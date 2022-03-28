<?php

if ( !defined( 'CONVO_BASE_URL')) {
	throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

if ( !defined( 'CONVO_PUBLIC_REST_BASE_URL')) {
	define( 'CONVO_PUBLIC_REST_BASE_URL', CONVO_BASE_URL . '/wp-json/convo/v1/public');
}

return [

    // COMMON
	'httpFactory' => DI\create('\Convo\Guzzle\GuzzleHttpFactory'),
    'currentTimeService' => DI\create('\Convo\Core\Util\CurrentTimeService'),

    // GOOGLE NLP
	'googleNlpSyntaxParser' => DI\create('\Convo\Pckg\Gnlp\GoogleNlSyntaxParser')->constructor(
		DI\get('logger')
	),
	'googleNlpFactory' => DI\create('\Convo\Pckg\Gnlp\Api\CacheableGoogleNlpApiFactory')->constructor(
		DI\get('cache'),
		DI\get('logger'),
		DI\get('httpFactory')
	),

    // USERS
    'adminUserDataProvider' => DI\create('Convo\Wp\AdminUserDataProvider')->constructor(
        DI\get('logger')
    ),
    'serviceUserDao' => DI\create('Convo\Wp\AdminUserDataProvider')->constructor(
        DI\get('logger')
    ),

    // SERVICES
	'convoServiceFactory' => DI\create('\Convo\Core\Factory\ConvoServiceFactory')->constructor(
		DI\get('logger'),
		DI\get('packageProviderFactory'),
		DI\get('convoServiceDataProvider')
	),
    'serviceReleaseManager' => DI\create( '\Convo\Core\Publish\ServiceReleaseManager')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider'),
	    CONVO_PUBLIC_REST_BASE_URL
    ),

    // AMAZON
	'amazonAuthService' => DI\create('\Convo\Core\Adapters\Alexa\AmazonAuthService')->constructor(
		DI\get('logger'),
		CONVO_PUBLIC_REST_BASE_URL,
		DI\get('httpFactory'),
		DI\get('adminUserDataProvider')
	),
    'alexaRequestValidator' => DI\create('\Convo\Core\Adapters\Alexa\Validators\AlexaRequestValidator')->constructor(
        DI\get('httpFactory'),
        DI\get('currentTimeService'),
        DI\get('logger')
    ),
    'amazonPublishingService' => DI\create('\Convo\Core\Adapters\Alexa\AmazonPublishingService')->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('amazonAuthService')
    ),
	'alexaCustomerProfileApi' => DI\create('\Convo\Core\Adapters\Alexa\Api\AlexaCustomerProfileApi')->constructor(
		DI\get('logger'),
		DI\get('httpFactory')
	),
	'alexaSettingsApi' => DI\create('\Convo\Core\Adapters\Alexa\Api\AlexaSettingsApi')->constructor(
		DI\get('logger'),
		DI\get('httpFactory')
	),
    'alexaRemindersApi' => DI\create('\Convo\Core\Adapters\Alexa\Api\AlexaRemindersApi')->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),
    'amazonUserApi' => DI\create('\Convo\Core\Adapters\Alexa\Api\AmazonUserApi')->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),

    // DIALOGFLOW
    'dialogflowApiFactory' => DI\create('\Convo\Core\Adapters\Dialogflow\DialogflowApiFactory')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider'),
        DI\get('adminUserDataProvider')
    ),

    // FACEBOOK
    'facebookMessengerApiFactory' => DI\create('\Convo\Core\Adapters\Fbm\FacebookMessengerApiFactory')->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),

    // VIBER
    'viberApi' => DI\create('\Convo\Core\Adapters\Viber\ViberApi')->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),


    // PLATFORMS
    'platformRequestFactory' => DI\create('\Convo\Core\Factory\PlatformRequestFactory')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider'),
        DI\get('amazonPublishingService'),
        DI\get('dialogflowApiFactory'),
        DI\get('adminUserDataProvider'),
        DI\get('httpFactory')
    ),
    'platformPublisherFactory' => DI\create('\Convo\Core\Publish\PlatformPublisherFactory')->constructor(
        CONVO_PUBLIC_REST_BASE_URL,
        DI\get('logger'),
        DI\get('convoServiceFactory'),
        DI\get('convoServiceDataProvider'),
        DI\get('convoServiceParamsFactory'),
        DI\get('serviceMediaManager'),
        DI\get('amazonPublishingService'),
        DI\get('dialogflowApiFactory'),
        DI\get('facebookMessengerApiFactory'),
        DI\get('viberApi'),
        DI\get('packageProviderFactory'),
        DI\get('adminUserDataProvider'),
        DI\get('serviceReleaseManager'),
		DI\get('platformPublishingHistory')
    ),

	'platformPublishingHistory' => DI\create('\Convo\Core\Publish\PlatformPublishingHistory')->constructor(
		DI\get('logger'),
		DI\get('cache')
	),

    // PACKAGES
    'packageProviderFactory' => DI\create('\Convo\Core\Factory\PackageProviderFactory')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider')
        ),

    // PACKAGE DEFINITIONS
    '\Convo\Pckg\Core\CorePackageDefinition' => DI\create()->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('packageProviderFactory'),
        DI\get('cache')
        ),
    '\Convo\Pckg\Alexa\AmazonPackageDefinition' => DI\create('\Convo\Pckg\Alexa\AmazonPackageDefinition')->constructor(
        DI\get('logger'),
        DI\get('httpFactory'),
        DI\get('convoServiceDataProvider'),
		DI\get('amazonUserApi'),
		DI\get('alexaCustomerProfileApi'),
        DI\get('alexaRemindersApi')
        ),
    '\Convo\Pckg\Dialogflow\DialogflowPackageDefinition' => DI\create('\Convo\Pckg\Dialogflow\DialogflowPackageDefinition')->constructor(
        DI\get('logger')
        ),
	'\Convo\Pckg\Filesystem\FilesystemPackageDefinition' => DI\create('\Convo\Pckg\Filesystem\FilesystemPackageDefinition')->constructor(
		DI\get('logger')
	),
	'\Convo\Pckg\MySQLI\MySQLIPackageDefinition' => DI\create('\Convo\Pckg\MySQLI\MySQLIPackageDefinition')->constructor(
		DI\get('logger')
	),
	'\Convo\Pckg\Visuals\VisualsPackageDefinition' => DI\create('\Convo\Pckg\Visuals\VisualsPackageDefinition')->constructor(
		DI\get('logger')
	),
    '\Convo\Pckg\Trivia\TriviaPackageDefinition' => DI\create('\Convo\Pckg\Trivia\TriviaPackageDefinition')->constructor(
        DI\get('logger'),
        DI\get('packageProviderFactory'),
        DI\get('httpFactory')
        ),
    '\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition' => DI\create('\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition')->constructor(
        DI\get('logger'),
        DI\get('googleNlpFactory'),
        DI\get('googleNlpSyntaxParser')
        ),
    '\Convo\Pckg\Text\TextPackageDefinition' => DI\create('\Convo\Pckg\Text\TextPackageDefinition')->constructor(
        DI\get('logger')
        ),
	'\Convo\Pckg\Mtg\MtgPackageDefinition' => DI\create('\Convo\Pckg\Mtg\MtgPackageDefinition')->constructor(
		DI\get('logger'),
		DI\get('httpFactory')
	),
	'\Convo\Pckg\Ta\TaPackageDefinition' => DI\create('\Convo\Pckg\Ta\TaPackageDefinition')->constructor(
		DI\get('logger'),
		DI\get('taDao')
	),

	'protoServiceURLSupplier' => DI\create('\Convo\Wp\WpServiceURLSupplier')->constructor(
		DI\get('logger'),
		DI\get('convoServiceDataProvider'),
		DI\get('adminUserDataProvider'),
		CONVO_BASE_URL
	),
	'\Convo\Core\Admin\URLSupplierRestHandler' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('protoServiceURLSupplier')
	)

];
