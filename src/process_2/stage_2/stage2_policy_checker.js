/**
 * Stage 2: AI Policy Checker
 * Evaluates each claim row against the user-defined policy.
 */

window.Stage2PolicyChecker = {
    systemPrompt: `You are an AI Finance Policy Auditor.
Your job is to evaluate a list of employee claims against a specific corporate policy.
You must output a strictly valid JSON array. Each object in the array represents your decision for a claim.
Required JSON format:
[
  {
    "refNo": "CLAIM_REF_NO",
    "decision": "Approved" | "Rejected" | "Unclear",
    "reasoning": "Brief explanation of why"
  }
]`,

    async run(claims, policyText) {
        const container = document.getElementById('stage2Content');
        container.innerHTML = '<div class="empty-state"><p><i class="fa-solid fa-spinner fa-spin"></i> AI is evaluating policies...</p></div>';

        const activeApiKey = localStorage.getItem('openRouterApiKey');
        if (!activeApiKey) {
            container.innerHTML = '<div class="empty-state text-danger"><p>Missing API Key. Please click API Key Settings in the header.</p></div>';
            return null;
        }

        const userPrompt = `
Policy:
${policyText}

Claims Data:
${JSON.stringify(claims, null, 2)}

Evaluate each claim according to the policy. Return ONLY the JSON array.
        `;

        try {
            window.SidePanelLog.log('p2 stage 2', 'Sending claims to AI Policy Checker...');
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

            // Clean markdown if AI wrapped in ```json
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(jsonStr);

            this.renderResults(results, claims);
            window.SidePanelLog.log('p2 stage 2', `AI successfully evaluated ${results.length} claims.`);
            return results;
        } catch (err) {
            console.error('AI Policy Check Error:', err);
            container.innerHTML = `<div class="empty-state text-danger"><p>AI Policy Check Failed: ${err.message}</p></div>`;
            window.SidePanelLog.log('p2 stage 2', 'AI Policy Check failed: ' + err.message);
            return null;
        }
    },

    renderResults(results, originalClaims) {
        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Ref No</th>
                        <th>Original Amount</th>
                        <th>HOD Approval</th>
                        <th>AI Decision</th>
                        <th>AI Reasoning</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(res => {
            const original = originalClaims.find(c => c.refNo === res.refNo) || {};

            let badgeClass = 'badge-match';
            if (res.decision === 'Rejected') badgeClass = 'badge-discrepancy';
            else if (res.decision === 'Unclear') badgeClass = 'badge-partial';

            tableHtml += `
                <tr>
                    <td class="font-bold">${res.refNo}</td>
                    <td>${original.claimAmt || 'N/A'}</td>
                    <td>${original.hodApproval || 'N/A'}</td>
                    <td><span class="badge ${badgeClass}">${res.decision}</span></td>
                    <td class="text-muted" style="font-size: 0.9em; max-width: 300px;">${res.reasoning}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('stage2Content').innerHTML = tableHtml;
    }
};
