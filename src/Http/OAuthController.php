<?php

namespace ConvoPlugin\Http;

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
    	$user = wp_get_current_user();
    	$userSettings = get_user_meta($user->ID, 'convo_settings', true);
	    $amazonClientId = $userSettings['amazon']['client_id'];
	    $amazonClientSecret = $userSettings['amazon']['client_secret'];
	    $amazonVendorId = $userSettings['amazon']['vendor_id'];

	    if (empty($amazonClientId) || empty($amazonClientSecret) || empty($amazonVendorId)) {
	    	wp_die('Client ID or Secret are not set!');
	    }

	    $provider = new \Luchianenco\OAuth2\Client\Provider\Amazon([
		    'clientId'          => $amazonClientId,
		    'clientSecret'      => $amazonClientSecret,
		    'redirectUri'       => oauth_callback_url(),
	    ]);

	    $options = [
		    'scope'             => 'alexa::ask:skills:readwrite alexa::ask:skills:test alexa::ask:models:readwrite alexa::ask:skills:test alexa::ask:models:read alexa::ask:skills:read alexa::ask:catalogs:readwrite',
	    ];

	    $authUrl = $provider->getAuthorizationUrl($options);
	    $_SESSION['OAuth2State'] = $provider->getState();

	    if (! empty($authUrl)) {
		    wp_redirect($authUrl);
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

	    $provider = new \Luchianenco\OAuth2\Client\Provider\Amazon([
		    'clientId'          => $amazonClientId,
		    'clientSecret'      => $amazonClientSecret,
		    'redirectUri'       => oauth_callback_url(),
	    ]);
	    // Try to get an access token
	    $token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);

	    // We can use token to make other API calls
	    if ( ! empty($token->getToken())) {
	    	$userSettings['amazon']['client_auth'] = $token;
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
	        delete_user_meta($user->ID, 'convo_settings');

            wp_redirect(admin_url('admin.php?page=convo-settings'));
            die();
        }

        return true;
    }
}
