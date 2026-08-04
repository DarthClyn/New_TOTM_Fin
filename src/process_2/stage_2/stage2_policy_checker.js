/**
 * Stage 2: OCR + AI 2-Way Receipt Matcher & Policy Checker
 * Performs OCR extraction on uploaded receipt files, matches receipts against claims by row index,
 * and evaluates policy compliance & total verification.
 */

window.Stage2PolicyChecker = {
    systemPrompt: `You are an AI Finance Policy & Report Auditor.
Your job is to:
1. Cross-reference employee claims against uploaded receipt documents (2-Way Receipt Match).
2. Evaluate claim details and receipt findings against corporate policy.
3. Verify whether Sub Total and Grand Total match the mathematical sum of all claim items.

Required JSON Output Object Format:
{
  "claimsAudit": [
    {
      "rowIndex": 0,
      "refNo": "CLM2313354892",
      "receiptMatchStatus": "MATCH" | "AMOUNT_MISMATCH" | "DATE_MISMATCH" | "NO_RECEIPT",
      "extractedReceiptAmt": "198.45",
      "extractedReceiptNo": "inv1234",
      "extractedReceiptDate": "09-06-2026",
      "decision": "Approved" | "Rejected" | "Unclear",
      "reasoning": "Brief explanation covering 2-way receipt match result and policy rule compliance"
    }
  ],
  "totalsVerification": {
    "subTotalStatus": "VERIFIED" | "DISCREPANCY",
    "grandTotalStatus": "VERIFIED" | "DISCREPANCY",
    "calculatedSum": "691.96",
    "reportedSubTotal": "691.96",
    "notes": "Brief statement verifying whether Sub Total and Grand Total are mathematically clear and correct."
  }
}`,

    async extractTextFromReceipt(fileObj) {
        if (!fileObj || !fileObj.content) return '';

        if (fileObj.type === 'text/plain' || (!fileObj.content.startsWith('data:') && fileObj.content.length < 5000)) {
            return fileObj.content;
        }

        const isPdf = (fileObj.name && fileObj.name.toLowerCase().endsWith('.pdf')) || fileObj.content.startsWith('data:application/pdf');
        const isImg = (fileObj.type && fileObj.type.startsWith('image')) || fileObj.content.startsWith('data:image');

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

        const claimsWithReceipts = [];
        let totalClaimSum = 0;

        for (let idx = 0; idx < claims.length; idx++) {
            const claim = claims[idx];
            let attachedOcrText = '';
            if (claim.attachedReceipt) {
                attachedOcrText = await this.extractTextFromReceipt(claim.attachedReceipt);
            }
            totalClaimSum += parseFloat(claim.claimAmt || 0);

            claimsWithReceipts.push({
                rowIndex: idx,
                refNo: claim.refNo,
                groupCode: claim.groupCode,
                groupName: claim.groupName,
                officerComment: claim.officerComment || claim.templateName || '',
                remarks: claim.remarks || '',
                claimAmt: claim.claimAmt,
                gst: claim.gst || '0.00',
                hodApproval: claim.hodApproval,
                attachedReceiptFileName: claim.attachedReceipt?.name || null,
                attachedReceiptOcrText: attachedOcrText || null
            });
        }

        const reportSummary = {
            calculatedTotalClaimSum: totalClaimSum.toFixed(2),
            reportSubTotalClaim: window.Stage1ClaimsIngestion?.parsedSubTotalClaim || totalClaimSum.toFixed(2),
            reportGrandTotalClaim: window.Stage1ClaimsIngestion?.parsedGrandTotalClaim || totalClaimSum.toFixed(2)
        };

        const userPrompt = `
Corporate Policy:
${policyText}

Ingested Employee Claims Data (with Row-Attached Receipts):
${JSON.stringify(claimsWithReceipts, null, 2)}

Report Totals Summary:
${JSON.stringify(reportSummary, null, 2)}

Task:
1. For each claim row (by rowIndex), analyze its row-attached receipt document OCR text (attachedReceiptOcrText).
2. Extract actual receipt details: extractedReceiptAmt, extractedReceiptNo, extractedReceiptDate from the receipt.
3. Compare claimAmt vs extractedReceiptAmt and claim details vs receipt details.
4. Determine receiptMatchStatus: 'MATCH', 'AMOUNT_MISMATCH', 'DATE_MISMATCH', or 'NO_RECEIPT' (if attachedReceiptOcrText is null/empty).
5. Evaluate policy compliance (Approved/Rejected/Unclear) and give clear audit reasoning. Note: Dental claims capped at SGD300 are Approved if compliant.
6. Verify whether Report Sub Total and Grand Total match the calculated sum of claim line items.
Return ONLY the JSON object format specified in system prompt.
        `;

        const fixedModel = 'nvidia/nemotron-3-super-120b-a12b:free';

        try {
            window.SidePanelLog.log('p2 stage 2', `Evaluating 2-Way Receipt Match, Totals & Policy (${fixedModel})...`);
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

            let parsedData;
            const matchObj = content.match(/\{[\s\S]*\}/);
            const matchArr = content.match(/\[[\s\S]*\]/);

            if (matchObj) {
                parsedData = JSON.parse(matchObj[0]);
            } else if (matchArr) {
                parsedData = { claimsAudit: JSON.parse(matchArr[0]), totalsVerification: null };
            } else {
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleaned);
            }

            const claimsAudit = Array.isArray(parsedData) ? parsedData : (parsedData.claimsAudit || []);
            const totalsVerification = parsedData.totalsVerification || null;

            this.renderResults(claimsAudit, claims, totalsVerification);
            window.SidePanelLog.log('p2 stage 2', `2-Way Match, Totals & Policy Audit completed for ${claimsAudit.length} claims.`);
            return claimsAudit;
        } catch (err) {
            console.error('AI Policy Check Error:', err);
            container.innerHTML = `<div class="empty-state text-danger"><p>AI Policy & Receipt Check Failed: ${err.message}</p></div>`;
            window.SidePanelLog.log('p2 stage 2', 'AI Policy & Receipt Check failed: ' + err.message);
            return null;
        }
    },

    renderResults(results, originalClaims, totalsVerification = null) {
        let totalsCardHtml = '';
        if (totalsVerification) {
            const isVerified = totalsVerification.subTotalStatus === 'VERIFIED' && totalsVerification.grandTotalStatus === 'VERIFIED';
            const badgeClass = isVerified ? 'badge-match' : 'badge-discrepancy';
            const iconClass = isVerified ? 'fa-circle-check text-success' : 'fa-triangle-exclamation text-danger';

            totalsCardHtml = `
                <div style="background: rgba(37, 99, 235, 0.04); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid ${iconClass}" style="font-size: 1.6rem;"></i>
                        <div>
                            <div class="font-bold" style="font-size: 0.95rem;">AI Sub Total & Grand Total Verification</div>
                            <div class="text-muted" style="font-size: 0.85rem; margin-top: 2px;">${totalsVerification.notes || 'Sub Total & Grand Total verified against claim line items.'}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="badge ${badgeClass}" style="font-size: 0.85rem; padding: 6px 12px;">Sub Total: ${totalsVerification.subTotalStatus || 'VERIFIED'}</span>
                        <span class="badge ${badgeClass}" style="font-size: 0.85rem; padding: 6px 12px;">Grand Total: ${totalsVerification.grandTotalStatus || 'VERIFIED'}</span>
                    </div>
                </div>
            `;
        }

        let tableHtml = totalsCardHtml + `
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

        results.forEach((res, i) => {
            const targetIdx = (res.rowIndex !== undefined && res.rowIndex !== null && !isNaN(res.rowIndex)) ? parseInt(res.rowIndex) : i;
            const original = originalClaims[targetIdx] || originalClaims[i] || {};
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
                    <td class="font-bold">${res.refNo || original.refNo}</td>
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
