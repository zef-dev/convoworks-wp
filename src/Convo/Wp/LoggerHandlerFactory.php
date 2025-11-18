<?php

namespace Convo\Wp;

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Zef\Monolog\MonologFormatter;

class LoggerHandlerFactory
{
    public static function createHandler($path, $filename, $level)
    {
        if (empty($path) || empty($filename) || empty($level)) {
            return new NullHandler();
        } else {
            $handler = new StreamHandler($path . '/' . $filename, Logger::toMonologLevel($level));
            $handler->setFormatter(new MonologFormatter());
            return $handler;
        }
    }
}
