const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
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

router.post('/', upload.single('files'), async (req, res) => {
    const file = req.file;
    const { format = 'jpg', quality = 90 } = req.body;

    if (!file) {
        return res.status(400).json({ message: 'Se requiere un archivo PDF' });
    }

    try {
        const fileBuffer = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(fileBuffer);
        const pageCount = pdf.getPageCount();

        const zipPath = path.join(__dirname, '../output', `pdf-images-${Date.now()}.zip`);
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        // Convertir cada página a imagen
        // Nota: pdf-lib no puede convertir PDF a imagen directamente
        // Usaremos una aproximación con canvas si está disponible, o devolveremos un error informativo
        // Para producción real, se necesitaría pdf2pic o similar con dependencias del sistema

        // Solución alternativa: usar pdf2pic si está disponible
        try {
            const pdf2pic = require('pdf2pic');
            const convert = pdf2pic.fromPath(file.path, {
                density: 200,
                saveFilename: "page",
                savePath: path.join(__dirname, '../output'),
                format: format === 'png' ? 'png' : 'jpg',
                width: 2000,
                height: 2000
            });

            const imagePromises = [];
            for (let i = 1; i <= pageCount; i++) {
                imagePromises.push(convert(i, { responseType: "buffer" }));
            }

            const images = await Promise.all(imagePromises);

            images.forEach((image, index) => {
                archive.append(image.buffer, { name: `page-${index + 1}.${format}` });
            });

            await archive.finalize();

            await fs.unlink(file.path);

            output.on('close', async () => {
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', 'attachment; filename="images.zip"');
                res.sendFile(zipPath, async (err) => {
                    if (err) {
                        console.error('Error enviando archivo:', err);
                    }
                    setTimeout(async () => {
                        await fs.unlink(zipPath).catch(() => {});
                    }, 1000);
                });
            });

        } catch (pdf2picError) {
            // Si pdf2pic no está disponible, devolver error informativo
            await fs.unlink(file.path);
            res.status(503).json({ 
                message: 'La conversión de PDF a imágenes requiere dependencias del sistema adicionales. Por favor, use una herramienta alternativa o configure pdf2pic con GraphicsMagick/ImageMagick.',
                note: 'Esta función requiere GraphicsMagick o ImageMagick instalado en el servidor.'
            });
        }

    } catch (error) {
        console.error('Error en pdfToImages:', error);
        await fs.unlink(file.path).catch(() => {});
        res.status(500).json({ message: 'Error al convertir PDF a imágenes: ' + error.message });
    }
});

module.exports = router;

