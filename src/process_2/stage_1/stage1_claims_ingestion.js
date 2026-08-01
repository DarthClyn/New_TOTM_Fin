/**
 * Stage 1: Claims Data Ingestion
 * Renders a fixed format table with dummy claims data.
 */

window.Stage1ClaimsIngestion = {
    dummyData: [
        {
            refNo: "CLM656202656",
            groupCode: "MLCLM",
            groupName: "MEDICAL CLAIM",
            templateName: "MEDICAL ALI - JULY",
            receiptNo: "inv1234",
            receiptDate: "03-07-2024",
            receiptAmt: "80.00",
            claimAmt: "80.00",
            hodApproval: "Pending"
        },
        {
            refNo: "CLM998202657",
            groupCode: "ASSET",
            groupName: "ASSET",
            templateName: "LAPTOP REPAIR - AUG",
            receiptNo: "RPT-0092",
            receiptDate: "15-08-2024",
            receiptAmt: "150.00",
            claimAmt: "150.00",
            hodApproval: "Approved"
        },
        {
            refNo: "CLM112202658",
            groupCode: "ENTERT",
            groupName: "ENTERTAINMENT",
            templateName: "CLIENT DINNER - Q3",
            receiptNo: "DIN-4421",
            receiptDate: "22-08-2024",
            receiptAmt: "320.50",
            claimAmt: "320.50",
            hodApproval: "Not Approved"
        },
        {
            refNo: "CLM443202659",
            groupCode: "IT",
            groupName: "IT",
            templateName: "SOFTWARE SUBSCRIPTION",
            receiptNo: "SUB-881",
            receiptDate: "01-09-2024",
            receiptAmt: "45.00",
            claimAmt: "45.00",
            hodApproval: "Approved"
        },
        {
            refNo: "CLM775202660",
            groupCode: "MOBILE",
            groupName: "MOBILE PHONE REIMBURSEMENT",
            templateName: "SEP MOBILE BILL",
            receiptNo: "MOB-09-24",
            receiptDate: "05-09-2024",
            receiptAmt: "60.00",
            claimAmt: "60.00",
            hodApproval: "Pending"
        }
    ],

    renderTable() {
        const container = document.getElementById('claimsTableContainer');
        if (!container) return;

        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Ref No</th>
                        <th>Group Code</th>
                        <th>Group Name</th>
                        <th>Template Name</th>
                        <th>Receipt No</th>
                        <th>Receipt Date</th>
                        <th>Receipt Amt</th>
                        <th>Claimable Amt</th>
                        <th>HOD Approval</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.dummyData.forEach((row, index) => {
            // Consistent accent badge for all group codes
            const badgeClass = 'badge-accent';
            
            const inputStyle = 'width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: transparent; font-family: inherit; font-size: inherit;';
            const numStyle = inputStyle + ' font-weight: bold; width: 80px;';
            const shortStyle = inputStyle + ' width: 100px;';

            tableHtml += `
                <tr data-index="${index}">
                    <td class="font-bold"><input type="text" class="claim-input" data-field="refNo" style="${shortStyle}" value="${row.refNo}"></td>
                    <td><input type="text" class="claim-input badge ${badgeClass}" data-field="groupCode" style="border:none; padding:4px; font-weight:bold; width: 70px;" value="${row.groupCode}"></td>
                    <td><input type="text" class="claim-input" data-field="groupName" style="${inputStyle}" value="${row.groupName}"></td>
                    <td><input type="text" class="claim-input" data-field="templateName" style="${inputStyle}" value="${row.templateName}"></td>
                    <td><input type="text" class="claim-input doc-tag" data-field="receiptNo" style="border:none; padding:4px;" value="${row.receiptNo}"></td>
                    <td><input type="text" class="claim-input" data-field="receiptDate" style="${shortStyle}" value="${row.receiptDate}"></td>
                    <td><input type="text" class="claim-input" data-field="receiptAmt" style="${numStyle}" value="${row.receiptAmt}"></td>
                    <td><input type="text" class="claim-input text-verified" data-field="claimAmt" style="${numStyle} border:none; background: transparent;" value="${row.claimAmt}"></td>
                    <td>
                        <select class="claim-input" data-field="hodApproval" style="${inputStyle} width: 120px;">
                            <option value="Pending" ${row.hodApproval === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Approved" ${row.hodApproval === 'Approved' ? 'selected' : ''}>Approved</option>
                            <option value="Not Approved" ${row.hodApproval === 'Not Approved' ? 'selected' : ''}>Not Approved</option>
                        </select>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;
        window.SidePanelLog.log('p2 stage 1', 'Ingested 5 editable claim records.');
    },

    saveChanges() {
        const rows = document.querySelectorAll('#claimsTableContainer tbody tr');
        let updatedCount = 0;
        
        rows.forEach(tr => {
            const index = tr.getAttribute('data-index');
            const inputs = tr.querySelectorAll('.claim-input');
            inputs.forEach(input => {
                const field = input.getAttribute('data-field');
                if (this.dummyData[index] && field) {
                    this.dummyData[index][field] = input.value;
                }
            });
            updatedCount++;
        });

        window.SidePanelLog.log('p2 stage 1', `Successfully saved changes for ${updatedCount} claims.`);
    }
};
