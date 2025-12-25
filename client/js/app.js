// Configuración
// Detección automática del entorno y URL del backend
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');

const API_BASE_URL = isDevelopment
    ? 'http://localhost:3000/api' 
    : 'https://pdfacil.onrender.com/api';

// Log para debugging (solo en desarrollo)
if (isDevelopment) {
    console.log('Modo desarrollo activado');
    console.log('API URL:', API_BASE_URL);
}

// Estado de la aplicación
let currentTool = 'merge';
let currentCategory = 'organize';
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

// Mapeo de herramientas a categorías
const toolCategoryMap = {
    'merge': 'organize',
    'split': 'organize',
    'delete-pages': 'organize',
    'extract-pages': 'organize',
    'organize': 'organize',
    'scan-to-pdf': 'organize',
    'compress': 'optimize',
    'repair': 'optimize',
    'ocr': 'optimize',
    'images-to-pdf': 'convert-to',
    'word-to-pdf': 'convert-to',
    'ppt-to-pdf': 'convert-to',
    'excel-to-pdf': 'convert-to',
    'html-to-pdf': 'convert-to',
    'pdf-to-images': 'convert-from',
    'pdf-to-word': 'convert-from',
    'pdf-to-ppt': 'convert-from',
    'pdf-to-excel': 'convert-from',
    'pdf-to-pdfa': 'convert-from',
    'rotate': 'edit',
    'page-numbers': 'edit',
    'watermark': 'edit',
    'crop': 'edit',
    'edit-text': 'edit',
    'unlock': 'security',
    'protect': 'security',
    'sign': 'security'
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeCategories();
    initializeToolButtons();
    initializeFileUpload();
    updateToolOptions();
});

// Selector de categorías
function initializeCategories() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            
            // Ocultar todas las categorías
            document.querySelectorAll('.tool-category').forEach(cat => {
                cat.classList.remove('active');
            });
            
            // Mostrar la categoría seleccionada
            const categoryDiv = document.querySelector(`.tool-category[data-category="${currentCategory}"]`);
            if (categoryDiv) {
                categoryDiv.classList.add('active');
            }
            
            // Seleccionar la primera herramienta de la categoría
            const firstTool = categoryDiv?.querySelector('.tool-btn');
            if (firstTool) {
                firstTool.click();
            }
        });
    });
}

