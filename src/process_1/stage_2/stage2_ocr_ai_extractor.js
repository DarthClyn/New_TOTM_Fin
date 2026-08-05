/**
 * Stage 2: OCR & AI Extractor Module
 * Performs direct text extraction for text-selectable PDFs & text files (bypassing OCR),
 * and uses Tesseract.js OCR for scanned PDFs & image files.
 * Uses fixed model: nvidia/nemotron-3-super-120b-a12b:free
 * Extracts ONLY fields belonging to the Main Invoice Document
 */

window.Stage2OcrAiExtractor = {
    fixedModel: 'nvidia/nemotron-3-super-120b-a12b:free',
    systemPrompt: `You are an expert OCR Invoice Data Parser.
Extract key-value fields ONLY belonging to the MAIN INVOICE DOCUMENT.

CRITICAL INVOICE-ONLY EXTRACTION RULES:
1. ONLY EXTRACT MAIN INVOICE FIELDS: Extract invoice fields (e.g. vendor_name, invoice_number, invoice_date, due_date, total_amount, tax_amount, line_items, currency, reference_po, reference_do, reference_agreement).
2. DO NOT EXTRACT SUPPORTING DOC FIELDS: Do NOT extract fields belonging to contract agreements, delivery orders, or purchase orders. Focus strictly on the invoice itself.
3. DO NOT INCLUDE MISSING FIELDS: If a field is missing, omit it completely from JSON output. Do NOT output null, "N/A", or empty values.
4. SYNONYM MAPPING: Map keys smartly to clean snake_case identifiers.
5. OUTPUT ONLY VALID RAW JSON: Output ONLY a raw valid JSON object starting with '{' and ending with '}' without any markdown, codeblocks, introductory, or conversational text.`,

    extractedOcrText: '',
    extractedData: null,

    async runOcr() {
        const file = window.Stage1DocumentSelector.selectedFile;
        if (!file) {
            alert('Please select a main invoice document in Stage 1 first.');
            return;
        }

        const startOcrBtn = document.getElementById('startOcrBtn');
        const ocrProgress = document.getElementById('ocrProgress');
        const ocrProgressStatus = document.getElementById('ocrProgressStatus');
        const ocrProgressBar = document.getElementById('ocrProgressBar');
        const ocrProgressPercent = document.getElementById('ocrProgressPercent');

        if (startOcrBtn) startOcrBtn.disabled = true;
        if (ocrProgress) ocrProgress.classList.remove('hidden');
        if (ocrProgressStatus) ocrProgressStatus.textContent = 'Initializing document reader...';
        if (ocrProgressBar) ocrProgressBar.style.width = '10%';
        if (ocrProgressPercent) ocrProgressPercent.textContent = '10%';

        window.SidePanelLog.log('p1 stage 2', 'Started document processing...');

        try {
            // 1. Text files (.txt, .csv)
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
                this.extractedOcrText = await file.text();
                if (ocrProgressBar) ocrProgressBar.style.width = '100%';
                if (ocrProgressPercent) ocrProgressPercent.textContent = '100%';
                if (ocrProgressStatus) ocrProgressStatus.textContent = 'Text file loaded directly!';
                setTimeout(() => ocrProgress && ocrProgress.classList.add('hidden'), 1000);
                if (startOcrBtn) startOcrBtn.disabled = false;
                window.SidePanelLog.log('p1 stage 2', 'Text file loaded directly (bypassed OCR).');
                return;
            }

            // 2. PDF Documents: Check if text-selectable first
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                if (ocrProgressStatus) ocrProgressStatus.textContent = 'Checking PDF for selectable text...';
                try {
                    if (window.pdfjsLib) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        const arrayBuffer = await file.arrayBuffer();
                        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        let textContentAll = '';

                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            textContentAll += pageText + '\n';
                        }

                        textContentAll = textContentAll.trim();

                        // If PDF contains selectable text (not a scanned image)
                        if (textContentAll && textContentAll.length > 20) {
                            this.extractedOcrText = textContentAll;
                            if (ocrProgressBar) ocrProgressBar.style.width = '100%';
                            if (ocrProgressPercent) ocrProgressPercent.textContent = '100%';
                            if (ocrProgressStatus) ocrProgressStatus.textContent = 'Text-selectable PDF loaded directly (Skipped OCR)!';
                            setTimeout(() => ocrProgress && ocrProgress.classList.add('hidden'), 1000);
                            if (startOcrBtn) startOcrBtn.disabled = false;
                            window.SidePanelLog.log('p1 stage 2', `Text-selectable PDF detected (${textContentAll.length} chars). Bypassed OCR engine & ready for AI extraction.`);
                            return;
                        }
                    }
                } catch (pdfErr) {
                    console.warn('PDF.js direct text extraction error, falling back to OCR:', pdfErr);
                }
            }

            // 3. Scanned PDF or Image Documents: Fallback to Tesseract OCR
            if (ocrProgressStatus) ocrProgressStatus.textContent = 'Scanned document detected. Running Tesseract OCR...';

            let ocrInput = file;
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (pdfCanvas && pdfCanvas.width > 0) {
                    ocrInput = pdfCanvas;
                }
            }

            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text' || m.status === 'initializing api') {
                        const pct = Math.min(99, Math.max(10, Math.round((m.progress || 0.1) * 100)));
                        if (ocrProgressBar) ocrProgressBar.style.width = `${pct}%`;
                        if (ocrProgressPercent) ocrProgressPercent.textContent = `${pct}%`;
                        if (ocrProgressStatus) ocrProgressStatus.textContent = `Extracting Text via Tesseract OCR (${pct}%)...`;
                    }
                }
            });

            const ret = await worker.recognize(ocrInput);
            await worker.terminate();

            this.extractedOcrText = ret.data.text.trim();
            if (ocrProgressBar) ocrProgressBar.style.width = '100%';
            if (ocrProgressPercent) ocrProgressPercent.textContent = '100%';
            if (ocrProgressStatus) ocrProgressStatus.textContent = 'OCR Completed!';
            setTimeout(() => ocrProgress && ocrProgress.classList.add('hidden'), 1200);

            window.SidePanelLog.log('p1 stage 2', 'Tesseract OCR extraction done.');

        } catch (err) {
            console.error('OCR Error:', err);
            window.SidePanelLog.log('p1 stage 2', 'Document extraction failed: ' + err.message);
            if (ocrProgressStatus) ocrProgressStatus.textContent = 'Extraction Failed';
            alert('Failed to process document: ' + err.message);
        } finally {
            if (startOcrBtn) startOcrBtn.disabled = false;
        }
    },

    async runAiExtraction(apiKey) {
        const mainText = this.extractedOcrText;

        if (!mainText) {
            alert('No main invoice text available. Please select a main invoice in Stage 1 or run OCR.');
            return;
        }

        const activeApiKey = apiKey || localStorage.getItem('openRouterApiKey') || '';

        if (!activeApiKey) {
            document.getElementById('configModal').classList.remove('hidden');
            window.SidePanelLog.log('p1 stage 2', 'AI extraction failed: OpenRouter API Key missing');
            alert('Please enter your OpenRouter API Key in settings first.');
            return;
        }

        const runAiExtractBtn = document.getElementById('runAiExtractBtn');
        if (runAiExtractBtn) {
            runAiExtractBtn.disabled = true;
            runAiExtractBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extracting Key Mapping Details...';
        }

        window.SidePanelLog.log('p1 stage 2', 'AI extraction started');

        const userPrompt = `Extract ALL valid fields belonging ONLY to the main invoice text below:\n\n=== MAIN INVOICE TEXT ===\n${mainText}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeApiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'TOTM Finance Automation',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.fixedModel,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status} Error`;
                try {
                    const errJson = await response.json();
                    errorMsg = errJson.error?.message || errorMsg;
                } catch (e) { }

                if (response.status === 401 || response.status === 403) {
                    document.getElementById('configModal').classList.remove('hidden');
                    window.SidePanelLog.log('p1 stage 2', 'AI extraction failed: API key invalid or expired (HTTP ' + response.status + ')');
                    throw new Error('OpenRouter API Key is invalid or expired. Please update key in settings.');
                } else if (response.status === 429) {
                    window.SidePanelLog.log('p1 stage 2', 'AI extraction failed: OpenRouter API rate limit exceeded');
                    throw new Error('API Rate Limit or Quota Exceeded. Please try again in a moment.');
                } else {
                    window.SidePanelLog.log('p1 stage 2', 'AI extraction failed: ' + errorMsg);
                    throw new Error(errorMsg);
                }
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            this.renderResults(content);
            window.SidePanelLog.log('p1 stage 2', 'AI extraction done');

        } catch (err) {
            console.error('OpenRouter AI Error:', err);
            alert('OpenRouter AI Extraction Failed: ' + err.message);
            throw err;
        } finally {
            if (runAiExtractBtn) {
                runAiExtractBtn.disabled = false;
                runAiExtractBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Key Mapping Details';
            }
        }
    },

    renderResults(rawContent) {
        let cleanJson = rawContent;
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        } else if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/```json/gi, '').replace(/```/g, '').trim();
        }

        try {
            const parsed = JSON.parse(cleanJson);
            this.extractedData = {};

            const grid = document.getElementById('keyValueGrid');
            if (grid) grid.innerHTML = '';

            Object.keys(parsed).forEach(key => {
                const val = parsed[key];

                if (
                    val === null ||
                    val === undefined ||
                    val === 'N/A' ||
                    val === 'n/a' ||
                    val === 'null' ||
                    val === '' ||
                    (Array.isArray(val) && val.length === 0)
                ) {
                    return;
                }

                this.extractedData[key] = val;

                const displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 1) : String(val);

                const card = document.createElement('div');
                card.className = 'kv-card';
                card.innerHTML = `
                    <div class="kv-key">${key.replace(/_/g, ' ')}</div>
                    <div class="kv-value">${displayVal}</div>
                `;
                if (grid) grid.appendChild(card);
            });

            const emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.classList.add('hidden');
            if (grid) grid.classList.remove('hidden');

            const downloadCsvBtn = document.getElementById('downloadCsvBtn');
            if (downloadCsvBtn) downloadCsvBtn.disabled = false;

        } catch (e) {
            console.error('JSON Parse Error:', e);
            window.SidePanelLog.log('p1 stage 2', 'AI extraction failed: JSON format parse error');
            alert('Received AI response, but formatting was non-standard.');
        }
    },

    downloadCsv() {
        if (!this.extractedData) return;

        let csvContent = 'Key,Value\n';
        Object.keys(this.extractedData).forEach(k => {
            const val = typeof this.extractedData[k] === 'object' ? JSON.stringify(this.extractedData[k]) : String(this.extractedData[k]);
            csvContent += `"${k}","${val.replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice_key_mappings.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
