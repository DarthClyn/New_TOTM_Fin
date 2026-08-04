document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = {
        sg: document.getElementById('fileSG'),
        in: document.getElementById('fileIN'),
        id: document.getElementById('fileID')
    };

    const fileInfos = {
        sg: document.getElementById('infoSG'),
        in: document.getElementById('infoIN'),
        id: document.getElementById('infoID')
    };

    const uploadCards = {
        sg: document.getElementById('uploadCardSG'),
        in: document.getElementById('uploadCardIN'),
        id: document.getElementById('uploadCardID')
    };

    let filesBase64 = {
        sg: null,
        in: null,
        id: null
    };

    // Helper to read file as base64
    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // get base64 part only
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    // Setup file input listeners
    Object.keys(fileInputs).forEach(key => {
        fileInputs[key].addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                fileInfos[key].textContent = file.name;
                uploadCards[key].classList.add('has-file');
                try {
                    filesBase64[key] = await readFileAsBase64(file);
                    checkAllFilesLoaded();
                } catch (err) {
                    console.error('Error reading file', err);
                    alert('Error reading file ' + file.name);
                }
            }
        });
    });

    const btnStage1 = document.getElementById('btnStage1');
    const btnStage2 = document.getElementById('btnStage2');

    const checkAllFilesLoaded = () => {
        // Just require at least 1 file to be able to test things, or require all 3?
        // Let's require all 3 for the full pipeline.
        if (filesBase64.sg && filesBase64.in && filesBase64.id) {
            btnStage1.disabled = false;
        }
    };

    // By default require all files, so btn is enabled when checked
    // Wait, initially they aren't disabled in HTML, let's just alert if missing.

    const runPipeline = async (stage) => {
        if (!filesBase64.sg || !filesBase64.in || !filesBase64.id) {
            alert('Please upload all 3 Excel files (SG, IN, ID) before running the pipeline.');
            return;
        }

        const loaderBox = document.getElementById('loaderBox');
        const loaderStatus = document.getElementById('loaderStatus');
        const resultsContainer = document.getElementById('resultsContainer');
        
        loaderBox.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        
        loaderStatus.textContent = stage === 1 ? 'Running Stage 1: Pandas Normalization & Mapping...' : 'Running Stage 2: AI Semantic Mapping...';

        try {
            const response = await fetch('/api/p3/consolidate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stage: stage,
                    files: filesBase64
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server error occurred');
            }

            // Success
            loaderBox.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
            document.getElementById('resultsTitle').innerHTML = `<i class="fa-solid fa-check-circle" style="color: var(--accent-green);"></i> Stage ${stage} Complete`;
            
            // Handle UI display switching between stages
            if (stage === 1) {
                document.getElementById('rawContainers').classList.remove('hidden');
                document.getElementById('mappingContainers').classList.add('hidden');
                renderGenericTable(data.sg_raw, 'sgRawTableHead', 'sgRawTableBody');
                renderGenericTable(data.in_raw, 'inRawTableHead', 'inRawTableBody');
                renderGenericTable(data.id_raw, 'idRawTableHead', 'idRawTableBody');
                btnStage2.disabled = false;
            } else {
                document.getElementById('rawContainers').classList.add('hidden');
                document.getElementById('mappingContainers').classList.remove('hidden');
                renderGenericTable(data.india_mapping, 'indiaTableHead', 'indiaTableBody');
                renderGenericTable(data.indo_mapping, 'indoTableHead', 'indoTableBody');
            }

            // Handle download
            if (data.excel_base64) {
                const downloadBtn = document.getElementById('downloadBtn');
                downloadBtn.classList.remove('hidden');
                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + data.excel_base64;
                    link.download = 'SG_Group_Consolidation_May2026.xlsx';
                    link.click();
                };
            }

        } catch (err) {
            loaderBox.classList.add('hidden');
            alert('Error: ' + err.message);
        }
    };

    btnStage1.addEventListener('click', () => runPipeline(1));
    btnStage2.addEventListener('click', () => runPipeline(2));

    const renderGenericTable = (rows, headId, bodyId) => {
        const thead = document.getElementById(headId);
        const tbody = document.getElementById(bodyId);
        
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No data available</td></tr>';
            return;
        }

        // Headers
        const headers = Object.keys(rows[0]);
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            thead.appendChild(th);
        });

        // Body (limit to 200 rows for preview)
        rows.slice(0, 200).forEach(row => {
            const tr = document.createElement('tr');
            
            // Highlight specific rows based on status
            if (row['Status']) {
                if (row['Status'].includes('UNMAPPED') || row['Status'].includes('REQUIRED')) {
                    tr.style.backgroundColor = 'rgba(255, 99, 132, 0.1)';
                } else if (row['Status'].includes('AI RESOLVED')) {
                    tr.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                }
            }

            headers.forEach(h => {
                const td = document.createElement('td');
                if (h === 'Status') {
                    if (row[h].includes('UNMAPPED') || row[h].includes('NOT FOUND')) {
                        td.innerHTML = `<span style="color: #d32f2f; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> ${row[h]}</span>`;
                    } else if (row[h].includes('REQUIRED') || row[h].includes('MULTIPLE')) {
                        td.innerHTML = `<span style="color: #d32f2f; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> ${row[h]}</span>`;
                    } else if (row[h].includes('AI RESOLVED')) {
                        td.innerHTML = `<span style="color: #f57c00; font-weight: 600;"><i class="fa-solid fa-wand-magic-sparkles"></i> ${row[h]}</span>`;
                    } else {
                        td.innerHTML = `<span style="color: var(--accent-green); font-weight: 600;"><i class="fa-solid fa-check"></i> ${row[h]}</span>`;
                    }
                } else {
                    td.textContent = row[h];
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    };
});
