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
    const { mode, pages, ranges, mergeRanges, size } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const totalPages = pdf.getPageCount();

        let pageRanges = [];
        
        // Procesar según el modo
        if (mode === 'range' && ranges) {
            // Modo rango: procesar rangos desde el frontend
            try {
                const rangesArray = typeof ranges === 'string' ? JSON.parse(ranges) : ranges;
                pageRanges = rangesArray.map(r => ({
                    from: parseInt(r.from) - 1, // Convertir a índice 0-based
                    to: parseInt(r.to) - 1
                })).filter(r => r.from >= 0 && r.to < totalPages && r.to >= r.from);
            } catch (e) {
                // Si no se puede parsear, usar el formato antiguo de pages
                if (pages) {
                    const parts = pages.split(',');
                    parts.forEach(part => {
                        if (part.includes('-')) {
                            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                            if (!isNaN(start) && !isNaN(end)) {
                                pageRanges.push({ from: start - 1, to: end - 1 });
                            }
                        } else {
                            const page = parseInt(part.trim());
                            if (!isNaN(page)) {
                                pageRanges.push({ from: page - 1, to: page - 1 });
                            }
                        }
                    });
                }
            }
        } else if (mode === 'pages' && pages) {
            // Modo páginas: convertir a rangos individuales
            const pageIndices = parsePages(pages, mode);
            pageRanges = pageIndices.map(p => ({ from: p, to: p }));
        } else if (mode === 'size' && size) {
            // Modo tamaño: dividir por tamaño (requiere herramientas adicionales)
            await fs.unlink(file.path);
            return res.status(503).json({ 
                message: 'La división por tamaño requiere herramientas adicionales del sistema.',
                note: 'Esta función requiere herramientas como qpdf o Ghostscript.'
            });
        } else if (pages) {
            // Formato antiguo: usar parsePages
            const pageIndices = parsePages(pages, mode || 'pages');
            pageRanges = pageIndices.map(p => ({ from: p, to: p }));
        } else {
            await fs.unlink(file.path);
            return res.status(400).json({ message: 'Se requiere especificar las páginas o rangos' });
        }

        if (pageRanges.length === 0) {
            await fs.unlink(file.path);
            return res.status(400).json({ message: 'No se encontraron rangos válidos' });
        }

        // Si mergeRanges está activado o solo hay un rango, devolver un solo PDF
        const shouldMerge = mergeRanges === 'true' || mergeRanges === true || pageRanges.length === 1;
        
        if (shouldMerge) {
            const mergedPdf = await PDFDocument.create();
            
            for (const range of pageRanges) {
                const pagesToCopy = [];
                for (let i = range.from; i <= range.to; i++) {
                    if (i >= 0 && i < totalPages) {
                        pagesToCopy.push(i);
                    }
                }
                
                if (pagesToCopy.length > 0) {
                    const copiedPages = await mergedPdf.copyPages(pdf, pagesToCopy);
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                }
            }
            
            const pdfBytes = await mergedPdf.save();
            await fs.unlink(file.path);

            const pdfBuffer = Buffer.from(pdfBytes);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="split.pdf"');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer, 'binary');
            return;
        }

        // Múltiples rangos: crear ZIP con PDFs separados
        const zipPath = path.join(__dirname, '../output', `split-${Date.now()}.zip`);
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        for (let i = 0; i < pageRanges.length; i++) {
            const range = pageRanges[i];
            const pagesToCopy = [];
            for (let j = range.from; j <= range.to; j++) {
                if (j >= 0 && j < totalPages) {
                    pagesToCopy.push(j);
                }
            }
            
            if (pagesToCopy.length > 0) {
                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(pdf, pagesToCopy);
                copiedPages.forEach(page => newPdf.addPage(page));
                const pdfBytes = await newPdf.save();

                const rangeName = range.from === range.to 
                    ? `page-${range.from + 1}.pdf`
                    : `pages-${range.from + 1}-${range.to + 1}.pdf`;
                archive.append(pdfBytes, { name: rangeName });
            }
        }

        await archive.finalize();
        await fs.unlink(file.path);

        output.on('close', async () => {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="split.zip"');
            res.sendFile(zipPath, async (err) => {
                if (err) {
                    console.error('Error enviando archivo:', err);
                    res.status(500).json({ message: 'Error al enviar el archivo ZIP' });
                }
                // Limpiar después de enviar
                setTimeout(async () => {
                    await fs.unlink(zipPath).catch(() => {});
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

