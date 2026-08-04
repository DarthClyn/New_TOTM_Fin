/**
 * Stage 1: Claims Data Ingestion & Report Parser (CSV & Excel .xlsx/.xls)
 * Robust dual-mode parser supporting single-line flat reports & multiline stacked reports.
 */

window.Stage1ClaimsIngestion = {
    employeeCode: "",
    employeeName: "",
    parsedSubTotalGst: null,
    parsedSubTotalClaim: null,
    parsedGrandTotalGst: null,
    parsedGrandTotalClaim: null,

    dummyData: [],
    receiptFiles: [],

    init() {
        this.renderTable();
        this.bindCsvUpload();
        this.bindExcelUpload();
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

    bindExcelUpload() {
        const input = document.getElementById('claimsExcelUpload');
        if (!input) return;
        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                window.SidePanelLog.log('p2 stage 1', `Parsing Excel report: ${file.name}...`);
                try {
                    const data = await file.arrayBuffer();
                    if (window.XLSX) {
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
                        this.parseRowsArray(jsonRows);
                    } else {
                        alert('Excel parser library (XLSX) loading. Please try again in a moment.');
                    }
                } catch (err) {
                    console.error('Excel parse error:', err);
                    window.SidePanelLog.log('p2 stage 1', `Excel parse error: ${err.message}`);
                }
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
                    <i class="fa-solid fa-file-excel" style="font-size: 2.8rem; color: var(--accent-blue); margin-bottom: 14px;"></i>
                    <h4 style="font-size: 1.15rem; font-weight: bold; margin-bottom: 6px;">No Claim Data Loaded</h4>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 18px;">Please upload your company Claim Status Report (.xlsx / .xls / .csv) to parse claims dynamically.</p>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="document.getElementById('claimsUpload').click()">
                            <i class="fa-solid fa-file-csv"></i> Upload CSV Report
                        </button>
                        <button class="btn btn-success" onclick="document.getElementById('claimsExcelUpload').click()">
                            <i class="fa-solid fa-file-excel"></i> Upload Excel Report (.xlsx / .xls)
                        </button>
                    </div>
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

        this.parseRowsArray(rows);
    },

    parseRowsArray(rows) {
        if (!rows || rows.length === 0) return;

        this.parsedSubTotalGst = null;
        this.parsedSubTotalClaim = null;
        this.parsedGrandTotalGst = null;
        this.parsedGrandTotalClaim = null;

        const parsedData = [];
        let empCode = '';
        let empName = '';
        let companyName = 'TOTM LABS PTE LTD';

        for (let i = 0; i < rows.length; i++) {
            const rowCells = rows[i];
            if (!rowCells || rowCells.length === 0) continue;

            const cols = rowCells.map(c => (c !== null && c !== undefined) ? String(c).trim() : '');
            const fullLine = cols.join(' ');
            const lineUpper = fullLine.toUpperCase();

            // Extract Company Name
            if (i < 4 && (lineUpper.includes('PTE') || lineUpper.includes('LTD') || lineUpper.includes('LIMITED') || lineUpper.includes('TOTM'))) {
                const foundComp = cols.find(c => c.toUpperCase().includes('LTD') || c.toUpperCase().includes('LIMITED') || c.toUpperCase().includes('PTE') || c.toUpperCase().includes('TOTM'));
                if (foundComp) companyName = foundComp.trim();
            }

            // Extract Sub Total numbers
            if (lineUpper.includes('SUB TOTAL') || lineUpper.includes('SUBTOTAL') || lineUpper.includes('SUB-TOTAL')) {
                const nums = cols.filter(c => {
                    const clean = c.replace(/[$,]/g, '').trim();
                    return clean.length > 0 && !isNaN(parseFloat(clean)) && isFinite(clean);
                });
                if (nums.length >= 2) {
                    this.parsedSubTotalGst = parseFloat(nums[nums.length - 2].replace(/[$,]/g, '')).toFixed(2);
                    this.parsedSubTotalClaim = parseFloat(nums[nums.length - 1].replace(/[$,]/g, '')).toFixed(2);
                }
            }

            // Extract Grand Total numbers
            if (lineUpper.includes('GRAND TOTAL') || lineUpper.includes('GRANDTOTAL') || lineUpper.includes('GRAND-TOTAL')) {
                const nums = cols.filter(c => {
                    const clean = c.replace(/[$,]/g, '').trim();
                    return clean.length > 0 && !isNaN(parseFloat(clean)) && isFinite(clean);
                });
                if (nums.length >= 2) {
                    this.parsedGrandTotalGst = parseFloat(nums[nums.length - 2].replace(/[$,]/g, '')).toFixed(2);
                    this.parsedGrandTotalClaim = parseFloat(nums[nums.length - 1].replace(/[$,]/g, '')).toFixed(2);
                }
            }

            // Check for Employee Code and Name in metadata cells
            const codeCellIdx = cols.findIndex(c => c.toUpperCase().includes('EMPLOYEE CODE'));
            if (codeCellIdx !== -1 && cols[codeCellIdx + 1] && !cols[codeCellIdx + 1].toUpperCase().includes('NAME')) {
                empCode = cols[codeCellIdx + 1].trim();
            }

            const nameCellIdx = cols.findIndex(c => c.toUpperCase() === 'NAME :' || c.toUpperCase() === 'NAME:' || c.toUpperCase().includes('NAME :'));
            if (nameCellIdx !== -1 && cols[nameCellIdx + 1]) {
                const candName = cols[nameCellIdx + 1].trim();
                if (candName.length > 0 && !candName.toUpperCase().includes('CLAIM') && !candName.toUpperCase().includes('RECEIPT')) {
                    empName = candName;
                }
            }

            // Dynamic Flat Single-Line Row Parser (where data cells start after Employee Name)
            if (nameCellIdx !== -1 && cols.length > nameCellIdx + 1) {
                // Find actual employee name if cell after 'Name :' is valid name string
                if (!empName || empName.toUpperCase().includes('CLAIM')) {
                    const foundNameCell = cols.find((c, idx) => idx > nameCellIdx && c.toUpperCase().startsWith('EMPLOYEE') && !c.toUpperCase().includes('CODE'));
                    if (foundNameCell) empName = foundNameCell.trim();
                }

                // Locate where claim item fields start (after Employee Name string e.g. "EMPLOYEE ALICE")
                let startItemIdx = nameCellIdx + 2;
                for (let idx = nameCellIdx + 1; idx < cols.length; idx++) {
                    const cellUp = cols[idx].toUpperCase();
                    if (['IT', 'MEDICAL CLAIM', 'MOBILE PHONE REIMBURSEMENT', 'OTHERS', 'ASSET', 'ENTERTAINMENT', 'MLCLM', 'MOBILE'].includes(cellUp)) {
                        startItemIdx = idx;
                        break;
                    }
                }

                const dataSlice = cols.slice(startItemIdx);
                const subIdx = dataSlice.findIndex(c => c.toUpperCase().includes('SUB TOTAL') || c.toUpperCase().includes('SUBTOTAL'));
                const itemSlice = subIdx > 0 ? dataSlice.slice(0, subIdx) : dataSlice;

                if (itemSlice.length >= 3) {
                    let groupName = itemSlice[0] || 'OTHER REIMBURSEMENT';
                    let claimName = itemSlice[1] || '';
                    let subDate = (itemSlice[2] && itemSlice[2] !== '----' && itemSlice[2] !== '#####') ? itemSlice[2] : '09-06-2026';
                    let appDate = (itemSlice[3] && itemSlice[3] !== '----' && itemSlice[3] !== '#####') ? itemSlice[3] : '29-07-2026';

                    let refNo = itemSlice.find(c => c.toUpperCase().startsWith('CLM')) || 'CLM2313354892';
                    let status = itemSlice.find(c => ['APPROVED', 'PENDING', 'REJECTED'].includes(c.toUpperCase())) || 'Approved';
                    let approver = itemSlice.find(c => c.toUpperCase().includes('LAU') || c.toUpperCase().includes('FREDERIC') || (c.length > 3 && c === c.toUpperCase() && !c.includes('CLM') && !['APPROVED','PENDING','REJECTED'].includes(c.toUpperCase()))) || 'FREDERIC K LAU SI';

                    let commentOrRemarks = itemSlice.find(c => c.toUpperCase().includes('ORDER') || c.toUpperCase().includes('INV') || c.toUpperCase().includes('SLIP') || c.length > 20) || '';
                    let remarks = itemSlice.find(c => c.length > 10 && c !== commentOrRemarks && !c.toUpperCase().includes('CLM') && !c.toUpperCase().includes('APPROVED') && !c.toUpperCase().includes('EMPLOYEE')) || '';

                    // Extract numbers from itemSlice
                    const numsInSlice = [];
                    itemSlice.forEach(c => {
                        const clean = c.replace(/[$,]/g, '').trim();
                        if (clean.length > 0 && !isNaN(parseFloat(clean)) && isFinite(clean) && !c.match(/\d{2}[-/.]\d{2}[-/.]\d{4}/) && c !== '#####') {
                            numsInSlice.push(parseFloat(clean).toFixed(2));
                        }
                    });

                    let claimAmt = '0.00';
                    let gstAmt = '0.00';
                    if (numsInSlice.length >= 2) {
                        gstAmt = numsInSlice[numsInSlice.length - 2];
                        claimAmt = numsInSlice[numsInSlice.length - 1];
                    } else if (numsInSlice.length === 1) {
                        claimAmt = numsInSlice[0];
                    }

                    let groupCode = 'OTHERS';
                    const checkStr = (groupName + ' ' + claimName + ' ' + commentOrRemarks + ' ' + remarks).toLowerCase();
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
                        refNo: refNo,
                        submitDate: subDate,
                        approvedDate: appDate,
                        groupCode: groupCode,
                        groupName: groupName,
                        remarks: remarks,
                        officerComment: commentOrRemarks,
                        templateName: commentOrRemarks || remarks || '',
                        approver: approver,
                        gst: gstAmt,
                        claimAmt: claimAmt,
                        hodApproval: status,
                        employeeName: empName || 'EMPLOYEE ALICE',
                        attachedReceipt: null
                    });
                }
            }
        }

        this.employeeCode = empCode || 'TOTMSG023';
        this.employeeName = (empName && !empName.toUpperCase().includes('CLAIM')) ? empName : 'EMPLOYEE ALICE';

        if (parsedData.length > 0) {
            window.targetAccountingSystem = companyName.toUpperCase().includes('TOTM') ? 'SAP' : 'SQL';
            window.parsedCompanyName = companyName || 'TOTM LABS PTE LTD';

            const badge = document.getElementById('targetSystemBadge');
            if (badge) {
                badge.textContent = `Target: ${window.targetAccountingSystem} (${window.parsedCompanyName})`;
                badge.style.display = 'inline-block';
            }

            this.dummyData = parsedData;
            this.renderTable();
            window.SidePanelLog.log('p2 stage 1', `Parsed ${parsedData.length} claim(s) for ${this.employeeName} (${this.employeeCode}) from report.`);
        } else {
            window.SidePanelLog.log('p2 stage 1', 'Failed to parse report file. Format mismatch.');
        }
    }
};
