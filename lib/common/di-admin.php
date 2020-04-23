<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Convo\Monolog\MonologFormatter;

return [
	'logger' => 	DI\factory( function () {
		$logger = new Logger( 'admin');
		$fileHandler = new StreamHandler( CONVO_LOG_PATH.'/convo-'.date('Y-m-d').'.log', Logger::DEBUG);
		$fileHandler->setFormatter(new MonologFormatter());
		$logger->pushHandler($fileHandler);
		return $logger;
	}),
	'\Convo\Core\Admin\ServicesRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
	    DI\get('platformPublisherFactory'),
	    DI\get('convoPackageProvider')
	),
	'\Convo\Core\Admin\ServicePlatformConfigRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('platformPublisherFactory')
	),
	'\Convo\Core\Admin\ServicePublishRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('platformPublisherFactory')
	),
	'\Convo\Core\Admin\UserPackgesRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoPackageProvider')
	),
	'\Convo\Core\Admin\TestServiceRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('platformPublisherFactory')
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
		DI\get('mediaService'),
		DI\get('convoServiceDataProvider')
	),
	'\Convo\Proto\AdminAuthRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('adminUserDataProvider'),
		DI\get('httpFactory')
	),
	'adminUserDataProvider' => DI\create( '\Convo\Proto\AdminUserDao')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'amazonAuthService' => DI\create('Convo\Core\Adapters\Alexa\AmazonAuthService')->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('configProvider')
	)
];

