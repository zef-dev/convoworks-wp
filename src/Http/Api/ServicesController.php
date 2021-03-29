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
			              ->withQueryParams($request->get_params())
		                  ->withAttribute( IAdminUser::class, $user);
		$newRequest->set_file_params( $_FILES);
		try {
			$response       =   $app->handle($newRequest);

			if ($response->getStatusCode() !== 200) {
				return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
			}

			if (strpos($response->getHeader('Content-Type')[0], 'image') == 0) {
				$contentType = $response->getHeader('Content-Type')[0];
				header('Content-type: ' . $contentType,true,200);
				echo $response->getBody()->getContents();
				exit;
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

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
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
		                     ->withParsedBody($request->get_params())
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

			if (strpos($response->getHeader('Content-Type')[0], 'image') == 0) {
				$contentType = $response->getHeader('Content-Type')[0];
				header('Content-type: ' . $contentType,true,200);
				echo $response->getBody()->getContents();
				exit;
			}

			if ($response->getStatusCode() !== 200) {
				return static::apiErrorResponse(json_decode($response->getBody()->getContents()), $response->getStatusCode());
			}

			return json_decode($response->getBody()->getContents());
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}
	}

	public static function specialRoutes(WP_REST_Request $request)
	{
		$route = $request->get_route();

		$uri = new Uri( CONVOWP_URL . '/wp-json' . $route);

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');

		$container = $builder->build();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$adminRestApi = new AdminRestApi($logger, $container);

		$userId = wp_validate_auth_cookie( $_COOKIE[LOGGED_IN_COOKIE], 'logged_in' );

		if ($userId === false) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}

		$wpUser = get_user_by('id', $userId);

		$user =	new AdminUser($wpUser);

		$middlewares    =   require_once(CONVOWP_LIB_COMMON_PATH . 'middlewares-admin.php');
		$app            =   new \Convo\Core\Util\RestApp($logger, $container, $adminRestApi, $middlewares);

		$newRequest = Request::from_wp_request($request)
		                     ->withUri($uri)
		                     ->withParsedBody($request->get_params())
							 ->withQueryParams($request->get_params())
		                     ->withAttribute( IAdminUser::class, $user);

		$newRequest->set_file_params($_FILES);

		try {
			$response       =   $app->handle($newRequest);

			$contents = $response->getBody()->getContents();

			$serviceId = $request->get_param('serviceId');

			$temp = explode('/', $serviceId);

			if (count($temp) == 1) {
				$fileName = $serviceId;
			} else {
				$fileName = $temp[0] . '-' . $temp[1];
			}

			$file = fopen(\wp_upload_dir()['basedir'] . '/' . $fileName . '.json', 'w');

			fwrite($file, $contents);
			fclose($file);

			header('Content-type: application/json',true,200);
			header("Content-Disposition: attachment; filename=" . $fileName . ".json");
			readfile(\wp_upload_dir()['basedir'] . '/' . $fileName . '.json');
			unlink(\wp_upload_dir()['basedir'] . '/' . $fileName . '.json');
			exit();
		} catch (\Convo\Core\Rest\NotAuthenticatedException $e) {
			return static::apiResponse(['message' => '403 User Not authorized'], 403);
		}
	}
}