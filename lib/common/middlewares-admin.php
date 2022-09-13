<?php declare(strict_types=1);

if ( !defined( 'CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
    define('CONVO_UTIL_DISABLE_GZIP_ENCODING', true);
}

/** @var Psr\Container\ContainerInterface $container */
if ( !isset( $container)) {
    throw new \Exception( 'No container present');
}

$middlewares = [];


// LOG REQUEST
$middlewares[] = new \Convo\Wp\LogRequestMiddleware( $container->get( 'logger'));
$middlewares[] = new \Convo\Wp\SaveConvoRequestLogMiddleware( $container->get( 'logger'), $container->get('eventDispatcher'), $container->get('wpConvoConversationRequestEventListener'));

// PARSE BODY
$middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

// LOAD PACKAGES
$middlewares[] = new \Convo\Wp\LoadPackagesMiddleware($container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));


// CONVO EXCEPTIONS
$middlewares[] = new \Convo\Wp\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));
$middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));


// if ( !CONVO_UTIL_DISABLE_GZIP_ENCODING) {
//     // Encoding
//     $middlewares[] = new Middlewares\GzipEncoder();
// }

// Trailing slash removal
$middlewares[] = new Middlewares\TrailingSlash();

// Content-Type negotiation
$middlewares[] = new \Convo\Core\Util\JsonHeaderMiddleware();


return $middlewares;

