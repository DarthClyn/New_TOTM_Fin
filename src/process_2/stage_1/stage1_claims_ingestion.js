/**
 * Stage 1: Claims Data Ingestion & Report CSV Parser
 * Case-insensitive Sub/Grand Total row exclusion & precise CSV parsing.
 */

window.Stage1ClaimsIngestion = {
    employeeCode: "",
    employeeName: "",
    parsedSubTotalGst: null,
    parsedSubTotalClaim: null,
    parsedGrandTotalGst: null,
    parsedGrandTotalClaim: null,

    // Dynamic data populated strictly via uploaded CSV reports
    dummyData: [],
    receiptFiles: [],

    init() {
        this.renderTable();
        this.bindCsvUpload();
    },

    bindCsvUpload() {
        const input = document.getElementById('claimsUpload');
        if (!input) return;
        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const text = await file.text();
                window.SidePanelLog.log('p2 stage 1', `Parsing CSV report: ${file.name}...`);
                this.parseCSV(text);
            }
        });
    },

    async handleRowReceiptUpload(index, fileList) {
        if (!fileList || fileList.length === 0) return;
        this.saveChanges();

        const file = fileList[0];
        let content = '';
        let fileType = file.type || '';

        if (file.name.endsWith('.pdf')) {
            fileType = 'application/pdf';
        } else if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            fileType = 'text/plain';
        } else if (file.type.startsWith('image/')) {
            fileType = 'image';
        }

        if (fileType === 'text/plain') {
            content = await file.text();
        } else {
            content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        const receiptObj = {
            name: file.name,
            size: file.size,
            type: fileType,
            fileObject: file,
            content: content
        };

        if (this.dummyData[index]) {
            this.dummyData[index].attachedReceipt = receiptObj;
            window.SidePanelLog.log('p2 stage 1', `Attached receipt ${file.name} to claim ${this.dummyData[index].refNo}.`);
            this.renderTable();
        }
    },

    removeRowReceipt(index) {
        this.saveChanges();

        if (this.dummyData[index]) {
            const claimRef = this.dummyData[index].refNo;
            this.dummyData[index].attachedReceipt = null;
            window.SidePanelLog.log('p2 stage 1', `Removed attached receipt from claim ${claimRef}.`);
            this.renderTable();
        }
    },

    renderTable(data = null) {
        if (data) this.dummyData = data;
        const container = document.getElementById('claimsTableContainer');
        if (!container) return;

        if (!this.dummyData || this.dummyData.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <i class="fa-solid fa-file-csv" style="font-size: 2.8rem; color: var(--accent-blue); margin-bottom: 14px;"></i>
                    <h4 style="font-size: 1.15rem; font-weight: bold; margin-bottom: 6px;">No Claim Data Loaded</h4>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 18px;">Please upload your company Claim Status Report CSV to parse claims, employee details, and line items dynamically.</p>
                    <button class="btn btn-primary btn-lg" onclick="document.getElementById('claimsUpload').click()">
                        <i class="fa-solid fa-file-upload"></i> Upload Claims CSV
                    </button>
                </div>
            `;
            return;
        }

        // Calculate totals dynamically
        let calcGstTotal = 0;
        let calcClaimTotal = 0;
        this.dummyData.forEach(row => {
            calcGstTotal += parseFloat(row.gst || 0);
            calcClaimTotal += parseFloat(row.claimAmt || 0);
        });

        const subGst = (this.parsedSubTotalGst !== null) ? this.parsedSubTotalGst : calcGstTotal.toFixed(2);
        const subClaim = (this.parsedSubTotalClaim !== null) ? this.parsedSubTotalClaim : calcClaimTotal.toFixed(2);

        const grandGst = (this.parsedGrandTotalGst !== null) ? this.parsedGrandTotalGst : calcGstTotal.toFixed(2);
        const grandClaim = (this.parsedGrandTotalClaim !== null) ? this.parsedGrandTotalClaim : calcClaimTotal.toFixed(2);

        let tableHtml = `
            <!-- Employee Info Header Card -->
            <div style="background: rgba(37, 99, 235, 0.04); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <div>
                        <span style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem;">EMPLOYEE CODE:</span>
                        <input type="text" id="employeeCodeInput" value="${this.employeeCode || ''}" style="font-weight: bold; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-panel); width: 130px; margin-left: 6px;" placeholder="(None)">
                    </div>
                    <div>
                        <span style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem;">EMPLOYEE NAME:</span>
                        <input type="text" id="employeeNameInput" value="${this.employeeName || ''}" style="font-weight: bold; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-panel); width: 180px; margin-left: 6px;" placeholder="(None)">
                    </div>
                </div>
                <div>
                    <span class="badge badge-accent" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-user-tie"></i> Staff Claim Status Report</span>
                </div>
            </div>

            <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table class="match-data-table" style="width: 100%; min-width: 1400px;">
                    <thead>
                        <tr>
                            <th style="min-width: 120px;">Claim Ref No</th>
                            <th style="min-width: 95px;">Submit Date</th>
                            <th style="min-width: 95px;">Approved Date</th>
                            <th style="min-width: 140px;">Group Name</th>
                            <th style="min-width: 80px;">GST ($)</th>
                            <th style="min-width: 110px;">Claimable Amt ($)</th>
                            <th style="min-width: 110px;">Status</th>
                            <th style="min-width: 150px;">Attached Receipt</th>
                            <th style="min-width: 150px;">Approver</th>
                            <th style="min-width: 180px;">Remarks</th>
                            <th style="min-width: 260px;">Officer's Comment</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.dummyData.forEach((row, index) => {
            const badgeClass = 'badge-accent';
            const inputStyle = 'width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: transparent; font-family: inherit; font-size: inherit;';
            const numStyle = inputStyle + ' font-weight: bold; width: 75px;';
            const shortStyle = inputStyle + ' width: 110px;';

            let attachedCell = '';
            if (row.attachedReceipt) {
                attachedCell = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="badge badge-accent" style="font-size: 0.75rem; white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis;" title="${row.attachedReceipt.name}">
                            <i class="fa-solid fa-file"></i> ${row.attachedReceipt.name}
                        </span>
                        <button class="btn-icon text-danger" onclick="window.Stage1ClaimsIngestion.removeRowReceipt(${index})" title="Remove receipt" style="background:none; border:none; cursor:pointer; font-weight:bold; padding: 2px 4px;">&times;</button>
                    </div>
                `;
            } else {
                attachedCell = `
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('rowReceiptInput_${index}').click()" style="white-space: nowrap; padding: 4px 8px; font-size: 0.8rem;">
                        <i class="fa-solid fa-paperclip"></i> Upload
                    </button>
                    <input type="file" id="rowReceiptInput_${index}" accept="image/*,.pdf,.txt,.csv" onchange="window.Stage1ClaimsIngestion.handleRowReceiptUpload(${index}, this.files)" style="display: none;">
                `;
            }

            tableHtml += `
                <tr data-index="${index}">
                    <td class="font-bold"><input type="text" class="claim-input" data-field="refNo" style="${shortStyle}" value="${row.refNo || ''}"></td>
                    <td><input type="text" class="claim-input" data-field="submitDate" style="width: 85px;" value="${row.submitDate || ''}"></td>
                    <td><input type="text" class="claim-input" data-field="approvedDate" style="width: 85px;" value="${row.approvedDate || ''}"></td>
                    <td><input type="text" class="claim-input badge ${badgeClass}" data-field="groupName" style="border:none; padding:4px; font-weight:bold;" value="${row.groupName || ''}"></td>
                    <td><input type="text" class="claim-input" data-field="gst" style="${numStyle}" value="${row.gst || '0.00'}"></td>
                    <td><input type="text" class="claim-input text-verified" data-field="claimAmt" style="${numStyle} border:none; background: transparent;" value="${row.claimAmt || '0.00'}"></td>
                    <td>
                        <select class="claim-input" data-field="hodApproval" style="${inputStyle} width: 110px;">
                            <option value="Approved" ${row.hodApproval === 'Approved' ? 'selected' : ''}>Approved</option>
                            <option value="Pending" ${row.hodApproval === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Not Approved" ${row.hodApproval === 'Not Approved' ? 'selected' : ''}>Not Approved</option>
                            <option value="Rejected" ${row.hodApproval === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td style="vertical-align: middle;">${attachedCell}</td>
                    <td><input type="text" class="claim-input text-muted" data-field="approver" style="${inputStyle}" value="${row.approver || ''}" placeholder="(Empty)"></td>
                    <td><input type="text" class="claim-input text-muted" data-field="remarks" style="${inputStyle}" value="${row.remarks || ''}" placeholder="(Empty)"></td>
                    <td><input type="text" class="claim-input" data-field="officerComment" style="${inputStyle}" value="${row.officerComment || row.templateName || ''}" placeholder="(Empty)"></td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                    <tfoot>
                        <tr style="background: rgba(37, 99, 235, 0.04); font-weight: bold; border-top: 2px solid var(--border-color);">
                            <td colspan="4" style="text-align: right; padding: 10px; color: var(--accent-blue);">Sub Total :</td>
                            <td style="padding: 10px;" class="font-mono">$${subGst}</td>
                            <td style="padding: 10px;" class="font-mono text-verified">$${subClaim}</td>
                            <td colspan="5"></td>
                        </tr>
                        <tr style="background: rgba(37, 99, 235, 0.08); font-weight: bold; border-top: 1px solid var(--border-color);">
                            <td colspan="4" style="text-align: right; padding: 10px; color: var(--accent-blue); font-size: 1.05rem;">Grand Total :</td>
                            <td style="padding: 10px; font-size: 1.05rem;" class="font-mono">$${grandGst}</td>
                            <td style="padding: 10px; font-size: 1.05rem;" class="font-mono text-verified">$${grandClaim}</td>
                            <td colspan="5"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

        const codeInput = document.getElementById('employeeCodeInput');
        const nameInput = document.getElementById('employeeNameInput');
        if (codeInput) codeInput.value = this.employeeCode || '';
        if (nameInput) nameInput.value = this.employeeName || '';

        if (codeInput) codeInput.addEventListener('input', (e) => this.employeeCode = e.target.value);
        if (nameInput) nameInput.addEventListener('input', (e) => this.employeeName = e.target.value);

        container.querySelectorAll('.claim-input').forEach(input => {
            const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventName, (e) => {
                const tr = e.target.closest('tr');
                if (!tr) return;
                const index = tr.getAttribute('data-index');
                const field = e.target.getAttribute('data-field');
                if (this.dummyData[index] && field) {
                    this.dummyData[index][field] = e.target.value;
                    if (field === 'officerComment' || field === 'remarks') {
                        this.dummyData[index].templateName = this.dummyData[index].officerComment || this.dummyData[index].remarks || '';
                    }
                    this.renderTotalsOnly();
                }
            });
        });

        window.SidePanelLog.log('p2 stage 1', `Ingested ${this.dummyData.length} claim record(s).`);
    },

    renderTotalsOnly() {
        let calcGstTotal = 0;
        let calcClaimTotal = 0;
        this.dummyData.forEach(row => {
            calcGstTotal += parseFloat(row.gst || 0);
            calcClaimTotal += parseFloat(row.claimAmt || 0);
        });

        const tfoot = document.querySelector('#claimsTableContainer table tfoot');
        if (tfoot) {
            const subGst = (this.parsedSubTotalGst !== null) ? this.parsedSubTotalGst : calcGstTotal.toFixed(2);
            const subClaim = (this.parsedSubTotalClaim !== null) ? this.parsedSubTotalClaim : calcClaimTotal.toFixed(2);

            const grandGst = (this.parsedGrandTotalGst !== null) ? this.parsedGrandTotalGst : calcGstTotal.toFixed(2);
            const grandClaim = (this.parsedGrandTotalClaim !== null) ? this.parsedGrandTotalClaim : calcClaimTotal.toFixed(2);

            tfoot.innerHTML = `
                <tr style="background: rgba(37, 99, 235, 0.04); font-weight: bold; border-top: 2px solid var(--border-color);">
                    <td colspan="4" style="text-align: right; padding: 10px; color: var(--accent-blue);">Sub Total :</td>
                    <td style="padding: 10px;" class="font-mono">$${subGst}</td>
                    <td style="padding: 10px;" class="font-mono text-verified">$${subClaim}</td>
                    <td colspan="5"></td>
                </tr>
                <tr style="background: rgba(37, 99, 235, 0.08); font-weight: bold; border-top: 1px solid var(--border-color);">
                    <td colspan="4" style="text-align: right; padding: 10px; color: var(--accent-blue); font-size: 1.05rem;">Grand Total :</td>
                    <td style="padding: 10px; font-size: 1.05rem;" class="font-mono">$${grandGst}</td>
                    <td style="padding: 10px; font-size: 1.05rem;" class="font-mono text-verified">$${grandClaim}</td>
                    <td colspan="5"></td>
                </tr>
            `;
        }
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
    },

    parseCSV(csvText) {
        // Reset subtotal and grandtotal states on new file upload
        this.parsedSubTotalGst = null;
        this.parsedSubTotalClaim = null;
        this.parsedGrandTotalGst = null;
        this.parsedGrandTotalClaim = null;

        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        if (currentCell !== '' || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
        }

        const parsedData = [];

        let empCode = '';
        let empName = '';
        let companyName = '';

        let colIndex = {
            groupCode: -1, claimName: -1, receiptDate: -1, approvedDate: -1,
            refNo: -1, status: -1, pendingWith: -1, approver: -1,
            remarks: -1, officerComment: -1, receiptAmt: -1, gst: -1, claimAmt: -1
        };

        let headerLineIdx = -1;
        for (let i = 0; i < rows.length; i++) {
            const lineStr = rows[i].join(' ').toUpperCase();
            if (lineStr.includes('CLAIM GROUP NAME') || lineStr.includes('REFERENCE NO') || lineStr.includes('OFFICER\'S COMMENT')) {
                headerLineIdx = i;
                const hCols = rows[i].map(c => c.toUpperCase());
                
                hCols.forEach((colText, idx) => {
                    if (colText.includes('CLAIM GROUP NAME')) colIndex.groupCode = idx;
                    else if (colText.includes('CLAIM NAME')) colIndex.claimName = idx;
                    else if (colText.includes('RECEIPT DATE')) colIndex.receiptDate = idx;
                    else if (colText.includes('APPROVED DATE')) colIndex.approvedDate = idx;
                    else if (colText.includes('REFERENCE NO')) colIndex.refNo = idx;
                    else if (colText.includes('STATUS')) colIndex.status = idx;
                    else if (colText.includes('PENDING WITH')) colIndex.pendingWith = idx;
                    else if (colText.includes('APPROVED UP TO')) colIndex.approver = idx;
                    else if (colText.includes('REMARKS')) colIndex.remarks = idx;
                    else if (colText.includes('OFFICER\'S COMMENT') || colText.includes('OFFICER COMMENT')) colIndex.officerComment = idx;
                    else if (colText.includes('RECEIPT AMT')) colIndex.receiptAmt = idx;
                    else if (colText.includes('GST')) colIndex.gst = idx;
                    else if (colText.includes('CLAIMABLE AMT')) colIndex.claimAmt = idx;
                });
                break;
            }
        }

        if (colIndex.refNo === -1) {
            colIndex = {
                groupCode: 0, claimName: 1, receiptDate: 2, approvedDate: 3,
                refNo: 4, status: 5, pendingWith: 6, approver: 7,
                remarks: 8, officerComment: 9, receiptAmt: 10, gst: 11, claimAmt: 12
            };
        }

        let lastSubmitDate = '';
        let lastApprovedDate = '';
        let lastRefNo = '';
        let lastStatus = 'Approved';
        let lastApprover = '';

        for (let i = 0; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length === 0) continue;
            const fullLine = cols.join(' ');
            const lineUpper = fullLine.toUpperCase();

            // Detect Company Header Title
            if (i < 4 && (lineUpper.includes('PTE') || lineUpper.includes('LTD') || lineUpper.includes('LIMITED') || lineUpper.includes('INC'))) {
                const foundComp = cols.find(c => c.toUpperCase().includes('LTD') || c.toUpperCase().includes('LIMITED') || c.toUpperCase().includes('PTE'));
                if (foundComp) companyName = foundComp.trim();
            }

            // Employee Subheader detection
            if (lineUpper.includes('EMPLOYEE CODE') || lineUpper.includes('NAME') || lineUpper.includes('EMPLOYEE')) {
                for (let cIdx = 0; cIdx < cols.length; cIdx++) {
                    const cellVal = cols[cIdx].trim();
                    const cellUpper = cellVal.toUpperCase();

                    if (cellUpper.includes('EMPLOYEE CODE') || cellUpper === 'EMPLOYEE CODE :') {
                        if (cols[cIdx + 1] && cols[cIdx + 1].trim().length > 0 && !cols[cIdx + 1].toUpperCase().includes('NAME')) {
                            empCode = cols[cIdx + 1].trim();
                        }
                    }
                    if (cellUpper.includes('NAME') || cellUpper === 'NAME :') {
                        if (cols[cIdx + 1] && cols[cIdx + 1].trim().length > 0) {
                            empName = cols[cIdx + 1].trim();
                        }
                    }
                }

                const codeMatch = fullLine.match(/Employee Code\s*[:]?\s*([A-Za-z0-9_-]+)/i);
                if (codeMatch && codeMatch[1] && !codeMatch[1].toUpperCase().includes('NAME')) empCode = codeMatch[1].trim();

                const nameMatch = fullLine.match(/Name\s*[:]?\s*([A-Za-z0-9\s_-]+)/i);
                if (nameMatch && nameMatch[1]) empName = nameMatch[1].trim();
                else {
                    const empCol = cols.find(c => c.toUpperCase().includes('EMPLOYEE') && !c.toUpperCase().includes('CODE'));
                    if (empCol) empName = empCol.replace(/[:]/g, '').replace(/EMPLOYEE/g, '').trim();
                }
                continue;
            }

            // Case-Insensitive Sub Total Row Exclusion
            if (lineUpper.includes('SUB TOTAL') || lineUpper.includes('SUBTOTAL') || lineUpper.includes('SUB-TOTAL')) {
                const nums = cols.filter(c => {
                    const clean = c.replace(/[$,]/g, '').trim();
                    return clean.length > 0 && !isNaN(parseFloat(clean)) && isFinite(clean);
                });
                if (nums.length >= 2) {
                    this.parsedSubTotalGst = parseFloat(nums[nums.length - 2].replace(/[$,]/g, '')).toFixed(2);
                    this.parsedSubTotalClaim = parseFloat(nums[nums.length - 1].replace(/[$,]/g, '')).toFixed(2);
                }
                continue; // CRITICAL: Exclude Sub Total line from claim rows!
            }

            // Case-Insensitive Grand Total Row Exclusion
            if (lineUpper.includes('GRAND TOTAL') || lineUpper.includes('GRANDTOTAL') || lineUpper.includes('GRAND-TOTAL')) {
                const nums = cols.filter(c => {
                    const clean = c.replace(/[$,]/g, '').trim();
                    return clean.length > 0 && !isNaN(parseFloat(clean)) && isFinite(clean);
                });
                if (nums.length >= 2) {
                    this.parsedGrandTotalGst = parseFloat(nums[nums.length - 2].replace(/[$,]/g, '')).toFixed(2);
                    this.parsedGrandTotalClaim = parseFloat(nums[nums.length - 1].replace(/[$,]/g, '')).toFixed(2);
                }
                continue; // CRITICAL: Exclude Grand Total line from claim rows!
            }

            if (i === headerLineIdx || lineUpper.includes('CLAIM GROUP NAME') || lineUpper.includes('REFERENCE NO') || lineUpper.includes('PAGE :') || lineUpper.includes('PERIOD :')) {
                continue;
            }

            // Extract row numbers dynamically from tail (Receipt Amt, GST, Claimable Amt)
            const numbersInRow = [];
            cols.forEach(c => {
                const cleanNumStr = c.replace(/[$,]/g, '').trim();
                if (cleanNumStr.length > 0 && !isNaN(parseFloat(cleanNumStr)) && isFinite(cleanNumStr)) {
                    if (!c.match(/\d{2}-\d{2}-\d{4}/) && !c.match(/\d{4}-\d{2}-\d{2}/) && cleanNumStr.length < 12) {
                        numbersInRow.push(parseFloat(cleanNumStr).toFixed(2));
                    }
                }
            });

            const refVal = cols[colIndex.refNo] || cols.find(c => c.toUpperCase().startsWith('CLM'));
            const hasDate = cols.some(c => c.match(/\d{2}-\d{2}-\d{4}/) || c.match(/\d{4}-\d{2}-\d{2}/));

            // Strictly process valid claim line items (must have Reference No or Date)
            if (refVal || (hasDate && numbersInRow.length > 0)) {
                if (refVal && refVal.toUpperCase().startsWith('CLM')) lastRefNo = refVal;
                else if (!lastRefNo) lastRefNo = 'CLM' + Math.floor(Math.random() * 1000000000);

                const recDateVal = cols[colIndex.receiptDate] || cols[2] || lastSubmitDate || '';
                const appDateVal = cols[colIndex.approvedDate] || cols[3] || lastApprovedDate || '';
                if (recDateVal) lastSubmitDate = recDateVal;
                if (appDateVal) lastApprovedDate = appDateVal;

                const statusVal = cols[colIndex.status] || 'APPROVED';
                if (statusVal.includes('APPROVED')) lastStatus = 'Approved';
                else if (statusVal.includes('PENDING')) lastStatus = 'Pending';
                else if (statusVal.includes('REJECTED')) lastStatus = 'Rejected';

                const approverVal = cols[colIndex.approver] || cols[colIndex.pendingWith] || lastApprover || '';
                if (approverVal && approverVal.length > 2) lastApprover = approverVal;

                const remarksVal = (colIndex.remarks !== -1 && cols[colIndex.remarks]) ? cols[colIndex.remarks].replace(/"/g, '').trim() : '';
                const officerCommentVal = (colIndex.officerComment !== -1 && cols[colIndex.officerComment]) ? cols[colIndex.officerComment].replace(/"/g, '').trim() : '';

                // Extract GST & Claimable Amt dynamically from numeric tail
                let claimAmtVal = '0.00';
                let gstVal = '0.00';
                let receiptAmtVal = '0.00';

                if (numbersInRow.length >= 3) {
                    receiptAmtVal = numbersInRow[numbersInRow.length - 3];
                    gstVal = numbersInRow[numbersInRow.length - 2];
                    claimAmtVal = numbersInRow[numbersInRow.length - 1];
                } else if (numbersInRow.length === 2) {
                    gstVal = numbersInRow[0];
                    claimAmtVal = numbersInRow[1];
                    receiptAmtVal = claimAmtVal;
                } else if (numbersInRow.length === 1) {
                    claimAmtVal = numbersInRow[0];
                    receiptAmtVal = claimAmtVal;
                }

                let groupName = cols[colIndex.groupCode] || cols[colIndex.claimName] || 'OTHER REIMBURSEMENT';
                let groupCode = 'OTHERS';

                const checkStr = (groupName + ' ' + officerCommentVal + ' ' + remarksVal).toLowerCase();
                if (checkStr.includes('dental') || checkStr.includes('clinic') || checkStr.includes('medical')) {
                    groupName = 'MEDICAL CLAIM';
                    groupCode = 'MLCLM';
                } else if (checkStr.includes('mobile') || checkStr.includes('phone') || checkStr.includes('local call')) {
                    groupName = 'MOBILE PHONE REIMBURSEMENT';
                    groupCode = 'MOBILE';
                } else if (checkStr.includes('headset') || checkStr.includes('laptop') || checkStr.includes('it')) {
                    groupName = 'ASSET / IT';
                    groupCode = 'ASSET';
                } else if (checkStr.includes('dinner') || checkStr.includes('client') || checkStr.includes('entertainment')) {
                    groupName = 'ENTERTAINMENT';
                    groupCode = 'ENTERT';
                }

                parsedData.push({
                    refNo: lastRefNo,
                    submitDate: lastSubmitDate,
                    approvedDate: lastApprovedDate,
                    groupCode: groupCode,
                    groupName: groupName,
                    remarks: remarksVal,
                    officerComment: officerCommentVal,
                    templateName: officerCommentVal || remarksVal || '',
                    approver: lastApprover,
                    gst: gstVal,
                    claimAmt: claimAmtVal,
                    hodApproval: lastStatus,
                    employeeName: empName,
                    attachedReceipt: null
                });
            }
        }

        this.employeeCode = empCode;
        this.employeeName = empName;

        if (parsedData.length > 0) {
            window.targetAccountingSystem = companyName.toUpperCase().includes('TOTM') ? 'SAP' : 'SQL';
            window.parsedCompanyName = companyName || 'Company Report';

            const badge = document.getElementById('targetSystemBadge');
            if (badge) {
                badge.textContent = `Target: ${window.targetAccountingSystem} (${window.parsedCompanyName})`;
                badge.style.display = 'inline-block';
            }

            this.dummyData = parsedData;
            this.renderTable();
            window.SidePanelLog.log('p2 stage 1', `Parsed ${parsedData.length} claim(s) from uploaded CSV report dynamically.`);
        } else {
            window.SidePanelLog.log('p2 stage 1', 'Failed to parse report CSV. Format mismatch.');
        }
    }
};
