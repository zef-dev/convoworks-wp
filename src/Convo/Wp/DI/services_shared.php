<?php

use Convo\Core\Adapters\Alexa\AmazonPublishingService;
use Convo\Core\Adapters\Alexa\Api\AlexaCustomerProfileApi;
use Convo\Core\Adapters\Alexa\Api\AlexaDeviceAddressApi;
use Convo\Core\Adapters\Alexa\Api\AlexaPersonProfileApi;
use Convo\Core\Adapters\Alexa\Api\AlexaRemindersApi;
use Convo\Core\Adapters\Alexa\Api\AlexaSettingsApi;
use Convo\Core\Adapters\Alexa\Validators\AlexaRequestValidator;
use Convo\Core\Adapters\Viber\ViberApi;
use Convo\Core\EventDispatcher\EventDispatcher;
use Convo\Core\Factory\ConvoServiceFactory;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Core\Factory\PlatformRequestFactory;
use Convo\Core\Publish\PlatformPublisherFactory;
use Convo\Core\Publish\PlatformPublishingHistory;
use Convo\Core\Publish\ServiceReleaseManager;
use Convo\Core\Rest\ConvoExceptionHandler;
use Convo\Core\Util\BodyParserMiddleware;
use Convo\Core\Util\CurrentTimeService;
use Convo\Core\Util\JsonHeaderMiddleware;
use Convo\Pckg\Alexa\AmazonPackageDefinition;
use Convo\Pckg\Core\CorePackageDefinition;
use Convo\Pckg\Filesystem\FilesystemPackageDefinition;
use Convo\Pckg\MySQLI\MySQLIPackageDefinition;
use Convo\Pckg\Text\TextPackageDefinition;
use Convo\Pckg\Trivia\TriviaPackageDefinition;
use Convo\Pckg\Visuals\VisualsPackageDefinition;
use Convo\Wp\AdminUserDataProvider;
use Convo\Wp\Data\WpCache;
use Convo\Wp\Data\WpConvoServiceConversationRequestDao;
use Convo\Wp\Data\WpServiceDataProvider;
use Convo\Wp\Data\WpServiceMediaManager;
use Convo\Wp\Data\WpServiceParamsFactory;
use Convo\Wp\Data\WpOptionSecretStore;
use Convo\Wp\EventListeners\WpConvoConversationRequestEventListener;
use Convo\Wp\Guzzle\GuzzleHttpFactory;
use Convo\Wp\ConvoWpExceptionHandler;
use Convo\Wp\ConvoWpLogRequestMiddleware;
use Convo\Wp\SaveConvoRequestLogMiddleware;
use Convo\Wp\WpServiceURLSupplier;
use Convo\Wp\DI\ServiceContainerFactory;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Middlewares\GzipEncoder;
use Middlewares\TrailingSlash;

