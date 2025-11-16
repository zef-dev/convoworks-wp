<?php

namespace Convo\Wp\Http;

class GettingStartedController extends Controller
{
    /**
     * Display general dashboard settings
     *
     * @return void
     */
    public static function index()
    {
        static::isConnectedToAmazon();
    }

    /**
     * Check if the current user is connected to Amazon.
     *
     */
    public static function isConnectedToAmazon()
    {
        $isConnectedToAmazon = false;
        $user = wp_get_current_user();
        $userSettings = get_user_meta($user->ID, 'convo_settings', true);

        if (!empty($userSettings)) {
            if (isset($userSettings['amazon']['client_auth']['access_token'])) {
                $isConnectedToAmazon = true;
            }
        }
        \Convo\view('getting-started/index', ['is_connected_to_amazon' => $isConnectedToAmazon]);
    }
}
