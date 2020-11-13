<?php declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;


if ( !defined( 'UTIL_DISABLE_GZIP_ENCODING')) {
    define('UTIL_DISABLE_GZIP_ENCODING', true);
}

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

// LOAD PACKAGES
$middlewares[] = new \Convo\Proto\LoadPackagesMiddleware( $container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));

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

// DUMP REQUEST AND RESPONSE
// initial config values
$convoDumpConfig = array(
    "classIdentifiers" => [],
    "dumpPath" => '',
    "dumpLimitPairs" => 5
);

// DUMP FAULTY REQUEST
// initial config values
$convoErrorDumpConfig = array(
    "errorDumpPath" => '',
    "errorDumpLimit" => 10
);

// configuration code
if (defined('CONVO_ERROR_DUMP_PATH')) {
    $convoErrorDumpConfig['errorDumpPath'] = CONVO_ERROR_DUMP_PATH;
}

if (defined('CONVO_ERROR_DUMP_LIMIT_OF_REQUESTS')) {
    $convoErrorDumpConfig['errorDumpLimit'] = CONVO_ERROR_DUMP_LIMIT_OF_REQUESTS;
}

if (defined('CONVO_DUMP_PATH') && defined('CONVO_CLASS_IDENTIFIERS_TO_DUMP_REQUESTS_AND_RESPONSES_FROM')) {
    $convoDumpConfig["dumpPath"] = CONVO_DUMP_PATH;
    $convoDumpConfig["classIdentifiers"] = CONVO_CLASS_IDENTIFIERS_TO_DUMP_REQUESTS_AND_RESPONSES_FROM;

    if (defined('CONVO_DUMP_LIMIT_OF_REQUEST_RESPONSE_PAIRS')) {
        $convoDumpConfig["dumpLimitPairs"] = CONVO_DUMP_LIMIT_OF_REQUEST_RESPONSE_PAIRS;
    }

    $middlewares[] = new \Convo\Core\Util\RequestResponseDumpMiddleware(
        $convoDumpConfig, $convoErrorDumpConfig, $container->get( 'logger'), $container->get( 'httpFactory')
    );
} else if (defined('CONVO_ERROR_DUMP_PATH') && !defined('CONVO_DUMP_PATH') && !defined('CONVO_CLASS_IDENTIFIERS_TO_DUMP_REQUESTS_AND_RESPONSES_FROM')) {
    $middlewares[] = new \Convo\Core\Util\RequestResponseDumpMiddleware(
        [], $convoErrorDumpConfig, $container->get( 'logger'), $container->get( 'httpFactory')
    );
}

return $middlewares;

