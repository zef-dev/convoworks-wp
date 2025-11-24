<?php

namespace Convo\Wp\Http;

use Convo\Core\ISecretStore;
use Convo\Wp\Providers\ConvoWPPlugin;

class InstallationVariablesController
{
    /**
     * Display the installation variables admin page
     *
     * @return void
     */
    public static function index()
    {
        // Check user capabilities
        if (!current_user_can('manage_convoworks')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'convoworks-wp'));
        }

        $container = ConvoWPPlugin::getCurrentDiContainer();
        /** @var ISecretStore $secretStore */
        $secretStore = $container->get('secretStore');

        // Handle form submissions
        $notice_message = '';
        $notice_type = 'success';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['convowp_install_vars_action'])) {
            // Verify nonce
            if (!isset($_POST['convowp_install_vars_nonce']) || !check_admin_referer('convowp_install_vars', 'convowp_install_vars_nonce')) {
                add_settings_error(
                    'convowp_install_vars',
                    'security_check_failed',
                    __('Security check failed. Please try again.', 'convoworks-wp'),
                    'error'
                );
            } else {
                $action = isset($_POST['convowp_install_vars_action']) ? sanitize_text_field($_POST['convowp_install_vars_action']) : '';
                $name = isset($_POST['name']) ? trim(sanitize_text_field($_POST['name'])) : '';
                $value = isset($_POST['value']) ? wp_unslash($_POST['value']) : '';
                $is_secret = isset($_POST['is_secret']) && $_POST['is_secret'] === 'on';
                $user_id = get_current_user_id();

                // Validate variable name format (uppercase letters, numbers, and underscores only)
                if ($name !== '' && $action !== 'delete' && !preg_match('/^[A-Z0-9_]+$/', $name)) {
                    add_settings_error(
                        'convowp_install_vars',
                        'invalid_variable_name',
                        __('Variable name must contain only uppercase letters, numbers, and underscores (e.g., OPENAI_API_KEY).', 'convoworks-wp'),
                        'error'
                    );
                } elseif ($name !== '') {
                    if ($action === 'add') {
                        $secretStore->set($name, $value, $is_secret, $user_id);
                        add_settings_error(
                            'convowp_install_vars',
                            'variable_added',
                            __('Variable added successfully.', 'convoworks-wp'),
                            'success'
                        );
                    } elseif ($action === 'update') {
                        $secretStore->set($name, $value, $is_secret, $user_id);
                        add_settings_error(
                            'convowp_install_vars',
                            'variable_updated',
                            __('Variable updated successfully.', 'convoworks-wp'),
                            'success'
                        );
                    } elseif ($action === 'delete') {
                        // No delete in interface, so set to empty value and not secret
                        $secretStore->set($name, '', false, $user_id);
                        add_settings_error(
                            'convowp_install_vars',
                            'variable_deleted',
                            __('Variable deleted successfully.', 'convoworks-wp'),
                            'success'
                        );
                    }
                }
            }
        }

        // Get all secrets for display
        $secrets = $secretStore->all();

        // Render the view
        \Convo\Wp\view('installation-variables/index', [
            'secrets' => $secrets,
            'notice_message' => $notice_message,
            'notice_type' => $notice_type,
        ]);
    }
}
