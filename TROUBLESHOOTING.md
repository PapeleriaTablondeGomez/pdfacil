# 🔧 Guía de Solución de Problemas

## Problemas Comunes y Soluciones

### ❌ Error: "No se pudo conectar con el servidor"

**Posibles causas:**

1. **Backend no está corriendo en Render**
   - Ve a tu dashboard de Render
   - Verifica que el servicio esté "Live" (no "Suspended")
   - Revisa los logs para ver si hay errores

2. **URL incorrecta en el frontend**
   - Verifica que `client/js/app.js` tenga la URL correcta:
     ```javascript
     const API_BASE_URL = 'https://pdfacil.onrender.com/api';
     ```
   - Asegúrate de que incluya `/api` al final

3. **Problemas de CORS**
   - En Render, configura la variable de entorno `FRONTEND_URL` con la URL completa de tu frontend en Vercel
   - Ejemplo: `FRONTEND_URL=https://pdfacil.vercel.app`
   - **IMPORTANTE**: No incluyas la barra final `/`
   - Reinicia el servicio después de cambiar la variable

### ❌ Error CORS en la consola del navegador

**Solución:**

1. Verifica que `FRONTEND_URL` en Render esté configurada correctamente:
   ```
   FRONTEND_URL=https://tu-dominio.vercel.app
   ```

2. Si tienes múltiples dominios (ej: con y sin www), sepáralos por comas:
   ```
   FRONTEND_URL=https://pdfacil.vercel.app,https://www.pdfacil.vercel.app
   ```

3. Reinicia el servicio en Render después de cambiar la variable

4. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### ❌ Error 503 o "Service Unavailable"

**Causa común:** Render suspende servicios gratuitos después de inactividad

**Solución:**
- Render reactiva automáticamente el servicio cuando recibe una petición
- La primera petición después de la suspensión puede tardar 30-60 segundos
- Considera usar un servicio de "ping" para mantener el servicio activo

### ❌ Los archivos no se procesan / Error al subir

**Verifica:**

1. **Tamaño del archivo**: Máximo 50MB por archivo
2. **Tipo de archivo**: Solo PDFs e imágenes (JPG, PNG)
3. **Logs del servidor**: Revisa los logs en Render para ver el error específico

### ❌ Frontend muestra error pero no hay detalles

**Solución:**

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console" para ver errores detallados
3. Ve a la pestaña "Network" para ver las peticiones HTTP
4. Busca la petición que falló y revisa:
   - Status code (200 = OK, 404 = No encontrado, 500 = Error del servidor)
   - Response body para ver el mensaje de error

### ✅ Verificación Rápida

**Checklist:**

- [ ] Backend está "Live" en Render
- [ ] Frontend está desplegado en Vercel
- [ ] `FRONTEND_URL` está configurada en Render con la URL completa de Vercel
- [ ] `API_BASE_URL` en `client/js/app.js` apunta a `https://pdfacil.onrender.com/api`
- [ ] No hay errores en los logs de Render
- [ ] No hay errores en la consola del navegador

### 🔍 Cómo Verificar que Todo Funciona

1. **Verifica el backend:**
   ```
   https://pdfacil.onrender.com/api/health
   ```
   Deberías ver: `{"status":"ok","timestamp":"..."}`

2. **Verifica el frontend:**
   - Abre tu sitio en Vercel
   - Abre la consola del navegador (F12)
   - Deberías ver: "API URL: https://pdfacil.onrender.com/api" (si estás en desarrollo verás localhost)

3. **Prueba una operación simple:**
   - Sube un PDF pequeño (menos de 1MB)
   - Intenta unir dos PDFs
   - Si funciona, el problema está resuelto

### 📞 Obtener Más Información

Si el problema persiste:

1. **Revisa los logs de Render:**
   - Ve a tu servicio en Render
   - Click en "Logs"
   - Busca errores en rojo

2. **Revisa la consola del navegador:**
   - F12 → Console
   - Busca mensajes en rojo
   - Copia los mensajes de error completos

3. **Verifica la red:**
   - F12 → Network
   - Intenta procesar un archivo
   - Click en la petición que falla
   - Revisa "Headers" y "Response"

### 🚀 Configuración Recomendada en Render

Variables de entorno mínimas:
```
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://tu-frontend.vercel.app
```

**Nota:** Reemplaza `tu-frontend.vercel.app` con tu URL real de Vercel.

