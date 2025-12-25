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
let pdfPages = []; // Almacena información de páginas PDF
let pageRotations = {}; // Almacena rotaciones por página {index: degrees}
let deletedPages = new Set(); // Páginas eliminadas
let selectedPages = new Set(); // Páginas seleccionadas
let pdfDocs = {}; // Documentos PDF cargados {fileIndex: pdfDoc}
let fileColors = {}; // Colores asignados a cada archivo {fileIndex: color}
const colorPalette = [
    '#4f46e5', // Indigo
    '#10b981', // Verde
    '#f59e0b', // Amarillo
    '#ef4444', // Rojo
    '#8b5cf6', // Púrpura
    '#06b6d4', // Cyan
    '#ec4899', // Rosa
    '#14b8a6', // Teal
    '#f97316', // Naranja
    '#6366f1', // Índigo claro
];

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
const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
const pagesGrid = document.getElementById('pagesGrid');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

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
            
            // Limpiar URLs de imágenes antes de resetear
            pdfPages.forEach(page => {
                if (page.isImage && page.imageUrl) {
                    URL.revokeObjectURL(page.imageUrl);
                }
            });
            
            files = [];
            fileOrder = [];
            pdfPages = [];
            pageRotations = {};
            deletedPages.clear();
            selectedPages.clear();
            pdfDocs = {};
            fileColors = {};
            pdfPreviewContainer.classList.add('hidden');
            pagesGrid.innerHTML = '';
            fileInput.value = ''; // Limpiar el input para permitir subir el mismo archivo de nuevo
            renderFilesList();
            updateToolOptions();
            resetUI();
            
            // En móvil, hacer scroll hacia el área de carga de archivos
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    const headerOffset = 80; // Offset para el header
                    const elementPosition = uploadPanel.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }, 150);
            }
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

async function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
        await addFiles(droppedFiles);
    }
}

function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        addFiles(selectedFiles);
        // Limpiar el input después de procesar para permitir subir el mismo archivo de nuevo
        e.target.value = '';
    }
}

async function addFiles(newFiles) {
    const validFiles = newFiles.filter(file => {
        const isValid = validateFile(file);
        if (!isValid) {
            showError(`El archivo ${file.name} no es válido. Solo se permiten PDFs e imágenes.`);
        }
        return isValid;
    });

    const toolsWithPreview = ['merge', 'split', 'organize', 'delete-pages', 'extract-pages', 'rotate'];
    const toolsWithImagePreview = ['images-to-pdf', 'scan-to-pdf', 'merge'];
    let hasNewPDFs = false;
    let hasNewImages = false;
    
    for (const file of validFiles) {
        if (!files.find(f => f.name === file.name && f.size === file.size)) {
            const fileIndex = files.length;
            files.push(file);
            fileOrder.push(fileIndex);
            
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const isImage = file.type.startsWith('image/') || 
                           ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => 
                               file.name.toLowerCase().endsWith(ext));
            
            // Asignar color al archivo si es PDF o imagen
            if ((isPDF && toolsWithPreview.includes(currentTool)) || 
                (isImage && toolsWithImagePreview.includes(currentTool))) {
                if (!fileColors[fileIndex]) {
                    fileColors[fileIndex] = colorPalette[fileIndex % colorPalette.length];
                }
                if (isPDF) hasNewPDFs = true;
                if (isImage) hasNewImages = true;
            }
        }
    }

    // Si hay PDFs y la herramienta lo requiere, renderizar vista previa de todos
    if (hasNewPDFs && toolsWithPreview.includes(currentTool)) {
        await renderAllPDFsPreview();
    }
    
    // Si hay imágenes y la herramienta lo requiere, renderizar vista previa
    if (hasNewImages && toolsWithImagePreview.includes(currentTool)) {
        await renderAllImagesPreview();
    }

    renderFilesList();
    updateProcessButton();
    updateToolOptions();
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

