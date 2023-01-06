<?php

namespace Convo\Http\Api;

use Convo\Core\Adapters\PublicRestApi;
use Convo\Core\Admin\AdminRestApi;
use Convo\Wp\AdminUser;
use Convo\Core\IAdminUser;
use GuzzleHttp\Psr7\Uri;
use Inpsyde\WPRESTStarter\Core\Request\Request;
use WP_REST_Request;
use function Convo\convo_esc_json;
use Convo\Wp\PackageLoader;

class ServicesController extends Controller
{
    
    private static $_packagesLoaded = false;
    
    /**
     * @var \Convo\Core\Util\RestApp
     */
    private static $_adminApp;

    /**
     * @var \Convo\Core\Util\RestApp
     */
    private static $_publicApp;
    
    public static function all( WP_REST_Request $request)
    {
        $route        =   $request->get_route();
        $uri          =   new Uri( CONVOWP_URL . '/wp-json' . $route);
        $container    =   \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug( 'Got admin API request ['.$request->get_route().'] after ['.timer_stop().']');
        
        // loading WP user
        $user           =    new AdminUser( wp_get_current_user());

        $app            =   self::_getAdminApp();

        $newRequest = Request::from_wp_request($request)
                          ->withUri($uri)
                          ->withParsedBody(json_decode($request->get_body(), true))
                          ->withQueryParams($request->get_params())
                          ->withAttribute( IAdminUser::class, $user);
        $newRequest->set_file_params( $_FILES);
        try {
            $response       =   $app->handle($newRequest);

            if ($response->getStatusCode() !== 200) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }
            return json_decode($response->getBody()->getContents());
        } catch ( \Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }
    
    public static function publicRoutes(WP_REST_Request $request)
    {
        $route = $request->get_route();

        $route = str_replace('public/', '', $route);

        $uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug( 'Got public API request ['.$request->get_route().'] after ['.timer_stop().']');
        

        // loading WP user
        $user       =   new AdminUser( wp_get_current_user());
        $app        =   self::_getPublicApp();
        $newRequest =   Request::from_wp_request($request)
                             ->withUri($uri)
                             ->withParsedBody(json_decode($request->get_body(), true))
                             ->withQueryParams($request->get_params())
                             ->withAttribute( IAdminUser::class, $user);
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
            
            $ctype = implode( ',', $response->getHeader( 'Content-Type'));
            
            if ( stripos( $ctype, 'xml')) {
                http_response_code( $response->getStatusCode());
                // Emit headers iteratively:
                foreach ( $response->getHeaders() as $name => $values) {
                     foreach ($values as $value) {
                         header(sprintf('%s: %s', $name, $value), false);
                     }
                 }
                 exit( $response->getBody());
            }
            
            return json_decode($response->getBody()->getContents());
        } catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }
    }

    public static function mediaRoute(WP_REST_Request $request)
    {
        $route = $request->get_route();

        $route = str_replace('public/', '', $route);

        $uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug( 'Got public media request ['.$request->get_route().'] after ['.timer_stop().']');
        
        // loading WP user
        $user       =   new AdminUser( wp_get_current_user());
        $app        =   self::_getPublicApp();
        $newRequest =   Request::from_wp_request($request)
                             ->withUri($uri)
                             ->withParsedBody(json_decode($request->get_body(), true))
                             ->withQueryParams($request->get_params())
                             ->withAttribute( IAdminUser::class, $user);
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

            foreach ($headers as $header => $values)
            {
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

        $uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

        $container = \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug( 'Got admin media request ['.$request->get_route().'] after ['.timer_stop().']');
        
        $loggedInCookie = $_COOKIE[LOGGED_IN_COOKIE] ?? '';
        $userId = wp_validate_auth_cookie( $loggedInCookie, 'logged_in' );

        if ($userId === false) {
            return static::apiResponse(['message' => '403 User Not authorized'], 403);
        }

        $user       =   new AdminUser( get_user_by('id', $userId));
        $app        =   self::_getAdminApp();

        $newRequest =   Request::from_wp_request($request)
                             ->withUri($uri)
                             ->withParsedBody(json_decode($request->get_body(), true))
                             ->withQueryParams($request->get_params())
                             ->withAttribute( IAdminUser::class, $user);

        $newRequest->set_file_params($_FILES);

        try {
            $response       =   $app->handle($newRequest);

            if ($response->getStatusCode() >= 400) {
                return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
            }

            $headers = $response->getHeaders();
            foreach ($headers as $header => $values)
            {
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
        if ( !isset( self::$_adminApp))
        {
            $container         =  \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();
            
            /** @var \Psr\Log\LoggerInterface $logger */
            $logger            =   $container->get( 'logger');
            $logger->info( 'Creating admin rest app');
            
            $adminRestApi      =   new AdminRestApi( $logger, $container);
            $middlewares       =   require_once( CONVOWP_LIB_COMMON_PATH . 'middlewares-admin.php');
            self::$_adminApp   =   new \Convo\Core\Util\RestApp( $logger, $container, $adminRestApi, $middlewares);
            
            self::_loadPackages( $container);
        }
        
        return self::$_adminApp;
    }
    
    /**
     * @return \Convo\Core\Util\RestApp
     */
    private static function _getPublicApp()
    {
        if ( !isset( self::$_publicApp))
        {
            $container      =   \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
            /** @var \Psr\Log\LoggerInterface $logger */
            $logger         =   $container->get('logger');
            $logger->info( 'Creating public rest app');
            
            $adminRestApi   =   new PublicRestApi( $logger, $container);
            $middlewares    =   require_once( CONVOWP_LIB_COMMON_PATH . 'middlewares-client.php');
            self::$_publicApp  =   new \Convo\Core\Util\RestApp( $logger, $container, $adminRestApi, $middlewares);
            
            self::_loadPackages( $container);
        }
        
        return self::$_publicApp;
    }
    
    private static function _loadPackages( $container)
    {
        if ( !self::$_packagesLoaded)
        {
            $loader = new PackageLoader( $container->get( 'logger'), $container, $container->get( 'packageProviderFactory'));
            $loader->load();
        }
        self::$_packagesLoaded = true;
    }
    
}
