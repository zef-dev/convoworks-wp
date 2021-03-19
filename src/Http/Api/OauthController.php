<?php

namespace ConvoPlugin\Http\Api;

use Convo\Core\DataItemNotFoundException;
use ConvoPlugin\Convo\Wp\AdminUser;
use ConvoPlugin\Convo\Wp\AdminUserDataProvider;
use Inpsyde\WPRESTStarter\Core\Response\Response;
use WP_REST_Request;
use function ConvoPlugin\view;

class OauthController extends Controller
{
    /**
     * All the request routes
     *
     * @var array
     */
    protected $routes = [
        'login/amazon'                          => 'loginAmazon',
    ];

    /**
     * Route requests
     *
     * @return mixed
     */
    public function routes()
    {
        global $wp;

        $method = isset($this->routes[$wp->request]) ? $this->routes[$wp->request] : false;

        if ($method and method_exists($this, $method)) {
            return $this->$method();
        }

        return [];
    }

	public function loginAmazon()
	{
		view('amazon/login');
    }

	public static function handleOAuthGet(WP_REST_Request $request)
	{
		$params         = $request->get_params();
		$user_id        = $params['user_id'] ?? null;
		$type           = $params['type'];

		if (! $user_id) {
			return static::apiErrorResponse(
				"Missing user_id query parameter."
			, 400);
		}

		$state 			=	$params['state'] ?? null;
		$client_id 		=	$params['client_id'] ?? null;
		$response_type	=	$params['response_type'] ?? null;
		$scope			=	$params['scope'] ?? null;
		$redirect_uri	=	$params['redirect_uri'] ?? null;

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-client.php');

		$container = $builder->build();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$logger->debug("Got params [$state][$client_id][$response_type][$scope][$redirect_uri]");

		try {
			// loading WP user
			$wpUser = get_user_by('id', $user_id);

			if (! $wpUser) {
				return static::apiErrorResponse(
					'User does not exist.'
					, 400);
			}

			$user =	new AdminUser($wpUser);

			$userDao = new AdminUserDataProvider($logger);

			$code = self::_generateAuthCodeForUser($user);

			$userConfig = $userDao->getPlatformConfig($user->getId());

			if (isset($userConfig['authCode'][$type]['code']) &&
			    $userConfig['authCode'][$type]['code'] === $code &&
			    $userConfig['authCode'][$type]['redeemed'] === true)
			{
				return static::apiErrorResponse(
					'Code has already been redeemed.'
					, 400);
			}

			$userDao->updatePlatformConfig($user->getId(), [
				'authCode' => [
					$type => [
						'code' => $code,
						'redeemed' => false
					]
				]
			]);

			$logger->debug('REDIRECTING to ' . $redirect_uri . "?state={$state}&code={$code}");

			wp_redirect($redirect_uri . "?state={$state}&code={$code}", 302);
			exit();
		} catch (DataItemNotFoundException $e) {
			$logger->debug('Error happened ' . $e->getMessage());
			return static::apiErrorResponse('', 401);
		}
	}

	public static function handleOAuthPost(WP_REST_Request $request)
	{
		$type = $request->get_param('type');
		$serviceId = $request->get_param('serviceId');
		$json = $request->get_params();

		$builder = new \DI\ContainerBuilder();
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
		$builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-client.php');

		$container = $builder->build();

		/** @var \Psr\Log\LoggerInterface $logger */
		$logger         =   $container->get('logger');

		$logger->debug('Got JSON ['.print_r($json, true).']');

		$grant_type = $request->get_param('grant_type') ?? null;

		if (! $grant_type) {
			throw new \Exception('Missing grant type.');
		}

		switch ($grant_type) {
			case 'refresh_token':
				$refresh_token = $request->get_param('refresh_token');
				return self::_refreshToken($refresh_token, $type, $serviceId, $logger);
			case 'authorization_code':
				$auth_code = $request->get_param('code');
				return self::_redeemCodeForToken($auth_code, $type, $serviceId, $logger);
			default:
				return static::apiErrorResponse('Invalid grant', 400);
		}
	}

	public static function _refreshToken($refreshToken, $type, $serviceId, $logger) {
		$expires = $type === 'google' ? 'expires_in' : 'expires';

		$userDao = new AdminUserDataProvider($logger);

		$user = $userDao->getUserByRefreshToken($refreshToken, $type);

		$auth_token = bin2hex(random_bytes(64));

		$token_data = [
			$serviceId => [
				$type => [
					'access_token' => $auth_token,
					'refresh_token' => $refreshToken,
					'token_type' => 'bearer',
					$expires => 3600
				]
			]
		];

		$userDao->updatePlatformConfig($user['id'], [
			'accessToken' => $token_data
		]);

		return new Response($token_data[$type], '200');
	}

	public static function _redeemCodeForToken($code, $type, $serviceId, $logger) {
		$expires = $type === 'google' ? 'expires_in' : 'expires';

		try {
			$userDao = new AdminUserDataProvider($logger);
			$user = $userDao->getUserByAuthCode($code, $type);

			// todo: mix in some user data so that this isn't completely random?
			$auth_token = bin2hex(random_bytes(64));
			$refresh_token = bin2hex(random_bytes(16));

			$token_data = [
				$serviceId => [
					$type => [
						'access_token' => $auth_token,
						'refresh_token' => $refresh_token,
						'token_type' => 'bearer',
						$expires => 3600
					]
				]
			];

			$userDao->updatePlatformConfig($user['id'], [
				'authCode' => [
					$serviceId => [
						$type => ['redeemed' => true]
					]
				],
				'accessToken' => $token_data
			]);

			return new Response($token_data[$type], '200');
		} catch (DataItemNotFoundException $e) {
			return static::apiErrorResponse('Auth code not found.', 401);
		}
	}

	public static function _generateAuthCodeForUser($user)
	{
		$data = $user->getId().$user->getName().bin2hex(random_bytes(16));

		return hash("haval128,3", $data);
	}
}
