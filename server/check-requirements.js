#!/usr/bin/env node

/**
 * Script para verificar requisitos del sistema
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando requisitos del sistema...\n');

let allOk = true;

// Verificar Node.js
try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion >= 18) {
        console.log(`✅ Node.js: ${nodeVersion} (OK)`);
    } else {
        console.log(`❌ Node.js: ${nodeVersion} (Se requiere v18+)`);
        allOk = false;
    }
} catch (error) {
    console.log('❌ Node.js: No encontrado');
    allOk = false;
}

// Verificar npm
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ npm: ${npmVersion} (OK)`);
} catch (error) {
    console.log('❌ npm: No encontrado');
    allOk = false;
}

// Verificar dependencias instaladas
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        console.log('✅ Dependencias: Instaladas');
    } else {
        console.log('⚠️  Dependencias: No instaladas (ejecuta: npm install)');
    }
} else {
    console.log('⚠️  package.json: No encontrado');
}

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');
if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env: Existe');
} else if (fs.existsSync(envExamplePath)) {
    console.log('⚠️  Archivo .env: No existe (copia env.example a .env)');
} else {
    console.log('⚠️  Archivo .env: No encontrado');
}

// Verificar directorios necesarios
const uploadsPath = path.join(__dirname, 'uploads');
const outputPath = path.join(__dirname, 'output');

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('✅ Directorio uploads: Creado');
} else {
    console.log('✅ Directorio uploads: Existe');
}

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log('✅ Directorio output: Creado');
} else {
    console.log('✅ Directorio output: Existe');
}

// Verificar herramientas opcionales
console.log('\n🔧 Herramientas opcionales (para funciones avanzadas):');

try {
    execSync('qpdf --version', { encoding: 'utf-8', stdio: 'ignore' });
    console.log('✅ qpdf: Instalado (desbloqueo y compresión avanzada disponibles)');
} catch (error) {
    console.log('⚠️  qpdf: No instalado (desbloqueo y compresión avanzada no disponibles)');
}

try {
    execSync('gm version', { encoding: 'utf-8', stdio: 'ignore' });
    console.log('✅ GraphicsMagick: Instalado (PDF → imágenes disponible)');
} catch (error) {
    try {
        execSync('magick -version', { encoding: 'utf-8', stdio: 'ignore' });
        console.log('✅ ImageMagick: Instalado (PDF → imágenes disponible)');
    } catch (error2) {
        console.log('⚠️  GraphicsMagick/ImageMagick: No instalado (PDF → imágenes no disponible)');
    }
}

console.log('\n' + '='.repeat(50));
if (allOk) {
    console.log('✅ Todos los requisitos básicos están cumplidos');
    console.log('🚀 Puedes iniciar el servidor con: npm start');
} else {
    console.log('❌ Algunos requisitos no están cumplidos');
    console.log('📖 Revisa la documentación en README.md');
}
console.log('='.repeat(50));

