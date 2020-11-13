<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Convo\Monolog\MonologFormatter;
use Psr\Log\NullLogger;

if ( !defined( 'CONVO_LOG_LEVEL')) {
    define( 'CONVO_LOG_LEVEL', 'debug');
}

if ( !defined( 'CONVO_LOG_PATH')) {
    define( 'CONVO_LOG_PATH', null);
}

if ( is_null( CONVO_LOG_PATH)) {
    $logger = new NullLogger();
} else {
    $logger = new Logger( 'util');
    $fileHandler = new StreamHandler( CONVO_LOG_PATH.'/convo-'.date('Y-m-d').'.log', CONVO_LOG_LEVEL);
    $fileHandler->setFormatter(new MonologFormatter());
    $logger->pushHandler($fileHandler);
}

return [
    'logger' => 	DI\factory( function () use ( $logger) {
        return $logger;
    }),
];
