// Configuración
// IMPORTANTE: Actualiza esta URL con la URL de tu backend en producción
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api' 
    : 'https://pdfacil.onrender.com/api';

// Estado de la aplicación
let currentTool = 'merge';
let files = [];
let fileOrder = [];

// Elementos DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const toolOptions = document.getElementById('toolOptions');
const processBtn = document.getElementById('processBtn');
const uploadPanel = document.getElementById('uploadPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');
const errorPanel = document.getElementById('errorPanel');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeToolButtons();
    initializeFileUpload();
    updateToolOptions();
});

// Selector de herramientas
function initializeToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            files = [];
            fileOrder = [];
            renderFilesList();
            updateToolOptions();
            resetUI();
        });
    });
}

// Manejo de carga de archivos
function initializeFileUpload() {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
}

function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
}

function addFiles(newFiles) {
    const validFiles = newFiles.filter(file => {
        const isValid = validateFile(file);
        if (!isValid) {
            showError(`El archivo ${file.name} no es válido. Solo se permiten PDFs e imágenes.`);
        }
        return isValid;
    });

    validFiles.forEach(file => {
        if (!files.find(f => f.name === file.name && f.size === file.size)) {
            files.push(file);
            fileOrder.push(files.length - 1);
        }
    });

    renderFilesList();
    updateProcessButton();
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return false;
    }

    const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];

    return validTypes.includes(file.type);
}

function renderFilesList() {
    filesList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;

        const fileIcon = file.type === 'application/pdf' ? '📄' : '🖼️';
        const fileSize = formatFileSize(file.size);

        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})">Eliminar</button>
        `;

        filesList.appendChild(fileItem);
    });
}

function removeFile(index) {
    files.splice(index, 1);
    fileOrder = fileOrder.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    renderFilesList();
    updateProcessButton();
    updateToolOptions();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Opciones específicas por herramienta
function updateToolOptions() {
    toolOptions.innerHTML = '';

    switch (currentTool) {
        case 'merge':
            if (files.length > 0) {
                toolOptions.innerHTML = `
                    <div class="option-group">
                        <p style="color: var(--text-secondary);">
                            Los PDFs se unirán en el orden mostrado. Puedes arrastrar los archivos para reordenarlos.
                        </p>
                    </div>
                `;
            }
            break;

        case 'split':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Modo de división</label>
                    <select id="splitMode" class="option-input">
                        <option value="pages">Por páginas específicas</option>
                        <option value="range">Por rangos</option>
                    </select>
                </div>
                <div class="option-group">
                    <label class="option-label" id="splitLabel">Páginas (ej: 1,3,5-7)</label>
                    <input type="text" id="splitPages" class="option-input" placeholder="1,3,5-7">
                    <p class="option-hint">Separa páginas con comas. Usa guiones para rangos.</p>
                </div>
            `;
            document.getElementById('splitMode').addEventListener('change', (e) => {
                const label = document.getElementById('splitLabel');
                const input = document.getElementById('splitPages');
                if (e.target.value === 'pages') {
                    label.textContent = 'Páginas (ej: 1,3,5-7)';
                    input.placeholder = '1,3,5-7';
                } else {
                    label.textContent = 'Rangos (ej: 1-5,10-15)';
                    input.placeholder = '1-5,10-15';
                }
            });
            break;

        case 'organize':
            if (files.length > 0) {
                toolOptions.innerHTML = `
                    <div class="option-group">
                        <label class="option-label">Acción</label>
                        <select id="organizeAction" class="option-input">
                            <option value="reorder">Reordenar páginas</option>
                            <option value="delete">Eliminar páginas</option>
                            <option value="rotate">Rotar páginas</option>
                        </select>
                    </div>
                    <div class="option-group" id="organizeDetails"></div>
                `;
                document.getElementById('organizeAction').addEventListener('change', updateOrganizeDetails);
                updateOrganizeDetails();
            }
            break;

        case 'images-to-pdf':
            if (files.length > 0) {
                toolOptions.innerHTML = `
                    <div class="option-group">
                        <p style="color: var(--text-secondary);">
                            Las imágenes se convertirán a un único PDF en el orden mostrado.
                        </p>
                    </div>
                `;
            }
            break;

        case 'pdf-to-images':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Formato de salida</label>
                    <select id="imageFormat" class="option-input">
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
                <div class="option-group">
                    <label class="option-label">Calidad (solo JPG)</label>
                    <input type="range" id="imageQuality" class="option-input" min="1" max="100" value="90">
                    <p class="option-hint">Calidad: <span id="qualityValue">90</span>%</p>
                </div>
            `;
            document.getElementById('imageQuality').addEventListener('input', (e) => {
                document.getElementById('qualityValue').textContent = e.target.value;
            });
            break;

        case 'protect':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Contraseña</label>
                    <input type="password" id="password" class="option-input" placeholder="Ingresa una contraseña">
                </div>
                <div class="option-group">
                    <label class="option-label">Confirmar contraseña</label>
                    <input type="password" id="passwordConfirm" class="option-input" placeholder="Confirma la contraseña">
                </div>
            `;
            break;

        case 'unlock':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Contraseña del PDF</label>
                    <input type="password" id="unlockPassword" class="option-input" placeholder="Ingresa la contraseña del PDF">
                </div>
            `;
            break;

        case 'compress':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Nivel de compresión</label>
                    <select id="compressionLevel" class="option-input">
                        <option value="low">Baja (mejor calidad)</option>
                        <option value="medium" selected>Media (balanceado)</option>
                        <option value="high">Alta (máxima compresión)</option>
                    </select>
                </div>
            `;
            break;
    }
}

