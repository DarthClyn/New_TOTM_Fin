window.OneDriveService = {
    clientId: 'b020cb03-53f4-4a79-94ef-8f21e43608f4',
    // The redirect URI must be on the exact same domain/port as the current page
    redirectUri: window.location.origin + '/microsoft/auth/callback/index.html',

    init() {
        const invoiceBtn = document.getElementById('onedriveInvoiceBtn');
        const supportingBtn = document.getElementById('onedriveSupportingBtn');

        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("OneDrive Invoice Button Clicked!");
                this.launchPicker({
                    multiSelect: false,
                    success: (files) => {
                        window.Stage1DocumentSelector.handleOneDriveInvoice(files.value[0]);
                    }
                });
            });
        } else {
            console.warn("onedriveInvoiceBtn not found in DOM");
        }

        if (supportingBtn) {
            supportingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("OneDrive Supporting Docs Button Clicked!");
                this.launchPicker({
                    multiSelect: true,
                    success: (files) => {
                        window.Stage1DocumentSelector.handleOneDriveSupportingDocs(files.value);
                    }
                });
            });
        } else {
            console.warn("onedriveSupportingBtn not found in DOM");
        }
    },

    launchPicker(options) {
        console.log("Launching OneDrive Picker with options...");
        if (!window.OneDrive) {
            alert('OneDrive SDK is not loaded yet. Check your internet connection or ad blocker.');
            return;
        }

        if (window.location.port !== "8000") {
            console.warn("WARNING: You are not running on port 8000. OneDrive authentication popup may fail due to Cross-Origin restrictions if the redirect URI is on port 8000.");
        }

        const odOptions = {
            clientId: this.clientId,
            action: "download",
            multiSelect: options.multiSelect,
            advanced: {
                redirectUri: this.redirectUri
            },
            success: options.success,
            cancel: function () {
                window.SidePanelLog.log('p1 stage 1', 'OneDrive file selection was cancelled.');
            },
            error: function (e) {
                console.error("OneDrive Picker Error: ", e);
                window.SidePanelLog.log('p1 stage 1', 'OneDrive Error: ' + (e.message || 'Unknown error'));
            }
        };

        window.OneDrive.open(odOptions);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.OneDriveService.init();
    });
} else {
    window.OneDriveService.init();
}
