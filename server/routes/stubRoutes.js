const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

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
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Ruta genérica para funcionalidades que requieren herramientas adicionales
function createStubRoute(message, note = '') {
    return async (req, res) => {
        const file = req.file;
        if (file) {
            await fs.unlink(file.path).catch(() => {});
        }
        res.status(503).json({ 
            message: message,
            note: note || 'Esta función requiere herramientas adicionales del sistema que no están disponibles actualmente.'
        });
    };
}

// OCR PDF
router.post('/ocr', upload.single('files'), createStubRoute(
    'OCR PDF requiere herramientas adicionales del sistema.',
    'Para habilitar OCR, se necesita instalar Tesseract OCR y sus dependencias en el servidor.'
));

// Reparar PDF
router.post('/repair', upload.single('files'), createStubRoute(
    'Reparar PDF requiere herramientas adicionales del sistema.',
    'Para reparar PDFs corruptos, se recomienda usar herramientas como qpdf o Ghostscript.'
));

// Word a PDF
router.post('/word-to-pdf', upload.single('files'), createStubRoute(
    'Conversión de Word a PDF requiere herramientas adicionales.',
    'Esta función requiere LibreOffice o herramientas similares instaladas en el servidor.'
));

// PowerPoint a PDF
router.post('/ppt-to-pdf', upload.single('files'), createStubRoute(
    'Conversión de PowerPoint a PDF requiere herramientas adicionales.',
    'Esta función requiere LibreOffice o herramientas similares instaladas en el servidor.'
));

// Excel a PDF
router.post('/excel-to-pdf', upload.single('files'), createStubRoute(
    'Conversión de Excel a PDF requiere herramientas adicionales.',
    'Esta función requiere LibreOffice o herramientas similares instaladas en el servidor.'
));

// HTML a PDF
router.post('/html-to-pdf', upload.single('files'), createStubRoute(
    'Conversión de HTML a PDF requiere herramientas adicionales.',
    'Esta función requiere Puppeteer o herramientas similares instaladas en el servidor.'
));

// PDF a Word
router.post('/pdf-to-word', upload.single('files'), createStubRoute(
    'Conversión de PDF a Word requiere herramientas adicionales.',
    'Esta función requiere herramientas especializadas como Adobe Acrobat o servicios de conversión externos.'
));

// PDF a PowerPoint
router.post('/pdf-to-ppt', upload.single('files'), createStubRoute(
    'Conversión de PDF a PowerPoint requiere herramientas adicionales.',
    'Esta función requiere herramientas especializadas o servicios de conversión externos.'
));

// PDF a Excel
router.post('/pdf-to-excel', upload.single('files'), createStubRoute(
    'Conversión de PDF a Excel requiere herramientas adicionales.',
    'Esta función requiere herramientas especializadas o servicios de conversión externos.'
));

// PDF a PDF/A
router.post('/pdf-to-pdfa', upload.single('files'), createStubRoute(
    'Conversión a PDF/A requiere herramientas adicionales.',
    'Esta función requiere herramientas como Ghostscript o pdf2pdfa instaladas en el servidor.'
));

// Editar texto en PDF
router.post('/edit-text', upload.single('files'), createStubRoute(
    'Edición de texto en PDF requiere herramientas avanzadas.',
    'La edición directa de texto en PDFs es compleja. Considera usar otras herramientas como agregar marca de agua o números de página.'
));

module.exports = router;

