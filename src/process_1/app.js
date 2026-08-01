/**
 * Main Application Orchestrator
 * Binds UI buttons and manages the automated end-to-end pipeline
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Stage 1 Document Selector
    window.Stage1DocumentSelector.init();

    // Mode Toggle Listeners (Presets vs Custom Uploads)
    const modeDefaultBtn = document.getElementById('modeDefaultBtn');
    const modeCustomBtn = document.getElementById('modeCustomBtn');

    if (modeDefaultBtn && modeCustomBtn) {
        modeDefaultBtn.addEventListener('click', () => window.Stage1DocumentSelector.setMode('preset'));
        modeCustomBtn.addEventListener('click', () => window.Stage1DocumentSelector.setMode('custom'));
    }

    // Scenario Dropdown Selection Listener
    const scenarioSelect = document.getElementById('scenarioSelect');
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', (e) => {
            window.Stage1DocumentSelector.loadScenario(e.target.value);
        });
    }

    // Custom Supporting Files Upload Listener
    const customContextFileInput = document.getElementById('customContextFileInput');
    if (customContextFileInput) {
        customContextFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                window.Stage1DocumentSelector.handleCustomContextFilesUpload(e.target.files);
            }
        });
    }

    // Main Invoice Selector File Input Listener
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                window.Stage1DocumentSelector.handleFileSelect(e.target.files[0]);
            }
        });
    }

    // Reupload / Change File Listener
    const reuploadBtn = document.getElementById('reuploadBtn');
    if (reuploadBtn) {
        reuploadBtn.addEventListener('click', () => {
            window.Stage1DocumentSelector.reset();
        });
    }

    // Save Supporting Document Text Changes
    const saveDocChangesBtn = document.getElementById('saveDocChangesBtn');
    if (saveDocChangesBtn) {
        saveDocChangesBtn.addEventListener('click', () => {
            window.Stage1DocumentSelector.saveDocumentChanges();
        });
    }

    // Function to execute automated end-to-end pipeline with stage-specific loaders
    async function executeAutomatedPipeline() {
        if (!window.Stage1DocumentSelector.selectedFile) {
            alert('Please select a main invoice document in Stage 1 first.');
            return;
        }

        const apiKey = localStorage.getItem('openRouterApiKey') || '';
        if (!apiKey) {
            document.getElementById('configModal').classList.remove('hidden');
            alert('Please enter your OpenRouter API Key in settings first.');
            return;
        }

        const runAllBtn = document.getElementById('runAllStagesBtn');
        const runPipelineBtn = document.getElementById('runPipelineBtn');
        const ocrProgress = document.getElementById('ocrProgress');

        if (runAllBtn) {
            runAllBtn.disabled = true;
            runAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running All Stages (OCR & AI Extraction)...';
        }
        if (runPipelineBtn) {
            runPipelineBtn.disabled = true;
            runPipelineBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extracting Invoice Details...';
        }

        if (ocrProgress) {
            ocrProgress.classList.remove('hidden');
        }

        const stage2Section = document.querySelector('.stage-panel:nth-of-type(2)');
        if (stage2Section) {
            stage2Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        try {
            // Step 1: Run Stage 2 OCR Extraction
            await window.Stage2OcrAiExtractor.runOcr();

            // Step 2: Run Stage 2 OpenRouter AI Key Extraction
            await window.Stage2OcrAiExtractor.runAiExtraction(apiKey);

            if (runPipelineBtn) {
                runPipelineBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Stage 2 Extraction Completed';
            }

            // Step 3: Run Stage 3 AI Multi-Way Document Matching
            if (runAllBtn) runAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running All Stages (Stage 3 Document Match)...';

            const stage3Section = document.querySelector('.stage-panel:nth-of-type(3)');
            if (stage3Section) {
                stage3Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            await window.Stage3AiMatcher.runAiMatch(apiKey);

            // Step 4: Run Stage 4 SQL DB Commit (Strict check for 0 pending reviews)
            if (window.Stage4Database.hasPendingReviews()) {
                window.SidePanelLog.log('p1 stage 4', 'Push to SQL DB paused: Pending human auditor review required for unresolved discrepancy fields.');
            } else {
                if (runAllBtn) runAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running All Stages (Stage 4 Committing to SQL DB)...';
                const stage4Section = document.querySelector('.stage-panel:nth-of-type(4)');
                if (stage4Section) {
                    stage4Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                window.Stage4Database.pushToDatabase(true);
            }

        } catch (e) {
            console.error('Pipeline Execution Error:', e);
        } finally {
            if (runAllBtn) {
                runAllBtn.disabled = false;
                runAllBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run All Stages (Automated End-to-End Invoice Match)';
            }
            if (runPipelineBtn) {
                runPipelineBtn.disabled = false;
            }
        }
    }

    // Bind Run All Stages Button below Stage 1
    const runAllStagesBtn = document.getElementById('runAllStagesBtn');
    if (runAllStagesBtn) {
        runAllStagesBtn.addEventListener('click', () => executeAutomatedPipeline());
    }

    // Bind Stage 2 Automated Pipeline Button
    const runPipelineBtn = document.getElementById('runPipelineBtn');
    if (runPipelineBtn) {
        runPipelineBtn.addEventListener('click', () => executeAutomatedPipeline());
    }

    // Bind Stage 3 Manual Run Button
    const runMatchBtn = document.getElementById('runMatchBtn');
    if (runMatchBtn) {
        runMatchBtn.addEventListener('click', () => {
            const apiKey = localStorage.getItem('openRouterApiKey') || '';
            window.Stage3AiMatcher.runAiMatch(apiKey);
        });
    }

    // Bind Stage 4 Push to DB Button
    const pushToDbBtn = document.getElementById('pushToDbBtn');
    if (pushToDbBtn) {
        pushToDbBtn.addEventListener('click', () => {
            window.Stage4Database.pushToDatabase(false);
        });
    }

    // Export CSV Listener
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', () => {
            window.Stage2OcrAiExtractor.downloadCsv();
        });
    }

    // Modal logic is now handled by common/ui/api_key_modal.js
});
