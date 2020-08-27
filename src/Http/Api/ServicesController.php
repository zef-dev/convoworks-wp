<?php

namespace ConvoPlugin\Http\Api;

use Convo\Core\Admin\AdminRestApi;
use Convo\Core\Admin\AdminUser;
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
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-core.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-util.php');

		$container = $builder->build();

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-admin.php');

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$adminRestApi = new AdminRestApi($logger, $container, $middlewares);

		// @todo load actual WP user
		$user =	new AdminUser(2, 'tole', 'Tole', 'tole.car@gmail.com', 'toletole');

		$request = Request::from_wp_request($request)
		                  ->withUri($uri)
		                  ->withAttribute( IAdminUser::class, $user);

		try {
			$response = $adminRestApi->handle($request);
			return json_decode($response->getBody()->getContents());
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}
	}
}