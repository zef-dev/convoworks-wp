<?php

/**
 * Convoworks WP plugin
 *
 * Plugin Name: Convoworks WP
 * Description: Publish your WordPress content through voice enabled devices (Amazon Alexa skills, Google Assistant actions)
 * UID: convo-wp
 * Plugin URI: https://convoworks.com
 * Update URI: https://wpdemo.convoworks.com/wp-content/uploads/deploy/info.json
 * Author: ZEF Development
 * Version: 0.22.21-RC12
 * Author URI: https://zef.dev
 * Text Domain: convo-wp
 * Domain Path: /resources/lang
 */

use Convo\Providers\ConvoWPPlugin;

define('CONVOWP_VERSION', "0.22.21-RC12");
define('CONVOWP_PLUGIN_SLUG', plugin_basename(__FILE__));
define('CONVOWP_FILE', __FILE__);
define('CONVOWP_PATH', __DIR__);
define('CONVOWP_URL' , plugin_dir_url(__FILE__));
define('CONVOWP_ASSETS_PATH' , CONVOWP_PATH . '/public/assets/');
define('CONVOWP_ASSETS_URL', CONVOWP_URL . 'public/assets/');
define('CONVOWP_RESOURCES_URL', CONVOWP_URL . 'resources/');
define('CONVOWP_RESOURCES_PATH', CONVOWP_PATH . '/resources/');
define('CONVOWP_PREFIX', 'convo_');

// for database updates
define('CONVO_DB_VERSION', '1.0.8');

// Define lib constants
define('CONVOWP_LIB_COMMON_PATH', CONVOWP_PATH . '/lib/common/');

// CONVO RELATED
define( 'CONVO_DATA_PATH', wp_upload_dir()['basedir'] . '/convoworks');
define( 'CONVO_MEDIA_BASE_URL', wp_upload_dir()['baseurl'] . '/convoworks');
define( 'CONVO_BASE_URL', site_url());
define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL . '/wp-json/convo/v1/public');
define( 'CONVO_UTIL_DISABLE_GZIP_ENCODING', false); // faster Rest responses, but can cause problemss in development and debuging

// Add manage convoworks capability to administrator and editor
function convo_role_caps() {
    // Gets the simple_role role object.
    $administratorRole = get_role( 'administrator' );
    $editorRole = get_role( 'editor' );
    
    if (!$administratorRole->has_cap('manage_convoworks')) {
        $administratorRole->add_cap('manage_convoworks');
    }
    
    if (!$editorRole->has_cap('manage_convoworks')) {
        $editorRole->add_cap('manage_convoworks');
    }
}
add_action( 'init', 'convo_role_caps', 11 );

// Initialize the plugin
function run_convo_plugin() {
    if (version_compare(PHP_VERSION, '7.2', ">=")) {
        add_filter('update_plugins_wpdemo.convoworks.com', 'convoworks_wp_check_for_updates', 10, 3);

        // Add autoloader
        require_once __DIR__.'/vendor/scoper-autoload.php';
        $plugin = new ConvoWPPlugin();
        $plugin->init();
    } else {
        if (is_admin()) {
            add_action('all_admin_notices', function() {
                echo esc_html('<div class="error"><p>You need PHP v7.2+ to use the ConvoWp plugin. You currently have ' . PHP_VERSION . '</p></div>');
            });
        }
    }
}
run_convo_plugin();

function convoworks_wp_check_for_updates($update, $plugin_data, $plugin_file)
{
    static $response = false;
        
    if (empty($plugin_data['UpdateURI']) || !empty($update)) {
        return $update;
    }
    
    if ($response === false) {
        $response = wp_remote_get($plugin_data['UpdateURI']);
    }

    if (is_a($response, 'WP_Error')) {
        /** @var WP_Error $response */
        error_log('Error updating plugin [Convoworks WP]: '.implode("\n", $response->get_error_messages()));
        return $update;
    }
    
    if (empty($response['body'])) {
        return $update;
    }
    
    $custom_plugins_data = json_decode($response['body'], true);
    
    if (!empty($custom_plugins_data[$plugin_file])) {
        return $custom_plugins_data[$plugin_file];
    }
    else {
        return $update;
    }
}

// Plugin activation and deactivation
if (version_compare(PHP_VERSION, '7.2', ">=")) {
    register_activation_hook( __FILE__, [ \Convo\Providers\PluginActivator::class, 'activate' ] );
    register_deactivation_hook( __FILE__, [ \Convo\Providers\PluginActivator::class, 'deactivate' ] );
    add_action( 'activated_plugin', [ \Convo\Providers\PluginActivator::class, 'afterActivate' ] );
    add_action( 'deactivated_plugin', [ \Convo\Providers\PluginActivator::class, 'afterDeactivate' ] );
}

