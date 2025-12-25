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

function formatPageNumber(pageNum, format) {
    switch (format) {
        case 'i': return toRoman(pageNum).toLowerCase();
        case 'I': return toRoman(pageNum).toUpperCase();
        case 'a': return toAlpha(pageNum).toLowerCase();
        case 'A': return toAlpha(pageNum).toUpperCase();
        default: return pageNum.toString();
    }
}

function toRoman(num) {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
            result += numerals[i];
            num -= values[i];
        }
    }
    return result;
}

function toAlpha(num) {
    let result = '';
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result || 'A';
}

function getPosition(position, pageWidth, pageHeight) {
    const margin = 20;
    switch (position) {
        case 'bottom-center':
            return { x: pageWidth / 2, y: margin };
        case 'bottom-left':
            return { x: margin, y: margin };
        case 'bottom-right':
            return { x: pageWidth - margin, y: margin };
        case 'top-center':
            return { x: pageWidth / 2, y: pageHeight - margin };
        case 'top-left':
            return { x: margin, y: pageHeight - margin };
        case 'top-right':
            return { x: pageWidth - margin, y: pageHeight - margin };
        default:
            return { x: pageWidth / 2, y: margin };
    }
}

router.post('/', upload.single('files'), async (req, res) => {
    const file = req.file;
    const { position = 'bottom-center', format = '1', startPage = '1' } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const totalPages = pdf.getPageCount();
        const startPageNum = parseInt(startPage) || 1;

        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        for (let i = 0; i < totalPages; i++) {
            const page = pdf.getPage(i);
            const { width, height } = page.getSize();
            const pageNum = startPageNum + i;
            const pageText = formatPageNumber(pageNum, format);

            const pos = getPosition(position, width, height);
            const textWidth = font.widthOfTextAtSize(pageText, fontSize);

            page.drawText(pageText, {
                x: position.includes('center') ? pos.x - textWidth / 2 : pos.x - (position.includes('right') ? textWidth : 0),
                y: pos.y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
        }

        const pdfBytes = await pdf.save();
        await fs.unlink(file.path);

        const pdfBuffer = Buffer.from(pdfBytes);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="numbered.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');

    } catch (error) {
        console.error('Error en pageNumbers:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ message: 'Error al agregar números de página: ' + error.message });
    }
});

module.exports = router;

