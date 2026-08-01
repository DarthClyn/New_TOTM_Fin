/**
 * Common UI Component: API Key Settings Modal
 * Dynamically injects and manages the API key modal for both Process 1 and Process 2.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Modal HTML
    const modalHtml = `
    <div id="configModal" class="modal-overlay hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fa-solid fa-key"></i> API Key Settings</h3>
                <button id="closeModalBtn" class="btn-icon">&times;</button>
            </div>
            <div class="modal-body">
                <p class="modal-desc">Enter your OpenRouter API Key to process AI requests.</p>
                <div class="form-group">
                    <label for="apiKeyInput">OpenRouter API Key</label>
                    <div class="input-with-icon">
                        <input type="password" id="apiKeyInput" placeholder="sk-or-v1-..." class="form-input">
                        <button id="toggleKeyVisibility" class="btn-icon"><i class="fa-regular fa-eye"></i></button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="saveConfigBtn" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Key</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 2. Bind Logic
    const configBtn = document.getElementById('configBtn');
    const configModal = document.getElementById('configModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleKeyBtn = document.getElementById('toggleKeyVisibility');

    if (configBtn) {
        configBtn.addEventListener('click', () => {
            apiKeyInput.value = localStorage.getItem('openRouterApiKey') || '';
            configModal.classList.remove('hidden');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => configModal.classList.add('hidden'));
    }

    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
            localStorage.setItem('openRouterApiKey', apiKeyInput.value.trim());
            configModal.classList.add('hidden');
            if (window.SidePanelLog) {
                window.SidePanelLog.log('system', 'API Key updated successfully.');
            }
        });
    }

    if (toggleKeyBtn) {
        toggleKeyBtn.addEventListener('click', () => {
            apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            toggleKeyBtn.innerHTML = apiKeyInput.type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }
});
