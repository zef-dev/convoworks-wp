<?php

namespace Convo\Http\Api;

use Convo\Core\Adapters\PublicRestApi;
use Convo\Core\Admin\AdminRestApi;
use Convo\Wp\AdminUser;
use Convo\Core\IAdminUser;
use Convo\Wp\DI\ServiceContainerFactory;
use GuzzleHttp\Psr7\Uri;
use Convo\Http\Api\Psr7RequestAdapter;
use WP_REST_Request;
use Convo\Providers\ConvoWPPlugin;

class ServicesController extends Controller
{

    /**
     * @var \Convo\Core\Util\RestApp
     */
    private static $_adminApp;

    /**
     * @var \Convo\Core\Util\RestApp
     */
    private static $_publicApp;

    public static function all(WP_REST_Request $request)
    {
        $route        =   $request->get_route();
        $uri          =   new Uri(get_rest_url(null, '/wp-json' . $route));
        $container    =   \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug('Got API request [' . $request->get_route() . '] after [' . timer_stop() . ']');

        // loading WP user
        $user           =    new AdminUser(wp_get_current_user());

        $app            =   self::_getAdminApp();

        $newRequest = Psr7RequestAdapter::from_wp_rest_request($request, $uri)
            ->withParsedBody(json_decode($request->get_body(), true))
            ->withQueryParams($request->get_params())
            ->withAttribute(IAdminUser::class, $user);
        // File params are handled in the adapter
        try {
            $response       =   $app->handle($newRequest);

            if ($response->getStatusCode() !== 200) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }
            return json_decode($response->getBody()->getContents());
        } catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }

    public static function publicRoutes(WP_REST_Request $request)
    {
        $route = $request->get_route();

        $route = implode('', explode('public/', $route, 2));

        $uri = new Uri(get_rest_url(null, '/wp-json' . $route));

        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug('Got public API request [' . $request->get_route() . '] after [' . timer_stop() . ']');


        // loading WP user
        $user       =   new AdminUser(wp_get_current_user());
        $app        =   self::_getPublicApp();
        $newRequest =   Psr7RequestAdapter::from_wp_rest_request($request, $uri)
            ->withParsedBody(json_decode($request->get_body(), true))
            ->withQueryParams($request->get_params())
            ->withAttribute(IAdminUser::class, $user);
        // File params are handled in the adapter

        try {
            $response       =   $app->handle($newRequest);
            $logger->debug('Got handler response');
            // we need to redirect
            if ($response->getStatusCode() === 302) {
                $redirectTo = $response->getHeader('Location');
                if (isset($redirectTo[0])) {
                    wp_redirect($redirectTo[0], 302);
                    die();
                }
            }

            if ($response->getStatusCode() !== 200) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }

            $ctype = implode(',', $response->getHeader('Content-Type'));

            if ($ctype) {
                http_response_code($response->getStatusCode());
                // Emit headers iteratively:
                foreach ($response->getHeaders() as $name => $values) {
                    foreach ($values as $value) {
                        $logger->debug('Header: ' . $name . ': ' . $value);
                        header(sprintf('%s: %s', $name, $value), false);
                    }
                }
                exit($response->getBody());
            }
            exit($response->getBody());
            // return json_decode($response->getBody()->getContents());
        } catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }

    public static function mediaRoute(WP_REST_Request $request)
    {
        $route = $request->get_route();

        $route = implode('', explode('public/', $route, 2));
        $uri = new Uri(get_rest_url(null, '/wp-json' . $route));


        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug('Got public media request [' . $request->get_route() . '] after [' . timer_stop() . ']');

        // loading WP user
        $user       =   new AdminUser(wp_get_current_user());
        $app        =   self::_getPublicApp();
        $newRequest =   Psr7RequestAdapter::from_wp_rest_request($request, $uri)
            ->withParsedBody(json_decode($request->get_body(), true))
            ->withQueryParams($request->get_params())
            ->withAttribute(IAdminUser::class, $user);
        // File params are handled in the adapter
        try {
            $response       =   $app->handle($newRequest);

            // we need to redirect
            if ($response->getStatusCode() === 302) {
                $redirectTo = $response->getHeader('Location');
                if (isset($redirectTo[0])) {
                    wp_redirect($redirectTo[0], 302);
                    die();
                }
            }

            if ($response->getStatusCode() !== 200) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }

            $headers = $response->getHeaders();

            foreach ($headers as $header => $values) {
                header($header . ': ' . implode('; ', $values), true, 200);
            }

            exit($response->getBody()->getContents());
        } catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }

    public static function specialRoutes(WP_REST_Request $request)
    {
        $route = $request->get_route();

        $uri = new Uri(get_rest_url(null, '/wp-json' . $route));

        $container = \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug('Got special request [' . $request->get_route() . '] after [' . timer_stop() . ']');

        $loggedInCookie = $_COOKIE[LOGGED_IN_COOKIE] ?? '';
        $userId = wp_validate_auth_cookie($loggedInCookie, 'logged_in');

        if ($userId === false) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }

        $user       =   new AdminUser(get_user_by('id', $userId));
        $app        =   self::_getAdminApp();

        $newRequest =   Psr7RequestAdapter::from_wp_rest_request($request, $uri)
            ->withParsedBody(json_decode($request->get_body(), true))
            ->withQueryParams($request->get_params())
            ->withAttribute(IAdminUser::class, $user);
        // File params are handled in the adapter

        try {
            $response       =   $app->handle($newRequest);

            if ($response->getStatusCode() >= 400) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }

            $headers = $response->getHeaders();
            foreach ($headers as $header => $values) {
                header($header . ': ' . implode('; ', $values), true, 200);
            }
            exit($response->getBody()->getContents());
        } catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }



    /**
     * @return \Convo\Core\Util\RestApp
     */
    private static function _getAdminApp()
    {
        if (!isset(self::$_adminApp)) {
            $container         =  \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

            /** @var \Psr\Log\LoggerInterface $logger */
            $logger            =   $container->get('logger');
            $logger->info('Creating admin rest app');

            $adminRestApi      =   new AdminRestApi($logger, $container);
            $middlewares       =   ServiceContainerFactory::getAdminMiddlewares($container);
            self::$_adminApp   =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);
            ConvoWPPlugin::loadPackages($container);
        }

        self::$_adminApp->reset();
        return self::$_adminApp;
    }

    /**
     * @return \Convo\Core\Util\RestApp
     */
    private static function _getPublicApp()
    {
        if (!isset(self::$_publicApp)) {
            $container      =   \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
            /** @var \Psr\Log\LoggerInterface $logger */
            $logger         =   $container->get('logger');
            $logger->info('Creating public rest app');

            $adminRestApi   =   new PublicRestApi($logger, $container);
            $middlewares       =   ServiceContainerFactory::getPublicMiddlewares($container);
            self::$_publicApp  =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);
            ConvoWPPlugin::loadPackages($container);
        }

        self::$_publicApp->reset();
        return self::$_publicApp;
    }
}
