<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Convo\Monolog\MonologFormatter;

if ( !defined( 'CONVO_LOG_LEVEL')) {
    define( 'CONVO_LOG_LEVEL', 'debug');
}

return [
    'logger' => DI\factory(function () {
        $logger = new Logger('util');
        $fileHandler = new StreamHandler(CONVO_LOG_PATH . '/convo-' . date('Y-m-d') . '.log', CONVO_LOG_LEVEL);
        $fileHandler->setFormatter(new MonologFormatter());
        $logger->pushHandler($fileHandler);
        return $logger;
    })
];
