/**
 * Process 2 Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
    // Render table & receipt cards by default on load
    if (window.Stage1ClaimsIngestion) {
        if (window.Stage1ClaimsIngestion.init) {
            window.Stage1ClaimsIngestion.init();
        } else {
            window.Stage1ClaimsIngestion.renderTable();
        }
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


    // STATE Variables to pass between stages
    let aiDecisionsState = null;
    let glMappingsState = null;
    let pipelineWaitingForHuman = false; // flag: pipeline paused for human review

    // Helper: check if all MANUAL rows are resolved; if so, auto-push to DB
    window._stage3AutoPushCheck = function() {
        if (!pipelineWaitingForHuman) return;
        const remaining = document.querySelectorAll('.gl-mapping-row .gl-select option[value="MANUAL"]:checked').length;
        if (remaining === 0) {
            pipelineWaitingForHuman = false;
            window.SidePanelLog.log('p2 stage 3', 'All human reviews saved. Auto-pushing to database...');
            const claims = window.Stage1ClaimsIngestion.dummyData;
            const mappings = glMappingsState();
            document.getElementById('stage4Status').textContent = 'Processing...';
            document.getElementById('stage4Status').className = 'badge badge-accent';
            const pushSuccess = window.Stage4Database.pushToDatabase(claims, aiDecisionsState, mappings);
            if (pushSuccess) {
                document.getElementById('stage4Status').textContent = 'Complete';
                document.getElementById('stage4Status').className = 'badge badge-match';
                window.SidePanelLog.log('p2 stage 4', 'Auto DB push complete after human review.');
                
                // Scroll to the database viewer so user sees the refresh
                document.getElementById('stage4Content').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            window.SidePanelLog.log('p2 stage 3', `${remaining} Human Required row(s) still pending. Save them to trigger DB push.`);
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
                const receiptFiles = window.Stage1ClaimsIngestion.receiptFiles;

                // STAGE 2
                document.getElementById('stage2Status').textContent = 'Processing...';
                document.getElementById('stage2Status').className = 'badge badge-accent';
                aiDecisionsState = await window.Stage2PolicyChecker.run(claims, policy, receiptFiles);
                if (!aiDecisionsState) throw new Error('Stage 2 failed');
                document.getElementById('stage2Status').textContent = 'Complete';
                document.getElementById('stage2Status').className = 'badge badge-match';

                // STAGE 3
                document.getElementById('stage3Status').textContent = 'Processing...';
                document.getElementById('stage3Status').className = 'badge badge-accent';
                const getMappingsFunc = await window.Stage3GLMapper.run(claims);
                if (!getMappingsFunc) throw new Error('Stage 3 failed');
                glMappingsState = getMappingsFunc;

                // Check if any rows still need human review
                const manualRows = document.querySelectorAll('.gl-mapping-row .gl-select option[value="MANUAL"]:checked').length;

                if (manualRows > 0) {
                    // PAUSE pipeline — wait for human to save manual mappings
                    pipelineWaitingForHuman = true;
                    document.getElementById('stage3Status').textContent = `${manualRows} Human Review Pending`;
                    document.getElementById('stage3Status').className = 'badge badge-partial';
                    document.getElementById('stage4Status').textContent = 'Waiting for Human Review';
                    document.getElementById('stage4Status').className = 'badge badge-partial';
                    window.SidePanelLog.log('p2 stage 3', `Pipeline paused: ${manualRows} row(s) need Human Review. Save them in Stage 3 to auto-push to DB.`);
                } else {
                    // No manual rows — go straight to Stage 4
                    document.getElementById('stage3Status').textContent = 'Complete';
                    document.getElementById('stage3Status').className = 'badge badge-match';

                    await new Promise(r => setTimeout(r, 600));

                    // STAGE 4
                    document.getElementById('stage4Status').textContent = 'Processing...';
                    document.getElementById('stage4Status').className = 'badge badge-accent';
                    const mappings = glMappingsState();
                    const pushSuccess = window.Stage4Database.pushToDatabase(claims, aiDecisionsState, mappings);
                    if (pushSuccess) {
                        document.getElementById('stage4Status').textContent = 'Complete';
                        document.getElementById('stage4Status').className = 'badge badge-match';
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

    // STAGE 2: Run Policy Checker
    const runStage2Btn = document.getElementById('runStage2Btn');
    if (runStage2Btn) {
        runStage2Btn.addEventListener('click', async () => {
            runStage2Btn.disabled = true;
            runStage2Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
            
            try {
                if (window.Stage1ClaimsIngestion.saveChanges) window.Stage1ClaimsIngestion.saveChanges();
                
                const claims = window.Stage1ClaimsIngestion.dummyData;
                const policy = policyText.value;
                const receiptFiles = window.Stage1ClaimsIngestion.receiptFiles;

                document.getElementById('stage2Status').textContent = 'Processing...';
                document.getElementById('stage2Status').className = 'badge badge-accent';
                
                aiDecisionsState = await window.Stage2PolicyChecker.run(claims, policy, receiptFiles);
                
                if (!aiDecisionsState) throw new Error('Stage 2 failed');
                
                document.getElementById('stage2Status').textContent = 'Complete';
                document.getElementById('stage2Status').className = 'badge badge-match';
            } catch (err) {
                console.error(err);
                alert("Stage 2 encountered an error.");
            } finally {
                runStage2Btn.disabled = false;
                runStage2Btn.innerHTML = '<i class="fa-solid fa-play"></i> Run AI + OCR Match & Policy Check';
            }
        });
    }

    // STAGE 3: Run GL Mapping
    const runStage3Btn = document.getElementById('runStage3Btn');
    if (runStage3Btn) {
        runStage3Btn.addEventListener('click', async () => {
            runStage3Btn.disabled = true;
            runStage3Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mapping...';
            
            try {
                const claims = window.Stage1ClaimsIngestion.dummyData;

                document.getElementById('stage3Status').textContent = 'Processing...';
                document.getElementById('stage3Status').className = 'badge badge-accent';
                
                const getMappingsFunc = await window.Stage3GLMapper.run(claims);
                
                if (!getMappingsFunc) throw new Error('Stage 3 failed');
                
                // Store function reference to extract mappings later
                glMappingsState = getMappingsFunc;
                
                document.getElementById('stage3Status').textContent = 'Complete';
                document.getElementById('stage3Status').className = 'badge badge-match';
            } catch (err) {
                console.error(err);
                alert("Stage 3 encountered an error.");
            } finally {
                runStage3Btn.disabled = false;
                runStage3Btn.innerHTML = '<i class="fa-solid fa-play"></i> Run GL Mapping';
            }
        });
    }

    // STAGE 4: Push to Database
    const runStage4Btn = document.getElementById('runStage4Btn');
    if (runStage4Btn) {
        runStage4Btn.addEventListener('click', () => {
            if (!aiDecisionsState) {
                alert("Please run Stage 2 (Policy Checker) first!");
                return;
            }
            if (!glMappingsState) {
                alert("Please run Stage 3 (GL Mapping) first!");
                return;
            }

            runStage4Btn.disabled = true;
            runStage4Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pushing...';
            
            try {
                const claims = window.Stage1ClaimsIngestion.dummyData;
                const mappings = glMappingsState(); // execute function to get current UI state

                document.getElementById('stage4Status').textContent = 'Processing...';
                document.getElementById('stage4Status').className = 'badge badge-accent';
                
                const pushSuccess = window.Stage4Database.pushToDatabase(claims, aiDecisionsState, mappings);
                
                if (pushSuccess) {
                    document.getElementById('stage4Status').textContent = 'Complete';
                    document.getElementById('stage4Status').className = 'badge badge-match';
                }
            } catch (err) {
                console.error(err);
                alert("Stage 4 encountered an error.");
            } finally {
                runStage4Btn.disabled = false;
                runStage4Btn.innerHTML = '<i class="fa-solid fa-play"></i> Push to SQL DB';
            }
        });
    }
});
