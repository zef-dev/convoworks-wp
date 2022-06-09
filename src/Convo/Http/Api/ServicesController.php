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

class ServicesController extends Controller
{
	public static function all(WP_REST_Request $request)
	{
		$route = $request->get_route();

		$uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

		$container = \Convo\Providers\ConvoWPPlugin::getAdminDiContainer();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$adminRestApi = new AdminRestApi($logger, $container);

		// loading WP user
		$wpUser = wp_get_current_user();

		$user =	new AdminUser($wpUser);

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-admin.php');
		$app            =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);

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
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
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

		$adminRestApi = new PublicRestApi($logger, $container);

		// loading WP user
		$wpUser = wp_get_current_user();

		$user =	new AdminUser($wpUser);

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-client.php');
		$app            =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);

		$newRequest = Request::from_wp_request($request)
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

		$adminRestApi = new PublicRestApi($logger, $container);

		// loading WP user
		$wpUser = wp_get_current_user();

		$user =	new AdminUser($wpUser);

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-client.php');
		$app            =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);

		$newRequest = Request::from_wp_request($request)
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

		$adminRestApi = new AdminRestApi($logger, $container);
        $loggedInCookie = $_COOKIE[LOGGED_IN_COOKIE] ?? '';
		$userId = wp_validate_auth_cookie( $loggedInCookie, 'logged_in' );

		if ($userId === false) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}

		$wpUser = get_user_by('id', $userId);

		$user =	new AdminUser($wpUser);

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-admin.php');
		$app            =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);

		$newRequest = Request::from_wp_request($request)
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
}
