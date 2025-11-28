<?php

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
use Convo\Core\Admin\UserPackgesRestHandler;
use Convo\Core\Admin\UserPlatformConfigRestHandler;
use Convo\Core\Admin\UserPlatformsRestHandler;
use Convo\Wp\LoggerHandlerFactory;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

return static function (ContainerBuilder $containerBuilder): void {
    // Logger handler factory and logger for admin
    $containerBuilder->register('logger_handler_factory', LoggerHandlerFactory::class);

    $containerBuilder->register('logger_handler', StreamHandler::class)
        ->setFactory([new Reference('logger_handler_factory'), 'createHandler'])
        ->addArgument('%convo.log_path_admin%')
        ->addArgument('%convo.log_filename_admin%')
        ->addArgument('%convo.log_level_admin%');

    $containerBuilder->register('logger', Logger::class)
        ->setArguments(['admin'])
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
        ->addArgument(new Reference('packageProviderFactory'))
        ->addArgument(new Reference('platformPublisherFactory'))
        ->addArgument(new Reference('adminUserDataProvider'));

    $containerBuilder->register(ServiceVersionsRestHandler::class, ServiceVersionsRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('platformPublisherFactory'))
        ->addArgument(new Reference('serviceReleaseManager'));

    $containerBuilder->register(ServicePlatformConfigRestHandler::class, ServicePlatformConfigRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('platformPublisherFactory'))
        ->addArgument(new Reference('propagationErrorReport'));

    $containerBuilder->register(UserPlatformConfigRestHandler::class, UserPlatformConfigRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('adminUserDataProvider'));

    $containerBuilder->register(UserPackgesRestHandler::class, UserPackgesRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('packageProviderFactory'));

    $containerBuilder->register(UserPlatformsRestHandler::class, UserPlatformsRestHandler::class)
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
        ->addArgument(new Reference('convoServiceParamsFactory'))
        ->addArgument(new Reference('platformRequestFactory'))
        ->addArgument(new Reference('eventDispatcher'));

    $containerBuilder->register(ServiceImpExpRestHandler::class, ServiceImpExpRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('convoServiceFactory'))
        ->addArgument(new Reference('convoServiceDataProvider'))
        ->addArgument(new Reference('platformPublisherFactory'))
        ->addArgument(new Reference('serviceReleaseManager'));

    $containerBuilder->register(MediaRestHandler::class, MediaRestHandler::class)
        ->addArgument(new Reference('logger'))
        ->addArgument(new Reference('httpFactory'))
        ->addArgument(new Reference('serviceMediaManager'));

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
};
