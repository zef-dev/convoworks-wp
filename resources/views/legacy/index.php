<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard">
	<?php \ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected p-4">

        <div ng-app="convo.wp">


 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//vendor.dd496f7cde5f4ca9a4dd.js?65b01b8ddbc291530bcc"></script>

 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//main.300fd623b26223ee8618.js?65b01b8ddbc291530bcc"></script>



            <script type="text/javascript">
                var appModule   =   angular.module('convo.wp');
                appModule.constant( 'CONVO_BASE_URL', '<?php echo CONVO_BASE_URL ?>');
                appModule.constant( 'CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1');
                appModule.constant( 'CONVO_ADMIN_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1');

                appModule.constant( 'WP_NONCE', '<?php echo wp_create_nonce('wp_rest'); ?>');
                appModule.constant( 'WP_USER', {
                    "user_id":"2",
                    "name":"Tole",
                    "username":"tole",
                    "email":"tole.car@gmail.com",
                    "amazon_account_linked":true}
                );

                appModule.constant( 'PROTO_AMAZON_ALL_ENGLISH', ["en-AU","en-CA","en-GB","en-IN","en-US"]);
                appModule.constant( 'PROTO_AMAZON_LANGUAGES', [{"code":"en-AU","name":"English Australia"},{"code":"en-CA","name":"English Canada"},{"code":"en-GB","name":"English UK"},{"code":"en-IN","name":"English India"},{"code":"en-US","name":"English US"}]);
                appModule.constant( 'PROTO_DIALOGFLOW_LANGUAGES', [{"code":"en","name":"English"}]);
                appModule.constant( 'PROTO_DIALOGFLOW_TIMEZONES', [{"value":"Etc/GMT+12","name":"(GMT-12:00) Etc/GMT+12"},{"value":"Pacific/Midway","name":"(GMT-11:00) Pacific/Midway"},{"value":"Pacific/Honolulu","name":"(GMT-10:00) Pacific/Honolulu"},{"value":"America/Anchorage","name":"(GMT-9:00) America/Anchorage"},{"value":"US/Alaska","name":"(GMT-9:00) US/Alaska"},{"value":"America/Los_Angeles","name":"(GMT-8:00) America/Los_Angeles"},{"value":"America/Denver","name":"(GMT-7:00) America/Denver"},{"value":"America/Chicago","name":"(GMT-6:00) America/Chicago"},{"value":"America/New_York","name":"(GMT-5:00) America/New_York"},{"value":"America/Barbados","name":"(GMT-4:00) America/Barbados"},{"value":"America/Buenos_Aires","name":"(GMT-3:00) America/Buenos_Aires"},{"value":"Atlantic/South_Georgia","name":"(GMT-2:00) Atlantic/South_Georgia"},{"value":"Atlantic/Cape_Verde","name":"(GMT-1:00) Atlantic/Cape_Verde"},{"value":"Africa/Casablanca","name":"(GMT0:00) Africa/Casablanca"},{"value":"Europe/Madrid","name":"(GMT+2:00) Europe/Madrid"},{"value":"Europe/Kaliningrad","name":"(GMT+2:00) Europe/Kaliningrad"},{"value":"Europe/Moscow","name":"(GMT+3:00) Europe/Moscow"},{"value":"Asia/Dubai","name":"(GMT+4:00) Asia/Dubai"},{"value":"Asia/Kabul","name":"(GMT+4:30) Asia/Kabul"},{"value":"Asia/Yekaterinburg","name":"(GMT+5:00) Asia/Yekaterinburg"},{"value":"Asia/Colombo","name":"(GMT+5:30) Asia/Colombo"},{"value":"Asia/Kathmandu","name":"(GMT+5:45) Asia/Kathmandu"},{"value":"Asia/Almaty","name":"(GMT+6:00) Asia/Almaty"},{"value":"Asia/Rangoon","name":"(GMT+6:30) Asia/Rangoon"},{"value":"Asia/Bangkok","name":"(GMT+7:00) Asia/Bangkok"},{"value":"Asia/Hong_Kong","name":"(GMT+8:00) Asia/Hong_Kong"},{"value":"Asia/Tokyo","name":"(GMT+9:00) Asia/Tokyo"},{"value":"Asia/Tokyo","name":"(GMT+9:00) Asia/Tokyo"},{"value":"Australia/Darwin","name":"(GMT+9:30) Australia/Darwin"},{"value":"Australia/Sydney","name":"(GMT+10:00) Australia/Sydney"},{"value":"Pacific/Noumea","name":"(GMT+11:00) Pacific/Noumea"},{"value":"Pacific/Fiji","name":"(GMT+12:00) Pacific/Fiji"},{"value":"Pacific/Tongatapu","name":"(GMT+13:00) Pacific/Tongatapu"}]);
                appModule.constant( 'PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS', [{"name":"messages","checked":false},{"name":"messaging_postbacks","checked":false},{"name":"messaging_optins","checked":false},{"name":"message_deliveries","checked":false},{"name":"message_reads","checked":false},{"name":"messaging_payments","checked":false},{"name":"messaging_pre_checkouts","checked":false},{"name":"messaging_checkout_updates","checked":false},{"name":"messaging_account_linking","checked":false},{"name":"messaging_referrals","checked":false},{"name":"message_echoes","checked":false},{"name":"messaging_game_plays","checked":false},{"name":"standby","checked":false},{"name":"messaging_handovers","checked":false},{"name":"messaging_policy_enforcement","checked":false},{"name":"message_reactions","checked":false},{"name":"inbox_labels","checked":false},{"name":"messaging_fblogin_account_linking","checked":false}]);
                appModule.constant( 'PROTO_VIBER_WEBHOOK_EVENT_TYPES', [{"name":"conversation_started","checked":false},{"name":"delivered","checked":false},{"name":"seen","checked":false},{"name":"failed","checked":false}]);
                appModule.constant( 'PROTO_ALEXA_INTERFACES', [{"type":"AUDIO_PLAYER","name":"Audio Player","checked":false},{"type":"RENDER_TEMPLATE","name":"Display Interface","checked":false},{"type":"VIDEO_APP","name":"Video App","checked":false},{"type":"CAN_FULFILL_INTENT_REQUEST","name":"CanFulfillIntentRequest","checked":false},{"type":"ALEXA_PRESENTATION_APL","name":"Alexa Presentation Language","checked":false},{"type":"CUSTOM_INTERFACE","name":"Custom Interface Controller","checked":false},{"type":"ALEXA_PRESENTATION_HTML","name":"Alexa Web API for Games","checked":false}]);
                appModule.constant( 'PROTO_DIALOGFLOW_INTERFACES', [{"type":"AUDIO_PLAYER","name":"Audio Player","checked":false}]);

            </script>

            <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
            <![endif]-->

            <div>

                <alert-indicator></alert-indicator>
                <loading-indicator></loading-indicator>

                <!-- Page Content -->
                <div class="container opd-product-list" style="min-height: 600px;" ui-view autoscroll="true"></div>

            </div>
        </div>
    </div>
</div>
