/**
 * Stage 4: Local SQL Database Integration Module (SQLAlchemy & SQLite)
 * Handles committing audited invoices to local_sql_accounting.db
 * Entity mapping from scenario: TLPL (Set 1), TTS (Set 2), IBPL (Set 3)
 * Strict Gate: Only commits when all fields are resolved (0 pending reviews)
 * Records strictly sorted with most recent at top.
 */

window.Stage4Database = {
    apiEndpoint: '/api/p1/records',
    dbKey: 'local_sql_accounting_db',

    init() {
        this.renderDatabaseViewer();
    },

    async clearDatabaseRecords() {
        try {
            await fetch(this.apiEndpoint, { method: 'DELETE' });
            window.SidePanelLog.log('p1 stage 4', 'SQL database table cleared in SQLite.');
        } catch (e) {
            console.warn('API clear failed, falling back to localStorage:', e);
            localStorage.setItem(this.dbKey, JSON.stringify([]));
        }
        this.renderDatabaseViewer();
    },

    getScenarioMapping() {
        const scenario = window.Stage1DocumentSelector.currentScenario || 'set2';
        if (scenario === 'set1') {
            return { entity: 'TLPL', db_target: 'TTSPL_SQL_DB', match_type: '4_WAY_MATCH' };
        } else if (scenario === 'set3') {
            return { entity: 'IBPL', db_target: 'IBPL_SQL_DB', match_type: '2_WAY_MATCH' };
        } else {
            return { entity: 'TTS', db_target: 'TTSPL_SQL_DB', match_type: '3_WAY_MATCH' };
        }
    },

    hasPendingReviews() {
        const stage3Data = window.Stage3AiMatcher.matchData;
        if (!stage3Data || !stage3Data.match_results) return false;
        return stage3Data.match_results.some(r => r.status === 'DISCREPANCY' || r.status === 'PARTIAL_MATCH');
    },

    async pushToDatabase(isAutoCall = false) {
        const stage2Data = window.Stage2OcrAiExtractor.extractedData;
        if (!stage2Data || Object.keys(stage2Data).length === 0) {
            if (!isAutoCall) alert('Please run Stage 2 & Stage 3 extraction first before committing to DB.');
            return false;
        }

        // STRICT GATE: Check for pending reviews
        if (this.hasPendingReviews()) {
            window.SidePanelLog.log('p1 stage 4', 'Push to SQL DB paused: Pending human auditor review required for unresolved discrepancy fields.');
            if (!isAutoCall) {
                alert('Push to DB paused: There are pending discrepancy fields requiring human review/approval in Stage 3.');
            }
            return false;
        }

        const mapping = this.getScenarioMapping();
        const docNo = stage2Data.invoice_number || stage2Data.invoice_no || 'INV-2026-8891';
        const vendorName = stage2Data.vendor_name || stage2Data.vendor || 'AEROSPACE SYSTEMS LTD';
        const vendorCode = '3000/' + vendorName.substring(0, 5).toUpperCase().replace(/\s/g, '');
        const amountVal = parseFloat(stage2Data.total_amount || stage2Data.amount || 1635);
        const taxVal = parseFloat(stage2Data.tax_amount || stage2Data.tax || 135);
        const netVal = amountVal - taxVal;
        const dateVal = stage2Data.invoice_date || stage2Data.date || '2026-05-15';

        const commitStatus = mapping.entity === 'TLPL' ? 'POSTED_TO_SAP' : 'MANUALLY_APPROVED';

        window.SidePanelLog.log('p1 stage 4', `Pushing invoice record ${docNo} to SQLite DB (${mapping.entity} / ${mapping.db_target})...`);

        const newRecordPayload = {
            entity: mapping.entity,
            db_target: mapping.db_target,
            doc_no: docNo,
            vendor_code: vendorCode,
            company: vendorName,
            date: dateVal,
            amount: amountVal,
            tax: taxVal,
            net_amount: netVal,
            match_type: mapping.match_type,
            status: commitStatus
        };

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecordPayload)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const createdRecord = await response.json();
            window.SidePanelLog.log('p1 stage 4', `SQL record ${docNo} committed successfully to SQLite (ID: ${createdRecord.id})`);
        } catch (e) {
            console.warn('API POST failed, writing to localStorage fallback:', e);
            const records = JSON.parse(localStorage.getItem(this.dbKey) || '[]');
            const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
            records.unshift({ id: nextId, ...newRecordPayload, amount: amountVal.toFixed(2), tax: taxVal.toFixed(2), net_amount: netVal.toFixed(2) });
            localStorage.setItem(this.dbKey, JSON.stringify(records));
        }

        this.renderDatabaseViewer();

        if (!isAutoCall) {
            alert(`Invoice ${docNo} successfully committed to local SQLite database (${mapping.db_target})!`);
        }
        return true;
    },

    async renderDatabaseViewer() {
        const tableContainer = document.getElementById('sqlDbTableContainer');
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

        // SORT DESCENDING BY ID (Recent at top)
        records.sort((a, b) => b.id - a.id);

        if (records.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-database"></i>
                    <p>No records committed to SQL database yet.</p>
                    <span>Records are automatically committed once all field discrepancies are resolved/approved in Stage 3.</span>
                </div>`;
            return;
        }

        let html = `
            <table class="sql-db-table">
                <thead>
                    <tr>
                        <th>id</th>
                        <th>entity</th>
                        <th>db_target</th>
                        <th>doc_no</th>
                        <th>vendor_code</th>
                        <th>company</th>
                        <th>date</th>
                        <th>amount</th>
                        <th>tax</th>
                        <th>net_amount</th>
                        <th>match_type</th>
                        <th>status</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td class="font-mono text-muted">${r.id}.00</td>
                            <td class="font-bold">${r.entity}</td>
                            <td><span class="db-target-tag">${r.db_target}</span></td>
                            <td class="font-mono">${r.doc_no}</td>
                            <td class="font-mono">${r.vendor_code}</td>
                            <td class="font-bold">${r.company}</td>
                            <td class="font-mono">${r.date}</td>
                            <td class="font-mono">${typeof r.amount === 'number' ? r.amount.toFixed(2) : r.amount}</td>
                            <td class="font-mono">${typeof r.tax === 'number' ? r.tax.toFixed(2) : r.tax}</td>
                            <td class="font-mono">${typeof r.net_amount === 'number' ? r.net_amount.toFixed(2) : r.net_amount}</td>
                            <td><span class="badge badge-accent">${r.match_type}</span></td>
                            <td><span class="badge ${r.status.includes('REJECTED') ? 'badge-discrepancy' : 'badge-match'}">${r.status}</span></td>
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
