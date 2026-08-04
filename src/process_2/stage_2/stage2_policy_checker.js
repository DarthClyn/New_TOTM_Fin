/**
 * Stage 2: OCR + AI 2-Way Receipt Matcher & Policy Checker
 * Performs OCR extraction on uploaded receipt files, matches receipts against claims (2-Way Match),
 * and evaluates policy compliance.
 */

window.Stage2PolicyChecker = {
    systemPrompt: `You are an AI Finance Policy & Receipt Auditor.
Your job is to:
1. Cross-reference employee claims against uploaded receipt documents (2-Way Receipt Match).
2. Evaluate claim details and receipt findings against corporate policy.

Required JSON Output Array Format:
[
  {
    "refNo": "CLAIM_REF_NO",
    "receiptMatchStatus": "MATCH" | "AMOUNT_MISMATCH" | "DATE_MISMATCH" | "NO_RECEIPT",
    "extractedReceiptAmt": "80.00",
    "extractedReceiptNo": "inv1234",
    "extractedReceiptDate": "03-07-2024",
    "decision": "Approved" | "Rejected" | "Unclear",
    "reasoning": "Brief explanation covering 2-way receipt match result and policy rule compliance"
  }
]`,

    async extractTextFromReceipt(fileObj) {
        if (!fileObj || !fileObj.content) return '';

        // If plain text content
        if (fileObj.type === 'text/plain' || (!fileObj.content.startsWith('data:') && fileObj.content.length < 5000)) {
            return fileObj.content;
        }

        const isPdf = (fileObj.name && fileObj.name.toLowerCase().endsWith('.pdf')) || fileObj.content.startsWith('data:application/pdf');
        const isImg = (fileObj.type && fileObj.type.startsWith('image')) || fileObj.content.startsWith('data:image');

        // 1. PDF Text & OCR Extraction using PDF.js
        if (isPdf && window.pdfjsLib) {
            try {
                window.SidePanelLog.log('p2 stage 2', `Extracting text from PDF: ${fileObj.name}...`);
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const loadingTask = window.pdfjsLib.getDocument(fileObj.content);
                const pdf = await loadingTask.promise;
                let extractedText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    extractedText += pageText + '\n';
                }

                extractedText = extractedText.trim();
                if (extractedText && extractedText.length > 15) {
                    window.SidePanelLog.log('p2 stage 2', `PDF text extracted (${extractedText.length} chars) for ${fileObj.name}`);
                    return extractedText;
                }

                // If PDF text is empty/scanned, render page 1 canvas for Tesseract OCR
                if (window.Tesseract && pdf.numPages > 0) {
                    window.SidePanelLog.log('p2 stage 2', `Scanned PDF detected. Rendering page to canvas for Tesseract OCR: ${fileObj.name}...`);
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const canvasDataUrl = canvas.toDataURL('image/png');

                    const worker = await window.Tesseract.createWorker('eng');
                    const ret = await worker.recognize(canvasDataUrl);
                    await worker.terminate();
                    const ocrText = ret.data.text.trim();
                    if (ocrText && ocrText.length > 5) return ocrText;
                }
            } catch (e) {
                console.warn('PDF extraction error:', e);
            }
        }

        // 2. Image OCR Extraction using Tesseract.js
        if (isImg && window.Tesseract) {
            try {
                window.SidePanelLog.log('p2 stage 2', `Running Tesseract OCR on image: ${fileObj.name}...`);
                const worker = await window.Tesseract.createWorker('eng');
                const ret = await worker.recognize(fileObj.content);
                await worker.terminate();
                const ocrResult = ret.data.text.trim();
                if (ocrResult && ocrResult.length > 5) return ocrResult;
            } catch (e) {
                console.warn('Tesseract OCR image error:', e);
            }
        }

        // Fallback: If no OCR or text extracted, pass file metadata summary so LLM can identify filename & details
        return `Receipt Document: ${fileObj.name}`;
    },

    async run(claims, policyText, receiptFiles = null) {
        const container = document.getElementById('stage2Content');
        container.innerHTML = '<div class="empty-state"><p><i class="fa-solid fa-spinner fa-spin"></i> Running OCR & 2-Way Receipt Matching...</p></div>';

        const activeApiKey = localStorage.getItem('openRouterApiKey');
        if (!activeApiKey) {
            container.innerHTML = '<div class="empty-state text-danger"><p>Missing API Key. Please click API Key Settings in the header.</p></div>';
            return null;
        }

        window.SidePanelLog.log('p2 stage 2', `Processing row-attached receipts for ${claims.length} claim(s)...`);

        // Extract OCR text from row-specific attached receipts
        const claimsWithReceipts = [];
        for (const claim of claims) {
            let attachedOcrText = '';
            if (claim.attachedReceipt) {
                attachedOcrText = await this.extractTextFromReceipt(claim.attachedReceipt);
            }
            claimsWithReceipts.push({
                refNo: claim.refNo,
                groupCode: claim.groupCode,
                groupName: claim.groupName,
                templateName: claim.templateName,
                receiptNo: claim.receiptNo,
                receiptDate: claim.receiptDate,
                claimAmt: claim.claimAmt,
                hodApproval: claim.hodApproval,
                attachedReceiptFileName: claim.attachedReceipt?.name || null,
                attachedReceiptOcrText: attachedOcrText || null
            });
        }

        const userPrompt = `
Corporate Policy:
${policyText}

Ingested Employee Claims Data (with Row-Attached Receipts):
${JSON.stringify(claimsWithReceipts, null, 2)}

Task:
1. For each claim row, analyze its row-attached receipt document OCR text (attachedReceiptOcrText).
2. Extract actual receipt details: extractedReceiptAmt, extractedReceiptNo, extractedReceiptDate from the receipt.
3. Compare claimAmt vs extractedReceiptAmt and claim details vs receipt details.
4. Determine receiptMatchStatus: 'MATCH', 'AMOUNT_MISMATCH', 'DATE_MISMATCH', or 'NO_RECEIPT' (if attachedReceiptOcrText is null/empty).
5. Evaluate policy compliance (Approved/Rejected/Unclear) and give clear audit reasoning.
Return ONLY the JSON array.
        `;

        const fixedModel = 'nvidia/nemotron-3-super-120b-a12b:free';

        try {
            window.SidePanelLog.log('p2 stage 2', `Evaluating 2-Way Receipt Match & Policy (${fixedModel})...`);
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeApiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'TOTM Finance Automation',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: fixedModel,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                let errMsg = `HTTP ${response.status}`;
                try {
                    const errJson = await response.json();
                    errMsg = errJson.error?.message || errJson.message || errMsg;
                } catch (e) { }
                throw new Error(errMsg);
            }

            const data = await response.json();
            const content = data.choices[0].message.content || '';

            // Extract JSON array robustly
            const match = content.match(/\[[\s\S]*\]/);
            const jsonStr = match ? match[0] : content.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(jsonStr);

            this.renderResults(results, claims);
            window.SidePanelLog.log('p2 stage 2', `2-Way Match & Policy Audit completed for ${results.length} claims.`);
            return results;
        } catch (err) {
            console.error('AI Policy Check Error:', err);
            container.innerHTML = `<div class="empty-state text-danger"><p>AI Policy & Receipt Check Failed: ${err.message}</p></div>`;
            window.SidePanelLog.log('p2 stage 2', 'AI Policy & Receipt Check failed: ' + err.message);
            return null;
        }
    },

    renderResults(results, originalClaims) {
        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Ref No</th>
                        <th>Group Name</th>
                        <th>Claim Amt</th>
                        <th>Extracted Receipt Amt</th>
                        <th>2-Way Receipt Match</th>
                        <th>HOD Approval</th>
                        <th>AI Policy Decision</th>
                        <th>Audit Reasoning</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(res => {
            const original = originalClaims.find(c => c.refNo === res.refNo) || {};
            const matchStatus = res.receiptMatchStatus || 'NO_RECEIPT';

            let matchBadgeClass = 'badge-match';
            let matchText = matchStatus;

            if (matchStatus === 'AMOUNT_MISMATCH') {
                matchBadgeClass = 'badge-discrepancy';
                matchText = 'Amount Mismatch';
            } else if (matchStatus === 'DATE_MISMATCH') {
                matchBadgeClass = 'badge-partial';
                matchText = 'Date Mismatch';
            } else if (matchStatus === 'NO_RECEIPT') {
                matchBadgeClass = 'badge-discrepancy';
                matchText = 'No Receipt';
            } else if (matchStatus === 'MATCH') {
                matchBadgeClass = 'badge-match';
                matchText = '2-Way Match OK';
            }

            let policyBadgeClass = 'badge-match';
            if (res.decision === 'Rejected') policyBadgeClass = 'badge-discrepancy';
            else if (res.decision === 'Unclear') policyBadgeClass = 'badge-partial';

            tableHtml += `
                <tr>
                    <td class="font-bold">${res.refNo}</td>
                    <td>${original.groupName || 'N/A'}</td>
                    <td class="font-mono">${original.claimAmt ? '$' + original.claimAmt : 'N/A'}</td>
                    <td class="font-mono">${res.extractedReceiptAmt ? '$' + res.extractedReceiptAmt : 'N/A'}</td>
                    <td><span class="badge ${matchBadgeClass}">${matchText}</span></td>
                    <td>${original.hodApproval || 'N/A'}</td>
                    <td><span class="badge ${policyBadgeClass}">${res.decision}</span></td>
                    <td class="text-muted" style="font-size: 0.85em; max-width: 280px;">${res.reasoning}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('stage2Content').innerHTML = tableHtml;
    }
};
