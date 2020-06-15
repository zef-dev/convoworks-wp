<?php

/**
 * ConvoWP plugin
 *
 * Plugin Name: ConvoWP
 * Description: ConvoWP
 * UID: convo-wp
 * Plugin URI: https://influendo.com
 * Author: Influendo
 * Version: 0.0.0
 * Author URI: https://influendo.com
 * Text Domain: convo-wp
 * Domain Path: /resources/lang
 */

use ConvoPlugin\Providers\ConvoWPPlugin;

// Add autoloader
require_once __DIR__.'/vendor/autoload.php';

define('CONVOWP_VERSION', '0.0.0');
define('CONVOWP_PLUGIN_SLUG', plugin_basename(__FILE__));
define('CONVOWP_FILE', __FILE__);
define('CONVOWP_PATH', __DIR__);
define('CONVOWP_URL' , plugin_dir_url(__FILE__));
define('CONVOWP_ASSETS_PATH' , CONVOWP_PATH . '/public/assets/');
define('CONVOWP_ASSETS_URL', CONVOWP_URL . 'public/assets/');
define('CONVOWP_RESOURCES_URL', CONVOWP_URL . 'resources/');
define('CONVOWP_RESOURCES_PATH', CONVOWP_PATH . '/resources/');
define('CONVOWP_PREFIX', 'convo_');

// Define lib constants
define('CONVOWP_LIB_CONFIG_PATH', CONVOWP_PATH . '/lib/config/');
define('CONVOWP_LIB_COMMON_PATH', CONVOWP_PATH . '/lib/common/');

// Initialize the plugin
function run_convo_plugin() {
    $plugin = new ConvoWPPlugin();
    $plugin->init();
}
run_convo_plugin();

// Plugin activation and deactivation
register_activation_hook(__FILE__,   [\ConvoPlugin\Providers\PluginActivator::class, 'activate']);
register_deactivation_hook(__FILE__, [\ConvoPlugin\Providers\PluginActivator::class, 'deactivate']);
add_action('activated_plugin',       [\ConvoPlugin\Providers\PluginActivator::class, 'afterActivate']);
add_action('deactivated_plugin',     [\ConvoPlugin\Providers\PluginActivator::class, 'afterDeactivate']);

