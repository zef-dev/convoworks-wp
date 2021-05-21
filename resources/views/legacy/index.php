<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard wp-convo">
	<?php //\ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected" ng-app="convo.wp">

        <script type="text/javascript">
                <?php
                    $user = new \Convo\Wp\AdminUser(wp_get_current_user());
                ?>
                var appModule   =   angular.module('convo.wp');
                appModule.constant( 'CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
                appModule.constant( 'CONVO_ADMIN_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1');

                appModule.constant( 'WP_NONCE', '<?php echo wp_create_nonce('wp_rest'); ?>');
                appModule.constant( 'WP_USER', {
                    "user_id":"<?php echo $user->getId(); ?>",
                    "name":"<?php echo $user->getName(); ?>",
                    "username":"<?php echo $user->getUsername(); ?>",
                    "email":"<?php echo $user->getEmail(); ?>",
                    "amazon_account_linked":true}
                );

            </script>
			
            <style>
	
.opd-dashboard.wp-convo
{
	min-height: calc(100vh - 32px);
}
	
.opd-dashboard.wp-convo .opd-dashboard-connected
{
	min-height: inherit;
}

.wp-convo-content
{
    min-height: inherit;
}

.wp-convo-content .layout {
    min-height: calc(100vh - 122px);
}

.wp-convo-content .layout .tabs {
    height: calc(100vh - 132px);
}

            </style>
            <?php
                wp_enqueue_script('convo-html5-shiv', CONVOWP_RESOURCES_URL . 'assets/external/html5shiv.js', ['jquery'], CONVOWP_VERSION);
                wp_script_add_data( 'convo-html5shiv', 'conditional', 'lt IE 9' );
                wp_enqueue_script('convo-respond', CONVOWP_RESOURCES_URL . 'assets/external/respond.js', ['jquery'], CONVOWP_VERSION);
                wp_script_add_data( 'convo-respond', 'conditional', 'lt IE 9' );
            ?>

                <alert-indicator></alert-indicator>
                <loading-indicator></loading-indicator>

                <!-- Page Content -->
                <div class="wp-convo-content" ui-view autoscroll="false"></div>

    </div>
</div>
