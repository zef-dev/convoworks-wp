<?php

global $wpdb;

if ( !defined( 'CONVO_DATA_PATH')) {
    throw new \Exception( 'CONVO_DATA_PATH is not defined!');
}

if ( !defined( 'CONVO_BASE_URL')) {
    throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

if ( !defined( 'CONVO_PUBLIC_REST_BASE_URL')) {
    define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL.'/rest_public/convo/v1');
}

return [
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Wp\WpServiceParamsFactory')->constructor(
		DI\get('logger'),
		$wpdb
	),
	'convoServiceDataProvider' => DI\create( '\Convo\Data\Wp\WpServiceDataProvider')->constructor(
	    DI\get('logger'),
	    DI\get('adminUserDataProvider'),
		$wpdb
	),
	'serviceMediaManager' => DI\create('\Convo\Data\Filesystem\FilesystemServiceMediaManager')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
	    CONVO_PUBLIC_REST_BASE_URL
	),
    'cache' => DI\create( '\Convo\Data\Wp\WpCache')->constructor(
	    DI\get('logger'),
		$wpdb
    ),
];

