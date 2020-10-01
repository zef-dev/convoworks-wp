<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\get_current_domain;
use function ConvoPlugin\oauth_callback_url;
use function ConvoPlugin\sl_direct_connect_url;
use OptimizePress\Integrations\Integration;
use function OptimizePress\Support\array_get;

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
	    $amazonClientId = get_option('convo_amazon_client_id');
	    $amazonClientSecret = get_option('convo_amazon_client_secret');

	    if (empty($amazonClientId) || empty($amazonClientSecret)) {
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
	    $amazonClientId = get_option('convo_amazon_client_id');
	    $amazonClientSecret = get_option('convo_amazon_client_secret');

	    $provider = new \Luchianenco\OAuth2\Client\Provider\Amazon([
		    'clientId'          => $amazonClientId,
		    'clientSecret'      => $amazonClientSecret,
		    'redirectUri'       => oauth_callback_url(),
	    ]);
	    // Try to get an access token
	    $token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);

	    // We can use token to make other API calls
	    if ( ! empty($token->getToken())) {
	    	update_option('convo_amazon_token', $token);
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
            delete_option('convo_amazon_token');
            delete_option('convo_amazon_client_id');
            delete_option('convo_amazon_client_secret');

            wp_redirect(admin_url('admin.php?page=convo-settings'));
            die();
        }

        return true;
    }
}
