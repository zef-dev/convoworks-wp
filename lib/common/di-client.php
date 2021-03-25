<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Zef\Monolog\MonologFormatter;

if ( !defined( 'CONVO_BASE_URL')) {
    throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

if (!defined('CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES')) {
    define('CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES', false);
}

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
if ( !defined( 'CONVO_LOG_LEVEL_PUBLIC')) {
    define( 'CONVO_LOG_LEVEL_PUBLIC', CONVO_LOG_LEVEL);
}

if ( !defined( 'CONVO_LOG_PATH_PUBLIC')) {
    define( 'CONVO_LOG_PATH_PUBLIC', CONVO_LOG_PATH);
}

if ( !defined( 'CONVO_LOG_FILENAME_PUBLIC')) {
    define( 'CONVO_LOG_FILENAME_PUBLIC', CONVO_LOG_FILENAME);
}

if ( empty( CONVO_LOG_PATH_PUBLIC) || empty( CONVO_LOG_FILENAME_PUBLIC) || empty( CONVO_LOG_LEVEL_PUBLIC)) {
    $logger = new Psr\Log\NullLogger();
} else {
    $logger = new Logger( 'public');
    $fileHandler = new StreamHandler( CONVO_LOG_PATH_PUBLIC.'/'.CONVO_LOG_FILENAME_PUBLIC, CONVO_LOG_LEVEL_PUBLIC);
    $fileHandler->setFormatter(new MonologFormatter());
    $logger->pushHandler($fileHandler);
}

return [
    // COMMON
    'logger' => 	DI\factory( function () use ( $logger) {
    return $logger;
    }),
	'facebookAuthService' => DI\create( '\Convo\Core\Adapters\Fbm\FacebookAuthService')->constructor(
		DI\get('logger')
	),

	// REST
	'\Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('platformRequestFactory')
	),
	'\Convo\Core\Adapters\Alexa\AlexaSkillRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('alexaRequestValidator')
	),
    '\Convo\Core\Adapters\Google\Dialogflow\DialogflowAgentRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('convoServiceFactory'),
        DI\get('convoServiceDataProvider'),
        DI\get('convoServiceParamsFactory'),
        CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES
    ),
    '\Convo\Core\Adapters\Google\Gactions\ActionsRestHandler' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('convoServiceFactory'),
        DI\get('convoServiceDataProvider'),
        DI\get('convoServiceParamsFactory'),
        CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES
    ),
	'\Convo\Core\Adapters\Fbm\FacebookMessengerRestHandler' => DI\create()->constructor(
		DI\get('httpFactory'),
		DI\get('logger'),
		DI\get('adminUserDataProvider'),
		DI\get('facebookAuthService'),
        DI\get('convoServiceDataProvider'),
        DI\get('convoServiceFactory'),
        DI\get('convoServiceParamsFactory'),
        DI\get('platformRequestFactory'),
        DI\get('facebookMessengerApiFactory')
	),
    '\Convo\Core\Adapters\Viber\ViberRestHandler' => DI\create()->constructor(
        DI\get('httpFactory'),
        DI\get('logger'),
        DI\get('adminUserDataProvider'),
        DI\get('facebookAuthService'),
        DI\get('convoServiceDataProvider'),
        DI\get('convoServiceFactory'),
        DI\get('convoServiceParamsFactory'),
        DI\get('platformRequestFactory')
    ),
	'\Convo\Core\Adapters\Alexa\AmazonAuthRestHandler' => DI\create()->constructor(
		admin_url('admin.php?page=convo-settings'),
		DI\get('httpFactory'),
		DI\get('logger'),
		DI\get('adminUserDataProvider'),
		DI\get('amazonAuthService')
	),
	'\Convo\Core\Media\MediaRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('serviceMediaManager')
	),
	'\Convo\Pckg\Mtg\MtgRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory')
	),
	'\Convo\Core\Adapters\Alexa\CatalogRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('adminUserDataProvider'),
		DI\get('convoServiceFactory'),
	    DI\get('convoServiceDataProvider'),
	    DI\get('convoServiceParamsFactory')
	)
];

