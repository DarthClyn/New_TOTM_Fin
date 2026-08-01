/**
 * Stage 4: Local SQL Database Integration Module
 * Mimics committing approved claims to SQL DB.
 */

window.Stage4Database = {
    dbKey: 'local_sql_claims_db',

    init() {
        if (!localStorage.getItem(this.dbKey)) {
            localStorage.setItem(this.dbKey, JSON.stringify([]));
        }
        this.renderDatabaseViewer();
    },

    clearDatabaseRecords() {
        localStorage.setItem(this.dbKey, JSON.stringify([]));
        window.SidePanelLog.log('p2 stage 4', 'SQL database table cleared by user.');
        this.renderDatabaseViewer();
    },

    pushToDatabase(claims, aiDecisions, glMappings) {
        if (!claims || !aiDecisions || !glMappings) {
            window.SidePanelLog.log('p2 stage 4', 'Missing data. Cannot push to DB.');
            return false;
        }

        const records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
        let nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        let pushedCount = 0;

        claims.forEach(claim => {
            const decision = aiDecisions.find(d => d.refNo === claim.refNo)?.decision;
            
            // Strict gate: Only push Approved claims
            if (decision !== 'Approved') {
                window.SidePanelLog.log('p2 stage 4', `Skipping ${claim.refNo} (Status: ${decision}).`);
                return; 
            }

            const glCode = glMappings[claim.groupCode] || 'UNMAPPED';
            
            if (glCode === 'MANUAL') {
                window.SidePanelLog.log('p2 stage 4', `Skipping ${claim.refNo} due to missing GL mapping.`);
                return;
            }

            const newRecord = {
                id: nextId++,
                ref_no: claim.refNo,
                gl_code: glCode,
                group_name: claim.groupName,
                receipt_no: claim.receiptNo,
                receipt_date: claim.receiptDate,
                claimable_amt: claim.claimAmt,
                hod_approval: claim.hodApproval,
                status: 'SQL_RECORD_INSERTED'
            };

            records.unshift(newRecord);
            pushedCount++;
        });

        localStorage.setItem(this.dbKey, JSON.stringify(records));

        window.SidePanelLog.log('p2 stage 4', `Successfully pushed ${pushedCount} approved claims to SQL database.`);
        this.renderDatabaseViewer();
        return true;
    },

    renderDatabaseViewer() {
        const tableContainer = document.getElementById('stage4Content');
        if (!tableContainer) return;

        const records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
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
                            <td class="font-mono">${r.claimable_amt}</td>
                            <td><span class="badge badge-match">${r.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        tableContainer.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Stage4Database.init();
});
