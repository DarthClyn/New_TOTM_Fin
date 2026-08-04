/**
 * Stage 5: Local SQL Database Integration Module
 * Mimics committing approved claims to SQL DB.
 */

window.Stage5Database = {
    apiEndpoint: '/api/p2/records',
    dbKey: 'local_sql_claims_db',

    init() {
        this.renderDatabaseViewer();
    },

    async clearDatabaseRecords() {
        try {
            await fetch(this.apiEndpoint, { method: 'DELETE' });
            window.SidePanelLog.log('p2 stage 5', 'SQL database table cleared in SQLite.');
        } catch (e) {
            console.warn('API clear failed, falling back to localStorage:', e);
            localStorage.setItem(this.dbKey, JSON.stringify([]));
        }
        this.renderDatabaseViewer();
    },

    async pushToDatabase(claims, aiDecisions, glMappings) {
        if (!claims || !aiDecisions || !glMappings) {
            window.SidePanelLog.log('p2 stage 5', 'Missing data. Cannot push to DB.');
            return false;
        }

        let pushedCount = 0;

        for (const claim of claims) {
            const decision = aiDecisions.find(d => d.refNo === claim.refNo)?.decision;
            
            // Strict gate: Only push Approved claims
            if (decision !== 'Approved') {
                window.SidePanelLog.log('p2 stage 5', `Skipping ${claim.refNo} (Status: ${decision}).`);
                continue; 
            }

            const glCode = glMappings[claim.groupCode] || 'UNMAPPED';
            
            if (glCode === 'MANUAL') {
                window.SidePanelLog.log('p2 stage 5', `Skipping ${claim.refNo} due to missing GL mapping.`);
                continue;
            }

            const newRecordPayload = {
                ref_no: claim.refNo.split('-')[0],
                gl_code: glCode,
                group_name: claim.groupName,
                receipt_no: claim.receiptNo,
                receipt_date: claim.receiptDate,
                claimable_amt: parseFloat(claim.claimAmt),
                hod_approval: claim.hodApproval,
                employee_name: claim.employeeName || 'Unknown',
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

        window.SidePanelLog.log('p2 stage 5', `Successfully pushed ${pushedCount} approved claims to SQL database.`);
        this.renderDatabaseViewer();
        return true;
    },

    async renderDatabaseViewer() {
        const tableContainer = document.getElementById('stage5Content');
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
                <button class="btn btn-outline" onclick="window.Stage5Database.clearDatabaseRecords()">Clear DB</button>
            </div>
            <table class="sql-db-table">
                <thead>
                    <tr>
                        <th>id</th>
                        <th>ref_no</th>
                        <th>gl_code</th>
                        <th>group_name</th>
                        <th>receipt_no</th>
                        <th>receipt_date</th>
                        <th>claimable_amt</th>
                        <th>status</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td class="font-mono text-muted">${r.id}</td>
                            <td class="font-bold">${r.ref_no}</td>
                            <td><span class="badge badge-accent">${r.gl_code}</span></td>
                            <td>${r.group_name}</td>
                            <td class="font-mono">${r.receipt_no}</td>
                            <td class="font-mono">${r.receipt_date}</td>
                            <td class="font-mono">${typeof r.claimable_amt === 'number' ? r.claimable_amt.toFixed(2) : r.claimable_amt}</td>
                            <td><span class="badge badge-match">${r.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
