FROM node:18-alpine

# Instalar dependencias del sistema para procesamiento de PDFs
# Nota: Para funciones avanzadas como PDF a imágenes, se necesitaría GraphicsMagick
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads output

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]

