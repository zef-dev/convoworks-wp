<?php

// config/services_public.php

use Convo\Services\LoggerHandlerFactory;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\LineFormatter;
use Zef\Monolog\MonologFormatter;

// Load shared services
$sharedContainerBuilder = require CONVOWP_LIB_COMMON_PATH . 'services_shared.php';

// Create the public-specific container builder
$containerBuilder = new ContainerBuilder();

// Merge shared services into the public container
$containerBuilder->merge($sharedContainerBuilder);

// Define public-specific constants and services

// Constants
if ( !defined( 'CONVO_BASE_URL')) {
    throw new \Exception( 'CONVO_BASE_URL is not defined!');
}

$CONVO_BASE_URL = CONVO_BASE_URL;
$CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES = defined('CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES') ? CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES : false;



// Define parameters for logging
$containerBuilder->setParameter('convo.log_level', defined('CONVO_LOG_LEVEL') ? CONVO_LOG_LEVEL : 'info');
$containerBuilder->setParameter('convo.log_path', defined('CONVO_LOG_PATH') ? CONVO_LOG_PATH : null);
$containerBuilder->setParameter('convo.log_filename', defined('CONVO_LOG_FILENAME') ? CONVO_LOG_FILENAME : 'debug.log');
$containerBuilder->setParameter('convo.log_level_public', defined('CONVO_LOG_LEVEL_PUBLIC') ? CONVO_LOG_LEVEL_PUBLIC : '%convo.log_level%');
$containerBuilder->setParameter('convo.log_path_public', defined('CONVO_LOG_PATH_PUBLIC') ? CONVO_LOG_PATH_PUBLIC : '%convo.log_path%');
$containerBuilder->setParameter('convo.log_filename_public', defined('CONVO_LOG_FILENAME_PUBLIC') ? CONVO_LOG_FILENAME_PUBLIC : '%convo.log_filename%');


// Register the factory class in the container
$containerBuilder->register('logger_handler_factory', LoggerHandlerFactory::class);

// Register the logger formatter
$containerBuilder->register('logger_formatter', MonologFormatter::class);

// Register the logger handler using the factory
$containerBuilder->register('logger_handler', StreamHandler::class)
    ->setFactory([new Reference('logger_handler_factory'), 'createHandler'])
    ->addArgument('%convo.log_path_public%')
    ->addArgument('%convo.log_filename_public%')
    ->addArgument('%convo.log_level_public%')
    ->addMethodCall('setFormatter', [new Reference('logger_formatter')]);

// Register the public logger
$containerBuilder->register('logger', Logger::class)
    ->setArguments(['public']) // Logger name 'public'
    ->addMethodCall('pushHandler', [new Reference('logger_handler')]);



// Public-specific services
$containerBuilder->register('facebookAuthService', \Convo\Core\Adapters\Fbm\FacebookAuthService::class)
    ->addArgument(new Reference('logger'));

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

$containerBuilder->register('\Convo\Core\Adapters\Google\Dialogflow\DialogflowAgentRestHandler', \Convo\Core\Adapters\Google\Dialogflow\DialogflowAgentRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('packageProviderFactory'));

$containerBuilder->register('\Convo\Core\Adapters\Google\Gactions\ActionsRestHandler', \Convo\Core\Adapters\Google\Gactions\ActionsRestHandler::class)
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument($CONVO_SHOULD_DUMP_REQUESTS_AND_RESPONSES);

$containerBuilder->register('\Convo\Core\Adapters\Fbm\FacebookMessengerRestHandler', \Convo\Core\Adapters\Fbm\FacebookMessengerRestHandler::class)
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('facebookAuthService'))
    ->addArgument(new Reference('convoServiceDataProvider'))
    ->addArgument(new Reference('convoServiceFactory'))
    ->addArgument(new Reference('convoServiceParamsFactory'))
    ->addArgument(new Reference('platformRequestFactory'))
    ->addArgument(new Reference('facebookMessengerApiFactory'));

$containerBuilder->register('\Convo\Core\Adapters\Viber\ViberRestHandler', \Convo\Core\Adapters\Viber\ViberRestHandler::class)
    ->addArgument(new Reference('httpFactory'))
    ->addArgument(new Reference('logger'))
    ->addArgument(new Reference('adminUserDataProvider'))
    ->addArgument(new Reference('facebookAuthService'))
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

// Return the public-specific container
return $containerBuilder;
