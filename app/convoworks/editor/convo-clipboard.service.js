/* @ngInject */
export default function ConvoClipboardService( $log, $interval, $rootScope, AlertService) {

    var clipboardData      =   null;
    var clipboardText      =   null;
    var clipboardInterval  =   null;

    this.init               =   init;
    this.cut                =   cut;
    this.copy               =   copy;
    this.hasClipboard       =   hasClipboard;
    this.getClipboard       =   getClipboard;
    this.getPasteData       =   getPasteData;

    function init() {
        $log.debug('ConvoClipboardService init()');
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
        }, 250);
    }

    async function cut(component, removeFn) {
        try {
            clipboardText = JSON.stringify({ component })
            clipboardData = JSON.parse(clipboardText);
            await navigator.clipboard.writeText(clipboardText);
            removeFn();
            $rootScope.$broadcast('ComponentRemoved', component);
        } catch (e) {
            AlertService.addWarning('Failed to cut: ' + e.message);
        }
    }

    async function copy(component) {
        try {
            clipboardText = JSON.stringify({ component })
            clipboardData = JSON.parse(clipboardText);
            await navigator.clipboard.writeText(clipboardText);
        } catch (e) {
            AlertService.addWarning('Failed to copy: ' + e.message);
        }
    }

    function getClipboard() {
        return clipboardData;
    }

    function hasClipboard() {
        return clipboardData !== null && clipboardData !== undefined;
    }

    function getPasteData( packages) {
        const data = {
            allowed: true,
            missing: []
        };

        try {
            const clipboard = getClipboard();
            if (!clipboard || !clipboard.component) {
                data.allowed = false;
                return data;
            }

            const r = /"namespace":"(.*?)"/g;
            const cmpstr = JSON.stringify(clipboard.component);
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
