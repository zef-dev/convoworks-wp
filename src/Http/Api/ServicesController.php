<?php

namespace ConvoPlugin\Http\Api;

use Convo\Core\Adapters\PublicRestApi;
use Convo\Core\Admin\AdminRestApi;
use ConvoPlugin\Convo\Wp\AdminUser;
use Convo\Core\IAdminUser;
use GuzzleHttp\Psr7\Uri;
use Inpsyde\WPRESTStarter\Core\Request\Request;
use WP_REST_Request;

class ServicesController extends Controller
{
	public static function all(WP_REST_Request $request)
	{
		$route = $request->get_route();

		$uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-util.php');

		$container = $builder->build();

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
			              ->withParsedBody($request->get_params())
		                  ->withAttribute( IAdminUser::class, $user);

		try {
			$response       =   $app->handle($newRequest);

			if ($response->getStatusCode() !== 200) {
				return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
			}

			if (strpos($route, 'package-help') !== false) {
				$realResponse = $response->getBody()->getContents();
			} else {
				$realResponse = json_decode($response->getBody()->getContents());
			}

			return $realResponse;
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}
	}

	public static function publicRoutes(WP_REST_Request $request)
	{
		$route = $request->get_route();

		$route = str_replace('public/', '', $route);

		$uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-util.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-client.php');

		$container = $builder->build();

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
		                     ->withParsedBody($request->get_params());
		                     //->withAttribute( IAdminUser::class, $user);

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
}