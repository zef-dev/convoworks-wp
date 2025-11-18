<?php

namespace Convo\Wp\Providers;

use function Convo\is_convo_admin;

class AssetsProvider
{
    /**
     * Triggered when deactivating the plugin
     *
     * @return void
     */
    public function init()
    {
        // Add specific class for admin pages
        add_filter('admin_body_class', function ($classes) {
            if (is_convo_admin()) {
                return "$classes op-dashboard-admin-app";
            }

            return $classes;
        });
        // Then add the assets
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminAssets']);
    }

    /**
     * Enqueue admin scripts
     *
     * @param $page
     */
    public function enqueueAdminAssets($page)
    {
        $pagesNeedingAppJs = [
            'toplevel_page_convo-plugin',
            'convo-plugin#!/convoworks-editor',
            'convoworks-wp_page_convo-settings',
            'convoworks-wp_page_convo-getting-started',
            'convoworks-wp_page_convo-service-conversation-request-log'
        ];

        // Although we could check for suitable pages by checking if
        // "op-funnels" string exists, by checking against the array decision
        // on which page to show JS needs to be conscious and not by default
        if (in_array($page, $pagesNeedingAppJs)) {
            global $wp_version;

            // The "updates" dependency breaks some stuff on older WP versions
            if (version_compare($wp_version, '5.5', '>=')) {
                wp_enqueue_script('convo-plugin-dashboard', plugins_url('public/assets/legacy/js/app.js', CONVOWP_FILE), ['jquery'], $this->version(), true);
            } else {
                wp_enqueue_script('convo-plugin-dashboard', plugins_url('public/assets/legacy/js/app.js', CONVOWP_FILE), [
                    'jquery',
                    'updates'
                ], $this->version(), true);
            }

            // adding resources needed for the Convo editor
            wp_enqueue_script('jquery-ui-core');
            wp_enqueue_script('jquery-ui-draggable');
            wp_enqueue_script('jquery-ui-droppable');
            wp_enqueue_script('jquery-ui-sortable');
            wp_enqueue_script('jquery-ui-resizable');
            wp_enqueue_script('heartbeat');
            wp_enqueue_style('convo-bootstrap-css', CONVOWP_ASSETS_URL . 'external/bootstrap.css', $this->version());
            wp_enqueue_script('convo-bootstrap', CONVOWP_ASSETS_URL . 'external/bootstrap.js', ['jquery'], $this->version());
            wp_enqueue_script('convo-json-formatter', CONVOWP_ASSETS_URL . 'external/json-formatter.umd.js', $this->version());
            wp_enqueue_style('convo-font-awesome-css', CONVOWP_ASSETS_URL . 'external/font-awesome.css', $this->version());
            wp_enqueue_script('convo-angular', CONVOWP_ASSETS_URL . 'external/angular.js', ['jquery'], $this->version());
            wp_enqueue_script('convo-angular-animate', CONVOWP_ASSETS_URL . 'external/angular-animate.js', ['jquery', 'convo-angular'], $this->version());
            wp_enqueue_script('convo-angular-cookies', CONVOWP_ASSETS_URL . 'external/angular-cookies.js', ['jquery', 'convo-angular'], $this->version());
            wp_enqueue_script('convo-angular-sanitize', CONVOWP_ASSETS_URL . 'external/angular-sanitize.js', ['jquery', 'convo-angular'], $this->version());
            wp_enqueue_script('convo-vendor', CONVOWP_ASSETS_URL . 'js/vendor.js', ['jquery', 'wp-element'], $this->version());
            wp_enqueue_script('convo-main', CONVOWP_ASSETS_URL . 'js/main.js', ['jquery'], $this->version());

            // Add some required variables to our global script
            wp_localize_script("convo-plugin-dashboard", 'ConvoScriptData', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wp_rest'),
            ]);

            wp_enqueue_style("convo-framework", plugins_url("public/assets/legacy/css/framework.css", CONVOWP_FILE), [], $this->version());
            wp_enqueue_style("convo-app", plugins_url("public/assets/legacy/css/app.css", CONVOWP_FILE), [], $this->version());

            remove_all_actions("admin_notices");

            if (is_admin()) {
                wp_enqueue_style("convo-wp-dashboard", plugins_url("public/assets/legacy/css/wp.css", CONVOWP_FILE), [], $this->version());
            }
        }
    }

    /**
     * Return plugin version
     *
     * @return string
     */
    public function version()
    {
        return CONVOWP_VERSION;
    }
}