return static function (ContainerBuilder $containerBuilder, $wpdb): void {
    // COMMON SERVICES
    $containerBuilder->register('httpFactory', GuzzleHttpFactory::class);
    $containerBuilder->register('currentTimeService', CurrentTimeService::class);
    $containerBuilder->register('eventDispatcher', EventDispatcher::class);

    // SERVER / ENVIRONMENT CONTEXT
    $containerBuilder->register('serverVarsResolver', \Convo\Wp\Util\ApacheServerVarsResolver::class);

    // USERS
    $containerBuilder->register('adminUserDataProvider', AdminUserDataProvider::class)
        ->addArgument(new Reference('logger'));
    $containerBuilder->register('serviceUserDao', AdminUserDataProvider::class)
        ->addArgument(new Reference('logger'));

    // SERVICES
    $containerBuilder->register('convoServiceFactory', ConvoServiceFactory::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('packageProviderFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('secretStore'))
        ->addArgument(new Reference('serverVarsResolver'));

    $containerBuilder->register('serviceReleaseManager', ServiceReleaseManager::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%');

    // AMAZON
    $containerBuilder->register('amazonAuthService', \Convo\Core\Adapters\Alexa\AmazonAuthService::class)
        ->addArgument(new Reference('logger'))
        ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%')
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('adminUserDataProvider'));
    $containerBuilder->register('alexaRequestValidator', AlexaRequestValidator::class)
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('currentTimeService'))
        ->addArgument(new Reference('logger'));
    $containerBuilder->register('amazonPublishingService', AmazonPublishingService::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('amazonAuthService'));
    $containerBuilder->register('alexaCustomerProfileApi', AlexaCustomerProfileApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register('alexaPersonProfileApi', AlexaPersonProfileApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register('alexaSettingsApi', AlexaSettingsApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register('alexaRemindersApi', AlexaRemindersApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register('alexaDeviceAddressApi', AlexaDeviceAddressApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register('amazonUserApi', \Convo\Core\Adapters\Alexa\Api\AmazonUserApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));

    // VIBER
    $containerBuilder->register('viberApi', ViberApi::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));

    // PLATFORMS
    $containerBuilder->register('platformRequestFactory', PlatformRequestFactory::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('amazonPublishingService'))
        ->addArgument(new Reference('adminUserDataProvider'));
    $containerBuilder->register('platformPublisherFactory', PlatformPublisherFactory::class)
        ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%')
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('convoServiceFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('convoServiceParamsFactory'))
        ->addArgument(new Reference('serviceMediaManager'))
        ->addArgument(new Reference('amazonPublishingService'))
        ->addArgument(new Reference('viberApi'))
        ->addArgument(new Reference('packageProviderFactory'))
        ->addArgument(new Reference('adminUserDataProvider'))
        ->addArgument(new Reference('serviceReleaseManager'))
        ->addArgument(new Reference('platformPublishingHistory'));

    $containerBuilder->register('platformPublishingHistory', PlatformPublishingHistory::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('cache'));

    // PACKAGES
    // Use factory method to ensure same instance is shared across all containers
    $containerBuilder->register('packageProviderFactory', PackageProviderFactory::class)
        ->setFactory([ServiceContainerFactory::class, 'getSharedPackageProviderFactory'])
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('convoServiceDataProvider'));

    // PACKAGE DEFINITIONS
    $containerBuilder->register(CorePackageDefinition::class, CorePackageDefinition::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('packageProviderFactory'))
        ->addArgument(new Reference('cache'));
    $containerBuilder->register(AmazonPackageDefinition::class, AmazonPackageDefinition::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('amazonUserApi'))
        ->addArgument(new Reference('alexaCustomerProfileApi'))
        ->addArgument(new Reference('alexaPersonProfileApi'))
        ->addArgument(new Reference('alexaRemindersApi'))
        ->addArgument(new Reference('alexaDeviceAddressApi'))
        ->addArgument(new Reference('packageProviderFactory'));
    $containerBuilder->register(FilesystemPackageDefinition::class, FilesystemPackageDefinition::class)
        ->addArgument(new Reference('logger'));
    $containerBuilder->register(MySQLIPackageDefinition::class, MySQLIPackageDefinition::class)
        ->addArgument(new Reference('logger'));
    $containerBuilder->register(VisualsPackageDefinition::class, VisualsPackageDefinition::class)
        ->addArgument(new Reference('logger'));
    $containerBuilder->register(TriviaPackageDefinition::class, TriviaPackageDefinition::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('packageProviderFactory'))
        ->addArgument(new Reference('httpFactory'));
    $containerBuilder->register(TextPackageDefinition::class, TextPackageDefinition::class)
        ->addArgument(new Reference('logger'));

    // WP DATA
    $containerBuilder->register('convoServiceParamsFactory', WpServiceParamsFactory::class)
        ->addArgument(new Reference('logger'))
        ->addArgument($wpdb);
    $containerBuilder->register('convoServiceDataProvider', WpServiceDataProvider::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('adminUserDataProvider'))
        ->addArgument($wpdb)
        ->addArgument('%CONVO_DISABLE_SERVICE_COMPRESSION%');
    $containerBuilder->register('serviceMediaManager', WpServiceMediaManager::class)
        ->addArgument(new Reference('logger'))
        ->addArgument('%CONVO_DATA_PATH%')
        ->addArgument('%CONVO_MEDIA_BASE_URL%');
    $containerBuilder->register('cache', WpCache::class)
        ->addArgument(new Reference('logger'))
        ->addArgument($wpdb);
    $containerBuilder->register('wpConvoServiceConversationRequestDao', WpConvoServiceConversationRequestDao::class)
        ->addArgument(new Reference('logger'))
        ->addArgument($wpdb);

    $containerBuilder->register('secretStore', WpOptionSecretStore::class)
        ->addArgument(new Reference('logger'));

    // MIDDLEWARE SERVICES (shared for admin and public stacks)
    $containerBuilder->register('convo.middleware.log_request', ConvoWpLogRequestMiddleware::class)
        ->addArgument(new Reference('logger'));

    $containerBuilder->register('convo.middleware.save_request', SaveConvoRequestLogMiddleware::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('eventDispatcher'))
        ->addArgument(new Reference('wpConvoConversationRequestEventListener'));

    $containerBuilder->register('convo.middleware.body_parser', BodyParserMiddleware::class);

    $containerBuilder->register('convo.middleware.wp_exception', ConvoWpExceptionHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));

    $containerBuilder->register('convo.middleware.convo_exception', ConvoExceptionHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'));

    $containerBuilder->register('convo.middleware.trailing_slash', TrailingSlash::class);

    $containerBuilder->register('convo.middleware.json_header', JsonHeaderMiddleware::class);

    $containerBuilder->register('convo.middleware.gzip_encoder', GzipEncoder::class);

    // PROTO SERVICES
    $containerBuilder->register('protoServiceURLSupplier', WpServiceURLSupplier::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('adminUserDataProvider'))
        ->addArgument('%CONVO_BASE_URL%');
    $containerBuilder->register(\Convo\Core\Admin\URLSupplierRestHandler::class, \Convo\Core\Admin\URLSupplierRestHandler::class)
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('protoServiceURLSupplier'));

    // EVENT LISTENERS
    $containerBuilder->register('wpConvoConversationRequestEventListener', WpConvoConversationRequestEventListener::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('wpConvoServiceConversationRequestDao'))
        ->addArgument(new Reference('convoServiceDataProvider'));
};
