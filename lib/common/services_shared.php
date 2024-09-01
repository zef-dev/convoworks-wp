<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;


if ( !class_exists('LoggerHandlerFactory')) {
    class LoggerHandlerFactory
    {
        public static function createHandler($path, $filename, $level)
        {
            if (empty($path) || empty($filename) || empty($level)) {
                return new NullHandler();
            } else {
                return new StreamHandler($path . '/' . $filename, Logger::toMonologLevel($level));
            }
        }
    }
}



// Create the container builder
$containerBuilder = new ContainerBuilder();

if ( !defined( 'CONVO_PUBLIC_REST_BASE_URL')) {
    throw new \Exception( 'CONVO_PUBLIC_REST_BASE_URL is not defined!');
}
$containerBuilder->setParameter('CONVO_PUBLIC_REST_BASE_URL', CONVO_PUBLIC_REST_BASE_URL);


// COMMON SERVICES
$containerBuilder->register('httpFactory', \Convo\Guzzle\GuzzleHttpFactory::class);
$containerBuilder->register('currentTimeService', \Convo\Core\Util\CurrentTimeService::class);
$containerBuilder->register('eventDispatcher', \Convo\Core\EventDispatcher\EventDispatcher::class);

// GOOGLE NLP
$containerBuilder->register('googleNlpSyntaxParser', \Convo\Pckg\Gnlp\GoogleNlSyntaxParser::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('googleNlpFactory', \Convo\Pckg\Gnlp\Api\CacheableGoogleNlpApiFactory::class)
    ->addArgument(new Reference('cache'))
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));

