<?php declare(strict_types=1);

$middlewares = [];

// LOG REQUEST
$middlewares[] = new \Convo\Core\Util\LogRequestMiddleware( $container->get( 'logger'));

// PARSE BODY
$middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

// AUTH
$middlewares[] = new \Convo\Proto\AdminAuthMiddleware( $container->get( 'logger'), $container->get( 'adminUserDataProvider'));

// LOAD PACKAGES
$middlewares[] = new \Convo\Proto\LoadPackagesMiddleware( $container->get( 'logger'), $container, $container->get( 'convoPackageProvider'));

// CONVO EXCEPTIONS
$middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));

if ( !UTIL_DISABLE_GZIP_ENCODING) {
    // Encoding
    $middlewares[] = new Middlewares\GzipEncoder();
}

return $middlewares;

