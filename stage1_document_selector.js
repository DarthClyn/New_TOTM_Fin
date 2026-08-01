/**
 * Stage 1: Document Selector Module
 * Dynamically loads default stage 1 input files from directory:
 * default_input_files_stage1/
 */

window.Stage1DocumentSelector = {
    activeMode: 'preset',
    currentScenario: 'set2',
    selectedFile: null,
    documentCategory: null,
    scenarioDocs: {},
    customFiles: [],

    scenarioConfig: {
        set1: {
            name: "Set 1: 4-Way Match (TLPL SAP)",
            files: [
                { id: "agr", name: "AGR.txt", path: "default_input_files_stage1/set1/AGR.txt" },
                { id: "do", name: "DO.txt", path: "default_input_files_stage1/set1/DO.txt" },
                { id: "po", name: "PO.txt", path: "default_input_files_stage1/set1/PO.txt" }
            ]
        },
        set2: {
            name: "Set 2: 3-Way Match (TTS SQL)",
            files: [
                { id: "do", name: "DO.txt", path: "default_input_files_stage1/set2/DO.txt" },
                { id: "po", name: "PO.txt", path: "default_input_files_stage1/set2/PO.txt" }
            ]
        },
        set3: {
            name: "Set 3: 2-Way Match (Services)",
            files: [
                { id: "agr", name: "AGR.txt", path: "default_input_files_stage1/set3/AGR.txt" }
            ]
        }
    },

    init() {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        this.loadScenario(this.currentScenario);
    },

    setMode(mode) {
        this.activeMode = mode;
        const defaultContainer = document.getElementById('defaultScenarioSelectContainer');
        const customContainer = document.getElementById('customUploadContainer');
        const modeDefaultBtn = document.getElementById('modeDefaultBtn');
        const modeCustomBtn = document.getElementById('modeCustomBtn');

        if (mode === 'preset') {
            modeDefaultBtn.classList.add('active');
            modeCustomBtn.classList.remove('active');
            defaultContainer.classList.remove('hidden');
            customContainer.classList.add('hidden');
            this.loadScenario(this.currentScenario);
        } else {
            modeDefaultBtn.classList.remove('active');
            modeCustomBtn.classList.add('active');
            defaultContainer.classList.add('hidden');
            customContainer.classList.remove('hidden');
            this.renderCustomFiles();
            window.SidePanelLog.log('p1 stage 1', 'Switched to Custom Supporting Document Upload mode');
        }
    },

    async loadScenario(scenarioId) {
        this.currentScenario = scenarioId;
        const config = this.scenarioConfig[scenarioId];
        if (!config) return;

        window.SidePanelLog.log('p1 stage 1', `Scenario set in process: ${config.name}`);

        const grid = document.getElementById('scenarioDocsGrid');
        grid.innerHTML = '<div class="loading-docs"><i class="fa-solid fa-spinner fa-spin"></i> Loading supporting documents...</div>';

        this.scenarioDocs = {};

        try {
            const loadedFiles = await Promise.all(config.files.map(async (fileConfig) => {
                let textContent = '';
                try {
                    const res = await fetch(fileConfig.path);
                    if (res.ok) {
                        textContent = await res.text();
                    } else {
                        textContent = `[Failed to load ${fileConfig.path}]`;
                    }
                } catch (e) {
                    console.error('Fetch error:', e);
                    textContent = `[File load error for ${fileConfig.name}]`;
                }

                return {
                    id: fileConfig.id,
                    name: fileConfig.name,
                    content: textContent
                };
            }));

            grid.innerHTML = '';

            loadedFiles.forEach(file => {
                this.scenarioDocs[file.id] = file.content;
                this.renderCard(file.id, file.name, file.content);
            });

        } catch (err) {
            console.error('Scenario load error:', err);
            grid.innerHTML = '<div class="error-docs">Error loading scenario text files.</div>';
        }
    },

    async handleCustomContextFilesUpload(filesList) {
        const filesArray = Array.from(filesList);
        for (const file of filesArray) {
            const text = await file.text();
            const fileId = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            this.customFiles.push({
                id: fileId,
                name: file.name,
                content: text
            });
            window.SidePanelLog.log('p1 stage 1', `Custom supporting document added: ${file.name}`);
        }
        this.renderCustomFiles();
    },

    renderCustomFiles() {
        const grid = document.getElementById('scenarioDocsGrid');
        grid.innerHTML = '';
        this.scenarioDocs = {};

        if (this.customFiles.length === 0) {
            grid.innerHTML = `
                <div class="empty-custom-docs">
                    <i class="fa-solid fa-file-circle-plus"></i>
                    <p>No custom context files uploaded yet.</p>
                    <span>Click "Add Supporting Docs" above to upload .txt or .csv documents.</span>
                </div>`;
            return;
        }

        this.customFiles.forEach(file => {
            this.scenarioDocs[file.id] = file.content;
            this.renderCard(file.id, file.name, file.content, true);
        });
    },

    renderCard(id, name, content, isCustom = false) {
        const grid = document.getElementById('scenarioDocsGrid');
        const card = document.createElement('div');
        card.className = 'doc-card-editable';
        card.innerHTML = `
            <div class="doc-card-header">
                <div class="doc-card-title">
                    <i class="fa-regular fa-file-code"></i> ${name}
                </div>
                <div class="doc-header-right">
                    <span class="doc-type-badge">Text (.txt)</span>
                    ${isCustom ? `<button class="btn-icon btn-remove-doc" onclick="window.Stage1DocumentSelector.removeCustomFile('${id}')" title="Remove file">&times;</button>` : ''}
                </div>
            </div>
            <textarea id="doc_text_${id}" class="doc-card-editor" rows="10">${content}</textarea>
        `;
        grid.appendChild(card);

        const editor = card.querySelector(`#doc_text_${id}`);
        editor.addEventListener('input', (e) => {
            this.scenarioDocs[id] = e.target.value;
        });
    },

    removeCustomFile(id) {
        this.customFiles = this.customFiles.filter(f => f.id !== id);
        this.renderCustomFiles();
    },

    saveDocumentChanges() {
        Object.keys(this.scenarioDocs).forEach(id => {
            const editor = document.getElementById(`doc_text_${id}`);
            if (editor) {
                this.scenarioDocs[id] = editor.value;
            }
        });
        window.SidePanelLog.log('p1 stage 1', 'Changes saved in supporting documents');
        alert('Document changes saved successfully!');
    },

    getCombinedContextText() {
        return Object.values(this.scenarioDocs).join('\n\n');
    },

    async handleFileSelect(file) {
        this.selectedFile = file;

        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const fileStatusBadge = document.getElementById('fileStatusBadge');
        const fileTypeBadge = document.getElementById('fileTypeBadge');
        const dropzone = document.getElementById('dropzone');
        const previewContainer = document.getElementById('previewContainer');

        fileNameDisplay.textContent = file.name;
        fileStatusBadge.textContent = 'Main File Loaded';
        fileStatusBadge.style.color = '#2563eb';

        dropzone.classList.add('hidden');
        previewContainer.classList.remove('hidden');

        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('pdfCanvas').classList.add('hidden');
        document.getElementById('textPreview').classList.add('hidden');

        window.SidePanelLog.log('p1 stage 1', `Main invoice uploaded: ${file.name}`);

        if (file.type.startsWith('image/')) {
            this.documentCategory = 'image';
            fileTypeBadge.textContent = 'IMAGE';
            this.renderImagePreview(file);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            this.documentCategory = 'pdf';
            fileTypeBadge.textContent = 'PDF';
            await this.renderPdfPreview(file);
        } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            this.documentCategory = 'text';
            fileTypeBadge.textContent = 'TEXT FILE';
            await this.renderTextFilePreview(file);
        }
    },

    renderImagePreview(file) {
        const img = document.getElementById('imagePreview');
        img.classList.remove('hidden');
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async renderPdfPreview(file) {
        const canvas = document.getElementById('pdfCanvas');
        canvas.classList.remove('hidden');

        try {
            const fileArrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 1.2 });
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
        } catch (e) {
            console.error('PDF Render Error:', e);
        }
    },

    async renderTextFilePreview(file) {
        const textPreview = document.getElementById('textPreview');
        textPreview.classList.remove('hidden');
        const text = await file.text();
        textPreview.textContent = text;
    },

    reset() {
        this.selectedFile = null;
        this.documentCategory = null;

        document.getElementById('fileInput').value = '';
        document.getElementById('previewContainer').classList.add('hidden');
        document.getElementById('dropzone').classList.remove('hidden');
        document.getElementById('fileStatusBadge').textContent = 'Ready';
        document.getElementById('fileStatusBadge').style.color = '';
    }
};
