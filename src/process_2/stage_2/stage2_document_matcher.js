/**
 * Stage 2: AI Document Matcher
 * Verifies the claims against the extracted text from supporting documents.
 */

window.Stage2DocumentMatcher = {
    systemPrompt: `You are an AI Finance Auditor.
Your job is to verify a list of employee claims against the provided supporting documents (receipts/invoices).
Perform a 2-Way Match: Check if the claimed amount and date are justified by the extracted text from the receipts.

You must output a strictly valid JSON array. Each object in the array represents your decision for a claim.
Required JSON format:
[
  {
    "refNo": "CLAIM_REF_NO",
    "decision": "Matched" | "Discrepancy" | "Missing Receipt",
    "reasoning": "Brief explanation"
  }
]`,

    async run(claims) {
        const container = document.getElementById('stage2Content');
        container.innerHTML = '<div class="empty-state"><p><i class="fa-solid fa-spinner fa-spin"></i> AI is verifying documents...</p></div>';

        const activeApiKey = localStorage.getItem('openRouterApiKey');
        if (!activeApiKey) {
            container.innerHTML = '<div class="empty-state text-danger"><p>Missing API Key. Please click API Key Settings in the header.</p></div>';
            return null;
        }

        const userPrompt = `
Supporting Documents (Extracted Text):
${window.p2ReceiptsText || 'No supporting documents provided.'}

Claims Data:
${JSON.stringify(claims, null, 2)}

Perform a 2-Way Match. Verify amounts and dates. Return ONLY the JSON array.
        `;

        try {
            window.SidePanelLog.log('p2 stage 2', 'Sending claims to AI Document Matcher...');
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeApiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'TOTM Finance Automation',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'nvidia/nemotron-3-super-120b-a12b:free',
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
            const content = data.choices[0].message.content;

            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(jsonStr);

            this.renderResults(results, claims);
            window.SidePanelLog.log('p2 stage 2', `AI successfully verified ${results.length} documents.`);
            return results;
        } catch (err) {
            console.error('AI Document Match Error:', err);
            container.innerHTML = `<div class="empty-state text-danger"><p>AI Document Match Failed: ${err.message}</p></div>`;
            window.SidePanelLog.log('p2 stage 2', 'AI Document Match failed: ' + err.message);
            return null;
        }
    },

    renderResults(results, originalClaims) {
        // Store results for override logic
        this.lastResults = results;
        window.p2DocumentMatchState = results;

        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Ref No</th>
                        <th>Original Amount</th>
                        <th>AI Verification</th>
                        <th>Verification Notes</th>
                        <th>Human Review Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(res => {
            const original = originalClaims.find(c => c.refNo === res.refNo) || {};

            let badgeClass = 'badge-match';
            if (res.decision === 'Discrepancy' || res.decision === 'Missing Receipt') badgeClass = 'badge-discrepancy';

            tableHtml += `
                <tr>
                    <td class="font-bold">${res.refNo}</td>
                    <td>${original.claimAmt || 'N/A'}</td>
                    <td><span class="badge ${badgeClass}">${res.decision}</span></td>
                    <td class="text-muted" style="font-size: 0.9em; max-width: 300px;">${res.reasoning}</td>
                    <td>
                        ${res.decision !== 'Matched' ? `
                            <button class="btn btn-primary" style="font-size: 0.8rem; padding: 4px 8px;" onclick="window.Stage2DocumentMatcher.overrideClaim(this, '${res.refNo}')"><i class="fa-solid fa-pen-to-square"></i> Override & Approve</button>
                        ` : '<span class="text-muted" style="font-size: 0.85rem;"><i class="fa-solid fa-check"></i> Document Verified</span>'}
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('stage2Content').innerHTML = tableHtml;
    },

    overrideClaim(btn, refNo) {
        const tr = btn.closest('tr');
        const badge = tr.querySelector('.badge-discrepancy');
        if (badge) {
            badge.className = 'badge badge-match';
            badge.textContent = 'Matched (Manual)';
        }
        
        const actionTd = btn.closest('td');
        actionTd.innerHTML = '<span class="text-verified" style="font-size: 0.85rem;"><i class="fa-solid fa-user-check"></i> Human Overridden</span>';

        if (window.p2DocumentMatchState) {
            const claimRes = window.p2DocumentMatchState.find(r => r.refNo === refNo);
            if (claimRes) {
                claimRes.decision = 'Matched';
                claimRes.reasoning = claimRes.reasoning + ' [OVERRIDDEN BY HUMAN]';
            }
        }
        window.SidePanelLog.log('p2 stage 2', `Human overridden and matched claim: ${refNo}`);
        
        // If auto-push logic is needed, call it here. For now, it just resolves the UI.
    }
};
