<?php

global $wpdb;

if ( !defined( 'CONVO_DATA_PATH')) {
    throw new \Exception( 'CONVO_DATA_PATH is not defined!');
}

if ( !defined( 'CONVO_MEDIA_BASE_URL')) {
	throw new \Exception( 'CONVO_MEDIA_BASE_URL is not defined!');
}

if ( !defined( 'CONVO_BASE_URL')) {
    throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

if ( !defined( 'CONVO_DISABLE_SERVICE_COMPRESSION')) {
    define( 'CONVO_DISABLE_SERVICE_COMPRESSION', false);
}

return [
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Wp\WpServiceParamsFactory')->constructor(
		DI\get('logger'),
		$wpdb
	),
	'convoServiceDataProvider' => DI\create( '\Convo\Data\Wp\WpServiceDataProvider')->constructor(
	    DI\get('logger'),
	    DI\get('adminUserDataProvider'),
	    $wpdb,
	    CONVO_DISABLE_SERVICE_COMPRESSION
	),
	'serviceMediaManager' => DI\create('\Convo\Data\Wp\WpServiceMediaManager')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
		CONVO_MEDIA_BASE_URL
	),
    'cache' => DI\create( '\Convo\Data\Wp\WpCache')->constructor(
	    DI\get('logger'),
		$wpdb
    ),
    'wpConvoServiceConversationRequestDao' => DI\create( '\Convo\Data\Wp\WpConvoServiceConversationRequestDao')->constructor(
        DI\get('logger'),
        $wpdb
    )
];

