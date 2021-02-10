<?php

/**
 * ConvoworksWP plugin
 *
 * Plugin Name: Convoworks WP
 * Description: Convoworks Plugin is a new GUI-based, cross-platform, voice assistant service development tool.
 * UID: convo-wp
 * Plugin URI: https://convoworks.com
 * Author: ZEF Development
 * Version: 0.19.0
 * Author URI: https://convoworks.com
 * Text Domain: convo-wp
 * Domain Path: /resources/lang
 */

use ConvoPlugin\Providers\ConvoWPPlugin;

// Add autoloader
require_once __DIR__.'/vendor/autoload.php';

define('CONVOWP_VERSION', '0.19.0');
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
define('CONVO_DB_VERSION', '1.0.1');

// Define lib constants
define('CONVOWP_LIB_CONFIG_PATH', CONVOWP_PATH . '/lib/config/');
define('CONVOWP_LIB_COMMON_PATH', CONVOWP_PATH . '/lib/common/');

//set_include_path(
//	CONVOWP_PATH . '/vendor/codeforest/convolibrary' . PATH_SEPARATOR .
	//get_include_path());

// CONVO RELATED
define( 'CONVO_VERSION'					, '1.0'); // used to reset js resources

define( 'CONVO_LOG_PATH', CONVOWP_PATH . '/storage/logs');
define( 'CONVO_LOG_LEVEL', 'info');
define( 'CONVO_LOG_PREFIX', 'convo');
define( 'CONVO_DATA_PATH', CONVOWP_PATH . '/lib/data');
//define( 'CONVO_CACHE_PATH', CONVOWP_PATH . '/lib/data/nlp_cache');
//define( 'CONVO_CONFIG_PATH', CONVOWP_PATH . '/lib/data/config');
define( 'CONVO_BASE_URL', site_url());
define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL . '/wp-json/convo/v1/public');


// UTIL
define( 'UTIL_DISABLE_GZIP_ENCODING', false); // faster Rest responses, but can cause problemss in development and debuging


// if ( true)
// {
// 	ini_set('display_errors', 1);
// 	// 		error_reporting(1);	// E_ERROR
// 	error_reporting(2047);	// E_ALL
// }


// function exception_error_handler($errno, $errstr, $errfile, $errline ) {
// 	$skip	=	array(E_DEPRECATED, E_STRICT); // E_NOTICE
// 	if (!in_array( $errno, $skip)) {
// 		throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
// 	}
// }
// set_error_handler("exception_error_handler");

// Initialize the plugin
function run_convo_plugin() {
	if (version_compare(PHP_VERSION, '7.2', ">=")) {
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