async function removeFile(index) {
    // Limpiar URLs de imágenes antes de eliminar
    pdfPages.forEach(page => {
        if (page.isImage && page.imageUrl) {
            URL.revokeObjectURL(page.imageUrl);
        }
    });
    
    files.splice(index, 1);
    fileOrder = fileOrder.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    
    // Limpiar datos del archivo eliminado
    delete pdfDocs[index];
    delete fileColors[index];
    
    // Re-renderizar vista previa si hay archivos restantes
    const toolsWithPreview = ['merge', 'split', 'organize', 'delete-pages', 'extract-pages', 'rotate'];
    const toolsWithImagePreview = ['images-to-pdf', 'scan-to-pdf', 'merge'];
    
    const remainingPDFs = files.filter((file, i) => 
        (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) &&
        toolsWithPreview.includes(currentTool)
    );
    
    const remainingImages = files.filter((file, i) => {
        const isImage = file.type.startsWith('image/') || 
                       ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => 
                           file.name.toLowerCase().endsWith(ext));
        return isImage && toolsWithImagePreview.includes(currentTool);
    });
    
    if (remainingPDFs.length > 0 || remainingImages.length > 0) {
        // Limpiar y re-renderizar
        pagesGrid.innerHTML = '';
        pdfPages = [];
        pageRotations = {};
        deletedPages.clear();
        selectedPages.clear();
        
        if (remainingPDFs.length > 0) {
            await renderAllPDFsPreview();
        }
        if (remainingImages.length > 0) {
            await renderAllImagesPreview();
        }
    } else {
        pdfPreviewContainer.classList.add('hidden');
        pagesGrid.innerHTML = '';
        pdfPages = [];
        pageRotations = {};
        deletedPages.clear();
        selectedPages.clear();
    }
    
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
                <div class="split-mode-selector">
                    <button class="split-mode-btn active" data-mode="range" id="splitModeRange">
                        <span class="mode-icon">📊</span>
                        <span class="mode-text">Rango</span>
                    </button>
                    <button class="split-mode-btn" data-mode="pages" id="splitModePages">
                        <span class="mode-icon">📄</span>
                        <span class="mode-text">Páginas</span>
                    </button>
                    <button class="split-mode-btn" data-mode="size" id="splitModeSize">
                        <span class="mode-icon">📏</span>
                        <span class="mode-text">Tamaño</span>
                        <span class="premium-badge">👑</span>
                    </button>
                </div>
                
                <!-- Contenido para modo Rango -->
                <div class="split-content" id="splitContentRange">
                    <div class="range-type-selector">
                        <button class="range-type-btn active" id="rangeTypeCustom">Rangos personalizados</button>
                        <button class="range-type-btn" id="rangeTypeFixed">Rangos fijos</button>
                    </div>
                    <div class="ranges-container" id="rangesContainer">
                        <!-- Los rangos se agregarán aquí dinámicamente -->
                    </div>
                    <button class="add-range-btn" id="addRangeBtn">
                        <span>+</span> Añadir Rango
                    </button>
                    <div class="merge-ranges-option">
                        <input type="checkbox" id="mergeRanges" class="merge-checkbox">
                        <label for="mergeRanges">Unir todos los rangos en un único PDF</label>
                    </div>
                </div>
                
                <!-- Contenido para modo Páginas -->
                <div class="split-content hidden" id="splitContentPages">
                    <div class="option-group">
                        <label class="option-label">Páginas específicas</label>
                        <input type="text" id="splitPages" class="option-input" placeholder="1,3,5-7">
                        <p class="option-hint">Separa páginas con comas. Usa guiones para rangos (ej: 1,3,5-7)</p>
                    </div>
                </div>
                
                <!-- Contenido para modo Tamaño -->
                <div class="split-content hidden" id="splitContentSize">
                    <div class="option-group">
                        <label class="option-label">Tamaño máximo por archivo (MB)</label>
                        <input type="number" id="splitSize" class="option-input" placeholder="10" min="1" max="50">
                        <p class="option-hint">El PDF se dividirá en archivos del tamaño especificado</p>
                        <p class="premium-note">👑 Esta función requiere herramientas adicionales del sistema</p>
                    </div>
                </div>
            `;
            
            // Inicializar modo split
            initializeSplitMode();
            break;

        case 'organize':
            if (files.length > 0) {
                toolOptions.innerHTML = `
                    <div class="organize-action-selector">
                        <button class="organize-action-btn active" data-action="reorder" id="organizeActionReorder">
                            <span class="action-icon">🔄</span>
                            <span class="action-text">Reordenar</span>
                        </button>
                        <button class="organize-action-btn" data-action="delete" id="organizeActionDelete">
                            <span class="action-icon">🗑️</span>
                            <span class="action-text">Eliminar</span>
                        </button>
                        <button class="organize-action-btn" data-action="rotate" id="organizeActionRotate">
                            <span class="action-icon">↻</span>
                            <span class="action-text">Rotar</span>
                        </button>
                    </div>
                    
                    <!-- Contenido para Reordenar -->
                    <div class="organize-content" id="organizeContentReorder">
                        <div class="visual-organize-info">
                            <p class="info-text">Arrastra y suelta las páginas en la vista previa para reordenarlas. El orden actual se aplicará al procesar.</p>
                            <div class="organize-stats">
                                <span class="stat-item">
                                    <span class="stat-label">Orden actual:</span>
                                    <span class="stat-value" id="currentOrderDisplay">Original</span>
                                </span>
                            </div>
                            <div class="visual-actions">
                                <button class="action-btn secondary" id="resetOrderBtn">Restaurar orden original</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contenido para Eliminar -->
                    <div class="organize-content hidden" id="organizeContentDelete">
                        <div class="visual-delete-info">
                            <p class="info-text">Haz clic en las páginas de la vista previa para marcarlas para eliminación.</p>
                            <div class="delete-stats">
                                <span class="stat-item">
                                    <span class="stat-label">Páginas a eliminar:</span>
                                    <span class="stat-value" id="organizeDeletedCount">0</span>
                                </span>
                                <span class="stat-item">
                                    <span class="stat-label">Páginas restantes:</span>
                                    <span class="stat-value" id="organizeRemainingCount">0</span>
                                </span>
                            </div>
                            <div class="visual-actions">
                                <button class="action-btn secondary" id="organizeClearDeletedBtn">Limpiar selección</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contenido para Rotar -->
                    <div class="organize-content hidden" id="organizeContentRotate">
                        <div class="visual-rotate-info">
                            <p class="info-text">Haz clic en los botones de rotar de cada página en la vista previa, o especifica páginas y ángulo.</p>
                            <div class="option-group" style="margin-top: 15px;">
                                <label class="option-label">Ángulo de rotación</label>
                                <select id="rotateAngle" class="option-input">
                                    <option value="90">90° (sentido horario)</option>
                                    <option value="180">180°</option>
                                    <option value="270">270° (sentido antihorario)</option>
                                </select>
                            </div>
                            <div class="visual-actions" style="margin-top: 15px;">
                                <button class="action-btn secondary" id="rotateAllBtn">Rotar todas las páginas</button>
                                <button class="action-btn secondary" id="resetRotationsBtn">Restaurar rotaciones</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Inicializar modo organize
                initializeOrganizeMode();
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
                <div class="delete-mode-selector">
                    <button class="delete-mode-btn active" data-mode="visual" id="deleteModeVisual">
                        <span class="mode-icon">👁️</span>
                        <span class="mode-text">Visual</span>
                    </button>
                    <button class="delete-mode-btn" data-mode="ranges" id="deleteModeRanges">
                        <span class="mode-icon">📊</span>
                        <span class="mode-text">Rangos</span>
                    </button>
                    <button class="delete-mode-btn" data-mode="pages" id="deleteModePages">
                        <span class="mode-icon">📄</span>
                        <span class="mode-text">Páginas</span>
                    </button>
                </div>
                
                <!-- Contenido para modo Visual -->
                <div class="delete-content" id="deleteContentVisual">
                    <div class="visual-delete-info">
                        <p class="info-text">Haz clic en las páginas de la vista previa para marcarlas para eliminación.</p>
                        <div class="delete-stats">
                            <span class="stat-item">
                                <span class="stat-label">Páginas a eliminar:</span>
                                <span class="stat-value" id="deletedPagesCount">0</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-label">Páginas restantes:</span>
                                <span class="stat-value" id="remainingPagesCount">0</span>
                            </span>
                        </div>
                        <div class="visual-actions">
                            <button class="action-btn secondary" id="clearDeletedBtn">Limpiar selección</button>
                            <button class="action-btn secondary" id="selectAllDeleteBtn">Seleccionar todas</button>
                        </div>
                    </div>
                </div>
                
                <!-- Contenido para modo Rangos -->
                <div class="delete-content hidden" id="deleteContentRanges">
                    <div class="ranges-container" id="deleteRangesContainer">
                        <!-- Los rangos se agregarán aquí dinámicamente -->
                    </div>
                    <button class="add-range-btn" id="addDeleteRangeBtn">
                        <span>+</span> Añadir Rango
                    </button>
                    <p class="option-hint">Especifica los rangos de páginas que deseas eliminar</p>
                </div>
                
                <!-- Contenido para modo Páginas -->
                <div class="delete-content hidden" id="deleteContentPages">
                    <div class="option-group">
                        <label class="option-label">Páginas a eliminar</label>
                        <input type="text" id="pagesToDelete" class="option-input" placeholder="1,3,5-7">
                        <p class="option-hint">Separa páginas con comas. Usa guiones para rangos (ej: 1,3,5-7)</p>
                    </div>
                </div>
            `;
            
            // Inicializar modo delete
            initializeDeleteMode();
            break;

        case 'extract-pages':
            toolOptions.innerHTML = `
                <div class="extract-mode-selector">
                    <button class="extract-mode-btn active" data-mode="visual" id="extractModeVisual">
                        <span class="mode-icon">👁️</span>
                        <span class="mode-text">Visual</span>
                    </button>
                    <button class="extract-mode-btn" data-mode="ranges" id="extractModeRanges">
                        <span class="mode-icon">📊</span>
                        <span class="mode-text">Rangos</span>
                    </button>
                    <button class="extract-mode-btn" data-mode="pages" id="extractModePages">
                        <span class="mode-icon">📄</span>
                        <span class="mode-text">Páginas</span>
                    </button>
                </div>
                
                <!-- Contenido para modo Visual -->
                <div class="extract-content" id="extractContentVisual">
                    <div class="visual-extract-info">
                        <p class="info-text">Haz clic en las páginas de la vista previa para seleccionarlas para extracción.</p>
                        <div class="extract-stats">
                            <span class="stat-item">
                                <span class="stat-label">Páginas seleccionadas:</span>
                                <span class="stat-value" id="selectedPagesCount">0</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-label">Total de páginas:</span>
                                <span class="stat-value" id="totalPagesCount">0</span>
                            </span>
                        </div>
                        <div class="visual-actions">
                            <button class="action-btn secondary" id="clearSelectedBtn">Limpiar selección</button>
                            <button class="action-btn secondary" id="selectAllExtractBtn">Seleccionar todas</button>
                        </div>
                    </div>
                </div>
                
                <!-- Contenido para modo Rangos -->
                <div class="extract-content hidden" id="extractContentRanges">
                    <div class="ranges-container" id="extractRangesContainer">
                        <!-- Los rangos se agregarán aquí dinámicamente -->
                    </div>
                    <button class="add-range-btn" id="addExtractRangeBtn">
                        <span>+</span> Añadir Rango
                    </button>
                    <p class="option-hint">Especifica los rangos de páginas que deseas extraer</p>
                </div>
                
                <!-- Contenido para modo Páginas -->
                <div class="extract-content hidden" id="extractContentPages">
                    <div class="option-group">
                        <label class="option-label">Páginas a extraer</label>
                        <input type="text" id="pagesToExtract" class="option-input" placeholder="1,3,5-7">
                        <p class="option-hint">Separa páginas con comas. Usa guiones para rangos (ej: 1,3,5-7)</p>
                    </div>
                </div>
            `;
            
            // Inicializar modo extract
            initializeExtractMode();
            break;

        case 'scan-to-pdf':
            if (files.length > 0) {
                toolOptions.innerHTML = `
                    <div class="scan-options-container">
                        <div class="option-group">
                            <label class="option-label">Tamaño de página</label>
                            <select id="scanPageSize" class="option-input">
                                <option value="A4" selected>A4 (210 × 297 mm)</option>
                                <option value="Letter">Letter (8.5 × 11 pulgadas)</option>
                                <option value="Legal">Legal (8.5 × 14 pulgadas)</option>
                                <option value="A3">A3 (297 × 420 mm)</option>
                                <option value="A5">A5 (148 × 210 mm)</option>
                                <option value="Custom">Personalizado</option>
                            </select>
                        </div>
                        
                        <div class="option-group hidden" id="customSizeGroup">
                            <label class="option-label">Ancho (mm)</label>
                            <input type="number" id="customWidth" class="option-input" placeholder="210" min="50" max="1000">
                            <label class="option-label" style="margin-top: 10px;">Alto (mm)</label>
                            <input type="number" id="customHeight" class="option-input" placeholder="297" min="50" max="1000">
                        </div>
                        
                        <div class="option-group">
                            <label class="option-label">Orientación</label>
                            <select id="scanOrientation" class="option-input">
                                <option value="portrait" selected>Vertical</option>
                                <option value="landscape">Horizontal</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label class="option-label">Calidad de imagen</label>
                            <select id="scanQuality" class="option-input">
                                <option value="high">Alta (mejor calidad, archivo más grande)</option>
                                <option value="medium" selected>Media (balanceado)</option>
                                <option value="low">Baja (archivo más pequeño)</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label class="option-label">Márgenes</label>
                            <select id="scanMargins" class="option-input">
                                <option value="none">Sin márgenes</option>
                                <option value="small" selected>Pequeños</option>
                                <option value="medium">Medianos</option>
                                <option value="large">Grandes</option>
                            </select>
                        </div>
                        
                        <div class="visual-scan-info">
                            <p class="info-text">
                                📷 Las imágenes se convertirán a un único PDF en el orden mostrado en la vista previa.
                                Puedes reorganizar las imágenes arrastrándolas antes de procesar.
                            </p>
                        </div>
                    </div>
                `;
                
                // Event listener para tamaño personalizado
                document.getElementById('scanPageSize')?.addEventListener('change', (e) => {
                    const customGroup = document.getElementById('customSizeGroup');
                    if (e.target.value === 'Custom') {
                        customGroup?.classList.remove('hidden');
                    } else {
                        customGroup?.classList.add('hidden');
                    }
                });
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
            const activeModeBtn = document.querySelector('.split-mode-btn.active');
            const activeMode = activeModeBtn?.dataset.mode || 'range';
            options.mode = activeMode;
            
            if (activeMode === 'range') {
                // Obtener todos los rangos
                const ranges = [];
                document.querySelectorAll('.range-item').forEach(rangeItem => {
                    const from = parseInt(rangeItem.querySelector('.range-from')?.value) || 1;
                    const to = parseInt(rangeItem.querySelector('.range-to')?.value) || 1;
                    if (from > 0 && to > 0 && to >= from) {
                        ranges.push({ from, to });
                    }
                });
                if (ranges.length > 0) {
                    options.ranges = JSON.stringify(ranges);
                    options.mergeRanges = document.getElementById('mergeRanges')?.checked || false;
                    // También enviar en formato antiguo para compatibilidad
                    options.pages = ranges.map(r => `${r.from}-${r.to}`).join(',');
                }
            } else if (activeMode === 'pages') {
                options.pages = document.getElementById('splitPages')?.value;
            } else if (activeMode === 'size') {
                options.size = document.getElementById('splitSize')?.value;
            }
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
            const activeDeleteModeBtn = document.querySelector('.delete-mode-btn.active');
            const activeDeleteMode = activeDeleteModeBtn?.dataset.mode || 'visual';
            
            if (activeDeleteMode === 'visual') {
                // Modo visual: usar páginas eliminadas de la vista previa
                if (deletedPages.size > 0) {
                    const deletedArray = Array.from(deletedPages).sort((a, b) => a - b);
                    options.pagesToDelete = deletedArray.map(i => i + 1).join(',');
                } else {
                    options.pagesToDelete = '';
                }
            } else if (activeDeleteMode === 'ranges') {
                // Modo rangos: convertir rangos a formato de páginas
                const ranges = [];
                document.querySelectorAll('#deleteRangesContainer .range-item').forEach(rangeItem => {
                    const from = parseInt(rangeItem.querySelector('.range-from')?.value) || 1;
                    const to = parseInt(rangeItem.querySelector('.range-to')?.value) || 1;
                    if (from > 0 && to > 0 && to >= from) {
                        ranges.push({ from, to });
                    }
                });
                if (ranges.length > 0) {
                    // Convertir rangos a lista de páginas
                    const pagesToDelete = [];
                    ranges.forEach(range => {
                        for (let i = range.from; i <= range.to; i++) {
                            pagesToDelete.push(i);
                        }
                    });
                    options.pagesToDelete = [...new Set(pagesToDelete)].sort((a, b) => a - b).join(',');
                }
            } else {
                // Modo páginas: usar input de texto
                options.pagesToDelete = document.getElementById('pagesToDelete')?.value || '';
            }
            break;
        case 'extract-pages':
            const activeExtractModeBtn = document.querySelector('.extract-mode-btn.active');
            const activeExtractMode = activeExtractModeBtn?.dataset.mode || 'visual';
            
            if (activeExtractMode === 'visual') {
                // Modo visual: usar páginas seleccionadas de la vista previa
                if (selectedPages.size > 0) {
                    const selectedArray = Array.from(selectedPages).sort((a, b) => a - b);
                    options.pagesToExtract = selectedArray.map(i => i + 1).join(',');
                } else {
                    options.pagesToExtract = '';
                }
            } else if (activeExtractMode === 'ranges') {
                // Modo rangos: convertir rangos a formato de páginas
                const ranges = [];
                document.querySelectorAll('#extractRangesContainer .range-item').forEach(rangeItem => {
                    const from = parseInt(rangeItem.querySelector('.range-from')?.value) || 1;
                    const to = parseInt(rangeItem.querySelector('.range-to')?.value) || 1;
                    if (from > 0 && to > 0 && to >= from) {
                        ranges.push({ from, to });
                    }
                });
                if (ranges.length > 0) {
                    // Convertir rangos a lista de páginas
                    const pagesToExtract = [];
                    ranges.forEach(range => {
                        for (let i = range.from; i <= range.to; i++) {
                            pagesToExtract.push(i);
                        }
                    });
                    options.pagesToExtract = [...new Set(pagesToExtract)].sort((a, b) => a - b).join(',');
                }
            } else {
                // Modo páginas: usar input de texto
                options.pagesToExtract = document.getElementById('pagesToExtract')?.value || '';
            }
            break;
        case 'scan-to-pdf':
            options.pageSize = document.getElementById('scanPageSize')?.value || 'A4';
            options.orientation = document.getElementById('scanOrientation')?.value || 'portrait';
            options.quality = document.getElementById('scanQuality')?.value || 'medium';
            options.margins = document.getElementById('scanMargins')?.value || 'small';
            if (options.pageSize === 'Custom') {
                options.customWidth = document.getElementById('customWidth')?.value;
                options.customHeight = document.getElementById('customHeight')?.value;
            }
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
            // Si hay vista previa activa, usar rotaciones de la vista previa
            if (Object.keys(pageRotations).length > 0) {
                const rotatedPages = Object.keys(pageRotations)
                    .filter(i => pageRotations[i] !== 0)
                    .map(i => parseInt(i) + 1);
                options.pagesToRotate = rotatedPages.length > 0 ? rotatedPages.join(',') : 'all';
                // Usar la primera rotación encontrada (o permitir múltiples ángulos)
                const firstRotation = Object.values(pageRotations).find(r => r !== 0) || 90;
                options.angle = firstRotation.toString();
            } else {
                options.pagesToRotate = document.getElementById('pagesToRotate')?.value;
                options.angle = document.getElementById('rotateAngle')?.value;
            }
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
    // Limpiar URLs de imágenes antes de resetear
    pdfPages.forEach(page => {
        if (page.isImage && page.imageUrl) {
            URL.revokeObjectURL(page.imageUrl);
        }
    });
    
    files = [];
    fileOrder = [];
    pdfPages = [];
    pageRotations = {};
    deletedPages.clear();
    selectedPages.clear();
    pdfDocs = {};
    fileColors = {};
    pdfPreviewContainer.classList.add('hidden');
    pagesGrid.innerHTML = '';
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

// ========== FUNCIONES DE VISTA PREVIA PDF ==========

// Configurar PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Renderizar vista previa de TODOS los PDFs
async function renderAllPDFsPreview() {
    try {
        const toolsWithPreview = ['merge', 'split', 'organize', 'delete-pages', 'extract-pages', 'rotate'];
        
        // Obtener solo los PDFs
        const pdfFiles = files
            .map((file, index) => ({ file, index }))
            .filter(({ file }) => 
                (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) &&
                toolsWithPreview.includes(currentTool)
            );
        
        // Verificar si hay imágenes también
        const hasImages = files.some(file => {
            const isImage = file.type.startsWith('image/') || 
                           ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => 
                               file.name.toLowerCase().endsWith(ext));
            return isImage && ['images-to-pdf', 'scan-to-pdf', 'merge'].includes(currentTool);
        });
        
        if (pdfFiles.length === 0 && !hasImages) {
            pdfPreviewContainer.classList.add('hidden');
            return;
        }
        
        // Limpiar solo si es la primera vez
        const currentPageCount = pdfPages.length;
        const shouldClear = currentPageCount === 0;
        
        if (shouldClear) {
            pagesGrid.innerHTML = '';
            pdfPages = [];
            pageRotations = {};
            deletedPages.clear();
            selectedPages.clear();
        } else {
            // Si ya hay páginas, solo agregar las nuevas
            // Verificar qué archivos ya están renderizados
            const renderedFileIndexes = new Set(pdfPages.map(p => p.fileIndex));
            const filesToRender = pdfFiles.filter(({ index }) => !renderedFileIndexes.has(index));
            
            // Solo procesar archivos nuevos
            for (const { file, index: fileIndex } of filesToRender) {
                if (!pdfDocs[fileIndex]) {
                    const arrayBuffer = await file.arrayBuffer();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    pdfDocs[fileIndex] = pdf;
                }
                
                const pdf = pdfDocs[fileIndex];
                const numPages = pdf.numPages;
                
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    await renderPage(pdf, pageNum, fileIndex, file.name);
                }
            }
            
            // Ya renderizamos, salir
            initializePreviewActions();
            return;
        }
        
        // Mostrar contenedor de vista previa
        pdfPreviewContainer.classList.remove('hidden');
        
        // Renderizar cada PDF
        for (const { file, index: fileIndex } of pdfFiles) {
            // Verificar si ya está cargado
            if (!pdfDocs[fileIndex]) {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                pdfDocs[fileIndex] = pdf;
            }
            
            const pdf = pdfDocs[fileIndex];
            const numPages = pdf.numPages;
            
            // Renderizar cada página del PDF
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                await renderPage(pdf, pageNum, fileIndex, file.name);
            }
        }
        
        // Inicializar eventos de botones de acción global
        initializePreviewActions();
        
        // Si estamos en modo split, actualizar los rangos con el número de páginas
        if (currentTool === 'split') {
            renderSplitRanges();
        }
        
        // Si estamos en modo delete-pages, actualizar estadísticas y rangos
        if (currentTool === 'delete-pages') {
            updateDeleteStats();
            renderDeleteRanges();
        }
        
        // Si estamos en modo extract-pages, actualizar estadísticas y rangos
        if (currentTool === 'extract-pages') {
            updateExtractStats();
            renderExtractRanges();
        }
        
        // Si estamos en modo organize, actualizar estadísticas
        if (currentTool === 'organize') {
            updateOrganizeOrderDisplay();
            updateOrganizeDeleteStats();
        }
        
    } catch (error) {
        console.error('Error renderizando PDFs:', error);
        showError('Error al cargar la vista previa de los PDFs: ' + error.message);
    }
}

// Renderizar vista previa de PDF (función legacy, mantener por compatibilidad)
async function renderPDFPreview(file, fileIndex) {
    await renderAllPDFsPreview();
}

// Renderizar vista previa de TODAS las imágenes
async function renderAllImagesPreview() {
    try {
        const toolsWithImagePreview = ['images-to-pdf', 'scan-to-pdf', 'merge'];
        
        // Obtener solo las imágenes
        const imageFiles = files
            .map((file, index) => ({ file, index }))
            .filter(({ file }) => {
                const isImage = file.type.startsWith('image/') || 
                               ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => 
                                   file.name.toLowerCase().endsWith(ext));
                return isImage && toolsWithImagePreview.includes(currentTool);
            });
        
        if (imageFiles.length === 0) {
            // Si no hay imágenes pero hay PDFs, no ocultar el contenedor
            const hasPDFs = files.some(file => 
                file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
            );
            if (!hasPDFs) {
                pdfPreviewContainer.classList.add('hidden');
            }
            return;
        }
        
        // Verificar si hay PDFs también para no limpiar si ya hay contenido
        const toolsWithPreview = ['merge', 'split', 'organize', 'delete-pages', 'extract-pages', 'rotate'];
        const hasPDFs = files.some(file => {
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            return isPDF && toolsWithPreview.includes(currentTool);
        });
        
        // Si hay PDFs, no limpiar, solo agregar imágenes
        // Si solo hay imágenes y es la primera vez, limpiar
        const currentImageCount = pdfPages.filter(p => p.isImage).length;
        const shouldClear = currentImageCount === 0 && !hasPDFs;
        
        if (shouldClear) {
            pagesGrid.innerHTML = '';
            pdfPages = [];
            pageRotations = {};
            deletedPages.clear();
            selectedPages.clear();
        }
        
        // Mostrar contenedor de vista previa
        pdfPreviewContainer.classList.remove('hidden');
        
        // Renderizar cada imagen (solo las nuevas)
        for (const { file, index: fileIndex } of imageFiles) {
            // Verificar si ya está renderizada
            const alreadyRendered = pdfPages.some(p => p.fileIndex === fileIndex && p.isImage);
            if (alreadyRendered) continue;
            
            await renderImagePreview(file, fileIndex);
        }
        
        // Inicializar eventos de botones de acción global
        initializePreviewActions();
        
    } catch (error) {
        console.error('Error renderizando imágenes:', error);
        showError('Error al cargar la vista previa de las imágenes: ' + error.message);
    }
}

// Renderizar vista previa de una imagen individual
async function renderImagePreview(file, fileIndex) {
    try {
        const imageIndex = pdfPages.length;
        const fileColor = fileColors[fileIndex] || colorPalette[fileIndex % colorPalette.length];
        if (!fileColors[fileIndex]) {
            fileColors[fileIndex] = fileColor;
        }
        
        // Crear objeto URL para la imagen
        const imageUrl = URL.createObjectURL(file);
        
        // Guardar información de la imagen
        pdfPages.push({ 
            file, 
            fileIndex, 
            fileName: file.name,
            imageUrl,
            isImage: true,
            pageNum: imageIndex + 1
        });
        
        // Crear contenedor de imagen
        const imageItem = document.createElement('div');
        imageItem.className = 'page-preview-item';
        imageItem.dataset.pageIndex = imageIndex;
        imageItem.dataset.fileIndex = fileIndex;
        imageItem.draggable = true;
        
        // Aplicar color de borde según el archivo
        imageItem.style.borderColor = fileColor;
        imageItem.style.borderWidth = '3px';
        
        // Crear imagen
        const img = document.createElement('img');
        img.className = 'image-preview-img';
        img.src = imageUrl;
        img.alt = file.name;
        // La imagen se ajustará automáticamente con CSS
        
        // Controles de imagen
        const controls = document.createElement('div');
        controls.className = 'page-preview-controls';
        
        // Botón de selección
        const selectBtn = document.createElement('button');
        selectBtn.className = 'page-control-btn select';
        selectBtn.innerHTML = '✓';
        selectBtn.title = 'Seleccionar imagen';
        selectBtn.onclick = (e) => {
            e.stopPropagation();
            togglePageSelection(imageIndex);
        };
        
        // Botón de eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'page-control-btn delete';
        deleteBtn.innerHTML = '✗';
        deleteBtn.title = 'Eliminar imagen';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePage(imageIndex);
        };
        
        controls.appendChild(selectBtn);
        controls.appendChild(deleteBtn);
        
        // Badge de archivo (arriba)
        const fileBadge = document.createElement('div');
        fileBadge.className = 'file-badge';
        const fileNameShort = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
        fileBadge.textContent = `🖼️ ${fileNameShort}`;
        fileBadge.style.backgroundColor = fileColor;
        fileBadge.style.color = 'white';
        
        // Badge de número de imagen
        const imageBadge = document.createElement('div');
        imageBadge.className = 'page-number-badge';
        imageBadge.textContent = `Imagen ${imageIndex + 1}`;
        imageBadge.style.backgroundColor = fileColor;
        imageBadge.style.color = 'white';
        
        // Overlay para imágenes eliminadas
        const overlay = document.createElement('div');
        overlay.className = 'page-preview-overlay';
        overlay.textContent = 'Eliminada';
        
        imageItem.appendChild(img);
        imageItem.appendChild(controls);
        imageItem.appendChild(fileBadge);
        imageItem.appendChild(imageBadge);
        imageItem.appendChild(overlay);
        
        // Eventos de drag and drop
        imageItem.addEventListener('dragstart', handleDragStart);
        imageItem.addEventListener('dragover', handleDragOver);
        imageItem.addEventListener('drop', handleDrop);
        imageItem.addEventListener('dragend', handleDragEnd);
        
        // Click para seleccionar
        imageItem.addEventListener('click', (e) => {
            if (e.target === imageItem || e.target === img) {
                togglePageSelection(imageIndex);
            }
        });
        
        pagesGrid.appendChild(imageItem);
        
    } catch (error) {
        console.error(`Error renderizando imagen ${file.name}:`, error);
    }
}

// Renderizar una página individual
async function renderPage(pdf, pageNum, fileIndex, fileName = null) {
    try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5 });
        
        // Calcular índice global de página
        const pageIndex = pdfPages.length;
        pdfPages.push({ page, pageNum, fileIndex, fileName });
        
        // Obtener color del archivo
        const fileColor = fileColors[fileIndex] || colorPalette[fileIndex % colorPalette.length];
        if (!fileColors[fileIndex]) {
            fileColors[fileIndex] = fileColor;
        }
        
        // Crear contenedor de página
        const pageItem = document.createElement('div');
        pageItem.className = 'page-preview-item';
        pageItem.dataset.pageIndex = pageIndex;
        pageItem.dataset.fileIndex = fileIndex;
        pageItem.draggable = true;
        
        // Aplicar color de borde según el archivo
        pageItem.style.borderColor = fileColor;
        pageItem.style.borderWidth = '3px';
        
        // Canvas para renderizar la página
        const canvas = document.createElement('canvas');
        canvas.className = 'page-preview-canvas';
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar página en canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Controles de página
        const controls = document.createElement('div');
        controls.className = 'page-preview-controls';
        
        // Botón de selección
        const selectBtn = document.createElement('button');
        selectBtn.className = 'page-control-btn select';
        selectBtn.innerHTML = '✓';
        selectBtn.title = 'Seleccionar página';
        selectBtn.onclick = (e) => {
            e.stopPropagation();
            togglePageSelection(pageIndex);
        };
        
        // Botón de rotar
        const rotateBtn = document.createElement('button');
        rotateBtn.className = 'page-control-btn rotate';
        rotateBtn.innerHTML = '🔄';
        rotateBtn.title = 'Rotar página';
        rotateBtn.onclick = (e) => {
            e.stopPropagation();
            rotatePage(pageIndex);
        };
        
        // Botón de eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'page-control-btn delete';
        deleteBtn.innerHTML = '✗';
        deleteBtn.title = 'Eliminar página';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePage(pageIndex);
        };
        
        controls.appendChild(selectBtn);
        controls.appendChild(rotateBtn);
        controls.appendChild(deleteBtn);
        
        // Badge de archivo (arriba)
        const fileBadge = document.createElement('div');
        fileBadge.className = 'file-badge';
        const fileNameShort = fileName ? (fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName) : `Archivo ${fileIndex + 1}`;
        fileBadge.textContent = `📄 ${fileNameShort}`;
        fileBadge.style.backgroundColor = fileColor;
        fileBadge.style.color = 'white';
        
        // Badge de número de página
        const pageBadge = document.createElement('div');
        pageBadge.className = 'page-number-badge';
        pageBadge.textContent = `Pág. ${pageNum}`;
        pageBadge.style.backgroundColor = fileColor;
        pageBadge.style.color = 'white';
        
        // Indicador de rotación
        const rotationIndicator = document.createElement('div');
        rotationIndicator.className = 'page-rotation-indicator';
        rotationIndicator.textContent = '0°';
        
        // Overlay para páginas eliminadas
        const overlay = document.createElement('div');
        overlay.className = 'page-preview-overlay';
        overlay.textContent = 'Eliminada';
        
        pageItem.appendChild(canvas);
        pageItem.appendChild(controls);
        pageItem.appendChild(fileBadge);
        pageItem.appendChild(pageBadge);
        pageItem.appendChild(rotationIndicator);
        pageItem.appendChild(overlay);
        
        // Eventos de drag and drop
        pageItem.addEventListener('dragstart', handleDragStart);
        pageItem.addEventListener('dragover', handleDragOver);
        pageItem.addEventListener('drop', handleDrop);
        pageItem.addEventListener('dragend', handleDragEnd);
        
        // Click para seleccionar o eliminar según la herramienta
        pageItem.addEventListener('click', (e) => {
            if (e.target === pageItem || e.target === canvas) {
                if (currentTool === 'delete-pages') {
                    // En modo eliminar páginas, hacer clic elimina/restaura
                    deletePage(pageIndex);
                } else {
                    togglePageSelection(pageIndex);
                }
            }
        });
        
        pagesGrid.appendChild(pageItem);
        
    } catch (error) {
        console.error(`Error renderizando página ${pageNum}:`, error);
    }
}

// Rotar página
function rotatePage(pageIndex) {
    const currentRotation = pageRotations[pageIndex] || 0;
    const newRotation = (currentRotation + 90) % 360;
    pageRotations[pageIndex] = newRotation;
    
    const pageItem = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (pageItem) {
        const indicator = pageItem.querySelector('.page-rotation-indicator');
        indicator.textContent = `${newRotation}°`;
        
        if (newRotation !== 0) {
            pageItem.classList.add('rotated');
        } else {
            pageItem.classList.remove('rotated');
        }
        
        // Rotar el canvas visualmente
        const canvas = pageItem.querySelector('canvas');
        canvas.style.transform = `rotate(${newRotation}deg)`;
    }
}

// Eliminar/restaurar página
function deletePage(pageIndex) {
    if (deletedPages.has(pageIndex)) {
        deletedPages.delete(pageIndex);
        selectedPages.delete(pageIndex);
    } else {
        deletedPages.add(pageIndex);
        selectedPages.delete(pageIndex);
    }
    
    const pageItem = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (pageItem) {
        pageItem.classList.toggle('deleted');
        pageItem.classList.remove('selected');
    }
    
    updatePreviewActions();
    
    // Si estamos en modo eliminar páginas, actualizar estadísticas
    if (currentTool === 'delete-pages') {
        updateDeleteStats();
    }
}

// Seleccionar/deseleccionar página
function togglePageSelection(pageIndex) {
    if (deletedPages.has(pageIndex)) return;
    
    if (selectedPages.has(pageIndex)) {
        selectedPages.delete(pageIndex);
    } else {
        selectedPages.add(pageIndex);
    }
    
    const pageItem = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (pageItem) {
        pageItem.classList.toggle('selected');
    }
    
    updatePreviewActions();
    
    // Si estamos en modo extract-pages, actualizar estadísticas
    if (currentTool === 'extract-pages') {
        updateExtractStats();
    }
}

// Drag and Drop
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(pagesGrid, e.clientY);
    const dragging = document.querySelector('.dragging');
    
    if (afterElement == null) {
        pagesGrid.appendChild(dragging);
    } else {
        pagesGrid.insertBefore(dragging, afterElement);
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Actualizar orden de páginas basado en el nuevo orden DOM
    const pageItems = Array.from(pagesGrid.querySelectorAll('.page-preview-item'));
    const newOrder = pageItems.map(item => parseInt(item.dataset.pageIndex));
    
    // Reordenar pdfPages según el nuevo orden
    const reorderedPages = newOrder.map(index => pdfPages[index]);
    pdfPages = reorderedPages;
    
    // Actualizar rotaciones y estados según nuevo índice
    const newRotations = {};
    const newDeleted = new Set();
    const newSelected = new Set();
    
    pageItems.forEach((item, newIndex) => {
        const oldIndex = parseInt(item.dataset.pageIndex);
        item.dataset.pageIndex = newIndex;
        
        if (pageRotations[oldIndex]) {
            newRotations[newIndex] = pageRotations[oldIndex];
        }
        if (deletedPages.has(oldIndex)) {
            newDeleted.add(newIndex);
        }
        if (selectedPages.has(oldIndex)) {
            newSelected.add(newIndex);
        }
    });
    
    pageRotations = newRotations;
    deletedPages = newDeleted;
    selectedPages = newSelected;
    
    // Re-renderizar con nuevos índices
    setTimeout(() => {
        renderPagesInOrder();
    }, 100);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.page-preview-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Re-renderizar páginas en el orden actual
async function renderPagesInOrder() {
    // Esta función se puede usar para re-renderizar si es necesario
    // Por ahora, solo actualizamos los números de página
    pdfPages.forEach((pageInfo, index) => {
        const pageItem = document.querySelector(`[data-page-index="${index}"]`);
        if (pageItem) {
            const badge = pageItem.querySelector('.page-number-badge');
            badge.textContent = `Página ${index + 1}`;
        }
    });
}

// Inicializar acciones globales de vista previa
function initializePreviewActions() {
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            pdfPages.forEach((_, index) => {
                if (!deletedPages.has(index)) {
                    selectedPages.add(index);
                    const pageItem = document.querySelector(`[data-page-index="${index}"]`);
                    if (pageItem) pageItem.classList.add('selected');
                }
            });
            updatePreviewActions();
        };
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.onclick = () => {
            selectedPages.clear();
            document.querySelectorAll('.page-preview-item').forEach(item => {
                item.classList.remove('selected');
            });
            updatePreviewActions();
        };
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.onclick = () => {
            selectedPages.forEach(index => {
                deletePage(index);
            });
            updatePreviewActions();
        };
    }
}

function updatePreviewActions() {
    const selectedCount = selectedPages.size;
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = selectedCount === 0;
        deleteSelectedBtn.textContent = selectedCount > 0 
            ? `🗑️ Eliminar (${selectedCount})` 
            : '🗑️ Eliminar';
    }
    
    // Si estamos en modo eliminar páginas, actualizar estadísticas
    if (currentTool === 'delete-pages') {
        updateDeleteStats();
    }
}

// Obtener páginas activas (no eliminadas) con sus rotaciones
function getActivePages() {
    return pdfPages
        .map((pageInfo, index) => ({
            index,
            pageInfo,
            rotation: pageRotations[index] || 0,
            deleted: deletedPages.has(index)
        }))
        .filter(page => !page.deleted);
}

// ========== FUNCIONES PARA DIVIDIR PDF MEJORADO ==========

let splitRanges = []; // Almacena los rangos de división

function initializeSplitMode() {
    // Obtener número total de páginas del primer PDF si está disponible
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        // Si hay páginas renderizadas, obtener el máximo
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    // Inicializar con modo Rango por defecto
    if (splitRanges.length === 0) {
        splitRanges = [{ from: 1, to: Math.min(3, totalPages) }];
    }
    renderSplitRanges();
    
    // Event listeners para cambiar de modo
    document.querySelectorAll('.split-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchSplitMode(mode);
        });
    });
    
    // Event listeners para tipo de rango
    document.getElementById('rangeTypeCustom')?.addEventListener('click', () => {
        document.getElementById('rangeTypeCustom').classList.add('active');
        document.getElementById('rangeTypeFixed').classList.remove('active');
    });
    
    document.getElementById('rangeTypeFixed')?.addEventListener('click', () => {
        document.getElementById('rangeTypeFixed').classList.add('active');
        document.getElementById('rangeTypeCustom').classList.remove('active');
    });
    
    // Botón para agregar rango
    document.getElementById('addRangeBtn')?.addEventListener('click', () => {
        addSplitRange();
    });
}

function switchSplitMode(mode) {
    // Actualizar botones de modo
    document.querySelectorAll('.split-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Mostrar/ocultar contenido según el modo
    document.getElementById('splitContentRange')?.classList.toggle('hidden', mode !== 'range');
    document.getElementById('splitContentPages')?.classList.toggle('hidden', mode !== 'pages');
    document.getElementById('splitContentSize')?.classList.toggle('hidden', mode !== 'size');
    
    // Si es modo tamaño, mostrar mensaje de premium
    if (mode === 'size') {
        // Por ahora solo mostrar mensaje
    }
}

function renderSplitRanges() {
    const container = document.getElementById('rangesContainer');
    if (!container) return;
    
    // Obtener número total de páginas del primer PDF si está disponible
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        // Si hay páginas renderizadas, obtener el máximo
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    container.innerHTML = '';
    
    splitRanges.forEach((range, index) => {
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        rangeItem.dataset.rangeIndex = index;
        
        // Asegurar que los valores estén dentro del rango válido
        const fromValue = Math.min(Math.max(1, range.from), totalPages);
        const toValue = Math.min(Math.max(fromValue, range.to), totalPages);
        
        rangeItem.innerHTML = `
            <div class="range-header">
                <div class="range-move-buttons">
                    <button class="range-move-btn" onclick="moveRange(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="range-move-btn" onclick="moveRange(${index}, 'down')" ${index === splitRanges.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <span class="range-title">Rango ${index + 1}</span>
                <button class="range-delete-btn" onclick="removeSplitRange(${index})">✗</button>
            </div>
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>de la página</label>
                    <input type="number" class="range-from" value="${fromValue}" min="1" max="${totalPages}" onchange="updateRange(${index}, 'from', this.value)">
                </div>
                <div class="range-input-group">
                    <label>a</label>
                    <input type="number" class="range-to" value="${toValue}" min="1" max="${totalPages}" onchange="updateRange(${index}, 'to', this.value)">
                </div>
            </div>
        `;
        
        container.appendChild(rangeItem);
    });
}

function addSplitRange() {
    // Obtener el último rango para sugerir el siguiente
    const lastRange = splitRanges[splitRanges.length - 1];
    const nextFrom = lastRange ? lastRange.to + 1 : 1;
    
    splitRanges.push({ from: nextFrom, to: nextFrom });
    renderSplitRanges();
}

function removeSplitRange(index) {
    if (splitRanges.length > 1) {
        splitRanges.splice(index, 1);
        renderSplitRanges();
    }
}

function updateRange(index, type, value) {
    if (splitRanges[index]) {
        const numValue = parseInt(value) || 1;
        if (type === 'from') {
            splitRanges[index].from = numValue;
            // Asegurar que 'to' sea mayor o igual que 'from'
            if (splitRanges[index].to < numValue) {
                splitRanges[index].to = numValue;
                const rangeItem = document.querySelector(`[data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-to').value = numValue;
                }
            }
        } else {
            splitRanges[index].to = numValue;
            // Asegurar que 'from' sea menor o igual que 'to'
            if (splitRanges[index].from > numValue) {
                splitRanges[index].from = numValue;
                const rangeItem = document.querySelector(`[data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-from').value = numValue;
                }
            }
        }
    }
}

function moveRange(index, direction) {
    if (direction === 'up' && index > 0) {
        [splitRanges[index], splitRanges[index - 1]] = [splitRanges[index - 1], splitRanges[index]];
        renderSplitRanges();
    } else if (direction === 'down' && index < splitRanges.length - 1) {
        [splitRanges[index], splitRanges[index + 1]] = [splitRanges[index + 1], splitRanges[index]];
        renderSplitRanges();
    }
}

// Hacer funciones globales para los onclick
window.removeSplitRange = removeSplitRange;
window.updateRange = updateRange;
window.moveRange = moveRange;

// ========== FUNCIONES PARA ELIMINAR PÁGINAS MEJORADO ==========

let deleteRanges = []; // Almacena los rangos de eliminación

function initializeDeleteMode() {
    // Inicializar con modo Visual por defecto
    deleteRanges = [];
    renderDeleteRanges();
    updateDeleteStats();
    
    // Event listeners para cambiar de modo
    document.querySelectorAll('.delete-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchDeleteMode(mode);
        });
    });
    
    // Botón para agregar rango
    document.getElementById('addDeleteRangeBtn')?.addEventListener('click', () => {
        addDeleteRange();
    });
    
    // Botones de acciones visuales
    document.getElementById('clearDeletedBtn')?.addEventListener('click', () => {
        deletedPages.clear();
        updateDeleteVisualState();
        updateDeleteStats();
    });
    
    document.getElementById('selectAllDeleteBtn')?.addEventListener('click', () => {
        pdfPages.forEach((_, index) => {
            deletedPages.add(index);
        });
        updateDeleteVisualState();
        updateDeleteStats();
    });
}

function switchDeleteMode(mode) {
    // Actualizar botones de modo
    document.querySelectorAll('.delete-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Mostrar/ocultar contenido según el modo
    document.getElementById('deleteContentVisual')?.classList.toggle('hidden', mode !== 'visual');
    document.getElementById('deleteContentRanges')?.classList.toggle('hidden', mode !== 'ranges');
    document.getElementById('deleteContentPages')?.classList.toggle('hidden', mode !== 'pages');
    
    // Si cambiamos a modo visual, actualizar el estado visual
    if (mode === 'visual') {
        updateDeleteVisualState();
        updateDeleteStats();
    }
}

function renderDeleteRanges() {
    const container = document.getElementById('deleteRangesContainer');
    if (!container) return;
    
    // Obtener número total de páginas del primer PDF si está disponible
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    container.innerHTML = '';
    
    if (deleteRanges.length === 0) {
        deleteRanges = [{ from: 1, to: 1 }];
    }
    
    deleteRanges.forEach((range, index) => {
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        rangeItem.dataset.rangeIndex = index;
        
        const fromValue = Math.min(Math.max(1, range.from), totalPages);
        const toValue = Math.min(Math.max(fromValue, range.to), totalPages);
        
        rangeItem.innerHTML = `
            <div class="range-header">
                <div class="range-move-buttons">
                    <button class="range-move-btn" onclick="moveDeleteRange(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="range-move-btn" onclick="moveDeleteRange(${index}, 'down')" ${index === deleteRanges.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <span class="range-title">Rango ${index + 1}</span>
                <button class="range-delete-btn" onclick="removeDeleteRange(${index})">✗</button>
            </div>
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>de la página</label>
                    <input type="number" class="range-from" value="${fromValue}" min="1" max="${totalPages}" onchange="updateDeleteRange(${index}, 'from', this.value)">
                </div>
                <div class="range-input-group">
                    <label>a</label>
                    <input type="number" class="range-to" value="${toValue}" min="1" max="${totalPages}" onchange="updateDeleteRange(${index}, 'to', this.value)">
                </div>
            </div>
        `;
        
        container.appendChild(rangeItem);
    });
}

function addDeleteRange() {
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    const lastRange = deleteRanges[deleteRanges.length - 1];
    const nextFrom = lastRange ? lastRange.to + 1 : 1;
    
    deleteRanges.push({ from: nextFrom, to: Math.min(nextFrom, totalPages) });
    renderDeleteRanges();
}

function removeDeleteRange(index) {
    if (deleteRanges.length > 1) {
        deleteRanges.splice(index, 1);
        renderDeleteRanges();
    }
}

function updateDeleteRange(index, type, value) {
    if (deleteRanges[index]) {
        const numValue = parseInt(value) || 1;
        if (type === 'from') {
            deleteRanges[index].from = numValue;
            if (deleteRanges[index].to < numValue) {
                deleteRanges[index].to = numValue;
                const rangeItem = document.querySelector(`#deleteRangesContainer [data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-to').value = numValue;
                }
            }
        } else {
            deleteRanges[index].to = numValue;
            if (deleteRanges[index].from > numValue) {
                deleteRanges[index].from = numValue;
                const rangeItem = document.querySelector(`#deleteRangesContainer [data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-from').value = numValue;
                }
            }
        }
    }
}

function moveDeleteRange(index, direction) {
    if (direction === 'up' && index > 0) {
        [deleteRanges[index], deleteRanges[index - 1]] = [deleteRanges[index - 1], deleteRanges[index]];
        renderDeleteRanges();
    } else if (direction === 'down' && index < deleteRanges.length - 1) {
        [deleteRanges[index], deleteRanges[index + 1]] = [deleteRanges[index + 1], deleteRanges[index]];
        renderDeleteRanges();
    }
}

function updateDeleteVisualState() {
    // Actualizar el estado visual de las páginas eliminadas
    pdfPages.forEach((_, index) => {
        const pageItem = document.querySelector(`[data-page-index="${index}"]`);
        if (pageItem) {
            if (deletedPages.has(index)) {
                pageItem.classList.add('deleted');
            } else {
                pageItem.classList.remove('deleted');
            }
        }
    });
}

function updateDeleteStats() {
    const deletedCount = deletedPages.size;
    const totalCount = pdfPages.length;
    const remainingCount = totalCount - deletedCount;
    
    const deletedCountEl = document.getElementById('deletedPagesCount');
    const remainingCountEl = document.getElementById('remainingPagesCount');
    
    if (deletedCountEl) {
        deletedCountEl.textContent = deletedCount;
        deletedCountEl.style.color = deletedCount > 0 ? 'var(--danger-color)' : 'var(--text-secondary)';
    }
    
    if (remainingCountEl) {
        remainingCountEl.textContent = remainingCount;
        remainingCountEl.style.color = remainingCount > 0 ? 'var(--success-color)' : 'var(--danger-color)';
    }
}

// Hacer funciones globales para los onclick
window.removeDeleteRange = removeDeleteRange;
window.updateDeleteRange = updateDeleteRange;
window.moveDeleteRange = moveDeleteRange;

// ========== FUNCIONES PARA EXTRAER PÁGINAS MEJORADO ==========

let extractRanges = []; // Almacena los rangos de extracción

function initializeExtractMode() {
    // Inicializar con modo Visual por defecto
    extractRanges = [];
    renderExtractRanges();
    updateExtractStats();
    
    // Event listeners para cambiar de modo
    document.querySelectorAll('.extract-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchExtractMode(mode);
        });
    });
    
    // Botón para agregar rango
    document.getElementById('addExtractRangeBtn')?.addEventListener('click', () => {
        addExtractRange();
    });
    
    // Botones de acciones visuales
    document.getElementById('clearSelectedBtn')?.addEventListener('click', () => {
        selectedPages.clear();
        updateExtractVisualState();
        updateExtractStats();
    });
    
    document.getElementById('selectAllExtractBtn')?.addEventListener('click', () => {
        pdfPages.forEach((_, index) => {
            if (!deletedPages.has(index)) {
                selectedPages.add(index);
            }
        });
        updateExtractVisualState();
        updateExtractStats();
    });
}

function switchExtractMode(mode) {
    // Actualizar botones de modo
    document.querySelectorAll('.extract-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Mostrar/ocultar contenido según el modo
    document.getElementById('extractContentVisual')?.classList.toggle('hidden', mode !== 'visual');
    document.getElementById('extractContentRanges')?.classList.toggle('hidden', mode !== 'ranges');
    document.getElementById('extractContentPages')?.classList.toggle('hidden', mode !== 'pages');
    
    // Si cambiamos a modo visual, actualizar el estado visual
    if (mode === 'visual') {
        updateExtractVisualState();
        updateExtractStats();
    }
}

function renderExtractRanges() {
    const container = document.getElementById('extractRangesContainer');
    if (!container) return;
    
    // Obtener número total de páginas del primer PDF si está disponible
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    container.innerHTML = '';
    
    if (extractRanges.length === 0) {
        extractRanges = [{ from: 1, to: 1 }];
    }
    
    extractRanges.forEach((range, index) => {
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        rangeItem.dataset.rangeIndex = index;
        
        const fromValue = Math.min(Math.max(1, range.from), totalPages);
        const toValue = Math.min(Math.max(fromValue, range.to), totalPages);
        
        rangeItem.innerHTML = `
            <div class="range-header">
                <div class="range-move-buttons">
                    <button class="range-move-btn" onclick="moveExtractRange(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="range-move-btn" onclick="moveExtractRange(${index}, 'down')" ${index === extractRanges.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <span class="range-title">Rango ${index + 1}</span>
                <button class="range-delete-btn" onclick="removeExtractRange(${index})">✗</button>
            </div>
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>de la página</label>
                    <input type="number" class="range-from" value="${fromValue}" min="1" max="${totalPages}" onchange="updateExtractRange(${index}, 'from', this.value)">
                </div>
                <div class="range-input-group">
                    <label>a</label>
                    <input type="number" class="range-to" value="${toValue}" min="1" max="${totalPages}" onchange="updateExtractRange(${index}, 'to', this.value)">
                </div>
            </div>
        `;
        
        container.appendChild(rangeItem);
    });
}

function addExtractRange() {
    let totalPages = 1;
    if (files.length > 0 && pdfDocs[0]) {
        totalPages = pdfDocs[0].numPages || 1;
    } else if (pdfPages.length > 0) {
        const maxPage = Math.max(...pdfPages.map(p => p.pageNum));
        totalPages = maxPage || 1;
    }
    
    const lastRange = extractRanges[extractRanges.length - 1];
    const nextFrom = lastRange ? lastRange.to + 1 : 1;
    
    extractRanges.push({ from: nextFrom, to: Math.min(nextFrom, totalPages) });
    renderExtractRanges();
}

function removeExtractRange(index) {
    if (extractRanges.length > 1) {
        extractRanges.splice(index, 1);
        renderExtractRanges();
    }
}

function updateExtractRange(index, type, value) {
    if (extractRanges[index]) {
        const numValue = parseInt(value) || 1;
        if (type === 'from') {
            extractRanges[index].from = numValue;
            if (extractRanges[index].to < numValue) {
                extractRanges[index].to = numValue;
                const rangeItem = document.querySelector(`#extractRangesContainer [data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-to').value = numValue;
                }
            }
        } else {
            extractRanges[index].to = numValue;
            if (extractRanges[index].from > numValue) {
                extractRanges[index].from = numValue;
                const rangeItem = document.querySelector(`#extractRangesContainer [data-range-index="${index}"]`);
                if (rangeItem) {
                    rangeItem.querySelector('.range-from').value = numValue;
                }
            }
        }
    }
}

