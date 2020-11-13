<?php


if ( !defined( 'CONVO_DATA_PATH')) {
    throw new \Exception( 'CONVO_DATA_PATH is not defined!');
}

if ( !defined( 'CONVO_BASE_URL')) {
    throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

if ( !defined( 'CONVO_PUBLIC_REST_BASE_URL')) {
    define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL.'/rest_public/convo/v1');
}

if ( !defined( 'CONVO_STORE_AS_GZ')) {
    define( 'CONVO_STORE_AS_GZ', false);
}

if ( !defined( 'CONVO_CACHE_PATH') || is_null( CONVO_CACHE_PATH)) {
    $cache  =   DI\create( '\Convo\Core\Util\InMemoryCache')->constructor();
} else {
    $cache  =   DI\create( '\Convo\Data\Filesystem\FilesystemCache')->constructor( DI\get('logger'), CONVO_CACHE_PATH);
}

return [
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceParamsFactory')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
	    CONVO_STORE_AS_GZ
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
    'cache' => $cache,
];

