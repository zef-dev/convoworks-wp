<?php
if (!defined('ABSPATH')) {
    exit;
}

// avoid recursively appending wp http referrer query argument
// thanks to \WPForms_Overview::remove_referer
if ( isset( $_SERVER['REQUEST_URI'] ) ) {
    $_SERVER['REQUEST_URI'] = remove_query_arg( '_wp_http_referer', wp_unslash( $_SERVER['REQUEST_URI'] ) );
}

$container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
$wpConvoServiceConversationRequestDao = $container->get('wpConvoServiceConversationRequestDao');

$details = $wpConvoServiceConversationRequestDao->getDetailsOfRecordById($_GET['id']);
echo '<div class="container-fluid">';
echo '<div style="cursor: pointer" onclick="window.history.back()"><i class="fa fa-arrow-left" aria-hidden="true"></i><span> Back to Request Logs</span></div>';

?>
<div>
    <div class="card p-0 mw-100">
        <div class="card-header">
            General Overview
        </div>
        <div class="card-body">
            <p><i>Service ID:</i> <?php echo '<b>'.$details['service_id'].'</b>'?> <?php echo sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Service ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['service_id']) ?></p>
            <p><i>Request ID:</i> <?php echo '<b>'.$details['request_id'].'</b>'?> <?php echo sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Request ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['request_id']) ?></p>
            <p><i>Session ID:</i> <?php echo !empty($details['session_id']) ? '<b>'.$details['session_id'].'</b>' : '<b>'.'N/A'.'</b>'?> <?php echo !empty($details['session_id']) ? sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Session ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['session_id']) : '' ?></p>
            <p class="text-break"><i>Device ID:</i> <?php echo '<b>'.$details['device_id'].'</b>'?> <?php echo sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Device ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['device_id']) ?></p>
            <p><i>Stage:</i> <?php echo '<b>'.$details['stage'].'</b>'?></p>
            <p><i>Platform:</i> <?php echo '<b>'.$details['platform'].'</b>'?></p>
            <p><i>Time Created:</i> <?php
                $date_time = date_i18n('F j, Y g:i:s a', $details['time_created']);
                echo '<b>'.sprintf('%1$s', $date_time).'</b>';?>
            </p>
            <p><i>Time Elapsed:</i> <?php $time_elapsed = $details['time_elapsed']; echo '<b>'.$details['time_elapsed'].'s'.'</b>'; ?></p>
        </div>
    </div>
    <div class="card-group">
        <div class="card mw-100 p-0 ml-sm-0 mr-sm-2">
            <div class="card-header">
                Intent Data
            </div>
            <div class="card-body">
                <p><i>Intent Name:</i> <?php echo !empty($details['intent_name']) ? '<b>'.$details['intent_name'].'</b>' : 'N/A'?></p>
                <p><i>Intent Slots:</i> </p>
                <?php echo !empty($details['intent_slots']) ? '<div class="text-break overflow-auto" id="intent-slots-json-format"></div>' : 'N/A'?>
            </div>
        </div>
        <div class="card mw-100 p-0 ml-sm-0 mr-sm-0">
            <div class="card-header">
                Service Variables
            </div>
            <?php echo !empty($details['service_variables']) ? '<div class="card-body overflow-auto" id="service-variables-json-format"></div>' : 'N/A'?>
        </div>
    </div>
    <div class="card-group">
        <div class="card mw-100 p-0 ml-sm-0 mr-sm-2">
            <div class="card-header">
                Request
            </div>
            <div class="card-body overflow-auto" id="request-json-format"></div>
        </div>
        <div class="card mw-100 p-0 ml-sm-0 mr-sm-0">
            <div class="card-header">
                Response
            </div>
            <div class="card-body overflow-auto" id="response-json-format"></div>
        </div>
    </div>
    <?php if (!empty($details['error'])): ?>
        <div class="card p-0 mw-100">
            <div class="card-header">
                Error
            </div>
            <div class="card-body overflow-auto">
                <p><i>Error Message:</i> <?php echo !empty($details['error']) ? '<b>'.$details['error'].'</b>' : '<b>'.'N/A'.'</b>'?> <?php echo !empty($details['error']) ? sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Error Message" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['error']) : '' ?></p>
                <p><i>Error Stack Trace:</i> <?php echo !empty($details['error_stack_trace']) ? '<br> <b style="white-space: pre-line;">'.$details['error_stack_trace'].'</b>' : '<b>'.'N/A'.'</b>'?> <?php echo !empty($details['error_stack_trace']) ? sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Error Stacktrace" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $details['error_stack_trace']) : '' ?></p>
            </div>
        </div>
    <?php endif; ?>

</div>
<div class="position-fixed bottom-0 right-0 p-3" style="z-index: 5; right: 0; bottom: 0;">
    <div id="liveToast" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true" data-delay="2000">
        <div class="toast-body">
            Copied to clipboard.
        </div>
    </div>
</div>
<script>
    window.onload = (event)=> {
        const intentSlotsJsonFormat = document.getElementById('intent-slots-json-format');
        const serviceVariablesJsonFormat = document.getElementById('service-variables-json-format');
        const requestJsonFormat = document.getElementById('request-json-format');
        const responseJsonFormat = document.getElementById('response-json-format');

        const intentSlotsJSON = <?php echo ltrim($details['intent_slots'])?>;
        const intentSlotsFormatter = new JSONFormatter(intentSlotsJSON);
        intentSlotsJsonFormat.appendChild(intentSlotsFormatter.render());

        const serviceVariablesJSON = <?php echo ltrim($details['service_variables'])?>;
        const serviceVariablesFormatter = new JSONFormatter(serviceVariablesJSON);
        serviceVariablesJsonFormat.appendChild(serviceVariablesFormatter.render());

        const requestJSON = <?php echo ltrim($details['request'])?>;
        const requestFormatter = new JSONFormatter(requestJSON);
        requestJsonFormat.appendChild(requestFormatter.render());

        const responseJSON = <?php echo ltrim($details['response'])?>;
        const responseFormatter = new JSONFormatter(responseJSON);
        responseJsonFormat.appendChild(responseFormatter.render());
    }
</script>
<script>
    /*function renderJsonFormatter(element) {
        window.alert('Ceca');
        // element.outerHTML = "ceca";
    }*/
    function copyToClipboard(event) {
        console.log('Copying text ' + event.dataset.content + ' to clipboard');
        var textArea = document.createElement("textarea");
        textArea.value = event.dataset.content
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            let myAlert = document.querySelector('.toast');
            let bsAlert = new  bootstrap.Toast(myAlert);
            bsAlert.show();
        } catch (err) {
            console.log('Oops, unable to copy', event.dataset.content);
            window.alert('Oops, unable to copy');
        }
        document.body.removeChild(textArea);
    }
</script>

<?php
echo '</div>';
?>
