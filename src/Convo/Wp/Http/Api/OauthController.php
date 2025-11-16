<?php

namespace Convo\Wp\Http\Api;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\IAdminUser;
use Convo\Wp\AdminUser;
use Convo\Wp\AdminUserDataProvider;
use WP_REST_Request;

class OauthController extends Controller
{
    public static function handleOAuthGet(WP_REST_Request $request)
    {
        setcookie('convo_account_linking_query_params', '', 0, '/', '', is_ssl(), true);
        $params         = $request->get_params();
        $user_id        = $params['user_id'] ?? null;
        $type           = $params['type'];
        $serviceId      = $params['serviceId'] ?? null;
        $consent_response      = $params['consent_response'] ?? '';

        if (! $user_id) {
            return static::apiErrorResponse(
                "Missing user_id query parameter.",
                400
            );
        }

        if (! $serviceId) {
            return static::apiErrorResponse(
                "Missing $serviceId query parameter.",
                400
            );
        }

        $state             =    $params['state'] ?? null;
        $client_id         =    $params['client_id'] ?? null;
        $response_type    =    $params['response_type'] ?? null;
        $scope            =    $params['scope'] ?? null;
        $redirect_uri    =    $params['redirect_uri'] ?? null;

        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();

        /** @var \Psr\Log\LoggerInterface $logger */
        $logger         =   $container->get('logger');

        $logger->debug("Got params [$state][$client_id][$response_type][$scope][$redirect_uri]");

        try {
            // loading WP user
            $wpUser = get_user_by('id', $user_id);

            if (! $wpUser) {
                return static::apiErrorResponse(
                    'User does not exist.',
                    400
                );
            }

            $user =    new AdminUser($wpUser);

            $userDao = new AdminUserDataProvider($logger);

            $code = self::_generateAuthCodeForUser($user);

            $userOauth = $userDao->getUserOauth($user->getId(), $type, $serviceId);

            if (
                isset($userOauth['code']) &&
                $userOauth['code'] === $code &&
                $userOauth['redeemed'] === true
            ) {
                return static::apiErrorResponse(
                    'Code has already been redeemed.',
                    400
                );
            }

            $metaKey = self::_generateUserMetaKey($serviceId, $type);
            $convoOauthData['redeemed'] = 0;
            $convoOauthData['code'] = $code;

            update_user_meta($user->getId(), $metaKey, $convoOauthData);

            $stateAndCode = "?state={$state}&code={$code}";
            if (!empty($consent_response) && $consent_response === 'decline') {
                $stateAndCode = '?state=N/A&code=N/A';
            }
            $logger->debug('REDIRECTING to ' . $redirect_uri . $stateAndCode);

            wp_redirect($redirect_uri . $stateAndCode, 302);
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

        $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
        /** @var \Psr\Log\LoggerInterface $logger */
        $logger   =   $container->get('logger');
        \Convo\Providers\ConvoWPPlugin::logRequest($logger);

        $logger->debug('Got JSON [' . print_r($json, true) . ']');

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

    public static function _refreshToken($refreshToken, $type, $serviceId, $logger)
    {
        $expires = 'expires';

        $userDao = new AdminUserDataProvider($logger);

        $user = $userDao->getUserByRefreshToken($refreshToken, $type, $serviceId);

        $auth_token = self::_generateAccessTokenForUser($user);

        $token_data = [
            'access_token' => $auth_token,
            'refresh_token' => $refreshToken,
            'token_type' => 'bearer',
            $expires => 3600
        ];
        $metaKey = self::_generateUserMetaKey($serviceId, $type);
        $convoOauthData = get_user_meta($user->getId(), $metaKey, true);
        $convoOauthData['accessToken'] = $token_data;
        update_user_meta($user->getId(), $metaKey, $convoOauthData);

        return new \WP_REST_Response($token_data, 200);
    }

    public static function _redeemCodeForToken($code, $type, $serviceId, $logger)
    {
        $expires = 'expires';

        try {
            $userDao = new AdminUserDataProvider($logger);
            $user = $userDao->getUserByAuthCode($code, $type, $serviceId);

            $auth_token = self::_generateAccessTokenForUser($user);
            $refresh_token = self::_generateRefreshTokenForUser($user);

            $token_data = [
                'access_token' => $auth_token,
                'refresh_token' => $refresh_token,
                'token_type' => 'bearer',
                $expires => 3600
            ];

            $metaKey = self::_generateUserMetaKey($serviceId, $type);
            $convoOauthData = get_user_meta($user->getId(), $metaKey, true);
            $convoOauthData['redeemed'] = 1;
            $convoOauthData['accessToken'] = $token_data;
            update_user_meta($user->getId(), $metaKey, $convoOauthData);

            return new \WP_REST_Response($token_data, 200);
        } catch (DataItemNotFoundException $e) {
            return static::apiErrorResponse('Auth code not found.', 401);
        }
    }

    public static function _generateAccessTokenForUser(IAdminUser $user)
    {
        $data = $user->getId() . $user->getName() . $user->getEmail() . bin2hex(random_bytes(64));

        return hash("haval128,5", $data);
    }

    public static function _generateRefreshTokenForUser(IAdminUser $user)
    {
        $data = $user->getId() . $user->getName() . $user->getEmail() . bin2hex(random_bytes(32));

        return hash("haval128,4", $data);
    }

    public static function _generateAuthCodeForUser(IAdminUser $user)
    {
        $data = $user->getId() . $user->getName() . $user->getEmail() . bin2hex(random_bytes(16));

        return hash("haval128,3", $data);
    }

    private static function _generateUserMetaKey($serviceId, $type)
    {
        return 'convo_account_linking' . '_' .  str_replace('-', '_', $serviceId) . '_' . str_replace('-', '_', $type);
    }
}
