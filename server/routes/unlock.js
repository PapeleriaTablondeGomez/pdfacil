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
    const { password } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    if (!password) {
        await fs.unlink(file.path);
        return res.status(400).json({ message: 'Se requiere la contraseña del PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        
        // Intentar cargar el PDF con la contraseña
        // Nota: pdf-lib tiene soporte limitado para PDFs protegidos
        // En producción, se necesitaría una librería especializada o herramientas del sistema
        
        let pdf;
        try {
            pdf = await PDFDocument.load(fileBuffer, {
                // pdf-lib no soporta directamente contraseñas en load()
                // Se necesitaría una librería adicional como pdf-parse o qpdf
            });
        } catch (loadError) {
            await fs.unlink(file.path);
            return res.status(400).json({ 
                message: 'No se pudo desbloquear el PDF. Verifica que la contraseña sea correcta.',
                note: 'El desbloqueo completo requiere herramientas adicionales del sistema como qpdf.'
            });
        }

        // Si se carga exitosamente, guardar sin protección
        const pdfBytes = await pdf.save();
        const outputPath = path.join(__dirname, '../output', `unlocked-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, pdfBytes);
        await fs.unlink(file.path);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="unlocked.pdf"');
        res.send(pdfBytes);

        setTimeout(async () => {
            await fs.unlink(outputPath).catch(() => {});
        }, 1000);

    } catch (error) {
        console.error('Error en unlock:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ 
            message: 'Error al desbloquear PDF: ' + error.message,
            note: 'El desbloqueo de PDFs protegidos puede requerir herramientas adicionales del sistema.'
        });
    }
});

module.exports = router;

