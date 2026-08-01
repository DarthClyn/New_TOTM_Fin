/**
 * Process Log Center Module
 * Human-readable execution step logging for Stage 1, Stage 2, and Stage 3
 */

window.SidePanelLog = {
    logs: [],

    init() {
        this.log('p1 stage 1', 'Log Center ready. Select scenario or upload document.');
    },

    log(stageTag, message) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const logItem = {
            id: Date.now() + Math.random(),
            timestamp,
            stageTag: stageTag.toLowerCase(),
            message
        };

        this.logs.unshift(logItem);
        this.render();
    },

    render() {
        const container = document.getElementById('logCenterList');
        if (!container) return;

        container.innerHTML = '';

        this.logs.forEach(item => {
            let catClass = 'cat-stage1';
            if (item.stageTag.includes('stage 2') || item.stageTag.includes('stage2')) catClass = 'cat-stage2';
            else if (item.stageTag.includes('stage 3') || item.stageTag.includes('stage3')) catClass = 'cat-stage3';
            else if (item.stageTag.includes('human')) catClass = 'cat-recheck';

            const el = document.createElement('div');
            el.className = 'log-entry';
            el.innerHTML = `
                <div class="log-header">
                    <span class="log-time">${item.timestamp}</span>
                    <span class="log-cat ${catClass}">${item.stageTag}</span>
                </div>
                <div class="log-msg-clean">${item.message}</div>
            `;
            container.appendChild(el);
        });
    },

    clear() {
        this.logs = [];
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.SidePanelLog.init();
});
