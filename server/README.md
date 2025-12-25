# PDF Tools Backend

Backend Node.js/Express para manipulación de archivos PDF.

## Instalación

```bash
npm install
```

## Configuración

Copia `env.example` a `.env` y configura las variables:

```bash
cp env.example .env
```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Endpoints API

- `POST /api/merge` - Unir PDFs
- `POST /api/split` - Dividir PDF
- `POST /api/organize` - Organizar PDF
- `POST /api/images-to-pdf` - Convertir imágenes a PDF
- `POST /api/pdf-to-images` - Convertir PDF a imágenes
- `POST /api/protect` - Proteger PDF con contraseña
- `POST /api/unlock` - Desbloquear PDF
- `POST /api/compress` - Comprimir PDF
- `GET /api/health` - Health check

## Estructura

```
server/
├── index.js              # Servidor principal
├── routes/               # Rutas de API
│   ├── merge.js
│   ├── split.js
│   ├── organize.js
│   ├── imagesToPdf.js
│   ├── pdfToImages.js
│   ├── protect.js
│   ├── unlock.js
│   └── compress.js
├── uploads/              # Archivos temporales (gitignored)
└── output/               # Archivos de salida (gitignored)
```

## Seguridad

- Validación de tipo MIME
- Límite de tamaño de archivo (50MB)
- Rate limiting (50 req/15min)
- Limpieza automática de archivos
- Sanitización de nombres de archivo

## Notas

Algunas funciones requieren dependencias adicionales del sistema. Ver `README.md` principal para más detalles.

