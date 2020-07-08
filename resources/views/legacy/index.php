<div ng-app="convo.wp">
	<?php
	if ( ! defined('ABSPATH')) {
		exit;
	}
	?>

    <script src="<?php echo CONVOWP_ASSETS_URL ?>js/ng-all.js?v=1594246244685?v=1594246104152?v=1594245905590"></script>
    <script src="<?php echo CONVOWP_ASSETS_URL ?>js/convo-all.js?v=1594246244685?v=1594246104152?v=1594245905590?v=1594245425619"></script>
    <script src="<?php echo CONVOWP_ASSETS_URL ?>js/templateCacheHtml.js?v=1594246244685?v=1594246104152?v=1594245905590?v=1594245425619"></script>
    <style src="<?php echo CONVOWP_ASSETS_URL ?>css/convo-all.css?v=1594246244685?v=1594246104152?v=1594245905590?v=1594245425619"></style>

    <script type="text/javascript">

        angular.module('convo.wp').constant( 'CONVO_BASE_URL', '<?php echo CONVO_BASE_URL ?>');
        angular.module('convo.wp').constant( 'CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/rest_public/convo/v1');
        angular.module('convo.wp').constant( 'CONVO_ADMIN_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/rest_admin/convo/v1');

        angular.module('convo.wp').constant( 'WP_NONCE', null);
        angular.module('convo.wp').constant( 'WP_USER', {
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
        <div class="container" style="min-height: 600px;" ng-view autoscroll="true">
        </div>

    </div>