const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

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
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
});

router.post('/', upload.array('files', 20), async (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Se requiere al menos una imagen' });
    }

    try {
        const pdf = await PDFDocument.create();

        for (const file of files) {
            try {
                const imageBuffer = await fs.readFile(file.path);
                
                // Convertir imagen a PNG usando Sharp para compatibilidad
                const pngBuffer = await sharp(imageBuffer)
                    .png()
                    .toBuffer();

                // Obtener dimensiones
                const metadata = await sharp(imageBuffer).metadata();
                const width = metadata.width;
                const height = metadata.height;

                // Agregar página con la imagen
                const page = pdf.addPage([width, height]);
                const image = await pdf.embedPng(pngBuffer);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            } catch (error) {
                console.error(`Error procesando ${file.originalname}:`, error);
                // Continuar con las demás imágenes
            }
        }

        const pdfBytes = await pdf.save();

        // Limpiar archivos temporales
        for (const file of files) {
            await fs.unlink(file.path).catch(() => {});
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="images.pdf"');
        res.send(pdfBytes);

    } catch (error) {
        console.error('Error en imagesToPdf:', error);
        
        if (files) {
            for (const file of files) {
                await fs.unlink(file.path).catch(() => {});
            }
        }

        res.status(500).json({ message: 'Error al convertir imágenes a PDF: ' + error.message });
    }
});

module.exports = router;

