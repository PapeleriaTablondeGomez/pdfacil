# PDF Tools - Aplicación Web Profesional para Manipulación de PDFs

Una aplicación web completa tipo iLovePDF para manipular archivos PDF, con arquitectura frontend/backend separada, lista para producción y escalable.

## 🚀 Características

- ✅ **Unir PDFs**: Combina múltiples archivos PDF en uno solo
- ✅ **Dividir PDFs**: Divide un PDF por páginas específicas o rangos
- ✅ **Organizar PDF**: Reordenar, eliminar o rotar páginas
- ✅ **Imágenes → PDF**: Convierte imágenes (JPG/PNG) a PDF
- ⚠️ **PDF → Imágenes**: Requiere dependencias adicionales (ver notas)
- ⚠️ **Proteger PDF**: Protección básica (limitaciones en pdf-lib)
- ⚠️ **Desbloquear PDF**: Requiere herramientas adicionales del sistema
- ✅ **Comprimir PDF**: Compresión básica de archivos PDF

## 📁 Estructura del Proyecto

```
pdf-tools/
├── client/                 # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── server/                 # Backend (Node.js/Express)
│   ├── index.js           # Servidor principal
│   ├── routes/            # Rutas de API
│   │   ├── merge.js
│   │   ├── split.js
│   │   ├── organize.js
│   │   ├── imagesToPdf.js
│   │   ├── pdfToImages.js
│   │   ├── protect.js
│   │   ├── unlock.js
│   │   └── compress.js
│   ├── uploads/           # Archivos temporales (gitignored)
│   ├── output/            # Archivos de salida (gitignored)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
└── README.md
```

## 🛠️ Instalación Local

### Prerrequisitos

- Node.js 18+ instalado
- npm o yarn

### Backend

1. Navega al directorio del servidor:
```bash
cd server
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Edita `.env` con tus configuraciones:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

5. Inicia el servidor:
```bash
npm start
# O para desarrollo con auto-reload:
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Frontend

1. Navega al directorio del cliente:
```bash
cd client
```

2. Abre `js/app.js` y actualiza la URL de la API:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

3. Sirve los archivos estáticos. Puedes usar:
   - Un servidor HTTP simple (Python): `python -m http.server 5500`
   - Live Server en VS Code
   - Cualquier servidor estático

El frontend estará disponible en `http://localhost:5500`

## 🌐 Despliegue en Producción

### Opción 1: Vercel (Frontend) + Render/Fly.io (Backend)

#### Frontend en Vercel

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. En el directorio `client`:
```bash
vercel
```

3. Sigue las instrucciones para configurar el proyecto.

4. Actualiza `js/app.js` con la URL de tu backend:
```javascript
const API_BASE_URL = 'https://tu-backend.render.com/api';
```

#### Backend en Render

