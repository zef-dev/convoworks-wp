<?php

if ( !defined( 'CONVO_PUBLIC_REST_BASE_URL')) {
    define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL.'/rest_public/convo/v1');
}

$storeAsGz = defined('CONVO_STORE_AS_GZ') ? CONVO_STORE_AS_GZ : true;

return [
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceParamsFactory')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
        $storeAsGz
	),
	'convoServiceDataProvider' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceDataProvider')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'serviceMediaManager' => DI\create('\Convo\Data\Filesystem\FilesystemServiceMediaManager')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
	    CONVO_PUBLIC_REST_BASE_URL
	),
	'cache' => DI\create( '\Convo\Data\Filesystem\FilesystemCache')->constructor(
		DI\get('logger'),
		CONVO_CACHE_PATH
	),
];

