<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

class SettingsController extends Controller
{
    /**
     * Display general dashboard settings
     *
     * @return mixed
     */
    public static function index()
    {
        view('settings/index');
    }

    /**
     * Toggle the full screen option for the current user
     *
     * @return void
     */
    public function toggleFullScreen()
    {
        $currentUser = wp_get_current_user();

        if ( ! isset($currentUser->ID)) {
            wp_die(__('You need to be logged in to WordPress.', 'opdash'));
        }

        $userOption   = 'ops_isFullScreen_' . $currentUser->ID;
        $isFullScreen = (int) $_POST['isFullScreen'];
        update_option($userOption, $isFullScreen, true);

        wp_send_json([
            'success'        => true,
            'option'         => $userOption,
            'isFullScreen' => $isFullScreen
        ]);
    }
}
