<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Zef\Monolog\MonologFormatter;

// GLOBAL LOG
if ( !defined( 'CONVO_LOG_LEVEL')) {
    define( 'CONVO_LOG_LEVEL', 'info');
}

if ( !defined( 'CONVO_LOG_PATH')) {
    define( 'CONVO_LOG_PATH', null);
}

if ( !defined( 'CONVO_LOG_FILENAME')) {
    define( 'CONVO_LOG_FILENAME', 'debug.log');
}

// PUBLIC LOG
if ( !defined( 'CONVO_LOG_LEVEL_ADMIN')) {
    define( 'CONVO_LOG_LEVEL_ADMIN', CONVO_LOG_LEVEL);
}

if ( !defined( 'CONVO_LOG_PATH_ADMIN')) {
    define( 'CONVO_LOG_PATH_ADMIN', CONVO_LOG_PATH);
}

if ( !defined( 'CONVO_LOG_FILENAME_ADMIN')) {
    define( 'CONVO_LOG_FILENAME_ADMIN', CONVO_LOG_FILENAME);
}

if ( empty( CONVO_LOG_PATH_ADMIN) || empty( CONVO_LOG_FILENAME_ADMIN) || empty( CONVO_LOG_LEVEL_ADMIN)) {
    $logger = new Psr\Log\NullLogger();
} else {
    $logger = new Logger( 'admin');
    $fileHandler = new StreamHandler( CONVO_LOG_PATH_ADMIN.'/'.CONVO_LOG_FILENAME_ADMIN, CONVO_LOG_LEVEL_ADMIN);
    $fileHandler->setFormatter(new MonologFormatter());
    $logger->pushHandler($fileHandler);
}

return [

    // COMMON
	'logger' => 	DI\factory( function () use ( $logger) {
		return $logger;
	}),
	'propagationErrorReport' => DI\create( '\Convo\Core\Admin\PropagationErrorReport')->constructor(
	    DI\get('logger')
	    ),

	// REST API
	'\Convo\Core\Admin\ServicesRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
	    DI\get('convoServiceParamsFactory'),
		DI\get('packageProviderFactory'),
        DI\get('platformPublisherFactory'),
        DI\get('adminUserDataProvider')
	),
	'\Convo\Core\Admin\ServiceVersionsRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
	    DI\get('platformPublisherFactory'),
		DI\get('serviceReleaseManager')
	),
	'\Convo\Core\Admin\ServicePlatformConfigRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('platformPublisherFactory'),
		DI\get('serviceReleaseManager'),
		DI\get('propagationErrorReport')
	),
	'\Convo\Core\Admin\UserPlatformConfigRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('adminUserDataProvider')
	),
	'\Convo\Core\Admin\UserPackgesRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('packageProviderFactory')
	),
    '\Convo\Core\Admin\ServicePackagesRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('convoServiceDataProvider'),
        DI\get('packageProviderFactory')
    ),
    '\Convo\Core\Admin\TemplatesRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('packageProviderFactory')
    ),
	'\Convo\Core\Admin\TestServiceRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('platformRequestFactory'),
        DI\get('eventDispatcher')
	),
	'\Convo\Core\Admin\ServiceImpExpRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
        DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
	    DI\get('platformPublisherFactory')
	),
	'\Convo\Core\Admin\MediaRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('serviceMediaManager'),
		DI\get('convoServiceDataProvider')
	),
    '\Convo\Core\Admin\ComponentHelpRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('packageProviderFactory')
    ),
// 	'\Convo\Core\Admin\AdminRestApi' => DI\create()->constructor(
// 			DI\get('logger'),
// 			DI\get('\DI\Container')
// 	),
    '\Convo\Core\Admin\ConfigurationRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),
    '\Convo\Core\Admin\AmazonAlexaSkillInfo' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('adminUserDataProvider'),
        DI\get('amazonPublishingService'),
	    DI\get('convoServiceDataProvider')
        )
];

