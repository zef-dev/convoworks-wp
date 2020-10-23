<?php declare(strict_types=1);

if ( !defined( 'PROTO_ALLOW_CORS_FROM')) {
	define('PROTO_ALLOW_CORS_FROM', null);
}

$middlewares = [];


if ( PROTO_ALLOW_CORS_FROM) {
	$middlewares[] = new \Convo\Proto\CorsMiddleware( $container->get( 'logger'), $container->get( 'httpFactory'), PROTO_ALLOW_CORS_FROM);
}

// LOG REQUEST
$middlewares[] = new \Convo\Core\Util\LogRequestMiddleware( $container->get( 'logger'));

// PARSE BODY
$middlewares[] = new \Convo\Core\Util\BodyParserMiddleware();

// AUTH
$middlewares[] = new \Convo\Proto\AdminAuthMiddleware( $container->get( 'logger'), $container->get( 'adminUserDataProvider'));

// AUTH TEST USER
//$middlewares[] = new \Convo\Proto\TestUserAuthMiddleware( $container->get( 'logger'), $container->get( 'adminUserDataProvider'));

// LOAD PACKAGES
//$middlewares[] = new \Convo\Proto\LoadPackagesMiddleware( $container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));
$middlewares[] = new \ConvoPlugin\Convo\Wp\LoadPackagesMiddleware($container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));


// CONVO EXCEPTIONS
$middlewares[] = new \Convo\Core\Rest\ConvoExceptionHandler( $container->get( 'logger'), $container->get( 'httpFactory'));


if ( !UTIL_DISABLE_GZIP_ENCODING) {
	// Encoding
	$middlewares[] = new Middlewares\GzipEncoder();
}

// Trailing slash removal
$middlewares[] = new Middlewares\TrailingSlash();

// Content-Type negotiation
$middlewares[] = new \Convo\Core\Util\JsonHeaderMiddleware();


return $middlewares;