function moveExtractRange(index, direction) {
    if (direction === 'up' && index > 0) {
        [extractRanges[index], extractRanges[index - 1]] = [extractRanges[index - 1], extractRanges[index]];
        renderExtractRanges();
    } else if (direction === 'down' && index < extractRanges.length - 1) {
        [extractRanges[index], extractRanges[index + 1]] = [extractRanges[index + 1], extractRanges[index]];
        renderExtractRanges();
    }
}

function updateExtractVisualState() {
    // Actualizar el estado visual de las páginas seleccionadas
    pdfPages.forEach((_, index) => {
        const pageItem = document.querySelector(`[data-page-index="${index}"]`);
        if (pageItem) {
            if (selectedPages.has(index)) {
                pageItem.classList.add('selected');
            } else {
                pageItem.classList.remove('selected');
            }
        }
    });
}

function updateExtractStats() {
    const selectedCount = selectedPages.size;
    const totalCount = pdfPages.length;
    
    const selectedCountEl = document.getElementById('selectedPagesCount');
    const totalCountEl = document.getElementById('totalPagesCount');
    
    if (selectedCountEl) {
        selectedCountEl.textContent = selectedCount;
        selectedCountEl.style.color = selectedCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)';
    }
    
    if (totalCountEl) {
        totalCountEl.textContent = totalCount;
    }
}

