<?php

/**
 * Convoworks WP plugin
 *
 * Plugin Name: Convoworks WP
 * Description: Convoworks WP is a GUI-based, cross-platform, voice assistant service development tool.
 * UID: convo-wp
 * Plugin URI: https://convoworks.com
 * Author: ZEF Development
 * Version: 0.21.0-beta4
 * Author URI: https://zef.dev
 * Text Domain: convo-wp
 * Domain Path: /resources/lang
 */

use ConvoPlugin\Providers\ConvoWPPlugin;

define('CONVOWP_VERSION', '0.21.0-beta3');
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
define('CONVO_DB_VERSION', '1.0.3');

// Define lib constants
define('CONVOWP_LIB_COMMON_PATH', CONVOWP_PATH . '/lib/common/');

// CONVO RELATED
define( 'CONVO_DATA_PATH', CONVOWP_PATH . '/lib/data');
define( 'CONVO_BASE_URL', site_url());
define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL . '/wp-json/convo/v1/public');
define( 'CONVO_UTIL_DISABLE_GZIP_ENCODING', false); // faster Rest responses, but can cause problemss in development and debuging

// Initialize the plugin
function run_convo_plugin() {
	if (version_compare(PHP_VERSION, '7.2', ">=")) {
		// Add autoloader
		require_once __DIR__.'/vendor/autoload.php';
		$plugin = new ConvoWPPlugin();
		$plugin->init();
	} else {
		if (is_admin()) {
			add_action('all_admin_notices', function() {
				echo '<div class="error"><p>You need PHP v7.2+ to use the ConvoWp plugin. You currently have ' . PHP_VERSION . '</p></div>';
			});
		}
	}
}
run_convo_plugin();

// Plugin activation and deactivation
if (version_compare(PHP_VERSION, '7.2', ">=")) {
	register_activation_hook( __FILE__, [ \ConvoPlugin\Providers\PluginActivator::class, 'activate' ] );
	register_deactivation_hook( __FILE__, [ \ConvoPlugin\Providers\PluginActivator::class, 'deactivate' ] );
	add_action( 'activated_plugin', [ \ConvoPlugin\Providers\PluginActivator::class, 'afterActivate' ] );
	add_action( 'deactivated_plugin', [ \ConvoPlugin\Providers\PluginActivator::class, 'afterDeactivate' ] );
}