1. Crea una cuenta en [Render](https://render.com)

2. Crea un nuevo "Web Service"

3. Conecta tu repositorio de GitHub

4. Configuración:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     ```
     PORT=3000
     NODE_ENV=production
     FRONTEND_URL=https://tu-frontend.vercel.app
     ```

5. Render automáticamente detectará el Dockerfile si existe

#### Backend en Fly.io

1. Instala Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. En el directorio `server`:
```bash
fly launch
```

3. Configura las variables de entorno:
```bash
fly secrets set NODE_ENV=production
fly secrets set FRONTEND_URL=https://tu-frontend.vercel.app
```

4. Despliega:
```bash
fly deploy
```

### Opción 2: Netlify (Frontend) + Railway (Backend)

#### Frontend en Netlify

1. Crea una cuenta en [Netlify](https://netlify.com)

2. Arrastra y suelta la carpeta `client` o conecta tu repositorio

3. Configura el build:
   - **Build command**: (dejar vacío, es estático)
   - **Publish directory**: `client`

4. Actualiza `js/app.js` con la URL de tu backend

#### Backend en Railway

1. Crea una cuenta en [Railway](https://railway.app)

2. Crea un nuevo proyecto desde GitHub

3. Selecciona el directorio `server`

4. Railway detectará automáticamente Node.js y ejecutará `npm start`

5. Configura variables de entorno en el dashboard

## 🔒 Seguridad

- ✅ Validación de tipo MIME de archivos
- ✅ Límite de tamaño de archivo (50MB por defecto)
- ✅ Sanitización de nombres de archivo
- ✅ Rate limiting (50 requests por 15 minutos)
- ✅ Eliminación automática de archivos temporales (10 minutos)
- ✅ CORS configurado para producción

## ⚠️ Limitaciones y Notas Importantes

### Funciones que Requieren Dependencias Adicionales

1. **PDF → Imágenes**:
   - Requiere `pdf2pic` con GraphicsMagick o ImageMagick instalado
   - En sistemas Linux: `apt-get install graphicsmagick` o `apt-get install imagemagick`
   - En Docker: agregar al Dockerfile:
     ```dockerfile
     RUN apk add --no-cache graphicsmagick
     ```

2. **Proteger PDF con Contraseña**:
   - `pdf-lib` tiene soporte limitado para protección con contraseña
   - Para protección completa, usar `qpdf` o herramientas del sistema:
     ```bash
     qpdf --encrypt user-password owner-password 256 -- input.pdf output.pdf
     ```

3. **Desbloquear PDF**:
   - Requiere `qpdf` o librerías especializadas
   - Instalación: `apt-get install qpdf` o `brew install qpdf`

4. **Compresión Avanzada**:
   - La compresión básica funciona con `pdf-lib`
   - Para mejor compresión, usar `qpdf` o Ghostscript:
     ```bash
     qpdf --linearize input.pdf output.pdf
     ```

### Soluciones Alternativas

Si necesitas todas las funciones avanzadas, considera:

1. **Usar servicios cloud**:
   - AWS Textract
   - Google Cloud Document AI
   - Adobe PDF Services API

2. **Instalar dependencias del sistema**:
   - Agregar al Dockerfile las herramientas necesarias
   - Configurar en el servidor de producción

3. **Usar librerías adicionales**:
   - `pdf-parse` para lectura avanzada
   - `hummus-recipe` para escritura avanzada
   - `pdfkit` como alternativa

## 📝 Variables de Entorno

Crea un archivo `.env` en `server/` con:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://tu-frontend.vercel.app
MAX_FILE_SIZE=52428800
FILE_CLEANUP_INTERVAL=300000
```

## 🧪 Testing Local

1. Inicia el backend:
```bash
cd server
npm start
```

2. Inicia un servidor para el frontend:
```bash
cd client
python -m http.server 5500
```

3. Abre `http://localhost:5500` en tu navegador

4. Prueba subiendo archivos PDF y usando las diferentes herramientas

## 📦 Dependencias Principales

### Backend
- `express`: Servidor web
- `multer`: Manejo de archivos multipart
- `pdf-lib`: Manipulación de PDFs
- `sharp`: Procesamiento de imágenes
- `archiver`: Creación de archivos ZIP
- `cors`: Configuración CORS
- `express-rate-limit`: Rate limiting

### Frontend
- HTML5, CSS3, JavaScript puro (sin frameworks)

## 🐳 Docker

Para ejecutar con Docker:

```bash
cd server
docker build -t pdf-tools-backend .
docker run -p 3000:3000 -e NODE_ENV=production pdf-tools-backend
```

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto para tus necesidades.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa la sección de limitaciones
2. Verifica los logs del servidor
3. Asegúrate de que todas las dependencias estén instaladas
4. Revisa la configuración de variables de entorno

## 🎯 Roadmap Futuro

- [ ] Integración con qpdf para funciones avanzadas
- [ ] Soporte para más formatos de imagen
- [ ] Interfaz de usuario mejorada
- [ ] Procesamiento en cola para archivos grandes
- [ ] Almacenamiento en cloud (S3, etc.)
- [ ] Autenticación de usuarios
- [ ] Historial de operaciones

---

**Nota**: Este proyecto está diseñado para ser funcional en producción, pero algunas funciones avanzadas requieren herramientas adicionales del sistema. Revisa la sección de limitaciones para más detalles.

