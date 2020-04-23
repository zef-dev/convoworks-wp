<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use Convo\Monolog\MonologFormatter;

return [
    'logger' => DI\factory(function () {
        $logger = new Logger('util');
        $fileHandler = new StreamHandler(CONVO_LOG_PATH . '/convo-' . date('Y-m-d') . '.log', Logger::DEBUG);
        $fileHandler->setFormatter(new MonologFormatter());
        $logger->pushHandler($fileHandler);
        return $logger;
    })
];
