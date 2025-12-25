# Guía de Inicio Rápido

## 🚀 Inicio en 5 Minutos

### 1. Clonar/Descargar el Proyecto

```bash
git clone https://github.com/tu-usuario/pdf-tools.git
cd pdf-tools
```

### 2. Configurar Backend

```bash
cd server
npm install
cp env.example .env
# Edita .env si es necesario
npm start
```

El backend estará en `http://localhost:3000`

### 3. Configurar Frontend

```bash
cd ../client
# Edita js/app.js y asegúrate de que API_BASE_URL apunte a http://localhost:3000/api
```

### 4. Servir Frontend

**Opción A: Python**
```bash
python -m http.server 5500
```

**Opción B: Node.js http-server**
```bash
npx http-server -p 5500
```

**Opción C: VS Code Live Server**
- Instala la extensión "Live Server"
- Click derecho en `index.html` → "Open with Live Server"

### 5. Abrir en Navegador

Abre `http://localhost:5500` y ¡listo!

## ✅ Verificación

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Sube un PDF pequeño
4. Verifica que las peticiones vayan a `localhost:3000`

## 🐛 Problemas Comunes

### Backend no inicia
- Verifica que el puerto 3000 esté libre
- Revisa que Node.js esté instalado: `node --version`

### Frontend no conecta
- Verifica que el backend esté corriendo
- Revisa la URL en `client/js/app.js`
- Verifica CORS en el backend

### Archivos no se procesan
- Verifica los logs del backend
- Asegúrate de que los directorios `uploads` y `output` existan

## 📦 Próximos Pasos

- Lee `README.md` para más detalles
- Lee `DEPLOY.md` para desplegar en producción
- Personaliza la UI en `client/css/styles.css`

