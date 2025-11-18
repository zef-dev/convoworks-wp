<?php

namespace Convo\Wp\Http;

use Convo\Core\ISecretStore;
use Convo\Wp\Providers\ConvoWPPlugin;

class InstallationVariablesController
{
    public static function index()
    {
        $container = ConvoWPPlugin::getCurrentDiContainer();
        /** @var ISecretStore $secretStore */
        $secretStore = $container->get('secretStore');

        // Handle form submissions
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['convowp_install_vars_action'])) {
            $action = $_POST['convowp_install_vars_action'];
            $name = isset($_POST['name']) ? trim($_POST['name']) : '';
            $value = isset($_POST['value']) ? $_POST['value'] : '';
            $is_secret = isset($_POST['is_secret']) && $_POST['is_secret'] === 'on';
            $user_id = get_current_user_id();

            if ($action === 'add' && $name !== '') {
                $secretStore->set($name, $value, $is_secret, $user_id);
                echo '<div class="updated"><p>Secret added/updated.</p></div>';
            }
            if ($action === 'update' && $name !== '') {
                $secretStore->set($name, $value, $is_secret, $user_id);
                echo '<div class="updated"><p>Secret updated.</p></div>';
            }
            if ($action === 'delete' && $name !== '') {
                // No delete in interface, so set to empty value and not secret
                $secretStore->set($name, '', false, $user_id);
                echo '<div class="updated"><p>Secret deleted (value cleared).</p></div>';
            }
        }

        $secrets = $secretStore->all();

        echo '<div class="wrap"><h1>Installation Variables</h1>';

        // Add new secret form
        echo '<h2>Add New Variable</h2>';
        echo '<form method="post" style="margin-bottom:2em;">';
        echo '<input type="hidden" name="convowp_install_vars_action" value="add">';
        echo '<table class="form-table"><tr>';
        echo '<th><label for="name">Name</label></th>';
        echo '<td><input type="text" name="name" id="name" required></td>';
        echo '</tr><tr>';
        echo '<th><label for="value">Value</label></th>';
        echo '<td><input type="text" name="value" id="value"></td>';
        echo '</tr><tr>';
        echo '<th><label for="is_secret">Is Secret?</label></th>';
        echo '<td><input type="checkbox" name="is_secret" id="is_secret" checked></td>';
        echo '</tr></table>';
        echo '<p><input type="submit" class="button button-primary" value="Add Variable"></p>';
        echo '</form>';

        // List existing secrets
        echo '<h2>Current Variables</h2>';
        if (empty($secrets)) {
            echo '<p>No installation variables found.</p>';
        } else {
            echo '<table class="widefat fixed striped"><thead><tr>';
            echo '<th>Name</th><th>Value</th><th>Is Secret</th><th>Updated At</th><th>Updated By</th><th>Actions</th>';
            echo '</tr></thead><tbody>';
            foreach ($secrets as $name => $meta) {
                $masked_value = $meta['is_secret'] ? str_repeat('*', 8) : $meta['value'];
                echo '<tr>';
                echo '<td>' . esc_html($name) . '</td>';
                echo '<td>' . esc_html($masked_value) . '</td>';
                echo '<td>' . ($meta['is_secret'] ? 'Yes' : 'No') . '</td>';
                echo '<td>' . esc_html($meta['updated_at'] ?? '') . '</td>';
                echo '<td>' . esc_html($meta['updated_by'] ?? '') . '</td>';
                echo '<td>';
                // Update form
                echo '<form method="post" style="display:inline-block;margin-right:8px;">';
                echo '<input type="hidden" name="convowp_install_vars_action" value="update">';
                echo '<input type="hidden" name="name" value="' . esc_attr($name) . '">';
                echo '<input type="text" name="value" value="' . esc_attr($meta['is_secret'] ? '' : $meta['value']) . '" placeholder="New value">';
                echo '<label><input type="checkbox" name="is_secret" ' . ($meta['is_secret'] ? 'checked' : '') . '> Secret</label> ';
                echo '<input type="submit" class="button" value="Update">';
                echo '</form>';
                // Delete form
                echo '<form method="post" style="display:inline-block;">';
                echo '<input type="hidden" name="convowp_install_vars_action" value="delete">';
                echo '<input type="hidden" name="name" value="' . esc_attr($name) . '">';
                echo '<input type="submit" class="button" value="Delete" onclick="return confirm(\'Are you sure you want to delete this variable?\');">';
                echo '</form>';
                echo '</td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
        }

        echo '</div>';
    }
}