// Hacer funciones globales para los onclick
window.removeExtractRange = removeExtractRange;
window.updateExtractRange = updateExtractRange;
window.moveExtractRange = moveExtractRange;

// ========== FUNCIONES PARA ORGANIZAR PÁGINAS MEJORADO ==========

function initializeOrganizeMode() {
    // Event listeners para cambiar de acción
    document.querySelectorAll('.organize-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            switchOrganizeAction(action);
        });
    });
    
    // Botones de acciones
    document.getElementById('resetOrderBtn')?.addEventListener('click', () => {
        // Restaurar orden original (no hacer nada, el orden ya está en fileOrder)
        updateOrganizeOrderDisplay();
    });
    
    document.getElementById('organizeClearDeletedBtn')?.addEventListener('click', () => {
        deletedPages.clear();
        updateOrganizeDeleteVisualState();
        updateOrganizeDeleteStats();
    });
    
    document.getElementById('rotateAllBtn')?.addEventListener('click', () => {
        const angle = parseInt(document.getElementById('rotateAngle')?.value || '90');
        pdfPages.forEach((_, index) => {
            if (!deletedPages.has(index)) {
                rotatePage(index);
                // Aplicar múltiples veces si es necesario
                const currentRotation = pageRotations[index] || 0;
                const targetRotation = angle;
                const rotationsNeeded = (targetRotation - currentRotation) / 90;
                for (let i = 0; i < rotationsNeeded; i++) {
                    rotatePage(index);
                }
            }
        });
        updatePreviewActions();
    });
    
    document.getElementById('resetRotationsBtn')?.addEventListener('click', () => {
        pageRotations = {};
        pdfPages.forEach((_, index) => {
            const pageItem = document.querySelector(`[data-page-index="${index}"]`);
            if (pageItem) {
                pageItem.classList.remove('rotated');
                const canvas = pageItem.querySelector('canvas');
                if (canvas) canvas.style.transform = 'rotate(0deg)';
                const rotationIndicator = pageItem.querySelector('.page-rotation-indicator');
                if (rotationIndicator) rotationIndicator.textContent = '0°';
            }
        });
        updatePreviewActions();
    });
    
    // Inicializar estadísticas
    updateOrganizeOrderDisplay();
    updateOrganizeDeleteStats();
}

