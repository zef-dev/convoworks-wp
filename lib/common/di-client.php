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

if ( !defined( 'CONVO_LOG_LEVEL')) {
    define( 'CONVO_LOG_LEVEL', 'debug');
}

if ( !defined( 'CONVO_LOG_PATH')) {
    define( 'CONVO_LOG_PATH', null);
}

if ( is_null( CONVO_LOG_PATH)) {
    $logger = new NullLogger();
} else {
    $logger = new Logger( 'public');
    $fileHandler = new StreamHandler( CONVO_LOG_PATH.'/convo-'.date('Y-m-d').'.log', CONVO_LOG_LEVEL);
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
		CONVO_BASE_URL,
		DI\get('httpFactory'),
		DI\get('logger'),
		DI\get('adminUserDataProvider'),
		DI\get('amazonAuthService')
	),
	'\Convo\Proto\ServiceUsersRestHandler' => DI\create()->constructor(
		DI\get('httpFactory'),
		DI\get('logger'),
		DI\get('serviceUserDao')
	),
	'\Convo\Proto\OAuthRestHandler' => DI\create()->constructor(
		DI\get('httpFactory'),
		DI\get('logger'),
		DI\get('serviceUserDao')
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
		DI\get('convoServiceDataProvider')
	)
];

