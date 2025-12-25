const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// Configuración de Multer
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

router.post('/', upload.array('files', 20), async (req, res) => {
    const files = req.files;
    const outputPath = path.join(__dirname, '../output', `merged-${Date.now()}.pdf`);

    try {
        if (!files || files.length < 2) {
            return res.status(400).json({ message: 'Se requieren al menos 2 archivos PDF' });
        }

        // Crear nuevo documento PDF
        const mergedPdf = await PDFDocument.create();

        // Procesar cada archivo
        for (const file of files) {
            try {
                const fileBuffer = await fs.readFile(file.path);
                const pdf = await PDFDocument.load(fileBuffer);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                
                pages.forEach((page) => {
                    mergedPdf.addPage(page);
                });
            } catch (error) {
                console.error(`Error procesando ${file.originalname}:`, error);
                // Continuar con los demás archivos
            }
        }

        // Guardar PDF combinado
        const pdfBytes = await mergedPdf.save();
        await fs.writeFile(outputPath, pdfBytes);

        // Limpiar archivos temporales
        for (const file of files) {
            await fs.unlink(file.path).catch(() => {});
        }

        // Enviar archivo como Buffer para asegurar correcta transmisión binaria
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
        res.setHeader('Content-Length', pdfBytes.length);
        res.send(Buffer.from(pdfBytes));

        // Eliminar archivo de salida después de enviarlo
        setTimeout(async () => {
            await fs.unlink(outputPath).catch(() => {});
        }, 1000);

    } catch (error) {
        console.error('Error en merge:', error);
        
        // Limpiar archivos en caso de error
        if (files) {
            for (const file of files) {
                await fs.unlink(file.path).catch(() => {});
            }
        }
        await fs.unlink(outputPath).catch(() => {});

        res.status(500).json({ message: 'Error al combinar PDFs: ' + error.message });
    }
});

module.exports = router;

