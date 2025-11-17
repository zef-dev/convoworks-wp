<?php

declare(strict_types=1);

namespace Convo\Wp;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;
use Convo\Wp\Providers\ConvoWPPlugin;
use Psr\Log\LoggerInterface;

class ConvoWpLogRequestMiddleware implements \Psr\Http\Server\MiddlewareInterface
{
    /**
     * @var LoggerInterface
     */
    private $_logger;

    public function __construct(\Psr\Log\LoggerInterface $logger)
    {
        $this->_logger    =    $logger;
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $start = microtime(true);

        ConvoWPPlugin::logRequest($this->_logger);

        $this->_logger->info('REST handling started after: ' . timer_stop());

        $response =   $handler->handle($request);

        $time_elapsed_us = microtime(true) - $start;
        $this->_logger->info('Returning HTTP [' . $response->getStatusCode() . '] in ' . ($time_elapsed_us * 1000) . ' ms, WP time: ' . timer_stop());

        return $response;
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[]';
    }
}
