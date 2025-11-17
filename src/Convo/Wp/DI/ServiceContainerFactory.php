<?php

namespace Convo\Wp\DI;

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
use Convo\Core\Publish\ServiceReleaseManager;
use Convo\Core\Util\CurrentTimeService;
use Convo\Wp\AdminUserDataProvider;
use Convo\Wp\Data\WpCache;
use Convo\Wp\Data\WpConvoServiceConversationRequestDao;
use Convo\Wp\Data\WpServiceDataProvider;
use Convo\Wp\Data\WpServiceMediaManager;
use Convo\Wp\Data\WpServiceParamsFactory;
use Convo\Wp\EventListeners\WpConvoConversationRequestEventListener;
use Convo\Wp\Guzzle\GuzzleHttpFactory;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Convo\Wp\LoggerHandlerFactory;
use Convo\Wp\WpServiceURLSupplier;
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
        $containerBuilder->register('\Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler', \Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformRequestFactory'))
            ->addArgument(new Reference('eventDispatcher'));

        $containerBuilder->register('\Convo\Core\Adapters\Alexa\AlexaSkillRestHandler', \Convo\Core\Adapters\Alexa\AlexaSkillRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('alexaRequestValidator'))
            ->addArgument(new Reference('eventDispatcher'));

        $containerBuilder->register('\Convo\Core\Adapters\Viber\ViberRestHandler', \Convo\Core\Adapters\Viber\ViberRestHandler::class)
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('convoServiceFactory'))
            ->addArgument(new Reference('convoServiceParamsFactory'))
            ->addArgument(new Reference('platformRequestFactory'));

        $containerBuilder->register('\Convo\Core\Adapters\Alexa\AmazonAuthRestHandler', \Convo\Core\Adapters\Alexa\AmazonAuthRestHandler::class)
            ->addArgument(admin_url('admin.php?page=convo-settings'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('adminUserDataProvider'))
            ->addArgument(new Reference('amazonAuthService'));

        $containerBuilder->register('\Convo\Core\Media\MediaRestHandler', \Convo\Core\Media\MediaRestHandler::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'))
            ->addArgument(new Reference('serviceMediaManager'));

        $containerBuilder->register('\Convo\Core\Adapters\Alexa\CatalogRestHandler', \Convo\Core\Adapters\Alexa\CatalogRestHandler::class)
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
        $middlewares[] = new \Convo\Wp\LogRequestMiddleware($container->get('logger'));
        $middlewares[] = new \Convo\Wp\SaveConvoRequestLogMiddleware(
            $container->get('logger'),
            $container->get('eventDispatcher'),
            $container->get('wpConvoConversationRequestEventListener')
        );

        // PARSE BODY
        $middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

        // CONVO EXCEPTIONS
        $middlewares[] = new \Convo\Wp\ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));
        $middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));

        // if (!CONVO_UTIL_DISABLE_GZIP_ENCODING) {
        //     // Encoding
        //     $middlewares[] = new Middlewares\GzipEncoder();
        // }

        // Trailing slash removal
        $middlewares[] = new \Middlewares\TrailingSlash();

        // Content-Type negotiation
        $middlewares[] = new \Convo\Core\Util\JsonHeaderMiddleware();

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
            ->addArgument(new Reference('convoServiceDataProvider'));
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

        // VIBER
        $containerBuilder->register('viberApi', \Convo\Core\Adapters\Viber\ViberApi::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('httpFactory'));

        // PLATFORMS
        $containerBuilder->register('platformRequestFactory', \Convo\Core\Factory\PlatformRequestFactory::class)
            ->addArgument(new Reference('logger'))
            ->addArgument(new Reference('convoServiceDataProvider'))
            ->addArgument(new Reference('amazonPublishingService'))
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
        $containerBuilder->register('\Convo\Pckg\Text\TextPackageDefinition', \Convo\Pckg\Text\TextPackageDefinition::class)
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
        $middlewares[] = new \Convo\Wp\LogRequestMiddleware($container->get('logger'));
        $middlewares[] = new \Convo\Wp\SaveConvoRequestLogMiddleware(
            $container->get('logger'),
            $container->get('eventDispatcher'),
            $container->get('wpConvoConversationRequestEventListener')
        );

        // PARSE BODY
        $middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

        // CONVO EXCEPTIONS
        $middlewares[] = new \Convo\Wp\ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));
        $middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler($container->get('logger'), $container->get('httpFactory'));

        if (!\CONVO_UTIL_DISABLE_GZIP_ENCODING) {
            $middlewares[] = new \Middlewares\GzipEncoder();
        }

        // Trailing slash removal
        $middlewares[] = new \Middlewares\TrailingSlash();

        // Content-Type negotiation
        $middlewares[] = new \Convo\Core\Util\JsonHeaderMiddleware();

        return $middlewares;
    }
}
