<?php

namespace ConvoPlugin\Providers;

use function ConvoPlugin\is_convo_admin;

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
        add_filter('admin_body_class', function($classes) {
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
     */
    public function enqueueAdminAssets()
    {
    	global $wp_version;

	    // The "updates" dependency breaks some stuff on older WP versions
	    if (version_compare($wp_version, '5.5', '>=')) {
		    wp_enqueue_script('convo-plugin-dashboard',  plugins_url('public/assets/js/app.js', CONVOWP_FILE), ['jquery'], $this->version());
	    } else {
		    wp_enqueue_script('convo-plugin-dashboard',  plugins_url('public/assets/js/app.js', CONVOWP_FILE), ['jquery', 'updates'], $this->version());
	    }

	    // Add some required variables to our global script
        wp_localize_script("convo-plugin-dashboard", 'ConvoScriptData', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('wp_rest'),
        ]);

        wp_enqueue_style("convo-framework",        plugins_url("public/assets/css/framework.css", CONVOWP_FILE), [], $this->version());
        wp_enqueue_style("convo-app",        plugins_url("public/assets/css/app.css", CONVOWP_FILE), [], $this->version());
        wp_enqueue_style("convo-plugin-dashboard", plugins_url("public/assets/css/convo-all.css",       CONVOWP_FILE), [], $this->version());

        remove_all_actions("admin_notices");

        if (is_admin()) {
            wp_enqueue_style("convo-wp-dashboard", plugins_url("public/assets/css/wp.css", CONVOWP_FILE), [], $this->version());
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
