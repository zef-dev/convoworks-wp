<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

class SettingsController extends Controller
{
    /**
     * Display general dashboard settings
     *
     * @return void
     */
    public static function index()
    {
	    $group = isset($_GET['convo-settings-group']) ? $_GET['convo-settings-group'] : 'amazon';

        static::group($group);
    }

	/**
	 * Display settings group
	 *
	 * @param string $group
	 */
	public static function group($group = 'amazon')
	{
		\ConvoPlugin\view( 'settings/index', [ 'group' => $group ] );
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

	/**
	 * Update settings
	 *
	 * @return void
	 */
	public static function update()
	{
		$data = $_POST;

		// General options
		foreach ($data as $key => $value) {
			if (strpos($key, 'convo_') !== false) {
				update_option($key, $value, true);
			}
		}

		wp_send_json(["success" => true, "message" => "Saved.", "redirect" => admin_url('admin.php?page=convo-settings')]);
		wp_die();
	}
}
