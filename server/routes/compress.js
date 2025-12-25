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

router.post('/', upload.single('files'), async (req, res) => {
    const file = req.file;
    const { level = 'medium' } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);

        // pdf-lib tiene opciones limitadas de compresión
        // La compresión real requiere herramientas del sistema como qpdf o Ghostscript
        
        // Aplicar compresión básica optimizando el PDF
        const pdfBytes = await pdf.save({
            useObjectStreams: level === 'high', // Comprimir objetos para alta compresión
            updateMetadata: false,
        });

        const outputPath = path.join(__dirname, '../output', `compressed-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, pdfBytes);
        await fs.unlink(file.path);

        const originalSize = file.size;
        const compressedSize = pdfBytes.length;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        const pdfBuffer = Buffer.from(pdfBytes);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="compressed.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('X-Original-Size', originalSize);
        res.setHeader('X-Compressed-Size', compressedSize);
        res.setHeader('X-Compression-Ratio', compressionRatio);
        res.end(pdfBuffer, 'binary');

        setTimeout(async () => {
            await fs.unlink(outputPath).catch(() => {});
        }, 1000);

    } catch (error) {
        console.error('Error en compress:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ 
            message: 'Error al comprimir PDF: ' + error.message,
            note: 'Para compresión avanzada se recomienda usar herramientas del sistema como qpdf o Ghostscript.'
        });
    }
});

module.exports = router;

