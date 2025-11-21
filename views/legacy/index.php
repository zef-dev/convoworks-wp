<?php
if (! defined('ABSPATH')) {
    exit;
}
?>

<div class="opd-dashboard wp-convo" style="<?php echo CONVOWP_LOCAL ? 'border-top: 3px solid orange;' : '' ?>">

    <div class="opd-dashboard-connected" ng-app="convo.wp">

        <script type="text/javascript">
            <?php
            $user = new \Convo\Wp\AdminUser(wp_get_current_user());
            ?>
            var appModule = angular.module('convo.wp');
            appModule.constant('CONVO_PUBLIC_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1/public');
            appModule.constant('CONVO_ADMIN_API_BASE_URL', '<?php echo CONVO_BASE_URL ?>/wp-json/convo/v1');

            appModule.constant('WP_USER', {
                "user_id": "<?php echo esc_attr($user->getId()); ?>",
                "name": "<?php echo esc_attr($user->getName()); ?>",
                "username": "<?php echo esc_attr($user->getUsername()); ?>",
                "email": "<?php echo esc_attr($user->getEmail()); ?>",
                "amazon_account_linked": true
            });

            jQuery(document).ajaxComplete(function(event, jqXHR, ajaxOptions) {
                if (ajaxOptions.url.includes('admin-ajax.php')) {
                    var responseData = JSON.parse(jqXHR.responseText);
                    //         console.log( 'AJAX responseData:', responseData);
                    if (responseData.rest_nonce) {
                        ConvoScriptData.nonce = responseData.rest_nonce;
                    }
                }
            });
        </script>

        <style>
            .opd-dashboard.wp-convo {
                height: calc(100vh - 32px);
            }

            .opd-dashboard.wp-convo .opd-dashboard-connected {
                height: 100%;
            }

            .wp-convo-content {
                height: 100%;
            }

            .wp-convo-content .layout {
                height: calc(100vh - 52px);
                overflow: hidden;
            }

            .wp-convo-content .layout .tabs {
                height: calc(100vh - 32px);
            }
        </style>

        <alert-indicator></alert-indicator>
        <loading-indicator></loading-indicator>

        <!-- Page Content -->
        <div class="wp-convo-content" ui-view autoscroll="false"></div>

    </div>
</div>
