/**
 * Stage 3: AI-Based Document Matcher Module
 * Includes:
 * - OCR Character Confusion Normalization (0 vs O, 1 vs I/l)
 * - AI Re-Checker Step before flagging discrepancies
 * - Stage 3 specific loader UI box inside Stage 3 panel
 * - Human Review Modal Drawer & Inline Quick Action Shortcuts
 * - Hides Approve/Reject/Review buttons once approved
 * - Auto-triggers DB Commit in Stage 4 once all pending reviews are resolved
 */

window.Stage3AiMatcher = {
    fixedModel: 'nvidia/nemotron-3-super-120b-a12b:free',

    systemPrompt: `You are an expert Enterprise Audit & Invoice Matching AI acting for TOTM (TOTM Labs / TOTM Technologies / TOTM Group).
All incoming invoices are billed TO TOTM from external vendors (never FROM TOTM).

Perform a 2-Way / 3-Way / 4-Way match between extracted Invoice Key-Values and Supporting Documents (Purchase Order, Delivery Order, Contract Agreement, Quotation).

GENERAL BUSINESS AUDIT & MATCHING PRINCIPLES:
1. PRIOR DOCUMENT METADATA LOGIC: Prior supporting documents (Contracts, POs, DOs, Quotations) are executed BEFORE an invoice is generated. They naturally will NOT contain 'invoice_number', 'invoice_date', or 'due_date'. NEVER flag 'invoice_number', 'invoice_date', or 'due_date' as DISCREPANCIES simply because they are absent from prior supporting documents. Mark them as MATCHED or NOT_APPLICABLE.
2. SERVICE & LUMP-SUM CONTRACT LOGIC: Service agreements, monthly maintenance contracts, or lump-sum scope agreements state overall service charges or total amounts rather than per-unit itemized prices ('unit_price'). If the invoice total_amount matches the contract agreement or quotation, do NOT flag missing 'unit_price' or description text variations as DISCREPANCIES.
3. ENTITY DIRECTION: TOTM is ALWAYS the buyer/client (Bill To). External vendors are the suppliers (Issued By).
4. FOCUS DISCREPANCIES ON GENUINE CONFLICTS: Only flag a field as "DISCREPANCY" if there is an ACTUAL BUSINESS CONFLICT (e.g., invoice total exceeds PO/contract price, vendor name is a completely different company, line item amount is mathematically wrong).
5. OCR AMBIGUITY NORMALIZATION: Common OCR character confusions (0 vs O, 1 vs I/l, SGD vs S$ vs saD) MUST NOT be flagged as discrepancies. Automatically normalize them and mark status as "MATCHED" with note "OCR Auto-Corrected".
6. DECIMAL ACCURACY: Compare prices, subtotals, tax, and totals up to exact decimal precision.
7. DO NOT OUTPUT ABSENT FIELDS: Only evaluate fields present in extracted invoice data or supporting documents.
8. IF a field is not presnet in availble data, not verifed but still dont mark descrepancy 
Output ONLY valid JSON:
{
  "overall_status": "MATCHED" | "DISCREPANCY_FOUND",
  "match_summary": "Summary of audit results focusing on genuine business discrepancies",
  "match_results": [
    {
      "field_name": "Invoice Field Name",
      "invoice_value": "Extracted Invoice Value",
      "supporting_doc_source": "AGR.txt / PO.txt / DO.txt",
      "supporting_doc_value": "Matched Value from Supporting Doc",
      "status": "MATCHED" | "DISCREPANCY" | "PARTIAL_MATCH",
      "verification_notes": "Detailed notes explaining verification"
    }
  ]
}`,

    recheckerSystemPrompt: `You are an AI Re-Checker Inspector acting for TOTM.
Your job is to audit suspected discrepancies flagged during OCR invoice matching.
1. PRIOR DOC & SERVICE CONTRACT RE-CHECK: If a discrepancy was flagged for fields that prior documents naturally do not contain (e.g. invoice_number, invoice_date, due_date, or unit_price for lump-sum service contracts), or if it is an OCR character confusion (0 vs O, 1 vs I, SGD vs S$), CORRECT status to MATCHED.
2. Keep status as DISCREPANCY ONLY if there is a genuine monetary or quantitative mismatch (e.g. invoice total exceeds contract price, different vendor company, wrong quantity).
Output valid JSON:
{
  "verified_status": "MATCHED" | "DISCREPANCY",
  "recheck_notes": "Re-checker explanation"
}`,

    matchData: null,

    async runAiMatch(apiKey) {
        const stage2Data = window.Stage2OcrAiExtractor.extractedData;
        const supportingDocsText = window.Stage1DocumentSelector.getCombinedContextText();

        if (!stage2Data || Object.keys(stage2Data).length === 0) {
            alert('Please run Stage 2 OCR & AI Extraction first.');
            return;
        }

        const activeApiKey = apiKey || localStorage.getItem('openRouterApiKey') || '';
        if (!activeApiKey) {
            document.getElementById('configModal').classList.remove('hidden');
            window.SidePanelLog.log('p1 stage 3', 'doc matching failed: OpenRouter API key missing');
            alert('Please enter your OpenRouter API Key in settings first.');
            return;
        }

        window.SidePanelLog.log('p1 stage 3', 'doc matching with ai started');

        const runMatchBtn = document.getElementById('runMatchBtn');
        const stage3Loader = document.getElementById('stage3Loader');

        if (runMatchBtn) runMatchBtn.disabled = true;
        if (stage3Loader) stage3Loader.classList.remove('hidden');

        const payloadText = `=== EXTRACTED INVOICE FIELDS ===\n${JSON.stringify(stage2Data, null, 2)}\n\n=== SUPPORTING DOCUMENTS ===\n${supportingDocsText}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeApiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'TOTM Finance Automation Stage 3',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.fixedModel,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        { role: 'user', content: payloadText }
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
                    window.SidePanelLog.log('p1 stage 3', 'doc matching failed: API key expired or invalid (HTTP ' + response.status + ')');
                    throw new Error('OpenRouter API Key is invalid or expired. Please update key in settings.');
                } else {
                    window.SidePanelLog.log('p1 stage 3', 'doc matching failed: ' + errorMsg);
                    throw new Error(errorMsg);
                }
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            await this.processRecheckerStep(content, activeApiKey);

        } catch (err) {
            console.error('Stage 3 AI Match Error:', err);
            alert('AI Match Request Failed: ' + err.message);
            throw err; // Stop the pipeline from continuing to Stage 4
        } finally {
            if (runMatchBtn) runMatchBtn.disabled = false;
            if (stage3Loader) stage3Loader.classList.add('hidden');
        }
    },

    async processRecheckerStep(rawContent, apiKey) {
        let cleanJson = rawContent;
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        try {
            const parsed = JSON.parse(cleanJson);
            const results = parsed.match_results || [];
            const discrepancies = results.filter(r => r.status === 'DISCREPANCY');

            if (discrepancies.length > 0) {
                window.SidePanelLog.log('p1 stage 3', `AI re-checker inspecting ${discrepancies.length} discrepancy fields...`);

                const stage3LoaderStatus = document.getElementById('stage3LoaderStatus');
                if (stage3LoaderStatus) stage3LoaderStatus.textContent = 'AI Re-Checker inspecting suspected discrepancies...';

                for (let row of discrepancies) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

                        const recheckRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            signal: controller.signal,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'HTTP-Referer': window.location.href,
                                'X-Title': 'TOTM Finance Automation Re-Checker',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: this.fixedModel,
                                messages: [
                                    { role: 'system', content: this.recheckerSystemPrompt },
                                    { role: 'user', content: `Inspect field '${row.field_name}': Invoice Value='${row.invoice_value}' vs Supporting Doc Value='${row.supporting_doc_value}'. Notes: ${row.verification_notes}` }
                                ],
                                temperature: 0.0
                            })
                        });
                        clearTimeout(timeoutId);

                        if (recheckRes.ok) {
                            const recheckData = await recheckRes.json();
                            const rcText = recheckData.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
                            const rcParsed = JSON.parse(rcText);

                            if (rcParsed.verified_status === 'MATCHED') {
                                row.status = 'MATCHED';
                                row.verification_notes += ` | [AI Re-Checker Auto-Corrected: ${rcParsed.recheck_notes}]`;
                                window.SidePanelLog.log('p1 stage 3', `AI re-checker cleared discrepancy for '${row.field_name}'`);
                            }
                        }

                        // Add a small 1s delay to prevent hitting free-tier rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));

                    } catch (e) {
                        console.warn('Re-checker sub-step skipped or timed out:', e);
                        window.SidePanelLog.log('p1 stage 3', `Re-checker skipped for '${row.field_name}' due to timeout/error`);
                    }
                }
            }

            this.renderMatchTable(JSON.stringify(parsed));
        } catch (e) {
            console.error('Rechecker parse error:', e);
            this.renderMatchTable(rawContent);
        }
    },

    renderMatchTable(rawContent) {
        let cleanJson = rawContent;
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        try {
            const parsed = JSON.parse(cleanJson);
            this.matchData = parsed;

            const summaryBox = document.getElementById('matchSummaryBox');
            const tableContainer = document.getElementById('matchTableContainer');

            const rawResults = parsed.match_results || [];
            const filteredResults = rawResults.filter(row => {
                const status = (row.status || '').toUpperCase();
                const invVal = row.invoice_value;
                return (
                    status !== 'NOT_AVAILABLE' &&
                    status !== 'N/A' &&
                    invVal !== null &&
                    invVal !== undefined &&
                    invVal !== 'null' &&
                    invVal !== 'N/A'
                );
            });

            const discrepanciesCount = filteredResults.filter(r => r.status === 'DISCREPANCY').length;
            const isPassed = discrepanciesCount === 0;

            summaryBox.className = `match-summary-banner ${isPassed ? 'status-pass' : 'status-fail'}`;
            summaryBox.innerHTML = `
                <div class="summary-status-icon">
                    <i class="fa-solid ${isPassed ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
                </div>
                <div class="summary-details">
                    <h4>${isPassed ? 'MATCH VERIFIED SUCCESSFUL' : 'MATCH DISCREPANCY DETECTED'}</h4>
                    <p>${parsed.match_summary || 'Multi-way invoice document match completed.'}</p>
                </div>
            `;
            summaryBox.classList.remove('hidden');

            if (filteredResults.length === 0) {
                tableContainer.innerHTML = '<div class="empty-state"><p>No relevant matching fields found.</p></div>';
            } else {
                let tableHtml = `
                    <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff;">
                        <table class="match-data-table" style="width: 100%; min-width: 1250px; table-layout: auto;">
                            <thead>
                                <tr>
                                    <th style="width: 14%;">Invoice Field</th>
                                    <th style="width: 18%;">Invoice Extracted Value</th>
                                    <th style="width: 10%;">Supporting Doc Source</th>
                                    <th style="width: 20%;">Supporting Doc Value</th>
                                    <th style="width: 10%;">Match Status</th>
                                    <th style="width: 18%;">Verification Notes</th>
                                    <th style="width: 10%; text-align: center;">Human Review Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredResults.map((row, idx) => {
                        let badgeClass = 'badge-match';
                        if (row.status === 'DISCREPANCY' || row.status === 'REJECTED') badgeClass = 'badge-discrepancy';
                        else if (row.status === 'PARTIAL_MATCH') badgeClass = 'badge-partial';

                        return `
                                        <tr>
                                            <td class="font-bold">${row.field_name || '-'}</td>
                                            <td id="inv_val_${idx}">${typeof row.invoice_value === 'object' ? JSON.stringify(row.invoice_value) : (row.invoice_value ?? '-')}</td>
                                            <td><span class="doc-tag">${row.supporting_doc_source || 'N/A'}</span></td>
                                            <td>${typeof row.supporting_doc_value === 'object' ? JSON.stringify(row.supporting_doc_value) : (row.supporting_doc_value ?? '-')}</td>
                                            <td><span class="badge ${badgeClass}" id="status_badge_${idx}">${row.status || 'MATCHED'}</span></td>
                                            <td class="text-sm-notes">${row.verification_notes || '-'}</td>
                                            <td id="action_cell_${idx}">
                                                <div class="action-shortcut-group" style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                                                    <button class="btn btn-xs btn-success" onclick="window.Stage3AiMatcher.quickApproveRow(${idx})" title="Quick Approve">
                                                        <i class="fa-solid fa-check"></i>
                                                    </button>
                                                    <button class="btn btn-xs btn-danger" onclick="window.Stage3AiMatcher.quickRejectRow(${idx})" title="Quick Reject">
                                                        <i class="fa-solid fa-xmark"></i>
                                                    </button>
                                                    <button class="btn btn-xs btn-outline" onclick="window.Stage3AiMatcher.openHumanReviewModal(${idx})" title="Detailed Review Drawer">
                                                        <i class="fa-solid fa-eye"></i> View Review
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                    }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                tableContainer.innerHTML = tableHtml;
            }

            document.getElementById('emptyStage3State').classList.add('hidden');
            tableContainer.classList.remove('hidden');

            window.SidePanelLog.log('p1 stage 3', 'doc matching done');

            if (isPassed) {
                window.SidePanelLog.log('p1 stage 3', 'no discrepancy found');
            } else {
                window.SidePanelLog.log('p1 stage 3', `discrepancy found (${discrepanciesCount} items)`);
            }

        } catch (e) {
            console.error('Failed to parse Stage 3 JSON:', e);
            window.SidePanelLog.log('p1 stage 3', 'doc matching failed: JSON parse error');
            alert('AI returned matching analysis in non-standard format.');
        }
    },

    checkAutoCommitToDb() {
        if (!window.Stage4Database.hasPendingReviews()) {
            window.SidePanelLog.log('p1 stage 4', 'All field reviews resolved by auditor. Auto-committing invoice to SQL DB...');
            window.Stage4Database.pushToDatabase(true);
        }
    },

    quickApproveRow(index) {
        if (!this.matchData || !this.matchData.match_results[index]) return;
        const row = this.matchData.match_results[index];
        row.status = 'MATCHED';
        row.verification_notes += ' [Approved by Auditor]';

        const badge = document.getElementById(`status_badge_${index}`);
        if (badge) {
            badge.className = 'badge badge-match';
            badge.textContent = 'MATCHED';
        }

        window.SidePanelLog.log('human approval', `human approval approved for field '${row.field_name}'`);

        // CHECK IF ALL REVIEWS ARE NOW RESOLVED
        this.checkAutoCommitToDb();
    },

    quickRejectRow(index) {
        if (!this.matchData || !this.matchData.match_results[index]) return;
        const row = this.matchData.match_results[index];
        row.status = 'REJECTED';
        row.verification_notes += ' [Rejected by Auditor]';

        const badge = document.getElementById(`status_badge_${index}`);
        if (badge) {
            badge.className = 'badge badge-discrepancy';
            badge.textContent = 'REJECTED';
        }

        window.SidePanelLog.log('human approval', `human approval rejected for field '${row.field_name}'`);

        // CHECK IF ALL REVIEWS ARE NOW RESOLVED
        this.checkAutoCommitToDb();
    },

    openHumanReviewModal(index) {
        if (!this.matchData || !this.matchData.match_results[index]) return;

        const row = this.matchData.match_results[index];
        const modal = document.getElementById('humanReviewModal');

        document.getElementById('reviewFieldName').textContent = row.field_name;
        document.getElementById('reviewInvoiceVal').value = typeof row.invoice_value === 'object' ? JSON.stringify(row.invoice_value) : (row.invoice_value ?? '');
        document.getElementById('reviewDocSource').textContent = row.supporting_doc_source || 'Supporting Document';
        document.getElementById('reviewDocVal').textContent = typeof row.supporting_doc_value === 'object' ? JSON.stringify(row.supporting_doc_value) : (row.supporting_doc_value ?? '');
        document.getElementById('reviewNotesText').textContent = row.verification_notes || 'No notes available.';

        modal.dataset.activeIndex = index;
        modal.classList.remove('hidden');
    },

    approveFieldMatch() {
        const modal = document.getElementById('humanReviewModal');
        const index = modal.dataset.activeIndex;
        if (index !== undefined && this.matchData.match_results[index]) {
            this.quickApproveRow(index);
            modal.classList.add('hidden');
        }
    },

    quickRejectFieldMatch() {
        const modal = document.getElementById('humanReviewModal');
        const index = modal.dataset.activeIndex;
        if (index !== undefined && this.matchData.match_results[index]) {
            this.quickRejectRow(index);
            modal.classList.add('hidden');
        }
    },

    overrideFieldMatch() {
        const modal = document.getElementById('humanReviewModal');
        const index = modal.dataset.activeIndex;
        const newInvoiceVal = document.getElementById('reviewInvoiceVal').value.trim();

        if (index !== undefined && this.matchData.match_results[index]) {
            const row = this.matchData.match_results[index];
            row.invoice_value = newInvoiceVal;
            row.status = 'MATCHED';
            row.verification_notes += ` [Overridden & Approved by Auditor: ${newInvoiceVal}]`;

            const badge = document.getElementById(`status_badge_${index}`);
            if (badge) {
                badge.className = 'badge badge-match';
                badge.textContent = 'MATCHED';
            }

            const invValTd = document.getElementById(`inv_val_${index}`);
            if (invValTd) invValTd.textContent = newInvoiceVal;

            modal.classList.add('hidden');
            window.SidePanelLog.log('human approval', `human approval overridden & approved for field '${row.field_name}' to '${newInvoiceVal}'`);

            // CHECK IF ALL REVIEWS ARE NOW RESOLVED
            this.checkAutoCommitToDb();
        }
    }
};
