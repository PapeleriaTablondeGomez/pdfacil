const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const mergeRoutes = require('./routes/merge');
const splitRoutes = require('./routes/split');
const organizeRoutes = require('./routes/organize');
const imagesToPdfRoutes = require('./routes/imagesToPdf');
const pdfToImagesRoutes = require('./routes/pdfToImages');
const protectRoutes = require('./routes/protect');
const unlockRoutes = require('./routes/unlock');
const compressRoutes = require('./routes/compress');
const deletePagesRoutes = require('./routes/deletePages');
const extractPagesRoutes = require('./routes/extractPages');
const pageNumbersRoutes = require('./routes/pageNumbers');
const watermarkRoutes = require('./routes/watermark');
const stubRoutes = require('./routes/stubRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS - Configuración mejorada para producción
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['*'];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // En desarrollo, permitir todos los orígenes
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // En producción, verificar contra la lista de orígenes permitidos
        if (allowedOrigins.includes('*') || allowedOrigins.some(allowed => {
            try {
                const allowedUrl = new URL(allowed);
                const originUrl = new URL(origin);
                return allowedUrl.origin === originUrl.origin;
            } catch {
                return allowed === origin || allowed === '*';
            }
        })) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 requests por ventana
    message: 'Demasiadas solicitudes, intenta más tarde.'
});

app.use('/api/', limiter);

// Crear directorios necesarios
const ensureDirectories = async () => {
    const dirs = ['uploads', 'output'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Error creando directorio ${dir}:`, error);
        }
    }
};

// Limpieza automática de archivos antiguos
const cleanupOldFiles = async () => {
    const dirs = ['uploads', 'output'];
    const maxAge = 10 * 60 * 1000; // 10 minutos

    for (const dir of dirs) {
        try {
            const files = await fs.readdir(dir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                    const stats = await fs.stat(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        await fs.unlink(filePath);
                        console.log(`Archivo eliminado: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`Error eliminando ${filePath}:`, error);
                }
            }
        } catch (error) {
            console.error(`Error limpiando directorio ${dir}:`, error);
        }
    }
};

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupOldFiles, 5 * 60 * 1000);

// Routes
app.use('/api/merge', mergeRoutes);
app.use('/api/split', splitRoutes);
app.use('/api/organize', organizeRoutes);
app.use('/api/images-to-pdf', imagesToPdfRoutes);
app.use('/api/pdf-to-images', pdfToImagesRoutes);
app.use('/api/protect', protectRoutes);
app.use('/api/unlock', unlockRoutes);
app.use('/api/compress', compressRoutes);
app.use('/api/delete-pages', deletePagesRoutes);
app.use('/api/extract-pages', extractPagesRoutes);
app.use('/api/scan-to-pdf', imagesToPdfRoutes); // Reutiliza la misma lógica
app.use('/api/rotate', organizeRoutes); // Reutiliza organize con acción rotate
app.use('/api/page-numbers', pageNumbersRoutes);
app.use('/api/watermark', watermarkRoutes);
app.use('/api/crop', organizeRoutes); // Por ahora usa organize, se puede mejorar
app.use('/api/sign', watermarkRoutes); // Reutiliza watermark para firma visual
app.use('/api/ocr', stubRoutes);
app.use('/api/repair', stubRoutes);
app.use('/api/word-to-pdf', stubRoutes);
app.use('/api/ppt-to-pdf', stubRoutes);
app.use('/api/excel-to-pdf', stubRoutes);
app.use('/api/html-to-pdf', stubRoutes);
app.use('/api/pdf-to-word', stubRoutes);
app.use('/api/pdf-to-ppt', stubRoutes);
app.use('/api/pdf-to-excel', stubRoutes);
app.use('/api/pdf-to-pdfa', stubRoutes);
app.use('/api/edit-text', stubRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Inicializar servidor
const startServer = async () => {
    await ensureDirectories();
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en puerto ${PORT}`);
        console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer().catch(console.error);

