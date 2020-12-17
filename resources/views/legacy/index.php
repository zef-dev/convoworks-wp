<?php
if ( ! defined('ABSPATH')) {
	exit;
}
?>

<div class="opd-dashboard convo-proto-content">
	<?php //\ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected layout convoworks">

        <div ng-app="convo.wp" style="width: 100%">

            <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
            <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css">
            <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
            <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>

            <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
            <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-animate.min.js"></script>
            <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-cookies.min.js"></script>
            <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-sanitize.min.js"></script>

            <script src="https://unpkg.com/react@16/umd/react.production.min.js" crossorigin></script>
            <script src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js" crossorigin></script>

            <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js/vendor.ac9e4a1f98da1076c423.js?5b2c6417b762e56a290b"></script>

            <script type="text/javascript" src="<?php echo CONVOWP_ASSETS_URL ?>js/main.4b55d47cd12a9dd76e7c.js?5b2c6417b762e56a290b"></script>

            <script type="text/javascript">
                <?php
                    $user = new \ConvoPlugin\Convo\Wp\AdminUser(wp_get_current_user());
                ?>
                var appModule   =   angular.module('convo.wp');
                appModule.constant( 'CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
                appModule.constant( 'CONVO_PUBLIC_REST_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
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
