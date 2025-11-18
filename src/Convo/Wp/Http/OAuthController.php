<?php

namespace Convo\Wp\Http;

use Convo\Wp\AdminUser;
use Convo\Wp\Providers\ConvoWPPlugin;
use Psr\Log\LoggerInterface;

use function Convo\oauth_callback_url;

class OAuthController extends Controller
{
    /**
     * All the request routes
     *
     * @var array
     */
    protected $routes = [
        'convo-connect-to-amazon' => 'connect',
        'convo-check-connection-to-amazon' => 'checkConnection',
        'convo-process-oauth-callback' => 'callback',
        'convo-process-oauth-disconnect' => 'disconnect',
        'login/amazon/' => 'loginAmazon',
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

        if (strpos($wp->request, 'login/amazon/') !== false) {
            $method = 'loginAmazon';
        }

        if ($method and method_exists($this, $method)) {
            return $this->$method();
        }

        return [];
    }

    public function loginAmazon()
    {
        global $wp;

        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');
        ConvoWPPlugin::logRequest($logger);
        $wpUser = wp_get_current_user();

        $user = new AdminUser($wpUser);

        $segments = explode('/', $wp->request);
        $serviceId = $segments[2];

        if (! empty($user->getId())) {
            $logger->info('Found user [' . $user->getId() . '][' . $user->getUsername() . ']');
            $queryString = parse_url(home_url(add_query_arg(null, null)), PHP_URL_QUERY);
            $queryString .= '&user_id=' . $user->getId();
            $url = get_rest_url() . 'convo/v1/oauth/amazon/' . $serviceId . '?' . $queryString;
            $logger->info('Redirecting user to [' . $url . ']');
            wp_redirect($url, 302);
            exit;
        } else {
            // QUICKFIX for login_url() in wps-hide-login plugin
            /* @global WP_Query $wp_query WordPress Query object. */
            global $wp_query;
            $wp_query->is_404 = false;
            // QUICKFIX END

            $logger->info('User not logged in.');
            $currentUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
            $redirectTo = esc_url(wp_login_url($currentUrl));
            $logger->info('Redirecting to [' . $redirectTo . ']');
            wp_redirect($redirectTo);
            exit;
        }
    }

    /**
     * Redirect to SL connection URL
     *
     * @return void
     */
    public function connect()
    {
        if (current_user_can('manage_convoworks')) {
            $container = ConvoWPPlugin::getAdminDiContainer();

            $amazon = $container->get('amazonAuthService');

            $wpUser = wp_get_current_user();

            $user = new AdminUser($wpUser);
            $redirectTo = $amazon->getAuthUri($user);

            if (! empty($redirectTo)) {
                wp_redirect($redirectTo);
                die();
            }

            wp_die('something went wrong');
        }
    }

    /**
     * Check SL connection
     *
     * @return void
     */
    public function checkConnection()
    {
        if (current_user_can('manage_convoworks')) {
            $container = ConvoWPPlugin::getAdminDiContainer();

            /**
             * @var AmazonPublishingService $amazonPublishingService
             */
            $amazonPublishingService = $container->get('amazonPublishingService');

            $wpUser = wp_get_current_user();
            $userSettings = get_user_meta($wpUser->ID, 'convo_settings', true);
            $amazonVendorId = $userSettings['amazon']['vendor_id'];
            $user = new AdminUser($wpUser);

            try {
                $amazonPublishingService->listSkills($user, $amazonVendorId, false, 1);
                wp_redirect(admin_url() . 'admin.php?page=convo-settings&test_result=ok&success_message=Amazon is correctly configured.');
            } catch (\Exception $e) {
                wp_redirect(admin_url() . 'admin.php?page=convo-settings&test_result=nok&error_message=' . $e->getMessage());
            }
            die();
        }
    }

    /**
     * Process the SL OAuth callback request
     *
     * @return mixed
     * @throws \Exception
     */
    public function callback()
    {
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');
        ConvoWPPlugin::logRequest($logger);

        $user = wp_get_current_user();
        $userSettings = get_user_meta($user->ID, 'convo_settings', true);
        $amazonClientId = $userSettings['amazon']['client_id'];
        $amazonClientSecret = $userSettings['amazon']['client_secret'];
        $amazonVendorId = $userSettings['amazon']['vendor_id'];

        if (empty($amazonClientId) || empty($amazonClientSecret) || empty($amazonVendorId)) {
            wp_die('Client ID or Secret are not set!');
        }

        if (isset($_GET['error'])) {
            // Redirect back to the settings with error description
            $error = sanitize_text_field($_GET['error']);
            $error_description = sanitize_text_field($_GET['error_description']) ?? '';
            wp_redirect(admin_url() . 'admin.php?page=convo-settings&error_description=' . urlencode($error_description) . '&error=' . $error);
            die();
        }

        $provider = new \Luchianenco\OAuth2\Client\Provider\Amazon([
            'clientId' => $amazonClientId,
            'clientSecret' => $amazonClientSecret,
            'redirectUri' => oauth_callback_url(),
        ]);

        // Try to get an access token
        $token = $provider->getAccessToken('authorization_code', ['code' => sanitize_text_field($_GET['code'])]);

        // We can use token to make other API calls
        if (! empty($token->getToken())) {
            $data = [
                'access_token' => $token->getToken(),
                'refresh_token' => $token->getRefreshToken(),
                'expires_in' => $token->getExpires() - time(),
                //       'resource_owner_id' => $token->getResourceOwnerId(),
                'created' => time(),
            ];
            $userSettings['amazon']['client_auth'] = $data;
            update_user_meta($user->ID, 'convo_settings', $userSettings);
        }

        // Redirect back to the settings
        wp_redirect(admin_url() . 'admin.php?page=convo-settings');
        die();
    }

    /**
     * Disconnect the Amazon connection
     *
     * @return mixed
     */
    public function disconnect()
    {
        if (current_user_can('manage_convoworks')) {
            // Clear out options
            $user = wp_get_current_user();
            $userSettings = get_user_meta($user->ID, 'convo_settings', true);

            // removing only oauth token
            $userSettings['amazon']['client_auth'] = [];

            update_user_meta($user->ID, 'convo_settings', $userSettings);

            wp_redirect(admin_url('admin.php?page=convo-settings'));
            die();
        }

        return true;
    }
}