function updateOrganizeDetails() {
    const action = document.getElementById('organizeAction')?.value;
    const detailsDiv = document.getElementById('organizeDetails');
    if (!detailsDiv) return;

    if (action === 'reorder') {
        detailsDiv.innerHTML = `
            <label class="option-label">Orden de páginas (ej: 3,1,2)</label>
            <input type="text" id="pageOrder" class="option-input" placeholder="3,1,2">
            <p class="option-hint">Especifica el nuevo orden de las páginas separado por comas.</p>
        `;
    } else if (action === 'delete') {
        detailsDiv.innerHTML = `
            <label class="option-label">Páginas a eliminar (ej: 1,3,5-7)</label>
            <input type="text" id="pagesToDelete" class="option-input" placeholder="1,3,5-7">
            <p class="option-hint">Separa páginas con comas. Usa guiones para rangos.</p>
        `;
    } else if (action === 'rotate') {
        detailsDiv.innerHTML = `
            <label class="option-label">Páginas a rotar (ej: 1,3,5-7 o "all")</label>
            <input type="text" id="pagesToRotate" class="option-input" placeholder="1,3,5-7 o all">
            <label class="option-label" style="margin-top: 15px;">Ángulo de rotación</label>
            <select id="rotateAngle" class="option-input">
                <option value="90">90° (sentido horario)</option>
                <option value="180">180°</option>
                <option value="270">270° (sentido antihorario)</option>
            </select>
        `;
    }
}

function updateProcessButton() {
    const minFiles = ['merge', 'images-to-pdf'].includes(currentTool) ? 1 : 1;
    const needsPdf = ['split', 'organize', 'pdf-to-images', 'protect', 'unlock', 'compress'].includes(currentTool);
    
    let canProcess = files.length >= minFiles;
    
    if (needsPdf) {
        canProcess = canProcess && files.some(f => f.type === 'application/pdf');
    }

    processBtn.disabled = !canProcess;
}

// Procesamiento
processBtn.addEventListener('click', async () => {
    if (processBtn.disabled) return;

    try {
        uploadPanel.classList.add('hidden');
        progressPanel.classList.remove('hidden');
        errorPanel.classList.add('hidden');
        resultPanel.classList.add('hidden');

        updateProgress(0, 'Preparando archivos...');

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        // Agregar opciones según la herramienta
        const options = getToolOptions();
        Object.keys(options).forEach(key => {
            formData.append(key, options[key]);
        });

        updateProgress(30, 'Subiendo archivos...');

        const response = await fetch(`${API_BASE_URL}/${currentTool}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al procesar los archivos');
        }

        updateProgress(70, 'Procesando PDF...');

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        updateProgress(100, 'Completado');

        setTimeout(() => {
            showResult(downloadUrl);
        }, 500);

    } catch (error) {
        showError(error.message || 'Ocurrió un error al procesar los archivos');
    }
});

function getToolOptions() {
    const options = {};

    switch (currentTool) {
        case 'split':
            options.mode = document.getElementById('splitMode').value;
            options.pages = document.getElementById('splitPages').value;
            break;
        case 'organize':
            options.action = document.getElementById('organizeAction').value;
            if (options.action === 'reorder') {
                options.pageOrder = document.getElementById('pageOrder').value;
            } else if (options.action === 'delete') {
                options.pagesToDelete = document.getElementById('pagesToDelete').value;
            } else if (options.action === 'rotate') {
                options.pagesToRotate = document.getElementById('pagesToRotate').value;
                options.angle = document.getElementById('rotateAngle').value;
            }
            break;
        case 'pdf-to-images':
            options.format = document.getElementById('imageFormat').value;
            options.quality = document.getElementById('imageQuality').value;
            break;
        case 'protect':
            options.password = document.getElementById('password').value;
            options.passwordConfirm = document.getElementById('passwordConfirm').value;
            break;
        case 'unlock':
            options.password = document.getElementById('unlockPassword').value;
            break;
        case 'compress':
            options.level = document.getElementById('compressionLevel').value;
            break;
    }

    return options;
}

function updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
    document.getElementById('progressDetail').textContent = `${percent}% completado`;
}

function showResult(downloadUrl) {
    progressPanel.classList.add('hidden');
    resultPanel.classList.remove('hidden');
    
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = downloadUrl;
    
    const fileName = currentTool === 'pdf-to-images' ? 'imagenes.zip' : 'documento.pdf';
    downloadLink.download = fileName;
    
    document.getElementById('resultMessage').textContent = 
        `Tu archivo está listo para descargar.`;
}

function showError(message) {
    progressPanel.classList.add('hidden');
    resultPanel.classList.add('hidden');
    errorPanel.classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
}

function resetUI() {
    uploadPanel.classList.remove('hidden');
    progressPanel.classList.add('hidden');
    resultPanel.classList.add('hidden');
    errorPanel.classList.add('hidden');
    updateProcessButton();
}

// Event listeners para botones
document.getElementById('newProcessBtn').addEventListener('click', () => {
    files = [];
    fileOrder = [];
    fileInput.value = '';
    resetUI();
    renderFilesList();
    updateToolOptions();
});

document.getElementById('retryBtn').addEventListener('click', () => {
    resetUI();
});

// Actualizar botón cuando cambian las opciones
document.addEventListener('input', () => {
    updateProcessButton();
});

