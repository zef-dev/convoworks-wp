<?php

namespace Convo\Http;

class SettingsController extends Controller
{
    /**
     * Display general dashboard settings
     *
     * @return void
     */
    public static function index()
    {
	    $group = isset($_GET['convo-settings-group']) ? sanitize_text_field($_GET['convo-settings-group']) : 'amazon';

        static::group($group);
    }

	/**
	 * Display settings group
	 *
	 * @param string $group
	 */
	public static function group($group = 'amazon')
	{
		\Convo\view( 'settings/index', [ 'group' => $group ] );
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
		$user = wp_get_current_user();
		$userSettings = get_user_meta($user->ID, 'convo_settings', true);

		if (empty($userSettings))
			$userSettings = [];

		// General options
		if (isset($_POST['convo_amazon_client_id']))  {
			$userSettings['amazon']['client_id'] = sanitize_text_field($_POST['convo_amazon_client_id']);
		}
		if (isset($_POST['convo_amazon_client_secret']))  {
			$userSettings['amazon']['client_secret'] = sanitize_text_field($_POST['convo_amazon_client_secret']);
		}
		if (isset($_POST['convo_amazon_vendor_id']))  {
			$userSettings['amazon']['vendor_id'] = sanitize_text_field($_POST['convo_amazon_vendor_id']);
		}

		update_user_meta($user->ID, 'convo_settings', $userSettings);

		wp_send_json(["success" => true, "message" => "Saved.", "redirect" => admin_url('admin.php?page=convo-settings')]);
		wp_die();
	}
}
