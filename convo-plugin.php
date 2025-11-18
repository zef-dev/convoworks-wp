<?php

/**
 * Convoworks WP plugin
 *
 * Plugin Name: Convoworks WP
 * Description: The most versatile no-code solution for WordPress!
 * UID: convoworks-wp
 * Plugin URI: https://convoworks.com
 * Update URI: https://convoworks.com/wp-content/uploads/convoworks/deploy/info.json
 * Author: ZEF Development
 * Version: 0.24.00-RC56
 * Author URI: https://zef.dev
 * Text Domain: convoworks-wp
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (! defined('ABSPATH')) {
    die('You are not allowed to call this page directly.');
}

if (! defined('CONVOWP_LOCAL')) {
    define('CONVOWP_LOCAL', false);
}

if (! defined('CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
    // faster Rest responses, but can cause problemss in development and debuging
    define('CONVO_UTIL_DISABLE_GZIP_ENCODING', false);
}

use Convo\Wp\Providers\ConvoWPPlugin;
use Convo\Wp\Providers\PluginActivator;

define('CONVOWP_VERSION', '0.24.00-RC56');
define('CONVOWP_PLUGIN_SLUG', plugin_basename(__FILE__));
define('CONVOWP_FILE', __FILE__);
define('CONVOWP_PATH', __DIR__);
define('CONVOWP_URL', plugin_dir_url(__FILE__));
define('CONVOWP_ASSETS_URL', CONVOWP_URL . 'public/assets/');
define('CONVOWP_PREFIX', 'convo_');

// for database updates
define('CONVO_DB_VERSION', '1.0.12');

// Define lib constants
define('CONVOWP_LIB_COMMON_PATH', CONVOWP_PATH . '/lib/common/');

// CONVO RELATED
define('CONVO_DATA_PATH', wp_upload_dir()['basedir'] . '/convoworks');
define('CONVO_MEDIA_BASE_URL', wp_upload_dir()['baseurl'] . '/convoworks');
define('CONVO_BASE_URL', site_url());
define('CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL . '/wp-json/convo/v1/public');

// Initialize the plugin
if (version_compare(PHP_VERSION, '7.2', ">=")) {
    add_filter('update_plugins_convoworks.com', 'convoworks_wp_check_for_updates', 10, 3);

    // Add autoloader
    if (CONVOWP_LOCAL) {
        require_once __DIR__ . '/vendor/autoload.php';
    } else {
        require_once __DIR__ . '/vendor/scoper-autoload.php';
    }

    $plugin = new ConvoWPPlugin();
    $plugin->init();
} else {
    if (is_admin()) {
        add_action('all_admin_notices', function () {
            echo esc_html('<div class="error"><p>You need PHP v7.2+ to use the ConvoWp plugin. You currently have ' . PHP_VERSION . '</p></div>');
        });
    }
}

function convoworks_wp_check_for_updates($update, $plugin_data, $plugin_file)
{
    static $response = false;
    if (empty($plugin_data['UpdateURI']) || !empty($update)) {
        return $update;
    }

    if ($response === false) {
        $response = wp_remote_get($plugin_data['UpdateURI']);
    }
    // $logger->debug('Response: ' . print_r($response, true));
    if (is_a($response, 'WP_Error')) {
        /** @var WP_Error $response */
        error_log('Error updating plugin [Convoworks WP]: ' . implode("\n", $response->get_error_messages()));
        return $update;
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code < 200 || $code >= 300) {
        error_log('Error updating plugin [Convoworks WP]: HTTP ' . $code);
        return $update;
    }

    if (empty($response['body'])) {
        return $update;
    }

    $custom_plugins_data = json_decode($response['body'], true);

    if (!empty($custom_plugins_data[$plugin_file])) {
        return $custom_plugins_data[$plugin_file];
    } else {
        return $update;
    }
}

// Plugin activation and deactivation
if (version_compare(PHP_VERSION, '7.2', ">=")) {
    register_activation_hook(__FILE__, [PluginActivator::class, 'activate']);
    register_deactivation_hook(__FILE__, [PluginActivator::class, 'deactivate']);
    add_action('activated_plugin', [PluginActivator::class, 'afterActivate']);
    add_action('deactivated_plugin', [PluginActivator::class, 'afterDeactivate']);
}
