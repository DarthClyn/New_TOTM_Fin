/**
 * Stage 4: Local SQL Database Integration Module
 * Mimics committing approved claims to SQL DB.
 */

window.Stage4Database = {
    apiEndpoint: '/api/p2/records',
    dbKey: 'local_sql_claims_db',

    init() {
        this.renderDatabaseViewer();
    },

    async clearDatabaseRecords() {
        try {
            await fetch(this.apiEndpoint, { method: 'DELETE' });
            window.SidePanelLog.log('p2 stage 4', 'SQL database table cleared in SQLite.');
        } catch (e) {
            console.warn('API clear failed, falling back to localStorage:', e);
            localStorage.setItem(this.dbKey, JSON.stringify([]));
        }
        this.renderDatabaseViewer();
    },

    async pushToDatabase(claims, aiDecisions, glMappings) {
        if (!claims || !aiDecisions || !glMappings) {
            window.SidePanelLog.log('p2 stage 4', 'Missing data. Cannot push to DB.');
            return false;
        }

        let pushedCount = 0;

        for (const claim of claims) {
            const aiObj = aiDecisions.find(d => d.refNo === claim.refNo) || {};
            const decision = aiObj.decision;
            
            // Strict gate: Only push Approved claims
            if (decision !== 'Approved') {
                window.SidePanelLog.log('p2 stage 4', `Skipping ${claim.refNo} (Status: ${decision}).`);
                continue; 
            }

            const glCode = glMappings[claim.groupCode] || glMappings[claim.groupName] || 'UNMAPPED';
            
            if (glCode === 'MANUAL') {
                window.SidePanelLog.log('p2 stage 4', `Skipping ${claim.refNo} due to missing GL mapping.`);
                continue;
            }

            const newRecordPayload = {
                ref_no: claim.refNo,
                employee_code: window.Stage1ClaimsIngestion.employeeCode || claim.employeeCode || 'EMP-001',
                employee_name: window.Stage1ClaimsIngestion.employeeName || claim.employeeName || 'ALICE',
                submit_date: claim.submitDate || '',
                approved_date: claim.approvedDate || '',
                group_code: claim.groupCode || '',
                group_name: claim.groupName || '',
                template_name: claim.templateName || '',
                receipt_no: claim.receiptNo || 'Receipt Attached',
                receipt_date: claim.receiptDate || '',
                approver: claim.approver || '',
                gst: parseFloat(claim.gst || 0),
                claimable_amt: parseFloat(claim.claimAmt || 0),
                hod_approval: claim.hodApproval || 'Approved',
                policy_decision: decision || 'Approved',
                reasoning: aiObj.reasoning || '',
                gl_code: glCode,
                target_system: window.targetAccountingSystem || 'SAP',
                status: 'SQL_RECORD_INSERTED'
            };

            try {
                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRecordPayload)
                });
                if (response.ok) pushedCount++;
                else throw new Error(`HTTP ${response.status}`);
            } catch (e) {
                console.warn('API POST failed, fallback to localStorage:', e);
                const records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
                const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
                records.unshift({ id: nextId, ...newRecordPayload });
                localStorage.setItem(this.dbKey, JSON.stringify(records));
                pushedCount++;
            }
        }

        window.SidePanelLog.log('p2 stage 4', `Successfully pushed ${pushedCount} approved claims to SQL database.`);
        this.renderDatabaseViewer();
        return true;
    },

    async renderDatabaseViewer() {
        const tableContainer = document.getElementById('stage4Content');
        if (!tableContainer) return;

        let records = [];
        try {
            const response = await fetch(this.apiEndpoint);
            if (response.ok) {
                records = await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (e) {
            console.warn('API fetch failed, reading localStorage fallback:', e);
            records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
        }

        records.sort((a, b) => b.id - a.id);

        if (records.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-database"></i>
                    <p>No claims committed to SQL database yet.</p>
                </div>`;
            return;
        }

        let html = `
            <div style="margin-bottom: 12px; text-align: right;">
                <button class="btn btn-outline" onclick="window.Stage4Database.clearDatabaseRecords()">Clear DB</button>
            </div>
            <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border-color); border-radius: 8px;">
                <table class="sql-db-table" style="width: 100%; min-width: 1500px;">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Claim Ref No</th>
                            <th>Emp Code</th>
                            <th>Emp Name</th>
                            <th>Submit Date</th>
                            <th>Approved Date</th>
                            <th>Group Name</th>
                            <th>Comments</th>
                            <th>Approver</th>
                            <th>GST ($)</th>
                            <th>Claimable ($)</th>
                            <th>GL Code</th>
                            <th>Target System</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(r => `
                            <tr>
                                <td class="font-mono text-muted">${r.id}</td>
                                <td class="font-bold">${r.ref_no}</td>
                                <td>${r.employee_code || 'EMP-001'}</td>
                                <td>${r.employee_name || 'ALICE'}</td>
                                <td class="font-mono">${r.submit_date || ''}</td>
                                <td class="font-mono">${r.approved_date || ''}</td>
                                <td>${r.group_name}</td>
                                <td class="text-muted" style="max-width: 180px; font-size: 0.85em;">${r.template_name || ''}</td>
                                <td>${r.approver || ''}</td>
                                <td class="font-mono">$${typeof r.gst === 'number' ? r.gst.toFixed(2) : (r.gst || '0.00')}</td>
                                <td class="font-mono text-verified">$${typeof r.claimable_amt === 'number' ? r.claimable_amt.toFixed(2) : r.claimable_amt}</td>
                                <td><span class="badge badge-accent">${r.gl_code}</span></td>
                                <td><span class="badge badge-partial">${r.target_system || 'SAP'}</span></td>
                                <td><span class="badge badge-match">${r.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = html;
    },

    async exportToCSV() {
        let records = [];
        try {
            const response = await fetch(this.apiEndpoint);
            if (response.ok) records = await response.json();
        } catch (e) {
            records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
        }

        if (records.length === 0) {
            alert("No records in database to export!");
            return;
        }

        // A.5 Format: Post Date, Tax Date, Ref 1, Description, Description 2, Account Code, Account Description, Local DR, Local CR
        let csv = "Post Date,Tax Date,Ref 1,Description,Description 2,Account Code,Account Description,Local DR,Local CR\n";
        
        records.forEach(r => {
            const empName = r.employee_name || "UNKNOWN EMPLOYEE";
            const desc2 = `"${r.group_name} - ${r.claimable_amt}"`;
            const acctDesc = window.Stage3GLMapper.glDictionary[r.gl_code] || 'UNKNOWN';
            
            csv += `30-06-2026,30-06-2026,${r.ref_no},${empName},${desc2},${r.gl_code},${acctDesc},${r.claimable_amt},0\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'GL_Export.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.SidePanelLog.log('p2 stage 4', 'Exported GL records to CSV.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Stage4Database.init();
});
