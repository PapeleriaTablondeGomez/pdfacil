# Guía de Despliegue Paso a Paso

Esta guía te ayudará a desplegar PDF Tools en producción paso a paso.

## 📋 Prerrequisitos

- Cuenta en GitHub
- Cuenta en Vercel (para frontend)
- Cuenta en Render o Fly.io (para backend)
- Node.js instalado localmente (para pruebas)

## 🚀 Paso 1: Preparar el Repositorio

1. Crea un nuevo repositorio en GitHub
2. Sube tu código:
```bash
git init
git add .
git commit -m "Initial commit: PDF Tools app"
git branch -M main
git remote add origin https://github.com/tu-usuario/pdf-tools.git
git push -u origin main
```

## 🌐 Paso 2: Desplegar Backend en Render

### Opción A: Render (Recomendado para empezar)

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Haz clic en "New +" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Name**: `pdf-tools-backend`
   - **Region**: Elige la más cercana
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Variables de entorno:
   ```
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://tu-frontend.vercel.app
   ```
6. Haz clic en "Create Web Service"
7. Espera a que termine el despliegue
8. **Copia la URL** del servicio (ej: `https://pdf-tools-backend.onrender.com`)

### Opción B: Fly.io

1. Instala Fly CLI:
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

2. En el directorio `server`:
```bash
cd server
fly launch
```

3. Responde las preguntas:
   - App name: `pdf-tools-backend`
   - Region: Elige el más cercano
   - PostgreSQL: No
   - Redis: No

4. Configura variables de entorno:
```bash
fly secrets set NODE_ENV=production
fly secrets set FRONTEND_URL=https://tu-frontend.vercel.app
```

5. Despliega:
```bash
fly deploy
```

6. **Copia la URL** del servicio

## 🎨 Paso 3: Desplegar Frontend en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Haz clic en "Add New..." → "Project"
3. Importa tu repositorio de GitHub
4. Configuración:
   - **Framework Preset**: Other
   - **Root Directory**: `client`
   - **Build Command**: (dejar vacío)
   - **Output Directory**: (dejar vacío)
5. Variables de entorno (opcional):
   ```
   REACT_APP_API_URL=https://tu-backend.onrender.com/api
   ```
6. Haz clic en "Deploy"
7. Espera a que termine el despliegue
8. **Copia la URL** del frontend (ej: `https://pdf-tools.vercel.app`)

## 🔧 Paso 4: Configurar URLs

### Actualizar Frontend

1. En Vercel, ve a tu proyecto
2. Ve a "Settings" → "Environment Variables"
3. Agrega:
   ```
   VITE_API_URL=https://tu-backend.onrender.com/api
   ```
4. O edita directamente `client/js/app.js`:
```javascript
const API_BASE_URL = 'https://tu-backend.onrender.com/api';
```

### Actualizar Backend CORS

1. En Render/Fly.io, actualiza la variable de entorno:
   ```
   FRONTEND_URL=https://tu-frontend.vercel.app
   ```
2. Reinicia el servicio

## ✅ Paso 5: Verificar Despliegue

1. Abre tu frontend en el navegador
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña "Network"
4. Intenta subir un PDF pequeño
5. Verifica que las peticiones vayan a tu backend

## 🐛 Solución de Problemas

### Backend no responde

1. Verifica los logs en Render/Fly.io
2. Asegúrate de que `PORT` esté configurado correctamente
3. Verifica que el servicio esté "Live"

### Error CORS

1. Verifica que `FRONTEND_URL` en el backend sea correcta
2. Asegúrate de incluir el protocolo `https://`
3. No incluyas la barra final `/`

### Archivos no se procesan

1. Verifica los límites de tamaño en Render/Fly.io
2. Revisa los logs del servidor
3. Asegúrate de que los directorios `uploads` y `output` existan

### Frontend no encuentra el backend

1. Verifica la URL en `client/js/app.js`
2. Asegúrate de que incluya `/api` al final
3. Verifica que el backend esté accesible públicamente

## 🔄 Actualizaciones Futuras

Para actualizar el código:

1. Haz cambios localmente
2. Commit y push a GitHub:
```bash
git add .
git commit -m "Descripción de cambios"
git push
```

3. Render y Vercel se actualizarán automáticamente

## 📊 Monitoreo

### Render
- Ve a tu servicio → "Logs" para ver logs en tiempo real
- "Metrics" muestra uso de CPU y memoria

### Vercel
- "Deployments" muestra el historial
- "Analytics" muestra métricas de uso

## 💰 Costos

- **Vercel**: Gratis para proyectos personales
- **Render**: Gratis con limitaciones (se suspende después de inactividad)
- **Fly.io**: Gratis con límites generosos

Para producción con mucho tráfico, considera planes de pago.

## 🔒 Seguridad Adicional

1. **HTTPS**: Automático en Vercel y Render
2. **Rate Limiting**: Ya configurado en el código
3. **Variables de Entorno**: Nunca subas `.env` a GitHub
4. **Validación**: El backend valida todos los archivos

## 📝 Checklist Final

- [ ] Backend desplegado y accesible
- [ ] Frontend desplegado y accesible
- [ ] URLs configuradas correctamente
- [ ] CORS configurado
- [ ] Variables de entorno configuradas
- [ ] Prueba de funcionalidad básica exitosa
- [ ] Logs verificados sin errores

¡Tu aplicación debería estar funcionando en producción! 🎉

