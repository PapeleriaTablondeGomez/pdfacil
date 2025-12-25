const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const archiver = require('archiver');

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

// Función para parsear páginas
function parsePages(pagesStr, mode) {
    const pages = [];
    const parts = pagesStr.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    pages.push(i - 1); // Convertir a índice 0-based
                }
            }
        } else {
            const page = parseInt(part);
            if (!isNaN(page)) {
                pages.push(page - 1); // Convertir a índice 0-based
            }
        }
    }

    return [...new Set(pages)].sort((a, b) => a - b);
}

router.post('/', upload.single('files'), async (req, res) => {
    const file = req.file;
    const { mode, pages } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    if (!pages) {
        return res.status(400).json({ message: 'Se requiere especificar las páginas' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const totalPages = pdf.getPageCount();

        const pageIndices = parsePages(pages, mode);
        
        // Validar que las páginas existan
        const validPages = pageIndices.filter(p => p >= 0 && p < totalPages);
        
        if (validPages.length === 0) {
            await fs.unlink(file.path);
            return res.status(400).json({ message: 'No se encontraron páginas válidas' });
        }

        // Si solo es una página, devolver un solo PDF
        if (validPages.length === 1) {
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdf, [validPages[0]]);
            newPdf.addPage(copiedPage);
            const pdfBytes = await newPdf.save();

            await fs.unlink(file.path);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="split.pdf"');
            res.setHeader('Content-Length', pdfBytes.length);
            res.send(Buffer.from(pdfBytes));
            return;
        }

        // Múltiples páginas: crear ZIP con PDFs separados
        const outputDir = path.join(__dirname, '../output', `split-${Date.now()}`);
        await fs.mkdir(outputDir, { recursive: true });

        const zipPath = path.join(__dirname, '../output', `split-${Date.now()}.zip`);
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        for (let i = 0; i < validPages.length; i++) {
            const pageIndex = validPages[i];
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex]);
            newPdf.addPage(copiedPage);
            const pdfBytes = await newPdf.save();

            archive.append(pdfBytes, { name: `page-${pageIndex + 1}.pdf` });
        }

        await archive.finalize();

        await fs.unlink(file.path);

        output.on('close', async () => {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="split.zip"');
            res.sendFile(zipPath, async (err) => {
                if (err) {
                    console.error('Error enviando archivo:', err);
                }
                // Limpiar después de enviar
                setTimeout(async () => {
                    await fs.unlink(zipPath).catch(() => {});
                    await fs.rmdir(outputDir, { recursive: true }).catch(() => {});
                }, 1000);
            });
        });

    } catch (error) {
        console.error('Error en split:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ message: 'Error al dividir PDF: ' + error.message });
    }
});

module.exports = router;

