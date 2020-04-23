<?php

// 'logger' => 	DI\create( '\Convo\Core\Util\Logger')->constructor( CONVO_LOG_PATH, CONVO_LOG_PREFIX, CONVO_LOG_LEVEL),

return [
	'serviceUserDao' => DI\create('\Convo\Proto\ServiceUserDao')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'httpFactory' => 	DI\create( '\Convo\Guzzle\GuzzleHttpFactory'),
	
    'googleNlpSyntaxParser' => 	DI\create( '\Convo\Pckg\Gnlp\GoogleNlSyntaxParser')->constructor( DI\get( 'logger')),
	'googleNlpFactory' => 	DI\create( '\Convo\Pckg\Gnlp\Api\CacheableGoogleNlpApiFactory')->constructor( 
		DI\get( 'cache'),
		DI\get( 'logger'),
		DI\get( 'httpFactory')),
    
    'convoPackageProvider' => 	DI\create( '\Convo\Core\Factory\ConvoPackageProvider')->constructor( DI\get( 'logger')),
    
	'convoServiceFactory' => 	DI\create( '\Convo\Core\Factory\ConvoServiceFactory')->constructor( 
	    DI\get( 'logger'), DI\get( 'convoPackageProvider'), DI\get( 'convoServiceDataProvider')),
    
    '\Convo\Pckg\Core\CorePackageDefinition'             => 	DI\create( '\Convo\Pckg\Core\CorePackageDefinition')->constructor(
        DI\get( 'logger'), DI\get( 'httpFactory'), DI\get( 'googleNlpFactory'), DI\get( 'googleNlpSyntaxParser'), DI\get( 'convoPackageProvider')),
    '\Convo\Pckg\Alexa\AmazonPackageDefinition'          => DI\create( '\Convo\Pckg\Alexa\AmazonPackageDefinition')->constructor( DI\get( 'logger')),
    '\Convo\Pckg\Dialogflow\DialogflowPackageDefinition' => DI\create( '\Convo\Pckg\Dialogflow\DialogflowPackageDefinition')->constructor( DI\get( 'logger')),
    '\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition'        => DI\create( '\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition')->constructor( 
        DI\get( 'logger'), DI\get( 'googleNlpFactory'), DI\get( 'googleNlpSyntaxParser')),
	'\Convo\Proto\Pckg\ProtoPackageDefinition'           => DI\create( '\Convo\Proto\Pckg\ProtoPackageDefinition')->constructor( DI\get('logger'), DI\get('serviceUserDao')),
	'platformPublisherFactory' => DI\create( '\Convo\Core\Publish\PlatformPublisherFactory')->constructor(
		CONVO_BASE_URL,
		DI\get('logger'),
		DI\get('convoServiceFactory'),
		DI\get('convoServiceDataProvider'),
		DI\get('convoServiceParamsFactory'),
		DI\get('mediaService'),
		DI\get('amazonPublishingService'),
		DI\get('dialogflowApiFactory'),
		DI\get('convoPackageProvider')
	),
	'amazonPublishingService' => DI\create('\Convo\Core\Adapters\Alexa\AmazonPublishingService')->constructor(
		DI\get('logger'),
		DI\get('httpFactory'),
		DI\get('amazonAuthService')
	),
	'dialogflowApiFactory' => DI\create('\Convo\Core\Adapters\Dialogflow\DialogflowApiFactory')->constructor(
		DI\get('logger'),
		DI\get('convoServiceDataProvider')
	)
];
