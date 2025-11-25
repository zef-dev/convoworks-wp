<?php

use Convo\Core\Adapters\Alexa\AlexaSkillRestHandler;
use Convo\Core\Adapters\Alexa\AmazonAuthRestHandler;
use Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler;
use Convo\Core\Adapters\Viber\ViberRestHandler;
use Convo\Core\Media\MediaRestHandler as PublicMediaRestHandler;
use Convo\Wp\LoggerHandlerFactory;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

return static function (ContainerBuilder $containerBuilder): void {
    // Logger handler factory and logger for public
    $containerBuilder->register('logger_handler_factory', LoggerHandlerFactory::class);

    $containerBuilder->register('logger_handler', StreamHandler::class)
        ->setFactory([new Reference('logger_handler_factory'), 'createHandler'])
        ->addArgument('%convo.log_path_public%')
        ->addArgument('%convo.log_filename_public%')
        ->addArgument('%convo.log_level_public%');

    $containerBuilder->register('logger', Logger::class)
        ->setArguments(['public'])
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
};


