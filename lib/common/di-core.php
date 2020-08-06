<?php

return [
	'serviceUserDao' => DI\create('\Convo\Proto\ServiceUserDao')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'httpFactory' => DI\create('\Convo\Guzzle\GuzzleHttpFactory'),
	'googleNlpSyntaxParser' => DI\create('\Convo\Pckg\Gnlp\GoogleNlSyntaxParser')->constructor(
		DI\get('logger')
	),
	'googleNlpFactory' => DI\create('\Convo\Pckg\Gnlp\Api\CacheableGoogleNlpApiFactory')->constructor(
		DI\get('cache'),
		DI\get('logger'),
		DI\get('httpFactory')
	),
	'convoPackageProvider' => DI\create('\Convo\Core\Factory\ConvoPackageProvider')->constructor(
		DI\get('logger')
	),
	'convoServiceFactory' => DI\create('\Convo\Core\Factory\ConvoServiceFactory')->constructor(
		DI\get('logger'),
		DI\get('convoPackageProvider'),
		DI\get('convoServiceDataProvider')
	),
	'\Convo\Pckg\Core\CorePackageDefinition' => DI\create('\Convo\Pckg\Core\CorePackageDefinition')->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('googleNlpFactory'),
		DI\get('googleNlpSyntaxParser'),
		DI\get('convoPackageProvider'),
		DI\get('cache')
	),
	'\Convo\Pckg\Alexa\AmazonPackageDefinition' => DI\create('\Convo\Pckg\Alexa\AmazonPackageDefinition')->constructor(
		DI\get('logger')
	),
	'\Convo\Pckg\Dialogflow\DialogflowPackageDefinition' => DI\create('\Convo\Pckg\Dialogflow\DialogflowPackageDefinition')->constructor(
		DI\get('logger')
	),
	'\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition' => DI\create('\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition')->constructor(
		DI\get('logger'),
		DI\get('googleNlpFactory'),
		DI\get('googleNlpSyntaxParser')
	),
	'\Convo\Pckg\Text\TextPackageDefinition' => DI\create('\Convo\Pckg\Text\TextPackageDefinition')->constructor(
		DI\get('logger')
	),
	'\Convo\Proto\Pckg\ProtoPackageDefinition' => DI\create('\Convo\Proto\Pckg\ProtoPackageDefinition')->constructor(
		DI\get('logger'),
		DI\get('serviceUserDao')
	),
    'serviceReleaseManager' => DI\create( '\Convo\Core\Publish\ServiceReleaseManager')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider'),
        CONVO_BASE_URL
        ),
	'platformPublisherFactory' => DI\create('\Convo\Core\Publish\PlatformPublisherFactory')->constructor(
		CONVO_BASE_URL,
		DI\get('logger'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('serviceMediaManager'),
		DI\get('amazonPublishingService'),
		DI\get('dialogflowApiFactory'),
		DI\get('facebookMessengerApiFactory'),
		DI\get('viberApi'),
		DI\get('convoPackageProvider'),
		DI\get('adminUserDataProvider'),
		DI\get('systemConfigurationProvider'),
		DI\get('serviceReleaseManager')
	),
	'amazonPublishingService' => DI\create('\Convo\Core\Adapters\Alexa\AmazonPublishingService')->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('amazonAuthService')
	),
  'facebookMessengerApiFactory' => DI\create('\Convo\Core\Adapters\Fbm\FacebookMessengerApiFactory')->constructor(
    DI\get('logger'),
    DI\get('httpFactory')
  ),
    'viberApi' => DI\create('\Convo\Core\Adapters\Viber\ViberApi')->constructor(
        DI\get('logger'),
        DI\get('httpFactory')
    ),
	'dialogflowApiFactory' => DI\create('\Convo\Core\Adapters\Dialogflow\DialogflowApiFactory')->constructor(
		DI\get('logger'),
		DI\get('convoServiceDataProvider'),
		DI\get('adminUserDataProvider'),
		DI\get('httpFactory')
	),
	'systemConfigurationProvider' => DI\create('\Convo\Proto\SimpleSystemConfigurationProvider')->constructor(
		DI\get('logger'),
		CONVO_SYSTEM_CONFIGURATION
	),
	'adminUserDataProvider' => DI\create('\Convo\Proto\AdminUserDao')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'amazonAuthService' => DI\create('\Convo\Core\Adapters\Alexa\AmazonAuthService')->constructor(
		DI\get('logger'),
		CONVO_BASE_URL,
		DI\get('httpFactory'),
		DI\get('adminUserDataProvider'),
		DI\get('systemConfigurationProvider')
	),
    'currentTimeService' => DI\create('\Convo\Core\Util\CurrentTimeService'),
    'alexaRequestValidator' => DI\create('\Convo\Core\Validators\Alexa\AlexaRequestValidator')->constructor(
        DI\get('httpFactory'),
        DI\get('currentTimeService'),
        DI\get('logger')
    ),
    'platformRequestFactory' => DI\create('\Convo\Core\Factory\PlatformRequestFactory')->constructor(
        DI\get('logger'),
        DI\get('convoServiceDataProvider'),
        DI\get('amazonPublishingService'),
        DI\get('dialogflowApiFactory'),
        DI\get('adminUserDataProvider'),
        DI\get('httpFactory')
    ),
	'\Convo\Pckg\Mtg\MtgPackageDefinition' => DI\create()->constructor(
		DI\get('logger'),
		DI\get('httpFactory')
	),
];
