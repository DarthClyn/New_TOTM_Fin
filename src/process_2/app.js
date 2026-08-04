/**
 * Process 2 Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
    // Render table by default on load
    if (window.Stage1ClaimsIngestion) {
        window.Stage1ClaimsIngestion.renderTable();
    }

    // Bind Save Claims Button
    const saveClaimsBtn = document.getElementById('saveClaimsBtn');
    if (saveClaimsBtn) {
        saveClaimsBtn.addEventListener('click', () => {
            saveClaimsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            saveClaimsBtn.disabled = true;

            // Simulate network delay for saving
            setTimeout(() => {
                if (window.Stage1ClaimsIngestion.saveChanges) {
                    window.Stage1ClaimsIngestion.saveChanges();
                }
                saveClaimsBtn.innerHTML = '<i class="fa-solid fa-check"></i> Changes Saved';
                setTimeout(() => {
                    saveClaimsBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
                    saveClaimsBtn.disabled = false;
                }, 2000);
            }, 600);
        });
    }

    // Policy Configuration Upload & Save
    const savePolicyBtn = document.getElementById('savePolicyBtn');
    const policyUpload = document.getElementById('policyUpload');
    const policyText = document.getElementById('policyText');

    if (savePolicyBtn) {
        savePolicyBtn.addEventListener('click', () => {
            savePolicyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            savePolicyBtn.disabled = true;
            setTimeout(() => {
                savePolicyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Policy Saved';
                window.SidePanelLog.log('p2 stage 1', 'Claim policy configuration updated and saved.');
                setTimeout(() => {
                    savePolicyBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Policy';
                    savePolicyBtn.disabled = false;
                }, 2000);
            }, 500);
        });
    }

    if (policyUpload) {
        policyUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            window.SidePanelLog.log('p2 stage 1', `Reading policy file: ${file.name}...`);

            const reader = new FileReader();

            reader.onload = (evt) => {
                const content = evt.target.result;
                // Append the file text to existing policy (do not replace)
                policyText.value = policyText.value.trim()
                    ? policyText.value.trim() + '\n\n' + content
                    : content;

                window.SidePanelLog.log('p2 stage 1', `Policy loaded from ${file.name} (${content.length} characters).`);
            };

            reader.onerror = () => {
                window.SidePanelLog.log('p2 stage 1', `Failed to read file: ${file.name}.`);
            };

            // Read as plain text (works for .txt and text-based .pdf)
            reader.readAsText(file);
        });
    }

    // CSV File Upload binding
    const claimsUpload = document.getElementById('claimsUpload');
    if (claimsUpload) {
        claimsUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            window.SidePanelLog.log('p2 stage 1', `Reading claims CSV file: ${file.name}...`);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const content = evt.target.result;
                if (window.Stage1ClaimsIngestion && window.Stage1ClaimsIngestion.parseCSV) {
                    window.Stage1ClaimsIngestion.parseCSV(content);
                }
            };
            reader.readAsText(file);
        });
    }

    // Receipts Upload binding
    const receiptsUpload = document.getElementById('receiptsUpload');
    if (receiptsUpload) {
        receiptsUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            window.SidePanelLog.log('p2 stage 1', `Reading ${files.length} supporting documents...`);

            let fullReceiptsText = window.p2ReceiptsText || '';
            const previewContainer = document.getElementById('receiptsPreviewContainer');
            if (previewContainer && fullReceiptsText === '') {
                previewContainer.innerHTML = ''; // clear empty state
            }

            for (const file of files) {
                let text = '';
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    try {
                        const fileArrayBuffer = await file.arrayBuffer();
                        const pdf = await window.pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
                        let pdfText = '';
                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const content = await page.getTextContent();
                            pdfText += content.items.map(item => item.str).join(' ') + '\n';
                        }
                        text = pdfText;
                    } catch(err) {
                        console.error('PDF extraction failed:', err);
                        text = `[Failed to extract text from PDF: ${file.name}]`;
                    }
                } else {
                    // For txt, csv, etc.
                    try {
                        text = await file.text();
                    } catch(err) {
                        text = `[Failed to read text from file: ${file.name}]`;
                    }
                }
                
                fullReceiptsText += `\n--- START RECEIPT: ${file.name} ---\n${text}\n--- END RECEIPT: ${file.name} ---\n`;
                window.SidePanelLog.log('p2 stage 1', `Extracted text from receipt: ${file.name}`);
                
                if (previewContainer) {
                    previewContainer.innerHTML += `<div class="card p-2 mb-2" style="background: var(--bg-alt);"><p class="text-sm font-bold"><i class="fa-solid fa-file"></i> ${file.name}</p><p class="text-xs text-muted">${text.substring(0, 100)}...</p></div>`;
                }
            }
            window.p2ReceiptsText = fullReceiptsText;
        });
    }

    // STATE Variables to pass between stages
    let aiDecisionsState = null;
    let glMappingsState = null;
    let pipelineWaitingForHuman = false; // flag: pipeline paused for human review

    // Helper: check if all MANUAL rows are resolved; if so, auto-push to DB
    window._stage4AutoPushCheck = function() {
        if (!pipelineWaitingForHuman) return;
        const remaining = document.querySelectorAll('.gl-mapping-row .gl-select option[value="MANUAL"]:checked').length;
        if (remaining === 0) {
            pipelineWaitingForHuman = false;
            window.SidePanelLog.log('p2 stage 4', 'All human reviews saved. Auto-pushing to database...');
            const claims = window.Stage1ClaimsIngestion.dummyData;
            const mappings = glMappingsState();
            document.getElementById('stage5Status').textContent = 'Processing...';
            document.getElementById('stage5Status').className = 'badge badge-accent';
            const pushSuccess = window.Stage5Database.pushToDatabase(claims, aiDecisionsState, mappings);
            if (pushSuccess) {
                document.getElementById('stage5Status').textContent = 'Complete';
                document.getElementById('stage5Status').className = 'badge badge-match';
                window.SidePanelLog.log('p2 stage 5', 'Auto DB push complete after human review.');
                
                // Scroll to the database viewer so user sees the refresh
                document.getElementById('stage5Content').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            window.SidePanelLog.log('p2 stage 4', `${remaining} Human Required row(s) still pending. Save them to trigger DB push.`);
        }
    };

    // Run Full Pipeline (Run All Stages)
    const runProcessBtn = document.getElementById('runProcessBtn');
    if (runProcessBtn) {
        runProcessBtn.addEventListener('click', async () => {
            runProcessBtn.disabled = true;
            runProcessBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running Automation Pipeline...';
            pipelineWaitingForHuman = false;

            try {
                if (window.Stage1ClaimsIngestion.saveChanges) {
                    window.Stage1ClaimsIngestion.saveChanges();
                }

                const claims = window.Stage1ClaimsIngestion.dummyData;
                const policy = policyText.value;

                // STAGE 2: Document Matcher
                document.getElementById('stage2Status').textContent = 'Processing...';
                document.getElementById('stage2Status').className = 'badge badge-accent';
                const docMatchState = await window.Stage2DocumentMatcher.run(claims);
                if (!docMatchState) throw new Error('Stage 2 failed');
                document.getElementById('stage2Status').textContent = 'Complete';
                document.getElementById('stage2Status').className = 'badge badge-match';

                // STAGE 3: Policy Checker
                document.getElementById('stage3Status').textContent = 'Processing...';
                document.getElementById('stage3Status').className = 'badge badge-accent';
                aiDecisionsState = await window.Stage3PolicyChecker.run(claims, policy);
                if (!aiDecisionsState) throw new Error('Stage 3 failed');
                document.getElementById('stage3Status').textContent = 'Complete';
                document.getElementById('stage3Status').className = 'badge badge-match';

                // STAGE 4: GL Mapping
                document.getElementById('stage4Status').textContent = 'Processing...';
                document.getElementById('stage4Status').className = 'badge badge-accent';
                const getMappingsFunc = await window.Stage4GLMapper.run(claims);
                if (!getMappingsFunc) throw new Error('Stage 4 failed');
                glMappingsState = getMappingsFunc;

                // Check if any rows still need human review
                const manualRows = document.querySelectorAll('.gl-mapping-row .gl-select option[value="MANUAL"]:checked').length;

                if (manualRows > 0) {
                    // PAUSE pipeline — wait for human to save manual mappings
                    pipelineWaitingForHuman = true;
                    document.getElementById('stage4Status').textContent = `${manualRows} Human Review Pending`;
                    document.getElementById('stage4Status').className = 'badge badge-partial';
                    document.getElementById('stage5Status').textContent = 'Waiting for Human Review';
                    document.getElementById('stage5Status').className = 'badge badge-partial';
                    window.SidePanelLog.log('p2 stage 4', `Pipeline paused: ${manualRows} row(s) need Human Review. Save them in Stage 4 to auto-push to DB.`);
                } else {
                    // No manual rows — go straight to Stage 5
                    document.getElementById('stage4Status').textContent = 'Complete';
                    document.getElementById('stage4Status').className = 'badge badge-match';

                    await new Promise(r => setTimeout(r, 600));

                    // STAGE 5: Database Push
                    document.getElementById('stage5Status').textContent = 'Processing...';
                    document.getElementById('stage5Status').className = 'badge badge-accent';
                    const mappings = glMappingsState();
                    const pushSuccess = window.Stage5Database.pushToDatabase(claims, aiDecisionsState, mappings);
                    if (pushSuccess) {
                        document.getElementById('stage5Status').textContent = 'Complete';
                        document.getElementById('stage5Status').className = 'badge badge-match';
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Pipeline encountered an error. Check logs.");
            } finally {
                runProcessBtn.disabled = false;
                runProcessBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run All Stages (Automated Process)';
            }
        });
    }

    // STAGE 2: Run Document Matcher
    const runStage2Btn = document.getElementById('runStage2Btn');
    if (runStage2Btn) {
        runStage2Btn.addEventListener('click', async () => {
            runStage2Btn.disabled = true;
            runStage2Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
            try {
                if (window.Stage1ClaimsIngestion.saveChanges) window.Stage1ClaimsIngestion.saveChanges();
                const claims = window.Stage1ClaimsIngestion.dummyData;

                document.getElementById('stage2Status').textContent = 'Processing...';
                document.getElementById('stage2Status').className = 'badge badge-accent';
                const docMatchState = await window.Stage2DocumentMatcher.run(claims);
                if (!docMatchState) throw new Error('Stage 2 failed');
                document.getElementById('stage2Status').textContent = 'Complete';
                document.getElementById('stage2Status').className = 'badge badge-match';
            } catch (err) {
                console.error(err);
                alert("Stage 2 encountered an error.");
            } finally {
                runStage2Btn.disabled = false;
                runStage2Btn.innerHTML = '<i class="fa-solid fa-play"></i> Run Document Matcher';
            }
        });
    }

    // STAGE 3: Run Policy Checker
    const runStage3Btn = document.getElementById('runStage3Btn');
    if (runStage3Btn) {
        runStage3Btn.addEventListener('click', async () => {
            runStage3Btn.disabled = true;
            runStage3Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
            try {
                if (window.Stage1ClaimsIngestion.saveChanges) window.Stage1ClaimsIngestion.saveChanges();
                const claims = window.Stage1ClaimsIngestion.dummyData;
                const policy = policyText.value;

                document.getElementById('stage3Status').textContent = 'Processing...';
                document.getElementById('stage3Status').className = 'badge badge-accent';
                aiDecisionsState = await window.Stage3PolicyChecker.run(claims, policy);
                if (!aiDecisionsState) throw new Error('Stage 3 failed');
                document.getElementById('stage3Status').textContent = 'Complete';
                document.getElementById('stage3Status').className = 'badge badge-match';
            } catch (err) {
                console.error(err);
                alert("Stage 3 encountered an error.");
            } finally {
                runStage3Btn.disabled = false;
                runStage3Btn.innerHTML = '<i class="fa-solid fa-play"></i> Run Policy Checker';
            }
        });
    }

    // STAGE 4: Run GL Mapping
    const runStage4Btn = document.getElementById('runStage4Btn');
    if (runStage4Btn) {
        runStage4Btn.addEventListener('click', async () => {
            runStage4Btn.disabled = true;
            runStage4Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mapping...';
            try {
                const claims = window.Stage1ClaimsIngestion.dummyData;
                document.getElementById('stage4Status').textContent = 'Processing...';
                document.getElementById('stage4Status').className = 'badge badge-accent';
                const getMappingsFunc = await window.Stage4GLMapper.run(claims);
                if (!getMappingsFunc) throw new Error('Stage 4 failed');
                glMappingsState = getMappingsFunc;
                document.getElementById('stage4Status').textContent = 'Complete';
                document.getElementById('stage4Status').className = 'badge badge-match';
            } catch (err) {
                console.error(err);
                alert("Stage 4 encountered an error.");
            } finally {
                runStage4Btn.disabled = false;
                runStage4Btn.innerHTML = '<i class="fa-solid fa-play"></i> Run GL Mapping';
            }
        });
    }

    // STAGE 5: Push to Database
    const runStage5Btn = document.getElementById('runStage5Btn');
    if (runStage5Btn) {
        runStage5Btn.addEventListener('click', () => {
            if (!aiDecisionsState) {
                alert("Please run Stage 3 (Policy Checker) first!");
                return;
            }
            if (!glMappingsState) {
                alert("Please run Stage 4 (GL Mapping) first!");
                return;
            }
            runStage5Btn.disabled = true;
            runStage5Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pushing...';
            try {
                const claims = window.Stage1ClaimsIngestion.dummyData;
                const mappings = glMappingsState(); 
                document.getElementById('stage5Status').textContent = 'Processing...';
                document.getElementById('stage5Status').className = 'badge badge-accent';
                const pushSuccess = window.Stage5Database.pushToDatabase(claims, aiDecisionsState, mappings);
                if (pushSuccess) {
                    document.getElementById('stage5Status').textContent = 'Complete';
                    document.getElementById('stage5Status').className = 'badge badge-match';
                }
            } catch (err) {
                console.error(err);
                alert("Stage 5 encountered an error.");
            } finally {
                runStage5Btn.disabled = false;
                runStage5Btn.innerHTML = '<i class="fa-solid fa-play"></i> Push to SQL DB';
            }
        });
    }
});
