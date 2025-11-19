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
                echo '<div class="notice notice-success is-dismissible"><p><strong>Variable added successfully.</strong></p></div>';
            }
            if ($action === 'update' && $name !== '') {
                $secretStore->set($name, $value, $is_secret, $user_id);
                echo '<div class="notice notice-success is-dismissible"><p><strong>Variable updated successfully.</strong></p></div>';
            }
            if ($action === 'delete' && $name !== '') {
                // No delete in interface, so set to empty value and not secret
                $secretStore->set($name, '', false, $user_id);
                echo '<div class="notice notice-success is-dismissible"><p><strong>Variable deleted successfully.</strong></p></div>';
            }
        }

        $secrets = $secretStore->all();

        // Add custom styles
        echo '<style>
            .convowp-vars-page { margin-top: 20px; }
            .convowp-vars-page .postbox { margin-bottom: 20px; }
            .convowp-vars-page .form-table th { width: 150px; }
            .convowp-vars-page .form-table input[type="text"] { width: 100%; max-width: 500px; }
            .convowp-vars-page .form-table textarea { width: 100%; max-width: 500px; min-height: 80px; }
            .convowp-vars-page .variable-row { position: relative; }
            .convowp-vars-page .variable-row:hover { background-color: #f9f9f9; }
            .convowp-vars-page .edit-form-row { display: none; }
            .convowp-vars-page .edit-form-row.show { display: table-row !important; }
            .convowp-vars-page .edit-form-row td { padding: 20px !important; background-color: #f9f9f9; vertical-align: top; }
            .convowp-vars-page .edit-form { margin: 0; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 4px; display: block; }
            .convowp-vars-page .edit-form .form-table { margin-top: 0; }
            .convowp-vars-page .edit-form .form-table th { width: 120px; }
            .convowp-vars-page .edit-form .form-table td { padding: 10px 0; }
            .convowp-vars-page .secret-badge { display: inline-block; padding: 2px 8px; background: #dc3232; color: #fff; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .convowp-vars-page .public-badge { display: inline-block; padding: 2px 8px; background: #46b450; color: #fff; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .convowp-vars-page .value-display { font-family: monospace; font-size: 13px; word-break: break-all; }
            .convowp-vars-page .value-display.masked { color: #999; letter-spacing: 2px; }
            .convowp-vars-page .actions-cell { white-space: nowrap; }
            .convowp-vars-page .button-link { text-decoration: none; }
            .convowp-vars-page .button-link:hover { text-decoration: underline; }
            .convowp-vars-page .meta-info { color: #666; font-size: 12px; }
            .convowp-vars-page .empty-state { text-align: center; padding: 40px; color: #666; }
            .convowp-vars-page .empty-state-icon { font-size: 48px; margin-bottom: 10px; opacity: 0.3; }
        </style>';

        echo '<div class="wrap convowp-vars-page">';
        echo '<h1 class="wp-heading-inline">Installation Variables</h1>';
        echo '<hr class="wp-header-end">';

        // Add new variable form in a postbox
        echo '<div class="postbox" style="padding: 20px;">';
        echo '<h2 class="hndle" style="padding: 10px 15px; margin: -20px -20px 20px -20px; border-bottom: 1px solid #ccd0d4;"><span>Add New Variable</span></h2>';
        echo '<form method="post" class="convowp-add-form">';
        echo '<input type="hidden" name="convowp_install_vars_action" value="add">';
        echo '<table class="form-table" role="presentation">';
        echo '<tr>';
        echo '<th scope="row"><label for="name">Variable Name</label></th>';
        echo '<td><input type="text" name="name" id="name" class="regular-text" placeholder="e.g., OPENAI_API_KEY" required></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row"><label for="value">Value</label></th>';
        echo '<td><textarea name="value" id="value" class="large-text code" placeholder="Enter the variable value"></textarea></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row"><label for="is_secret">Security</label></th>';
        echo '<td><label><input type="checkbox" name="is_secret" id="is_secret" checked> Mark as secret (value will be encrypted and masked)</label></td>';
        echo '</tr>';
        echo '</table>';
        echo '<p class="submit">';
        echo '<input type="submit" class="button button-primary button-large" value="Add Variable">';
        echo '</p>';
        echo '</form>';
        echo '</div>';

        // List existing variables
        echo '<div class="postbox">';
        echo '<h2 class="hndle" style="padding: 10px 15px; margin: 0; border-bottom: 1px solid #ccd0d4;"><span>Current Variables</span></h2>';
        echo '<div style="padding: 0;">';

        if (empty($secrets)) {
            echo '<div class="empty-state">';
            echo '<div class="empty-state-icon">🔐</div>';
            echo '<p><strong>No installation variables found.</strong></p>';
            echo '<p>Add your first variable using the form above.</p>';
            echo '</div>';
        } else {
            echo '<table class="wp-list-table widefat fixed striped table-view-list">';
            echo '<thead>';
            echo '<tr>';
            echo '<th scope="col" style="width: 20%;">Name</th>';
            echo '<th scope="col" style="width: 25%;">Value</th>';
            echo '<th scope="col" style="width: 10%;">Type</th>';
            echo '<th scope="col" style="width: 15%;">Updated</th>';
            echo '<th scope="col" style="width: 10%;">Updated By</th>';
            echo '<th scope="col" style="width: 20%;">Actions</th>';
            echo '</tr>';
            echo '</thead>';
            echo '<tbody>';

            foreach ($secrets as $name => $meta) {
                $masked_value = $meta['is_secret'] ? str_repeat('●', 12) : esc_html($meta['value']);
                $value_class = $meta['is_secret'] ? 'masked' : '';
                $badge = $meta['is_secret']
                    ? '<span class="secret-badge">Secret</span>'
                    : '<span class="public-badge">Public</span>';

                // Format date
                $updated_at = '';
                if (!empty($meta['updated_at'])) {
                    $timestamp = strtotime($meta['updated_at']);
                    $updated_at = $timestamp ? date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $timestamp) : esc_html($meta['updated_at']);
                }

                // Get user name
                $updated_by = '';
                if (!empty($meta['updated_by'])) {
                    $user = get_user_by('id', $meta['updated_by']);
                    $updated_by = $user ? esc_html($user->display_name) : 'User #' . esc_html($meta['updated_by']);
                }

                $edit_form_id = 'edit-form-' . md5($name);

                echo '<tr class="variable-row">';
                echo '<td><strong>' . esc_html($name) . '</strong></td>';
                echo '<td><span class="value-display ' . $value_class . '">' . $masked_value . '</span></td>';
                echo '<td>' . $badge . '</td>';
                echo '<td><span class="meta-info">' . $updated_at . '</span></td>';
                echo '<td><span class="meta-info">' . $updated_by . '</span></td>';
                echo '<td class="actions-cell">';
                echo '<a href="#" class="button-link edit-toggle" data-form-id="' . esc_attr($edit_form_id) . '">Edit</a> | ';
                echo '<form method="post" style="display:inline;" onsubmit="return confirm(\'Are you sure you want to delete the variable \\\'' . esc_js($name) . '\\\'? This action cannot be undone.\');">';
                echo '<input type="hidden" name="convowp_install_vars_action" value="delete">';
                echo '<input type="hidden" name="name" value="' . esc_attr($name) . '">';
                echo '<button type="submit" class="button-link" style="color: #b32d2e;">Delete</button>';
                echo '</form>';
                echo '</td>';
                echo '</tr>';

                // Edit form row
                echo '<tr class="edit-form-row" id="' . esc_attr($edit_form_id) . '-row">';
                echo '<td colspan="6" style="padding: 20px;">';
                echo '<div class="edit-form">';
                echo '<form method="post">';
                echo '<input type="hidden" name="convowp_install_vars_action" value="update">';
                echo '<input type="hidden" name="name" value="' . esc_attr($name) . '">';
                echo '<table class="form-table" role="presentation">';
                echo '<tr>';
                echo '<th scope="row"><label>Value</label></th>';
                echo '<td><textarea name="value" class="large-text code" placeholder="' . ($meta['is_secret'] ? 'Enter new value (current value is hidden)' : 'Enter new value') . '">' . esc_textarea($meta['is_secret'] ? '' : $meta['value']) . '</textarea></td>';
                echo '</tr>';
                echo '<tr>';
                echo '<th scope="row"><label>Security</label></th>';
                echo '<td><label><input type="checkbox" name="is_secret" ' . ($meta['is_secret'] ? 'checked' : '') . '> Mark as secret</label></td>';
                echo '</tr>';
                echo '</table>';
                echo '<p class="submit">';
                echo '<input type="submit" class="button button-primary" value="Update Variable">';
                echo ' <a href="#" class="button cancel-edit" data-form-id="' . esc_attr($edit_form_id) . '">Cancel</a>';
                echo '</p>';
                echo '</form>';
                echo '</div>';
                echo '</td>';
                echo '</tr>';
            }

            echo '</tbody>';
            echo '</table>';
        }

        echo '</div>';
        echo '</div>';
        echo '</div>';

        // Add JavaScript for toggle functionality
        echo '<script>
        (function() {
            document.addEventListener("DOMContentLoaded", function() {
                var editToggles = document.querySelectorAll(".edit-toggle");
                var cancelButtons = document.querySelectorAll(".cancel-edit");

                editToggles.forEach(function(toggle) {
                    toggle.addEventListener("click", function(e) {
                        e.preventDefault();
                        var formId = this.getAttribute("data-form-id");
                        var formRow = document.getElementById(formId + "-row");
                        if (formRow) {
                            if (formRow.classList.contains("show")) {
                                formRow.classList.remove("show");
                            } else {
                                // Hide all other edit forms first
                                document.querySelectorAll(".edit-form-row.show").forEach(function(row) {
                                    row.classList.remove("show");
                                });
                                formRow.classList.add("show");
                                var textarea = formRow.querySelector("textarea");
                                if (textarea) {
                                    setTimeout(function() { textarea.focus(); }, 100);
                                }
                            }
                        }
                    });
                });

                cancelButtons.forEach(function(button) {
                    button.addEventListener("click", function(e) {
                        e.preventDefault();
                        var formId = this.getAttribute("data-form-id");
                        var formRow = document.getElementById(formId + "-row");
                        if (formRow) {
                            formRow.classList.remove("show");
                        }
                    });
                });
            });
        })();
        </script>';
    }
}
