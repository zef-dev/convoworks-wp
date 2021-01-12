<?php declare(strict_types=1);

if ( !defined( 'UTIL_DISABLE_GZIP_ENCODING')) {
    define('UTIL_DISABLE_GZIP_ENCODING', true);
}

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;

$middlewares = [];


// LOG REQUEST
$middlewares[] = new \Convo\Core\Util\LogRequestMiddleware( $container->get( 'logger'));

// PARSE BODY
$middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

// LOAD PACKAGES
$middlewares[] = new \ConvoPlugin\Convo\Wp\LoadPackagesMiddleware($container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));


// CONVO EXCEPTIONS
$middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));
$middlewares[] = new \ConvoPlugin\Convo\Wp\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));


if ( !UTIL_DISABLE_GZIP_ENCODING) {
    // Encoding
    $middlewares[] = new Middlewares\GzipEncoder();
}

// Trailing slash removal
$middlewares[] = new Middlewares\TrailingSlash();

// Content-Type negotiation
$middlewares[] = new \Convo\Core\Util\JsonHeaderMiddleware();


return $middlewares;

