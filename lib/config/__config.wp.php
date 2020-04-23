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
define( 'CONVO_BASE_URL', 'https://convo-local-tunnel.ngrok.io');


// UTIL
//define( 'UTIL_PUBLIC_MAINTENACE_MODE', false); // blocks access to everything
//define( 'UTIL_DISABLE_GZIP_ENCODING', true); // faster Rest responses, but can cause problemss in development and debuging


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