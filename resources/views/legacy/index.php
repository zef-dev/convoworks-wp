<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard convo-proto-content">
	<?php \ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected layout convoworks">

        <div ng-app="convo.wp" style="width: 100%">


            <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js/vendor.84a8807c50225b9bb850.js?07d1421dd03e67177db6"></script>

            <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js/main.9c380ffc2886f2585dc0.js?07d1421dd03e67177db6"></script>



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

            </script>

            <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
            <![endif]-->

            <div>

                <alert-indicator></alert-indicator>
                <loading-indicator></loading-indicator>

                <!-- Page Content -->
                <div class="convo-proto-content ng-scope" style="min-height: 600px;" ui-view autoscroll="false"></div>

            </div>
        </div>
    </div>
</div>