function switchOrganizeAction(action) {
    // Actualizar botones de acción
    document.querySelectorAll('.organize-action-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.action === action);
    });
    
    // Mostrar/ocultar contenido según la acción
    document.getElementById('organizeContentReorder')?.classList.toggle('hidden', action !== 'reorder');
    document.getElementById('organizeContentDelete')?.classList.toggle('hidden', action !== 'delete');
    document.getElementById('organizeContentRotate')?.classList.toggle('hidden', action !== 'rotate');
    
    // Actualizar estadísticas según la acción
    if (action === 'reorder') {
        updateOrganizeOrderDisplay();
    } else if (action === 'delete') {
        updateOrganizeDeleteVisualState();
        updateOrganizeDeleteStats();
    }
}

function updateOrganizeOrderDisplay() {
    const orderDisplay = document.getElementById('currentOrderDisplay');
    if (orderDisplay) {
        const currentOrder = pdfPages
            .map((_, index) => index + 1)
            .filter((_, index) => !deletedPages.has(index))
            .join(', ');
        orderDisplay.textContent = currentOrder || 'Original';
    }
}

function updateOrganizeDeleteVisualState() {
    pdfPages.forEach((_, index) => {
        const pageItem = document.querySelector(`[data-page-index="${index}"]`);
        if (pageItem) {
            if (deletedPages.has(index)) {
                pageItem.classList.add('deleted');
            } else {
                pageItem.classList.remove('deleted');
            }
        }
    });
}

function updateOrganizeDeleteStats() {
    const deletedCount = deletedPages.size;
    const totalCount = pdfPages.length;
    const remainingCount = totalCount - deletedCount;
    
    const deletedCountEl = document.getElementById('organizeDeletedCount');
    const remainingCountEl = document.getElementById('organizeRemainingCount');
    
    if (deletedCountEl) {
        deletedCountEl.textContent = deletedCount;
        deletedCountEl.style.color = deletedCount > 0 ? 'var(--danger-color)' : 'var(--text-secondary)';
    }
    
    if (remainingCountEl) {
        remainingCountEl.textContent = remainingCount;
        remainingCountEl.style.color = remainingCount > 0 ? 'var(--success-color)' : 'var(--danger-color)';
    }
}

