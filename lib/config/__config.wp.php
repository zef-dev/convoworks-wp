<?php
// CONVO
define( 'CONVO_VERSION'					, '1.0'); // used to reset js resources
define( 'CONVO_APP_TITLE'				, 'ConvoWorks Prototype');
define( 'CONVO_IS_DEVELOPMENT'			, true); // is it local, dvelopment installation

define( 'CONVO_LOG_PATH', CONVOWP_PATH . '/storage/logs');
define( 'CONVO_LOG_LEVEL', 'debug');
define( 'CONVO_LOG_PREFIX', 'convo');
define( 'CONVO_DATA_PATH', CONVOWP_PATH . '/lib/data');
define( 'CONVO_CACHE_PATH', CONVOWP_PATH . '/lib/data/nlp_cache');
define( 'CONVO_CONFIG_PATH', CONVOWP_PATH . '/lib/data/config');
define( 'CONVO_BASE_URL', 'http://convo-wp.local');
//define( 'CONVO_BASE_URL', 'https://wpdemo.convoworks.com');


// UTIL
define( 'UTIL_PUBLIC_MAINTENACE_MODE', false); // blocks access to everything
define( 'UTIL_DISABLE_GZIP_ENCODING', false); // faster Rest responses, but can cause problemss in development and debuging

define('CONVO_SYSTEM_CONFIGURATION', [
	'amazon' => [
		'client_id' => 'amzn1.application-oa2-client.95c95384fdc741dd85d13aaec12b561f',
		'client_secret' => '447927fbc586fe477e56ef7c41e5928527dbe211c8aa61209663a3af61e688c4'
	]
]);


if ( true)
{
	ini_set('display_errors', 1);
	// 		error_reporting(1);	// E_ERROR
	error_reporting(2047);	// E_ALL
}


function exception_error_handler($errno, $errstr, $errfile, $errline ) {
	$skip	=	array(E_DEPRECATED, E_STRICT); // E_NOTICE
	if (!in_array( $errno, $skip)) {
		throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
	}
}
set_error_handler("exception_error_handler");