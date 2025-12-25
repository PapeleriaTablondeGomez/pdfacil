const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + sanitizedName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

function parsePageNumbers(pagesStr) {
    const pages = [];
    const parts = pagesStr.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    pages.push(i - 1);
                }
            }
        } else {
            const page = parseInt(part);
            if (!isNaN(page)) {
                pages.push(page - 1);
            }
        }
    }

    return [...new Set(pages)];
}

router.post('/', upload.single('files'), async (req, res) => {
    const file = req.file;
    const { action, pageOrder, pagesToDelete, pagesToRotate, angle } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const totalPages = pdf.getPageCount();
        const outputPath = path.join(__dirname, '../output', `organized-${Date.now()}.pdf`);

        let newPdf = await PDFDocument.create();

        if (action === 'reorder') {
            // Reordenar páginas
            if (!pageOrder) {
                await fs.unlink(file.path);
                return res.status(400).json({ message: 'Se requiere especificar el orden de páginas' });
            }

            const order = pageOrder.split(',').map(p => parseInt(p.trim()) - 1);
            const validOrder = order.filter(p => p >= 0 && p < totalPages);

            if (validOrder.length === 0) {
                await fs.unlink(file.path);
                return res.status(400).json({ message: 'Orden de páginas inválido' });
            }

            const pages = await newPdf.copyPages(pdf, validOrder);
            pages.forEach(page => newPdf.addPage(page));

        } else if (action === 'delete') {
            // Eliminar páginas
            if (!pagesToDelete) {
                await fs.unlink(file.path);
                return res.status(400).json({ message: 'Se requiere especificar las páginas a eliminar' });
            }

            const pagesToRemove = parsePageNumbers(pagesToDelete);
            const allPages = Array.from({ length: totalPages }, (_, i) => i);
            const pagesToKeep = allPages.filter(p => !pagesToRemove.includes(p));

            if (pagesToKeep.length === 0) {
                await fs.unlink(file.path);
                return res.status(400).json({ message: 'No pueden eliminarse todas las páginas' });
            }

            const pages = await newPdf.copyPages(pdf, pagesToKeep);
            pages.forEach(page => newPdf.addPage(page));

        } else if (action === 'rotate') {
            // Rotar páginas
            if (!pagesToRotate || !angle) {
                await fs.unlink(file.path);
                return res.status(400).json({ message: 'Se requiere especificar las páginas y el ángulo' });
            }

            const pagesToRotateList = pagesToRotate.toLowerCase() === 'all' 
                ? Array.from({ length: totalPages }, (_, i) => i)
                : parsePageNumbers(pagesToRotate);

            const allPages = Array.from({ length: totalPages }, (_, i) => i);
            const pages = await newPdf.copyPages(pdf, allPages);

            pages.forEach((page, index) => {
                const newPage = newPdf.addPage(page);
                if (pagesToRotateList.includes(index)) {
                    const rotationAngle = parseInt(angle);
                    newPage.setRotation(newPage.getRotation() + rotationAngle);
                }
            });
        } else {
            await fs.unlink(file.path);
            return res.status(400).json({ message: 'Acción no válida' });
        }

        const pdfBytes = await newPdf.save();
        await fs.writeFile(outputPath, pdfBytes);
        await fs.unlink(file.path);

        const pdfBuffer = Buffer.from(pdfBytes);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="organized.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');

        setTimeout(async () => {
            await fs.unlink(outputPath).catch(() => {});
        }, 1000);

    } catch (error) {
        console.error('Error en organize:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ message: 'Error al organizar PDF: ' + error.message });
    }
});

module.exports = router;

