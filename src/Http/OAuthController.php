<?php

namespace ConvoPlugin\Http;

use ConvoPlugin\Convo\Wp\AdminUser;
use function ConvoPlugin\oauth_callback_url;

class OAuthController extends Controller
{
    /**
     * All the request routes
     *
     * @var array
     */
    protected $routes = [
        'convo-connect-to-amazon'               => 'connect',
        'convo-process-oauth-callback'          => 'callback',
        'convo-process-oauth-disconnect'        => 'disconnect',
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

    /**
     * Redirect to SL connection URL
     *
     * @return void
     */
    public function connect()
    {
	    $builder = new \DI\ContainerBuilder();
	    $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
	    $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
	    $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');

	    $container = $builder->build();
	    $amazon         =   $container->get('amazonAuthService');

	    $wpUser = wp_get_current_user();

	    $user =	new AdminUser($wpUser);
	    $redirectTo = $amazon->getAuthUri($user);

	    if (! empty($redirectTo)) {
		    wp_redirect($redirectTo);
		    die();
	    }

	    wp_die('something went wrong');
    }

    /**
     * Process the SL OAuth callback request
     *
     * @return mixed
     * @throws \Exception
     */
    public function callback()
    {
	    $user = wp_get_current_user();
	    $userSettings = get_user_meta($user->ID, 'convo_settings', true);
	    $amazonClientId = $userSettings['amazon']['client_id'];
	    $amazonClientSecret = $userSettings['amazon']['client_secret'];
	    $amazonVendorId = $userSettings['amazon']['vendor_id'];

	    if (empty($amazonClientId) || empty($amazonClientSecret) || empty($amazonVendorId)) {
		    wp_die('Client ID or Secret are not set!');
	    }
	    
	    if ( isset( $_GET['error'])) {
	        // Redirect back to the settings with error description
	        $error = $_GET['error'];
	        $error_description = $_GET['error_description'] ?? '';
	        wp_redirect(admin_url() . 'admin.php?page=convo-settings&error_description='.urlencode( $error_description).'&error='.$error);
	        die();
	    }

	    $provider = new \Luchianenco\OAuth2\Client\Provider\Amazon([
		    'clientId'          => $amazonClientId,
		    'clientSecret'      => $amazonClientSecret,
		    'redirectUri'       => oauth_callback_url(),
	    ]);

	    // Try to get an access token
	    $token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);

	    // We can use token to make other API calls
	    if ( ! empty($token->getToken())) {
	    	$data = [
	    		'access_token' => $token->getToken(),
	    		'refresh_token' => $token->getRefreshToken(),
	    		'expires_in' => $token->getExpires() - time(),
			    'resource_owner_id' => $token->getResourceOwnerId(),
			    'created' => time(),
		    ];
	    	$userSettings['amazon']['client_auth'] = $data;
	    	update_user_meta($user->ID,'convo_settings', $userSettings);
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
        if (current_user_can('administrator')) {
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
