<?php

namespace ConvoPlugin\Http\Api;

use Convo\Core\Admin\AdminRestApi;
use Convo\Core\Admin\AdminUser;
use Convo\Core\IAdminUser;
use Convo\Core\Rest\NotFoundException;
use GuzzleHttp\Psr7\Uri;
use Inpsyde\WPRESTStarter\Core\Request\Request;
use WP_REST_Request;

class ServicesController extends Controller
{
	/**
	 * Get all of the services from ConvoAdmin
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return \WP_REST_Response
	 * @throws NotFoundException
	 * @throws \Exception
	 */
	public static function index(WP_REST_Request $request)
	{
		// @todo extract to method when ready
		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-core.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');

		$container = $builder->build();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$adminRestApi = new AdminRestApi($logger, $container);

		// @todo load actual WP user
		$user =	new AdminUser(1, 'Testić', 'test@test.com');

		$request = Request::from_wp_request($request)
		                  ->withUri(new Uri(CONVOWP_URL . '/wp-json/convo/v1/services'))
		                  ->withAttribute( IAdminUser::class, $user);

		try {
			$response = $adminRestApi->handle($request);
			return static::apiResponse(json_decode($response->getBody()->getContents()));
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}
	}
}