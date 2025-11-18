<?php

namespace Convo\Wp\DI;

use Convo\Core\Adapters\Alexa\AlexaSkillRestHandler;
use Convo\Core\Adapters\Alexa\AmazonAuthRestHandler;
use Convo\Core\Adapters\Alexa\AmazonAuthService;
use Convo\Core\Adapters\Alexa\AmazonPublishingService;
use Convo\Core\Adapters\Alexa\Api\AlexaCustomerProfileApi;
use Convo\Core\Adapters\Alexa\Api\AlexaDeviceAddressApi;
use Convo\Core\Adapters\Alexa\Api\AlexaPersonProfileApi;
use Convo\Core\Adapters\Alexa\Api\AlexaRemindersApi;
use Convo\Core\Adapters\Alexa\Api\AlexaSettingsApi;
use Convo\Core\Adapters\Alexa\Api\AmazonUserApi;
use Convo\Core\Adapters\Alexa\CatalogRestHandler;
use Convo\Core\Adapters\Alexa\Validators\AlexaRequestValidator;
use Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler;
use Convo\Core\Adapters\Viber\ViberApi;
use Convo\Core\Adapters\Viber\ViberRestHandler;
use Convo\Core\Admin\AmazonAlexaSkillInfo;
use Convo\Core\Admin\ComponentHelpRestHandler;
use Convo\Core\Admin\ConfigurationRestHandler;
use Convo\Core\Admin\MediaRestHandler;
use Convo\Core\Admin\PropagationErrorReport;
use Convo\Core\Admin\ServiceImpExpRestHandler;
use Convo\Core\Admin\ServicePackagesRestHandler;
use Convo\Core\Admin\ServicePlatformConfigRestHandler;
use Convo\Core\Admin\ServicesRestHandler;
use Convo\Core\Admin\ServiceVersionsRestHandler;
use Convo\Core\Admin\TemplatesRestHandler;
use Convo\Core\Admin\TestServiceRestHandler;
use Convo\Core\Admin\URLSupplierRestHandler;
use Convo\Core\Admin\UserPackgesRestHandler;
use Convo\Core\Admin\UserPlatformConfigRestHandler;
use Convo\Core\EventDispatcher\EventDispatcher;
use Convo\Core\Factory\ConvoServiceFactory;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Core\Factory\PlatformRequestFactory;
use Convo\Core\Media\MediaRestHandler as PublicMediaRestHandler;
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
use Convo\Wp\ConvoWpExceptionHandler;
use Convo\Wp\ConvoWpLogRequestMiddleware;
use Convo\Wp\Data\WpCache;
use Convo\Wp\Data\WpConvoServiceConversationRequestDao;
use Convo\Wp\Data\WpServiceDataProvider;
use Convo\Wp\Data\WpServiceMediaManager;
use Convo\Wp\Data\WpServiceParamsFactory;
use Convo\Wp\Data\WpOptionSecretStore;
use Convo\Wp\EventListeners\WpConvoConversationRequestEventListener;
use Convo\Wp\Guzzle\GuzzleHttpFactory;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Convo\Wp\LoggerHandlerFactory;
use Convo\Wp\SaveConvoRequestLogMiddleware;
use Convo\Wp\WpServiceURLSupplier;
use Middlewares\GzipEncoder;
use Middlewares\TrailingSlash;
use Psr\Container\ContainerInterface;

