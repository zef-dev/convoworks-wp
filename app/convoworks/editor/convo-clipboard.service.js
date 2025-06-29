/* @ngInject */
export default function ConvoClipboardService( $log, $interval, ConvoworksApi) {

    var clipboardData      =   null;
    var clipboardInterval  =   null;

    this.init               =   init;
    this.hasClipboard       =   hasClipboard;
    this.getClipboard       =   getClipboard;
    this.getPasteData       =   getPasteData;

    function init() {
        $log.debug('ConvoClipboardService init()');
        clipboardInterval = $interval(async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text !== clipboardData) {
                    clipboardData = JSON.parse(text);
                } else {
                    clipboardData = null;
                }

            } catch (e) {
                clipboardData = null;
             //   $log.warn('Clipboard read failed', e);
            }
        }, 250);
    }

    function getClipboard() {
        return clipboardData;
    }

    function hasClipboard() {
        const data = getClipboard();
        return !!data;
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
