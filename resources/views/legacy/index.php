<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard">
	<?php \ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected p-4">

        <div ng-app="convo.wp">


 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//vendor.19882e0d370f0ba78b02.js?c7691623c25b7cddc1f1"></script>

 <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js//main.3fe48bfbb2828b768244.js?c7691623c25b7cddc1f1"></script>



            <script type="text/javascript">
                var appModule   =   angular.module('convo.wp');
                appModule.constant( 'CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
                appModule.constant( 'CONVO_PUBLIC_REST_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
                appModule.constant( 'CONVO_ADMIN_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1');

                appModule.constant( 'WP_NONCE', '<?php echo wp_create_nonce('wp_rest'); ?>');
                appModule.constant( 'WP_USER', {
                    "user_id":"2",
                    "name":"Tole",
                    "username":"tole",
                    "email":"tole.car@gmail.com",
                    "amazon_account_linked":true}
                );

                appModule.constant( 'PROTO_AMAZON_ALL_ENGLISH', );
                appModule.constant( 'PROTO_AMAZON_LANGUAGES', );
                appModule.constant( 'PROTO_DIALOGFLOW_LANGUAGES', );
                appModule.constant( 'PROTO_DIALOGFLOW_TIMEZONES', );
                appModule.constant( 'PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS', );
                appModule.constant( 'PROTO_VIBER_WEBHOOK_EVENT_TYPES', );
                appModule.constant( 'PROTO_ALEXA_INTERFACES', );
                appModule.constant( 'PROTO_DIALOGFLOW_INTERFACES', );

            </script>

            <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
            <![endif]-->

            <div>

                <alert-indicator></alert-indicator>
                <loading-indicator></loading-indicator>

                <!-- Page Content -->
                <div class="container opd-product-list" style="min-height: 600px;" ui-view autoscroll="false"></div>

            </div>
        </div>
    </div>
</div>
