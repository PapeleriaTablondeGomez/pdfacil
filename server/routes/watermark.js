const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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
    const { text = 'CONFIDENCIAL', position = 'center', opacity = '50' } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    if (!text || text.trim() === '') {
        await fs.unlink(file.path);
        return res.status(400).json({ message: 'Se requiere texto para la marca de agua' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const totalPages = pdf.getPageCount();
        const opacityValue = Math.max(0.1, Math.min(1, parseInt(opacity) / 100));

        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 48;

        for (let i = 0; i < totalPages; i++) {
            const page = pdf.getPage(i);
            const { width, height } = page.getSize();

            if (position === 'diagonal') {
                // Marca de agua diagonal
                page.drawText(text, {
                    x: width / 2,
                    y: height / 2,
                    size: fontSize,
                    font: font,
                    color: rgb(0.7, 0.7, 0.7),
                    opacity: opacityValue,
                    rotate: { angleInDegrees: -45 },
                });
            } else if (position === 'tiled') {
                // Marca de agua en mosaico
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const spacing = textWidth + 100;
                for (let x = 0; x < width + spacing; x += spacing) {
                    for (let y = 0; y < height + spacing; y += spacing) {
                        page.drawText(text, {
                            x: x,
                            y: y,
                            size: fontSize,
                            font: font,
                            color: rgb(0.7, 0.7, 0.7),
                            opacity: opacityValue,
                            rotate: { angleInDegrees: -45 },
                        });
                    }
                }
            } else {
                // Centro
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                page.drawText(text, {
                    x: (width - textWidth) / 2,
                    y: height / 2,
                    size: fontSize,
                    font: font,
                    color: rgb(0.7, 0.7, 0.7),
                    opacity: opacityValue,
                });
            }
        }

        const pdfBytes = await pdf.save();
        await fs.unlink(file.path);

        const pdfBuffer = Buffer.from(pdfBytes);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="watermarked.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');

    } catch (error) {
        console.error('Error en watermark:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ message: 'Error al agregar marca de agua: ' + error.message });
    }
});

module.exports = router;