class ServiceContainerFactory
{
    /**
     * Builds and returns the public DI container.
     *
     * @return ContainerBuilder
     * @throws \Exception
     */
    public static function createPublicContainer(): ContainerBuilder
    {
        // Load shared services
        $sharedContainerBuilder = self::createSharedContainer();

        // Create the public-specific container builder
        $containerBuilder = new ContainerBuilder();

        // Merge shared services into the public container
        $containerBuilder->merge($sharedContainerBuilder);

        // Define public-specific constants and services

        // Constants
        if (!defined('\\CONVO_BASE_URL')) {
            throw new \Exception('CONVO_BASE_URL is not defined!');
        }

        // Define parameters for logging
        $containerBuilder->setParameter('convo.log_level', defined('\\CONVO_LOG_LEVEL') ? constant('\\CONVO_LOG_LEVEL') : 'info');
        $containerBuilder->setParameter('convo.log_path', defined('\\CONVO_LOG_PATH') ? constant('\\CONVO_LOG_PATH') : null);
        $containerBuilder->setParameter('convo.log_filename', defined('\\CONVO_LOG_FILENAME') ? constant('\\CONVO_LOG_FILENAME') : 'debug.log');
        $containerBuilder->setParameter('convo.log_level_public', defined('\\CONVO_LOG_LEVEL_PUBLIC') ? constant('\\CONVO_LOG_LEVEL_PUBLIC') : '%convo.log_level%');
        $containerBuilder->setParameter('convo.log_path_public', defined('\\CONVO_LOG_PATH_PUBLIC') ? constant('\\CONVO_LOG_PATH_PUBLIC') : '%convo.log_path%');
        $containerBuilder->setParameter('convo.log_filename_public', defined('\\CONVO_LOG_FILENAME_PUBLIC') ? constant('\\CONVO_LOG_FILENAME_PUBLIC') : '%convo.log_filename%');

        // Register the factory class in the container
        $containerBuilder->register('logger_handler_factory', LoggerHandlerFactory::class);

        // Register the logger handler using the factory
        $containerBuilder->register('logger_handler', StreamHandler::class)
            ->setFactory([new Reference('logger_handler_factory'), 'createHandler'])
            ->addArgument('%convo.log_path_public%')
            ->addArgument('%convo.log_filename_public%')
            ->addArgument('%convo.log_level_public%');

        // Register the public logger
        $containerBuilder->register('logger', Logger::class)
            ->setArguments(['public']) // Logger name 'public'
            ->addMethodCall('pushHandler', [new Reference('logger_handler')]);

        // REST Handlers
        $containerBuilder->register(ConvoChatRestHandler::class, ConvoChatRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformRequestFactory'))
            ->addArgument(new Reference('eventDispatcher'));

        $containerBuilder->register(AlexaSkillRestHandler::class, AlexaSkillRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('alexaRequestValidator'))
            ->addArgument(new Reference('eventDispatcher'));

        $containerBuilder->register(ViberRestHandler::class, ViberRestHandler::class)
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformRequestFactory'));

        $containerBuilder->register(AmazonAuthRestHandler::class, AmazonAuthRestHandler::class)
            ->addArgument(admin_url('admin.php?page=convo-settings'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('amazonAuthService'));

        $containerBuilder->register(PublicMediaRestHandler::class, PublicMediaRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('serviceMediaManager'));

        $containerBuilder->register(CatalogRestHandler::class, CatalogRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'));

        return $containerBuilder;
    }

    /**
     * Returns the admin middlewares array.
     *
     * @param \Psr\Container\ContainerInterface $container
     * @return array
     * @throws \Exception
     */
    public static function getAdminMiddlewares(ContainerInterface $container): array
    {
        if (!isset($container)) {
            throw new \Exception('No container present');
        }

        if (!defined('\\CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
            define('CONVO_UTIL_DISABLE_GZIP_ENCODING', true);
        }

        $middlewares = [];

        // LOG REQUEST
        $middlewares[] = new ConvoWpLogRequestMiddleware($container->get('logger'));
        $middlewares[] = new SaveConvoRequestLogMiddleware(
            $container->get('logger'),
            $container->get('eventDispatcher'),
            $container->get('wpConvoConversationRequestEventListener')
        );

        // PARSE BODY
        $middlewares[] = new BodyParserMiddleware();

        // CONVO EXCEPTIONS
        $middlewares[] = new ConvoWpExceptionHandler($container->get('logger'), $container->get('httpFactory'));
        $middlewares[] = new ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));

        // if (!CONVO_UTIL_DISABLE_GZIP_ENCODING) {
        //     // Encoding
        //     $middlewares[] = new Middlewares\GzipEncoder();
        // }

        // Trailing slash removal
        $middlewares[] = new TrailingSlash();

        // Content-Type negotiation
        $middlewares[] = new JsonHeaderMiddleware();

        return $middlewares;
    }

    /**
     * Builds and returns the admin DI container.
     *
     * @return ContainerBuilder
     * @throws \Exception
     */
    public static function createAdminContainer(): ContainerBuilder
    {
        // Load shared services
        $sharedContainerBuilder = self::createSharedContainer();

        // Create the admin-specific container builder
        $containerBuilder = new ContainerBuilder();

        // Merge shared services into the admin container
        $containerBuilder->merge($sharedContainerBuilder);

        // Define admin-specific constants and services
        $containerBuilder->setParameter('convo.log_level', defined('\\CONVO_LOG_LEVEL') ? constant('\\CONVO_LOG_LEVEL') : 'info');
        $containerBuilder->setParameter('convo.log_path', defined('\\CONVO_LOG_PATH') ? constant('\\CONVO_LOG_PATH') : null);
        $containerBuilder->setParameter('convo.log_filename', defined('\\CONVO_LOG_FILENAME') ? constant('\\CONVO_LOG_FILENAME') : 'debug.log');
        $containerBuilder->setParameter('convo.log_level_admin', defined('\\CONVO_LOG_LEVEL_ADMIN') ? constant('\\CONVO_LOG_LEVEL_ADMIN') : '%convo.log_level%');
        $containerBuilder->setParameter('convo.log_path_admin', defined('\\CONVO_LOG_PATH_ADMIN') ? constant('\\CONVO_LOG_PATH_ADMIN') : '%convo.log_path%');
        $containerBuilder->setParameter('convo.log_filename_admin', defined('\\CONVO_LOG_FILENAME_ADMIN') ? constant('\\CONVO_LOG_FILENAME_ADMIN') : '%convo.log_filename%');

        // Register the factory class in the container
        $containerBuilder->register('logger_handler_factory', LoggerHandlerFactory::class);

        // Register the logger handler using the factory
        $containerBuilder->register('logger_handler', StreamHandler::class)
            ->setFactory([new Reference('logger_handler_factory'), 'createHandler'])
            ->addArgument('%convo.log_path_admin%')
            ->addArgument('%convo.log_filename_admin%')
            ->addArgument('%convo.log_level_admin%');

        // Register the logger
        $containerBuilder->register('logger', Logger::class)
            ->setArguments(['admin']) // The logger name
            ->addMethodCall('pushHandler', [new Reference('logger_handler')]);

        // Admin-specific services
        $containerBuilder->register('propagationErrorReport', PropagationErrorReport::class)
            ->addArgument(new Reference('logger'));

        // REST API Handlers
        $containerBuilder->register(ServicesRestHandler::class, ServicesRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('packageProviderFactory'))
            ->addArgument(new Reference('platformPublisherFactory'))
            ->addArgument(new Reference('adminUserDataProvider'));

        $containerBuilder->register(ServiceVersionsRestHandler::class, ServiceVersionsRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('platformPublisherFactory'))
            ->addArgument(new Reference('serviceReleaseManager'));

        $containerBuilder->register(ServicePlatformConfigRestHandler::class, ServicePlatformConfigRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('platformPublisherFactory'))
            ->addArgument(new Reference('serviceReleaseManager'))
            ->addArgument(new Reference('propagationErrorReport'));

        $containerBuilder->register(UserPlatformConfigRestHandler::class, UserPlatformConfigRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('adminUserDataProvider'));

        $containerBuilder->register(UserPackgesRestHandler::class, UserPackgesRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('packageProviderFactory'));

        $containerBuilder->register(ServicePackagesRestHandler::class, ServicePackagesRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('packageProviderFactory'));

        $containerBuilder->register(TemplatesRestHandler::class, TemplatesRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('packageProviderFactory'));

        $containerBuilder->register(TestServiceRestHandler::class, TestServiceRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformRequestFactory'))
            ->addArgument(new Reference('eventDispatcher'));

        $containerBuilder->register(ServiceImpExpRestHandler::class, ServiceImpExpRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformPublisherFactory'))
            ->addArgument(new Reference('serviceReleaseManager'));

        $containerBuilder->register(MediaRestHandler::class, MediaRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('serviceMediaManager'))
            ->addArgument(new Reference('convoServiceDataProvider'));

        $containerBuilder->register(ComponentHelpRestHandler::class, ComponentHelpRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('packageProviderFactory'));

        $containerBuilder->register(ConfigurationRestHandler::class, ConfigurationRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'));

        $containerBuilder->register(AmazonAlexaSkillInfo::class, AmazonAlexaSkillInfo::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('amazonPublishingService'))
            ->addArgument(new Reference('convoServiceDataProvider'));

        return $containerBuilder;
    }

    /**
     * Builds and returns the shared DI container.
     * For now, this can require the old file, or you can migrate its logic here.
     */
    public static function createSharedContainer(): ContainerBuilder
    {
        // Migrate logic from services_shared.php

        $containerBuilder = new ContainerBuilder();

        if (!defined('\\CONVO_PUBLIC_REST_BASE_URL')) {
            throw new \Exception('CONVO_PUBLIC_REST_BASE_URL is not defined!');
        }
        $containerBuilder->setParameter('CONVO_PUBLIC_REST_BASE_URL', \CONVO_PUBLIC_REST_BASE_URL);

        // COMMON SERVICES
        $containerBuilder->register('httpFactory', GuzzleHttpFactory::class);
        $containerBuilder->register('currentTimeService', CurrentTimeService::class);
        $containerBuilder->register('eventDispatcher', EventDispatcher::class);

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
            ->addArgument(new Reference('secretStore'));

        $containerBuilder->register('serviceReleaseManager', ServiceReleaseManager::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument('%CONVO_PUBLIC_REST_BASE_URL%');

        // AMAZON
        $containerBuilder->register('amazonAuthService', AmazonAuthService::class)
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
        $containerBuilder->register('amazonUserApi', AmazonUserApi::class)
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
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('packageProviderFactory'))
            ->addArgument(new Reference('httpFactory'));
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
        $containerBuilder->register('packageProviderFactory', PackageProviderFactory::class)
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
        global $wpdb;

        if (!defined('\\CONVO_DATA_PATH')) {
            throw new \Exception('CONVO_DATA_PATH is not defined!');
        }

        if (!defined('\\CONVO_MEDIA_BASE_URL')) {
            throw new \Exception('CONVO_MEDIA_BASE_URL is not defined!');
        }

        if (!defined('\\CONVO_BASE_URL')) {
            throw new \Exception('CONVO_BASE_URL is not defined!');
        }

        if (!defined('\\CONVO_DISABLE_SERVICE_COMPRESSION')) {
            define('CONVO_DISABLE_SERVICE_COMPRESSION', false);
        }

        $containerBuilder->setParameter('CONVO_DISABLE_SERVICE_COMPRESSION', \CONVO_DISABLE_SERVICE_COMPRESSION);
        $containerBuilder->setParameter('CONVO_BASE_URL', \CONVO_BASE_URL);
        $containerBuilder->setParameter('CONVO_MEDIA_BASE_URL', \CONVO_MEDIA_BASE_URL);
        $containerBuilder->setParameter('CONVO_DATA_PATH', \CONVO_DATA_PATH);

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

        // PROTO SERVICES
        $containerBuilder->register('protoServiceURLSupplier', WpServiceURLSupplier::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument('%CONVO_BASE_URL%');
        $containerBuilder->register(URLSupplierRestHandler::class, URLSupplierRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('protoServiceURLSupplier'));

        // EVENT LISTENERS
        $containerBuilder->register('wpConvoConversationRequestEventListener', WpConvoConversationRequestEventListener::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('wpConvoServiceConversationRequestDao'))
            ->addArgument(new Reference('convoServiceDataProvider'));

        return $containerBuilder;
    }

    /**
     * Returns the public middlewares array.
     *
     * @param \Psr\Container\ContainerInterface $container
     * @return array
     * @throws \Exception
     */
    public static function getPublicMiddlewares(ContainerInterface $container): array
    {
        if (!isset($container)) {
            throw new \Exception('No container present');
        }

        if (!defined('\\CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
            define('CONVO_UTIL_DISABLE_GZIP_ENCODING', true);
        }

        $middlewares = [];

        // LOG REQUEST
        $middlewares[] = new ConvoWpLogRequestMiddleware($container->get('logger'));
        $middlewares[] = new SaveConvoRequestLogMiddleware(
            $container->get('logger'),
            $container->get('eventDispatcher'),
            $container->get('wpConvoConversationRequestEventListener')
        );

        // PARSE BODY
        $middlewares[] = new BodyParserMiddleware();

        // CONVO EXCEPTIONS
        $middlewares[] = new ConvoWpExceptionHandler($container->get('logger'), $container->get('httpFactory'));
        $middlewares[] = new ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));

        if (!\CONVO_UTIL_DISABLE_GZIP_ENCODING) {
            $middlewares[] = new GzipEncoder();
        }

        // Trailing slash removal
        $middlewares[] = new TrailingSlash();

        // Content-Type negotiation
        $middlewares[] = new JsonHeaderMiddleware();

        return $middlewares;
    }
}
