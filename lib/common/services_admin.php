<?php

// config/services_admin.php

use Convo\Services\LoggerHandlerFactory;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Load shared services
$sharedContainerBuilder = require CONVOWP_LIB_COMMON_PATH . 'services_shared.php';

// Create the admin-specific container builder
$containerBuilder = new ContainerBuilder();

// Merge shared services into the admin container
$containerBuilder->merge($sharedContainerBuilder);

// Define admin-specific constants and services

// Constants
$containerBuilder->setParameter('convo.log_level', defined('CONVO_LOG_LEVEL') ? CONVO_LOG_LEVEL : 'info');
$containerBuilder->setParameter('convo.log_path', defined('CONVO_LOG_PATH') ? CONVO_LOG_PATH : null);
$containerBuilder->setParameter('convo.log_filename', defined('CONVO_LOG_FILENAME') ? CONVO_LOG_FILENAME : 'debug.log');
$containerBuilder->setParameter('convo.log_level_admin', defined('CONVO_LOG_LEVEL_ADMIN') ? CONVO_LOG_LEVEL_ADMIN : '%convo.log_level%');
$containerBuilder->setParameter('convo.log_path_admin', defined('CONVO_LOG_PATH_ADMIN') ? CONVO_LOG_PATH_ADMIN : '%convo.log_path%');
$containerBuilder->setParameter('convo.log_filename_admin', defined('CONVO_LOG_FILENAME_ADMIN') ? CONVO_LOG_FILENAME_ADMIN : '%convo.log_filename%');


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
$containerBuilder->register('propagationErrorReport', \Convo\Core\Admin\PropagationErrorReport::class)
    ->addArgument(new Reference('logger'));

// REST API Handlers
$containerBuilder->register('\Convo\Core\Admin\ServicesRestHandler', \Convo\Core\Admin\ServicesRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('packageProviderFactory'))
    ->addArgument(new Reference('platformPublisherFactory'))
    ->addArgument(new Reference('adminUserDataProvider'));

$containerBuilder->register( '\Convo\Core\Admin\ServiceVersionsRestHandler', \Convo\Core\Admin\ServiceVersionsRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('platformPublisherFactory'))
    ->addArgument(new Reference('serviceReleaseManager'));

$containerBuilder->register('\Convo\Core\Admin\ServicePlatformConfigRestHandler', \Convo\Core\Admin\ServicePlatformConfigRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('platformPublisherFactory'))
    ->addArgument(new Reference('serviceReleaseManager'))
    ->addArgument(new Reference('propagationErrorReport'));

$containerBuilder->register('\Convo\Core\Admin\UserPlatformConfigRestHandler', \Convo\Core\Admin\UserPlatformConfigRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('adminUserDataProvider'));

$containerBuilder->register('\Convo\Core\Admin\UserPackgesRestHandler', \Convo\Core\Admin\UserPackgesRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('packageProviderFactory'));

$containerBuilder->register('\Convo\Core\Admin\ServicePackagesRestHandler', \Convo\Core\Admin\ServicePackagesRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('packageProviderFactory'));

$containerBuilder->register('\Convo\Core\Admin\TemplatesRestHandler', \Convo\Core\Admin\TemplatesRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('packageProviderFactory'));

$containerBuilder->register('\Convo\Core\Admin\TestServiceRestHandler', \Convo\Core\Admin\TestServiceRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('platformRequestFactory'))
    ->addArgument(new Reference('eventDispatcher'));

$containerBuilder->register('\Convo\Core\Admin\ServiceImpExpRestHandler', \Convo\Core\Admin\ServiceImpExpRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('platformPublisherFactory'));

$containerBuilder->register('\Convo\Core\Admin\MediaRestHandler', \Convo\Core\Admin\MediaRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('serviceMediaManager'))
    ->addArgument(new Reference('convoServiceDataProvider'));

$containerBuilder->register('\Convo\Core\Admin\ComponentHelpRestHandler', \Convo\Core\Admin\ComponentHelpRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('packageProviderFactory'));

$containerBuilder->register('\Convo\Core\Admin\ConfigurationRestHandler', \Convo\Core\Admin\ConfigurationRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'));

$containerBuilder->register('\Convo\Core\Admin\AmazonAlexaSkillInfo', \Convo\Core\Admin\AmazonAlexaSkillInfo::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('amazonPublishingService'))
    ->addArgument(new Reference('convoServiceDataProvider'));

// Return the admin-specific container
return $containerBuilder;
