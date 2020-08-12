<?php

namespace ConvoPlugin\Http\Api;

use Convo\Core\Admin\AdminRestApi;
use Convo\Core\Admin\AdminUser;
use Convo\Core\IAdminUser;
use Convo\Core\Rest\NotFoundException;
use GuzzleHttp\Psr7\Uri;
use Inpsyde\WPRESTStarter\Core\Request\Request;
use WP_REST_Request;
use function ConvoPlugin\startsWith;

class ServicesController extends Controller
{
	public static function all(WP_REST_Request $request)
	{
		$uri = '';
		$route = $request->get_route();
		$justRoute = substr($route, 10, strlen($route));

		$uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

		/*if (startsWith($justRoute, 'services/')) {
			$uri = new Uri(CONVOWP_URL . '/wp-json/convo/v1/services/' . $request->get_param('serviceId'));
		} elseif (startsWith($justRoute, 'services')) {
			$uri = new Uri( CONVOWP_URL . '/wp-json/convo/v1/services');
		} elseif (startsWith($justRoute, 'service-platform-propagate')) {
			$serviceId = $request->get_param('serviceId');
			$serviceType = $request->get_param('serviceType');
			$uri = new Uri(CONVOWP_URL . '/wp-json/convo/v1/service-platform-propagate/' . $serviceId . '/' . $serviceType);
		} elseif (startsWith($justRoute, 'user-packages')) {
			$uri = new Uri(CONVOWP_URL . '/wp-json/convo/v1/user-packages');
		}*/

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-core.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-util.php');

		$container = $builder->build();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$adminRestApi = new AdminRestApi($logger, $container);

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