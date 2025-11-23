/* @ngInject */
export default function ClipboardService($log, $interval, $rootScope, AlertService) {

    var clipboardData = null;
    var clipboardText = null;
    var clipboardInterval = null;

    this.init = init;
    this.cut = cut;
    this.copy = copy;
    this.hasClipboard = hasClipboard;
    this.getClipboard = getClipboard;
    this.getPasteData = getPasteData;

    function init() {
        $log.debug('ClipboardService init()');

        if (!navigator.clipboard) {
            AlertService.addWarning('Clipboard access is not available in this context. Ensure the site is served over HTTPS.');
            return;
        }

        // Check permissions asynchronously (non-blocking)
        checkClipboardPermissions();

        clipboardInterval = $interval(async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text !== clipboardText) {
                    clipboardText = text;
                    clipboardData = JSON.parse(clipboardText);
                }
            } catch (e) {
                clipboardData = null;
            }
        }, 500); // Kept at 250ms; consider increasing to 500ms if performance is an issue
    }

    async function checkClipboardPermissions() {
        try {
            const readPerm = await navigator.permissions.query({ name: 'clipboard-read' });
            if (readPerm.state !== 'granted') {
                $log.warn('Clipboard read permission not granted: ' + readPerm.state);
                // Optionally alert user, but avoid spamming; permission might be prompted on first read
            }

            const writePerm = await navigator.permissions.query({ name: 'clipboard-write' });
            if (writePerm.state !== 'granted') {
                $log.warn('Clipboard write permission not granted: ' + writePerm.state);
            }
        } catch (e) {
            $log.error('Error checking clipboard permissions: ' + e.message);
        }
    }

    async function cut(component, removeFn) {
        try {
            clipboardText = JSON.stringify(component);
            clipboardData = JSON.parse(clipboardText);

            if (navigator.clipboard) {
                await navigator.clipboard.writeText(clipboardText);
            } else {
                fallbackCopy(clipboardText);
            }

            removeFn();
            $rootScope.$broadcast('ComponentRemoved', component);
        } catch (e) {
            AlertService.addWarning('Failed to cut: ' + e.message);
        }
    }

    async function copy(component) {
        try {
            clipboardText = JSON.stringify(component);
            clipboardData = JSON.parse(clipboardText);

            if (navigator.clipboard) {
                await navigator.clipboard.writeText(clipboardText);
            } else {
                fallbackCopy(clipboardText);
            }
        } catch (e) {
            AlertService.addWarning('Failed to copy: ' + e.message);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('Fallback copy failed');
            }
        } catch (e) {
            AlertService.addWarning('Failed to copy using fallback: ' + e.message);
        } finally {
            document.body.removeChild(textarea);
        }
    }

    function getClipboard() {
        return clipboardData;
    }

    function hasClipboard() {
        return clipboardData !== null && clipboardData !== undefined;
    }

    function getPasteData(packages) {
        const data = {
            allowed: true,
            missing: []
        };

        try {
            const clipboard = getClipboard();
            if (!clipboard || !clipboard.namespace) {
                data.allowed = false;
                return data;
            }

            const r = /"namespace":"(.*?)"/g;
            const cmpstr = JSON.stringify(clipboard);
            const matches = [...cmpstr.matchAll(r)];

            for (const match of matches) {
                const nmspc = match[1];
                if (!packages.includes(nmspc)) {
                    $log.warn(`selectableComponent can't paste, missing package [${nmspc}]`);
                    data.allowed = false;
                    if (!data.missing.includes(nmspc)) {
                        data.missing.push(nmspc);
                    }
                }
            }
        } catch (e) {
            data.allowed = false;
        }

        return data;
    }

};