// USERS
$containerBuilder->register('adminUserDataProvider', \Convo\Wp\AdminUserDataProvider::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('serviceUserDao', \Convo\Wp\AdminUserDataProvider::class)
    ->addArgument(new Reference('logger'));

// SERVICES
$containerBuilder->register('convoServiceFactory', \Convo\Core\Factory\ConvoServiceFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'));
$containerBuilder->register('serviceReleaseManager', \Convo\Core\Publish\ServiceReleaseManager::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%');

// AMAZON
$containerBuilder->register('amazonAuthService', \Convo\Core\Adapters\Alexa\AmazonAuthService::class)
    ->addArgument(new Reference('logger'))
    ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%')
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('adminUserDataProvider'));
$containerBuilder->register('alexaRequestValidator', \Convo\Core\Adapters\Alexa\Validators\AlexaRequestValidator::class)
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('currentTimeService'))
    ->addArgument(new Reference('logger'));
$containerBuilder->register('amazonPublishingService', \Convo\Core\Adapters\Alexa\AmazonPublishingService::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('amazonAuthService'));
$containerBuilder->register('alexaCustomerProfileApi', \Convo\Core\Adapters\Alexa\Api\AlexaCustomerProfileApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('alexaPersonProfileApi', \Convo\Core\Adapters\Alexa\Api\AlexaPersonProfileApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('alexaSettingsApi', \Convo\Core\Adapters\Alexa\Api\AlexaSettingsApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('alexaRemindersApi', \Convo\Core\Adapters\Alexa\Api\AlexaRemindersApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('alexaDeviceAddressApi', \Convo\Core\Adapters\Alexa\Api\AlexaDeviceAddressApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('amazonUserApi', \Convo\Core\Adapters\Alexa\Api\AmazonUserApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));

// DIALOGFLOW
$containerBuilder->register('dialogflowApiFactory', \Convo\Core\Adapters\Dialogflow\DialogflowApiFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('httpFactory'));

// FACEBOOK
$containerBuilder->register('facebookMessengerApiFactory', \Convo\Core\Adapters\Fbm\FacebookMessengerApiFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));

// VIBER
$containerBuilder->register('viberApi', \Convo\Core\Adapters\Viber\ViberApi::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));

// PLATFORMS
$containerBuilder->register('platformRequestFactory', \Convo\Core\Factory\PlatformRequestFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('amazonPublishingService'))
    ->addArgument(new Reference('dialogflowApiFactory'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('platformPublisherFactory', \Convo\Core\Publish\PlatformPublisherFactory::class)
    ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%')
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('serviceMediaManager'))
    ->addArgument(new Reference('amazonPublishingService'))
    ->addArgument(new Reference('dialogflowApiFactory'))
    ->addArgument(new Reference('facebookMessengerApiFactory'))
    ->addArgument(new Reference('viberApi'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('serviceReleaseManager'))
    ->addArgument(new Reference('platformPublishingHistory'));

$containerBuilder->register('platformPublishingHistory', \Convo\Core\Publish\PlatformPublishingHistory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('cache'));

// PACKAGES
$containerBuilder->register('packageProviderFactory', \Convo\Core\Factory\PackageProviderFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceDataProvider'));

// PACKAGE DEFINITIONS
$containerBuilder->register('\Convo\Pckg\Core\CorePackageDefinition', \Convo\Pckg\Core\CorePackageDefinition::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('cache'));
$containerBuilder->register('\Convo\Pckg\Alexa\AmazonPackageDefinition', \Convo\Pckg\Alexa\AmazonPackageDefinition::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('amazonUserApi'))
    ->addArgument(new Reference('alexaCustomerProfileApi'))
    ->addArgument(new Reference('alexaPersonProfileApi'))
    ->addArgument(new Reference('alexaRemindersApi'))
    ->addArgument(new Reference('alexaDeviceAddressApi'))
    ->addArgument(new Reference('packageProviderFactory'));
$containerBuilder->register('\Convo\Pckg\Dialogflow\DialogflowPackageDefinition', \Convo\Pckg\Dialogflow\DialogflowPackageDefinition::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('\Convo\Pckg\Filesystem\FilesystemPackageDefinition', \Convo\Pckg\Filesystem\FilesystemPackageDefinition::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('\Convo\Pckg\MySQLI\MySQLIPackageDefinition', \Convo\Pckg\MySQLI\MySQLIPackageDefinition::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('\Convo\Pckg\Visuals\VisualsPackageDefinition', \Convo\Pckg\Visuals\VisualsPackageDefinition::class)
    ->addArgument(new Reference('logger'));
$containerBuilder->register('\Convo\Pckg\Trivia\TriviaPackageDefinition', \Convo\Pckg\Trivia\TriviaPackageDefinition::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('httpFactory'));
$containerBuilder->register('\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition', \Convo\Pckg\Gnlp\GoogleNlpPackageDefinition::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('googleNlpFactory'))
    ->addArgument(new Reference('googleNlpSyntaxParser'));
$containerBuilder->register('\Convo\Pckg\Text\TextPackageDefinition', \Convo\Pckg\Text\TextPackageDefinition::class)
    ->addArgument(new Reference('logger'));

// WP DATA
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

$containerBuilder->setParameter('CONVO_DISABLE_SERVICE_COMPRESSION', CONVO_DISABLE_SERVICE_COMPRESSION);
$containerBuilder->setParameter('CONVO_BASE_URL', CONVO_BASE_URL);
$containerBuilder->setParameter('CONVO_MEDIA_BASE_URL', CONVO_MEDIA_BASE_URL);
$containerBuilder->setParameter('CONVO_DATA_PATH', CONVO_DATA_PATH);

$containerBuilder->register('convoServiceParamsFactory', \Convo\Data\Wp\WpServiceParamsFactory::class)
    ->addArgument(new Reference('logger'))
    ->addArgument($wpdb);
$containerBuilder->register('convoServiceDataProvider', \Convo\Data\Wp\WpServiceDataProvider::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument($wpdb)
    ->addArgument('%CONVO_DISABLE_SERVICE_COMPRESSION%');
$containerBuilder->register('serviceMediaManager', \Convo\Data\Wp\WpServiceMediaManager::class)
    ->addArgument(new Reference('logger'))
    ->addArgument('%CONVO_DATA_PATH%')
    ->addArgument('%CONVO_MEDIA_BASE_URL%');
$containerBuilder->register('cache', \Convo\Data\Wp\WpCache::class)
    ->addArgument(new Reference('logger'))
    ->addArgument($wpdb);
$containerBuilder->register('wpConvoServiceConversationRequestDao', \Convo\Data\Wp\WpConvoServiceConversationRequestDao::class)
    ->addArgument(new Reference('logger'))
    ->addArgument($wpdb);

// PROTO SERVICES
$containerBuilder->register('protoServiceURLSupplier', \Convo\Wp\WpServiceURLSupplier::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument('%CONVO_BASE_URL%');
$containerBuilder->register('\Convo\Core\Admin\URLSupplierRestHandler', \Convo\Core\Admin\URLSupplierRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('protoServiceURLSupplier'));

// EVENT LISTENERS
$containerBuilder->register('wpConvoConversationRequestEventListener', \Convo\EventListeners\Wp\WpConvoConversationRequestEventListener::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('wpConvoServiceConversationRequestDao'))
    ->addArgument(new Reference('convoServiceDataProvider'));

// Return the container builder
return $containerBuilder;
