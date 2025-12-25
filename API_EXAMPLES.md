# Ejemplos de Uso de la API

Ejemplos de cómo usar la API directamente con `curl` o `fetch`.

## Base URL

```
http://localhost:3000/api  (desarrollo)
https://tu-backend.onrender.com/api  (producción)
```

## 1. Unir PDFs

```bash
curl -X POST http://localhost:3000/api/merge \
  -F "files=@documento1.pdf" \
  -F "files=@documento2.pdf" \
  -o merged.pdf
```

```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

const response = await fetch('http://localhost:3000/api/merge', {
  method: 'POST',
  body: formData
});

const blob = await response.blob();
// Descargar blob
```

## 2. Dividir PDF

```bash
curl -X POST http://localhost:3000/api/split \
  -F "files=@documento.pdf" \
  -F "mode=pages" \
  -F "pages=1,3,5-7" \
  -o split.zip
```

```javascript
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('mode', 'pages');
formData.append('pages', '1,3,5-7');

const response = await fetch('http://localhost:3000/api/split', {
  method: 'POST',
  body: formData
});
```

## 3. Organizar PDF (Reordenar)

```bash
curl -X POST http://localhost:3000/api/organize \
  -F "files=@documento.pdf" \
  -F "action=reorder" \
  -F "pageOrder=3,1,2" \
  -o reordered.pdf
```

## 4. Organizar PDF (Eliminar páginas)

```bash
curl -X POST http://localhost:3000/api/organize \
  -F "files=@documento.pdf" \
  -F "action=delete" \
  -F "pagesToDelete=1,3,5-7" \
  -o deleted.pdf
```

## 5. Organizar PDF (Rotar páginas)

```bash
curl -X POST http://localhost:3000/api/organize \
  -F "files=@documento.pdf" \
  -F "action=rotate" \
  -F "pagesToRotate=1,3" \
  -F "angle=90" \
  -o rotated.pdf
```

## 6. Imágenes a PDF

```bash
curl -X POST http://localhost:3000/api/images-to-pdf \
  -F "files=@imagen1.jpg" \
  -F "files=@imagen2.png" \
  -o images.pdf
```

## 7. PDF a Imágenes

```bash
curl -X POST http://localhost:3000/api/pdf-to-images \
  -F "files=@documento.pdf" \
  -F "format=jpg" \
  -F "quality=90" \
  -o images.zip
```

## 8. Proteger PDF

```bash
curl -X POST http://localhost:3000/api/protect \
  -F "files=@documento.pdf" \
  -F "password=miPassword123" \
  -F "passwordConfirm=miPassword123" \
  -o protected.pdf
```

## 9. Desbloquear PDF

```bash
curl -X POST http://localhost:3000/api/unlock \
  -F "files=@documento_protegido.pdf" \
  -F "password=miPassword123" \
  -o unlocked.pdf
```

## 10. Comprimir PDF

```bash
curl -X POST http://localhost:3000/api/compress \
  -F "files=@documento.pdf" \
  -F "level=medium" \
  -o compressed.pdf
```

## Respuestas de Error

```json
{
  "message": "Error descriptivo",
  "note": "Información adicional (opcional)"
}
```

## Códigos de Estado HTTP

- `200` - Éxito
- `400` - Error de validación (archivo inválido, parámetros faltantes)
- `500` - Error del servidor
- `429` - Demasiadas solicitudes (rate limit)

## Límites

- Tamaño máximo por archivo: 50MB
- Rate limit: 50 requests por 15 minutos
- Archivos temporales se eliminan automáticamente después de 10 minutos