// Selector de herramientas
function initializeToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todas las herramientas en la categoría actual
            const currentCategoryDiv = document.querySelector(`.tool-category[data-category="${currentCategory}"]`);
            if (currentCategoryDiv) {
                currentCategoryDiv.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            }
            
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            
            // Actualizar categoría si es necesario
            if (toolCategoryMap[currentTool]) {
                currentCategory = toolCategoryMap[currentTool];
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.category === currentCategory);
                });
                document.querySelectorAll('.tool-category').forEach(cat => {
                    cat.classList.toggle('active', cat.dataset.category === currentCategory);
                });
            }
            
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

    // Tipos de archivo válidos según la herramienta
    const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/html'
    ];

    // También validar por extensión
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.html', '.htm'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    return validTypes.includes(file.type) || hasValidExtension;
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

        // Nuevas herramientas - Organizar PDF
        case 'delete-pages':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Páginas a eliminar (ej: 1,3,5-7)</label>
                    <input type="text" id="pagesToDelete" class="option-input" placeholder="1,3,5-7">
                    <p class="option-hint">Separa páginas con comas. Usa guiones para rangos.</p>
                </div>
            `;
            break;

        case 'extract-pages':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Páginas a extraer (ej: 1,3,5-7)</label>
                    <input type="text" id="pagesToExtract" class="option-input" placeholder="1,3,5-7">
                    <p class="option-hint">Separa páginas con comas. Usa guiones para rangos.</p>
                </div>
            `;
            break;

        case 'scan-to-pdf':
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

        // Optimizar PDF
        case 'repair':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <p style="color: var(--text-secondary);">
                        El PDF será reparado y optimizado. Esto puede tomar unos momentos.
                    </p>
                </div>
            `;
            break;

        case 'ocr':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Idioma</label>
                    <select id="ocrLanguage" class="option-input">
                        <option value="spa">Español</option>
                        <option value="eng">Inglés</option>
                        <option value="fra">Francés</option>
                        <option value="deu">Alemán</option>
                    </select>
                    <p class="option-hint">Nota: OCR requiere herramientas adicionales del sistema.</p>
                </div>
            `;
            break;

        // Convertir a PDF
        case 'word-to-pdf':
        case 'ppt-to-pdf':
        case 'excel-to-pdf':
        case 'html-to-pdf':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <p style="color: var(--text-secondary);">
                        El archivo se convertirá a PDF. Esta función requiere herramientas adicionales del sistema.
                    </p>
                </div>
            `;
            break;

        // Convertir desde PDF
        case 'pdf-to-word':
        case 'pdf-to-ppt':
        case 'pdf-to-excel':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <p style="color: var(--text-secondary);">
                        El PDF se convertirá al formato seleccionado. Esta función requiere herramientas adicionales del sistema.
                    </p>
                </div>
            `;
            break;

        case 'pdf-to-pdfa':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Versión PDF/A</label>
                    <select id="pdfaVersion" class="option-input">
                        <option value="1a">PDF/A-1a</option>
                        <option value="1b">PDF/A-1b</option>
                        <option value="2a">PDF/A-2a</option>
                        <option value="2b">PDF/A-2b</option>
                        <option value="3a">PDF/A-3a</option>
                        <option value="3b">PDF/A-3b</option>
                    </select>
                    <p class="option-hint">Nota: Conversión a PDF/A requiere herramientas adicionales del sistema.</p>
                </div>
            `;
            break;

        // Editar PDF
        case 'rotate':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Páginas a rotar (ej: 1,3,5-7 o "all")</label>
                    <input type="text" id="pagesToRotate" class="option-input" placeholder="1,3,5-7 o all">
                    <label class="option-label" style="margin-top: 15px;">Ángulo de rotación</label>
                    <select id="rotateAngle" class="option-input">
                        <option value="90">90° (sentido horario)</option>
                        <option value="180">180°</option>
                        <option value="270">270° (sentido antihorario)</option>
                    </select>
                </div>
            `;
            break;

        case 'page-numbers':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Posición</label>
                    <select id="pageNumberPosition" class="option-input">
                        <option value="bottom-center">Abajo centro</option>
                        <option value="bottom-left">Abajo izquierda</option>
                        <option value="bottom-right">Abajo derecha</option>
                        <option value="top-center">Arriba centro</option>
                        <option value="top-left">Arriba izquierda</option>
                        <option value="top-right">Arriba derecha</option>
                    </select>
                </div>
                <div class="option-group">
                    <label class="option-label">Formato</label>
                    <select id="pageNumberFormat" class="option-input">
                        <option value="1">1, 2, 3...</option>
                        <option value="i">i, ii, iii...</option>
                        <option value="I">I, II, III...</option>
                        <option value="a">a, b, c...</option>
                        <option value="A">A, B, C...</option>
                    </select>
                </div>
                <div class="option-group">
                    <label class="option-label">Página inicial</label>
                    <input type="number" id="startPage" class="option-input" value="1" min="1">
                </div>
            `;
            break;

        case 'watermark':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Texto de marca de agua</label>
                    <input type="text" id="watermarkText" class="option-input" placeholder="Ej: CONFIDENCIAL">
                </div>
                <div class="option-group">
                    <label class="option-label">Posición</label>
                    <select id="watermarkPosition" class="option-input">
                        <option value="center">Centro</option>
                        <option value="diagonal">Diagonal</option>
                        <option value="tiled">Mosaico</option>
                    </select>
                </div>
                <div class="option-group">
                    <label class="option-label">Opacidad</label>
                    <input type="range" id="watermarkOpacity" class="option-input" min="10" max="100" value="50">
                    <p class="option-hint">Opacidad: <span id="opacityValue">50</span>%</p>
                </div>
            `;
            document.getElementById('watermarkOpacity')?.addEventListener('input', (e) => {
                const opacitySpan = document.getElementById('opacityValue');
                if (opacitySpan) opacitySpan.textContent = e.target.value;
            });
            break;

        case 'crop':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Margen superior (mm)</label>
                    <input type="number" id="cropTop" class="option-input" value="0" min="0">
                </div>
                <div class="option-group">
                    <label class="option-label">Margen inferior (mm)</label>
                    <input type="number" id="cropBottom" class="option-input" value="0" min="0">
                </div>
                <div class="option-group">
                    <label class="option-label">Margen izquierdo (mm)</label>
                    <input type="number" id="cropLeft" class="option-input" value="0" min="0">
                </div>
                <div class="option-group">
                    <label class="option-label">Margen derecho (mm)</label>
                    <input type="number" id="cropRight" class="option-input" value="0" min="0">
                </div>
            `;
            break;

        case 'edit-text':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <p style="color: var(--text-secondary);">
                        La edición de texto en PDF requiere herramientas avanzadas. Por ahora, puedes usar otras herramientas como agregar marca de agua o números de página.
                    </p>
                </div>
            `;
            break;

        // Seguridad
        case 'sign':
            toolOptions.innerHTML = `
                <div class="option-group">
                    <label class="option-label">Texto de firma</label>
                    <input type="text" id="signatureText" class="option-input" placeholder="Tu nombre">
                </div>
                <div class="option-group">
                    <label class="option-label">Posición</label>
                    <select id="signaturePosition" class="option-input">
                        <option value="bottom-right">Abajo derecha</option>
                        <option value="bottom-left">Abajo izquierda</option>
                        <option value="bottom-center">Abajo centro</option>
                    </select>
                </div>
                <p class="option-hint">Nota: Firma digital completa requiere certificados. Esta es una firma visual básica.</p>
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
    const minFiles = ['merge', 'images-to-pdf', 'scan-to-pdf', 'word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf', 'html-to-pdf'].includes(currentTool) ? 1 : 1;
    const needsPdf = [
        'split', 'organize', 'delete-pages', 'extract-pages', 'pdf-to-images', 'pdf-to-word', 'pdf-to-ppt', 
        'pdf-to-excel', 'pdf-to-pdfa', 'protect', 'unlock', 'compress', 'repair', 'ocr', 'rotate', 
        'page-numbers', 'watermark', 'crop', 'edit-text', 'sign'
    ].includes(currentTool);
    
    let canProcess = files.length >= minFiles;
    
    if (needsPdf) {
        canProcess = canProcess && files.some(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
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

        const apiUrl = `${API_BASE_URL}/${currentTool}`;
        console.log('Enviando petición a:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            headers: {
                // No agregar Content-Type, fetch lo maneja automáticamente para FormData
            }
        });

        console.log('Respuesta recibida:', response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = 'Error al procesar los archivos';
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch (e) {
                // Si no se puede parsear el JSON, usar el texto de la respuesta
                const text = await response.text();
                errorMessage = text || errorMessage;
            }
            
            // Mensajes de error más específicos
            if (response.status === 0 || response.status === 503) {
                errorMessage = 'El servidor no está disponible. Por favor, intenta más tarde.';
            } else if (response.status === 404) {
                errorMessage = 'Endpoint no encontrado. Verifica la configuración del servidor.';
            } else if (response.status === 429) {
                errorMessage = 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
            } else if (response.status >= 500) {
                errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
            }
            
            throw new Error(errorMessage);
        }

        updateProgress(70, 'Procesando PDF...');

        // Verificar que el Content-Type sea correcto
        const contentType = response.headers.get('content-type');
        console.log('Content-Type recibido:', contentType);
        
        if (!contentType || (!contentType.includes('application/pdf') && !contentType.includes('application/zip'))) {
            console.warn('Content-Type inesperado:', contentType);
        }

        // Obtener el array buffer primero para mayor control
        const arrayBuffer = await response.arrayBuffer();
        
        // Validar que tenga contenido
        if (arrayBuffer.byteLength === 0) {
            throw new Error('El archivo recibido está vacío. Por favor, intenta de nuevo.');
        }
        
        console.log('Tamaño del archivo recibido:', arrayBuffer.byteLength, 'bytes');
        
        // Determinar el tipo MIME correcto
        const mimeType = contentType && contentType.includes('application/zip') 
            ? 'application/zip' 
            : 'application/pdf';
        
        // Crear blob con el tipo MIME explícito
        const blob = new Blob([arrayBuffer], { type: mimeType });
        
        // Intentar obtener el nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = null;
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
                console.log('Nombre de archivo del servidor:', fileName);
            }
        }
        
        // Crear URL del blob
        const blobUrl = URL.createObjectURL(blob);

        updateProgress(100, 'Completado');

        setTimeout(() => {
            showResult(blobUrl, fileName);
        }, 500);

    } catch (error) {
        console.error('Error al procesar:', error);
        
        // Mensajes de error más descriptivos
        let errorMessage = error.message || 'Ocurrió un error al procesar los archivos';
        
        // Detectar errores de red
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('Network request failed')) {
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté disponible.';
        }
        
        showError(errorMessage);
    }
});

function getToolOptions() {
    const options = {};

    switch (currentTool) {
        case 'split':
            options.mode = document.getElementById('splitMode')?.value;
            options.pages = document.getElementById('splitPages')?.value;
            break;
        case 'organize':
            options.action = document.getElementById('organizeAction')?.value;
            if (options.action === 'reorder') {
                options.pageOrder = document.getElementById('pageOrder')?.value;
            } else if (options.action === 'delete') {
                options.pagesToDelete = document.getElementById('pagesToDelete')?.value;
            } else if (options.action === 'rotate') {
                options.pagesToRotate = document.getElementById('pagesToRotate')?.value;
                options.angle = document.getElementById('rotateAngle')?.value;
            }
            break;
        case 'delete-pages':
            options.pagesToDelete = document.getElementById('pagesToDelete')?.value;
            break;
        case 'extract-pages':
            options.pagesToExtract = document.getElementById('pagesToExtract')?.value;
            break;
        case 'pdf-to-images':
            options.format = document.getElementById('imageFormat')?.value;
            options.quality = document.getElementById('imageQuality')?.value;
            break;
        case 'protect':
            options.password = document.getElementById('password')?.value;
            options.passwordConfirm = document.getElementById('passwordConfirm')?.value;
            break;
        case 'unlock':
            options.password = document.getElementById('unlockPassword')?.value;
            break;
        case 'compress':
            options.level = document.getElementById('compressionLevel')?.value;
            break;
        case 'ocr':
            options.language = document.getElementById('ocrLanguage')?.value;
            break;
        case 'pdf-to-pdfa':
            options.version = document.getElementById('pdfaVersion')?.value;
            break;
        case 'rotate':
            options.pagesToRotate = document.getElementById('pagesToRotate')?.value;
            options.angle = document.getElementById('rotateAngle')?.value;
            break;
        case 'page-numbers':
            options.position = document.getElementById('pageNumberPosition')?.value;
            options.format = document.getElementById('pageNumberFormat')?.value;
            options.startPage = document.getElementById('startPage')?.value;
            break;
        case 'watermark':
            options.text = document.getElementById('watermarkText')?.value;
            options.position = document.getElementById('watermarkPosition')?.value;
            options.opacity = document.getElementById('watermarkOpacity')?.value;
            break;
        case 'crop':
            options.top = document.getElementById('cropTop')?.value;
            options.bottom = document.getElementById('cropBottom')?.value;
            options.left = document.getElementById('cropLeft')?.value;
            options.right = document.getElementById('cropRight')?.value;
            break;
        case 'sign':
            options.text = document.getElementById('signatureText')?.value;
            options.position = document.getElementById('signaturePosition')?.value;
            break;
    }

    return options;
}

function updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
    document.getElementById('progressDetail').textContent = `${percent}% completado`;
}

function showResult(downloadUrl, serverFileName = null) {
    progressPanel.classList.add('hidden');
    resultPanel.classList.remove('hidden');
    
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = downloadUrl;
    
    // Usar el nombre del servidor si está disponible, sino usar nombres por defecto
    let fileName = serverFileName;
    if (!fileName) {
        // Nombres por defecto según la herramienta
        const defaultNames = {
            'merge': 'merged.pdf',
            'split': 'split.pdf',
            'organize': 'organized.pdf',
            'delete-pages': 'deleted-pages.pdf',
            'extract-pages': 'extracted-pages.pdf',
            'scan-to-pdf': 'scanned.pdf',
            'images-to-pdf': 'images.pdf',
            'pdf-to-images': 'imagenes.zip',
            'protect': 'protected.pdf',
            'unlock': 'unlocked.pdf',
            'compress': 'compressed.pdf',
            'repair': 'repaired.pdf',
            'ocr': 'ocr.pdf',
            'rotate': 'rotated.pdf',
            'page-numbers': 'numbered.pdf',
            'watermark': 'watermarked.pdf',
            'crop': 'cropped.pdf',
            'sign': 'signed.pdf',
            'pdf-to-pdfa': 'pdfa.pdf'
        };
        fileName = defaultNames[currentTool] || 'documento.pdf';
    }
    
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

