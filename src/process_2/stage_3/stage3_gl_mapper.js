/**
 * Stage 3: GL Code Mapper
 * Uses AI to map Claim Group Codes to valid GL Codes based on a dictionary.
 */

window.Stage3GLMapper = {
    // Full Chart of Accounts
    glDictionary: {
        "11010101": "COMPUTERS", "11010102": "OFFICE EQUIPMENT", "11010103": "FURNITURE & FITTINGS",
        "11010104": "RENOVATION", "11010201": "ACC. DEPN-COMPUTERS", "11010202": "ACC. DEPN-OFFICE EQUIPMENT",
        "11010203": "ACC. DEPN-FURNITURE & FITTINGS", "11010204": "ACC. DEPN-RENOVATION",
        "11020101": "ROU-OFFICE RENTAL", "11020201": "ACC. DEPN - ROU-OFFICE RENTAL",
        "11030101": "SOFTWARE", "11030201": "ACC. AMORT-SOFTWARE",
        "12130000": "PREPAYMENTS", "12140202": "STAFF ADVANCE",
        "71010000": "SALARIES", "71020000": "CPF - EMPLOYER", "71030000": "SDL",
        "71070000": "ALLOWANCE", "71080000": "LEAVE-PAY (YEAR-END)", "71090000": "MEDICAL EXPENSES",
        "71100000": "RECRUITMENT EXPENSES", "71110000": "INSURANCE PREMIUM", "71120000": "STAFF TRAINING",
        "71130000": "STAFF WELFARE", "71140000": "PRIVILEGE LEAVE ENCASHMENT",
        "71150000": "STAFF SUBSCRIPTION FEE", "71160000": "ACCOMODATION ALLOWANCE",
        "75010000": "LOCAL TRANSPORT", "75020000": "PETROL & PARKING",
        "75100000": "TRAVEL-AIRTICKET", "75110000": "TRAVEL-HOTEL",
        "75120000": "TRAVEL-OVERSEAS TRANSPORT", "75130000": "TRAVEL-INSURANCE",
        "75140000": "TRAVEL-COMMUNICATION/INTERNET", "75150000": "TRAVEL-MEAL",
        "75160000": "TRAVEL-PER DIEM", "75190000": "TRAVEL-OTHERS",
        "78050100": "ADVERTISING EXPENSES", "78050200": "MEAL & ENTERTAINMENT - BUSINESS",
        "78050300": "EVENT EXPENSES", "78060000": "HARDWARE/SOFTWARE",
        "78070000": "SOFTWARE/LICENSE", "78080000": "MEAL AND ENTERTAINMENT - STAFF",
        "78090000": "MANAGEMENT FEE EXPENSES", "78100000": "UTILITIES",
        "78110000": "PRINTING & STATIONERY", "78120000": "POSTAGE & COURIER",
        "78130000": "TELEPHONE & COMMUNICATION", "78140000": "OFFICE CLEANING EXPENSES",
        "78150000": "OFFICE EXPENSE", "78160000": "RENTAL - OFFICE",
        "78170000": "RENTAL - MEETING ROOM", "78180000": "BAD DEBT (NON-TRADE)",
        "78200000": "FINE & PENALITIES", "78300000": "SUBSCRIPTION FEE",
        "78400000": "BANK CHARGES", "78500000": "OTHERS",
        "78600000": "(GAIN)/LOSS ON DISPOSAL OF ASSETS",
        "78700000": "STAMP DUTY",
        "82010000": "INTEREST EXPENSES - NON-RELATED",
        "82030000": "INTEREST ON LEASE LIABILITIES"
    },

    // Pre-defined mappings for all known Claim Group Codes
    claimCodeMapping: {
        "ASSET": { gl: "11010101", desc: "COMPUTERS (or nearest asset code)" },
        "ENTERT": { gl: "78050200", desc: "MEAL & ENTERTAINMENT - BUSINESS" },
        "IT": { gl: "78060000", desc: "HARDWARE/SOFTWARE" },
        "MLCLM": { gl: "71090000", desc: "MEDICAL EXPENSES" },
        "MOBILE": { gl: "78130000", desc: "TELEPHONE & COMMUNICATION" },
        "OTHERS": { gl: "78500000", desc: "OTHERS" },
        "OVRSEA": { gl: "75100000", desc: "TRAVEL-AIRTICKET (Overseas/Business Travel)" },
        "TRAIN": { gl: "71120000", desc: "STAFF TRAINING" },
        "TRAN": { gl: "75010000", desc: "LOCAL TRANSPORT" }
    },

    systemPrompt: `You are an AI Finance Mapping Assistant.
Your job is to map short "Claim Group Codes" (and their names) to a strict list of GL Codes.
If a logical mapping exists, provide the GL Code. If it is completely ambiguous, return "MANUAL".
You must perform semantic matching. For example, claim codes related to "MEAL", "FOOD", "LUNCH", or "DINNER" should map to "78050200" (MEAL & ENTERTAINMENT - BUSINESS).
You must return a strictly valid JSON object where the keys are the Claim Group Codes, and the values are the mapped GL Code strings.
Example: { "ENTERT": "78050200", "MEAL": "78050200", "UNKNOWN": "MANUAL" }`,

    // Called on page load — renders all pre-defined mappings immediately
    init() {
        const allGroups = Object.entries(this.claimCodeMapping).map(([code, val]) => ({
            code, name: val.desc
        }));
        const finalMappings = {};
        allGroups.forEach(g => {
            finalMappings[g.code] = this.claimCodeMapping[g.code].gl;
        });

        // Pass this.claimCodeMapping so they show as 'Mapped' instead of 'AI Resolved' on load
        this.renderMappingTable(allGroups, finalMappings, this.claimCodeMapping);
        window.SidePanelLog.log('p2 stage 3', `Default GL mapping loaded: ${allGroups.length} claim group codes pre-mapped from hardcoded table.`);
        document.getElementById('stage3Status').textContent = 'Default Ready';
        document.getElementById('stage3Status').className = 'badge badge-match';
    },

    // Run: Check current claims for any NEW unknown codes, call AI only for those
    async run(claimsData) {
        // Step 1: Build groups — all 9 known codes + any new ones from the claims batch
        const allGroups = Object.entries(this.claimCodeMapping).map(([code, val]) => ({
            code, name: val.desc
        }));

        // Add any codes from claims NOT already in known mapping (case-insensitive)
        const aiNeededFor = [];
        claimsData.forEach(c => {
            const upperCode = c.groupCode.toUpperCase();
            // Check exact match OR uppercase match
            const knownMatch = this.claimCodeMapping[c.groupCode] || this.claimCodeMapping[upperCode];
            const alreadyInAll = allGroups.find(g => g.code === c.groupCode || g.code === upperCode);
            if (!alreadyInAll) {
                const canonicalCode = knownMatch ? upperCode : c.groupCode;
                allGroups.push({ code: canonicalCode, name: c.groupName });
                if (!knownMatch) aiNeededFor.push({ code: canonicalCode, name: c.groupName });
            }
        });

        // Step 2: Pre-map all known codes instantly — no AI (case-insensitive lookup)
        const finalMappings = {};
        allGroups.forEach(group => {
            const match = this.claimCodeMapping[group.code] || this.claimCodeMapping[group.code.toUpperCase()];
            if (match) {
                finalMappings[group.code] = match.gl;
            }
        });

        const knownCount = allGroups.length - aiNeededFor.length;
        window.SidePanelLog.log('p2 stage 3', `[PART 1 - Hardcoded] ${knownCount} claim codes instantly mapped from pre-defined GL table. No AI required.`);

        // Step 3: AI fallback ONLY for unknown codes
        if (aiNeededFor.length > 0) {
            window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] ${aiNeededFor.length} new/unknown codes detected: ${aiNeededFor.map(g => g.code).join(', ')}. Calling AI...`);
            const activeApiKey = localStorage.getItem('openRouterApiKey');
            if (!activeApiKey) {
                aiNeededFor.forEach(g => { finalMappings[g.code] = 'MANUAL'; });
                window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] No API key \u2014 ${aiNeededFor.length} codes marked MANUAL (Human Intervention).`);
            } else {
                try {
                    const userPrompt = `Available GL Codes:\n${JSON.stringify(this.glDictionary, null, 2)}\n\nNew Unknown Claim Groups:\n${JSON.stringify(aiNeededFor, null, 2)}\n\nReturn ONLY a valid JSON object.`;
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
                        let e = `HTTP ${response.status}`;
                        try { const j = await response.json(); e = j.error?.message || e; } catch (_) { }
                        throw new Error(e);
                    }
                    const data = await response.json();
                    const jsonStr = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
                    const aiMappings = JSON.parse(jsonStr);
                    Object.assign(finalMappings, aiMappings);
                    window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] AI resolved ${Object.keys(aiMappings).length} codes: ${Object.entries(aiMappings).map(([k, v]) => k + '\u2192' + v).join(', ')}.`);
                } catch (err) {
                    aiNeededFor.forEach(g => { finalMappings[g.code] = 'MANUAL'; });
                    window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] AI failed: ${err.message}. Codes marked MANUAL.`);
                }
            }
        } else {
            window.SidePanelLog.log('p2 stage 3', '[PART 2 - AI Fallback] Not needed \u2014 all claim codes matched in pre-defined table.');
        }

        this.renderMappingTable(allGroups, finalMappings, this.claimCodeMapping);
        window.SidePanelLog.log('p2 stage 3', `Complete: ${knownCount} hardcoded + ${aiNeededFor.length} AI-resolved = ${allGroups.length} total mapped.`);
        return this.getFinalMappings.bind(this);
    },


    renderMappingTable(groups, mappings, knownCodes = {}) {
        // Build dropdown options from full GL dictionary
        let optionsHtml = '<option value="MANUAL">-- Require Human Intervention --</option>';
        for (const [code, desc] of Object.entries(this.glDictionary)) {
            optionsHtml += `<option value="${code}">${code} - ${desc}</option>`;
        }

        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Group Code</th>
                        <th>Group Name</th>
                        <th>Mapped GL Code</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
        `;

        groups.forEach(group => {
            const glCode = mappings[group.code] || 'MANUAL';
            const isManual = glCode === 'MANUAL';
            const badgeClass = isManual ? 'badge-discrepancy' : 'badge-match';
            const isKnown = !!knownCodes[group.code];
            const sourceBadge = isKnown
                ? '<span class="badge badge-accent" style="font-size:0.75em;">Mapped</span>'
                : '<span class="badge badge-partial" style="font-size:0.75em;">AI Resolved</span>';

            // Pre-select the mapped GL code in dropdown
            const selectOptions = optionsHtml.replace(`value="${glCode}"`, `value="${glCode}" selected`);

            // Human Required rows get a Save button to confirm the manual selection
            const actionCell = isManual
                ? `<span class="badge badge-discrepancy" style="font-size:0.75em; margin-right:8px;">Human Required</span>
                   <button class="btn btn-success btn-sm gl-save-btn" onclick="window.Stage3GLMapper.saveManualMapping('${group.code}', this)" style="padding: 4px 10px; font-size: 0.8rem;">
                       <i class="fa-solid fa-floppy-disk"></i> Save
                   </button>`
                : sourceBadge;

            tableHtml += `
                <tr class="gl-mapping-row" data-group="${group.code}">
                    <td class="font-bold"><span class="badge ${badgeClass}" id="badge-${group.code}">${group.code}</span></td>
                    <td>${group.name}</td>
                    <td>
                        <select class="form-input gl-select" style="width: 100%; max-width: 380px;">
                            ${selectOptions}
                        </select>
                    </td>
                    <td id="source-${group.code}">${actionCell}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('stage3Content').innerHTML = tableHtml;
    },

    saveManualMapping(groupCode, btnEl) {
        const row = btnEl.closest('.gl-mapping-row');
        const select = row.querySelector('.gl-select');
        const selectedGl = select.value;

        if (selectedGl === 'MANUAL') {
            alert('Please select a valid GL Code before saving.');
            return;
        }

        // Update badge to green (resolved)
        const badge = document.getElementById(`badge-${groupCode}`);
        if (badge) badge.className = 'badge badge-match';

        // Replace source cell with "Human Saved" badge
        const sourceCell = document.getElementById(`source-${groupCode}`);
        if (sourceCell) {
            sourceCell.innerHTML = '<span class="badge badge-match" style="font-size:0.75em;">✓ Human Saved</span>';
        }

        const glDesc = this.glDictionary[selectedGl] || selectedGl;
        window.SidePanelLog.log('p2 stage 3', `[Human Intervention] ${groupCode} → ${selectedGl} - ${glDesc} saved.`);

        // If pipeline was waiting for human reviews, check if all are now resolved
        if (typeof window._stage3AutoPushCheck === 'function') {
            window._stage3AutoPushCheck();
        }
    },



    getFinalMappings() {
        const rows = document.querySelectorAll('.gl-mapping-row');
        const finalMap = {};
        rows.forEach(r => {
            const groupCode = r.getAttribute('data-group');
            const glCode = r.querySelector('.gl-select').value;
            finalMap[groupCode] = glCode;
        });
        return finalMap;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Auto-render all pre-defined claim code mappings on page load
    window.Stage3GLMapper.init();
});
