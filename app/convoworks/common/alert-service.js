/* @ngInject */
export default function AlertService( $log, $timeout)
{
    var DURATION    =   5000;
    var     alertsService   =   {};

    alertsService.alerts    =   [];

    alertsService.getAlerts =   function()
    {
        return alertsService.alerts;
    };

    alertsService.addSuccess =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'success'}, DURATION);
    };

    /**
     * Normalize various error shapes to a short, user‑friendly message.
     * Avoids dumping huge error objects / stack traces into the UI.
     */
    alertsService.addDanger =   function( msg)
    {
        // Extract common HTTP / Error shapes
        if ( msg && msg.data && msg.data.message) {
            msg = msg.data.message;
        } else if ( msg && msg.message) {
            msg = msg.message;
        }

        // Fallback for non‑string messages
        if ( typeof msg !== 'string') {
            $log.error( 'AlertService.addDanger raw error', msg);
            msg =   'Something went wrong. Please check console for details.';
        } else {
            // Special‑case common AngularJS internal error codes (ngRepeat dupes, etc.)
            if ( msg.indexOf('[ngRepeat:dupes]') !== -1 || msg.indexOf('ngRepeat/dupes') !== -1) {
                msg = 'Internal editor error: duplicate items detected in a list. Please reload the page; if the problem persists, check the browser console or contact support.';
            } else if ( msg.indexOf('errors.angularjs.org/1.') !== -1) {
                msg = 'Internal AngularJS error occurred in the editor. Please check the browser console or contact support.';
            }

            // Strip simple HTML tags (e.g. WordPress fatal error snippets)
            if ( msg.indexOf('<') !== -1 && msg.indexOf('>') !== -1) {
                msg = msg.replace(/<[^>]*>/g, '').trim();
            }

            // Special‑case common WordPress critical error text
            if ( msg.indexOf('There has been a critical error on this website.') !== -1) {
                msg = 'WordPress reported a critical error on the site. Check the PHP error log on the server for details.';
            }

            // Prevent very long messages from filling the whole screen
            if ( msg.length > 500) {
                $log.error( 'AlertService.addDanger long error', msg);
                msg =   msg.substring( 0, 500) + '… (see console for full details)';
            }
        }

        alertsService._addAlert( { msg : msg, type : 'danger'}, DURATION * 2);
    };

    alertsService.addInfo   =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'info'}, DURATION);
    };

    alertsService.addWarning    =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'warning'}, DURATION * 1.25);
    };

    /**
     * Helper for handling $http rejections in a consistent way.
     * Logs the full error and shows either the backend message or a generic fallback.
     */
    alertsService.handleHttpError = function( reason, fallbackMessage)
    {
        $log.error( 'HTTP error', reason);

        var msg =   (reason && reason.data && reason.data.message)
            ? reason.data.message
            : (fallbackMessage || 'Request failed.');

        alertsService.addDanger( msg);
    };

    alertsService._addAlert =   function( alert, timeout)
    {
        alertsService.alerts.push( alert);
        $timeout(function () {
            alertsService.closeAlertObj( alert);
        }, timeout);
    };

    alertsService.closeAlert    =   function( index)
    {
        alertsService.alerts.splice(index, 1);
    };

    alertsService.closeAlertObj =   function( alert)
    {
        var index   =   alertsService.alerts.indexOf( alert);
        if (index > -1)
            alertsService.closeAlert( index);
    };

    return alertsService;
};

