<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard">
	<?php \ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected p-4">

        <div ng-app="convo.wp">


 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//vendor.23eb30cbe17b2636ec40.js?50922316c64fdc446ba9"></script>

 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//main.bd18ccf6bafcf4d2b66e.js?50922316c64fdc446ba9"></script>



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
                appModule.constant( 'PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS', [{"name":"messages","checked":false},{"name":"messaging_postbacks","checked":false},{"name":"messaging_optins","checked":false},{"name":"message_deliveries","checked":false},{"name":"message_reads","checked":false},{"name":"messaging_payments","checked":false},{"name":"messaging_pre_checkouts","checked":false},{"name":"messaging_checkout_updates","checked":false},{"name":"messaging_account_linking","checked":false},{"name":"messaging_referrals","checked":false},{"name":"message_echoes","checked":false},{"name":"messaging_game_plays","checked":false},{"name":"standby","checked":false},{"name":"messaging_handovers","checked":false},{"name":"messaging_policy_enforcement","checked":false},{"name":"message_reactions","checked":false},{"name":"inbox_labels","checked":false},{"name":"messaging_fblogin_account_linking","checked":false}]);
                appModule.constant( 'PROTO_VIBER_WEBHOOK_EVENT_TYPES', [{"name":"conversation_started","checked":false},{"name":"delivered","checked":false},{"name":"seen","checked":false},{"name":"failed","checked":false}]);

            </script>

            <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
            <![endif]-->

            <div>

                <alert-indicator></alert-indicator>
                <loading-indicator></loading-indicator>

                <!-- Page Content -->
                <div class="container opd-product-list" style="min-height: 600px;" ng-view autoscroll="true"></div>

            </div>
        </div>
    </div>
</div>