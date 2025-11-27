<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * @var array $secrets Array of installation variables with metadata
 * @var string $notice_message Optional notice message to display
 * @var string $notice_type Optional notice type (success, error, warning, info)
 */
?>

<div class="wrap convowp-vars-page">
    <h1 class="wp-heading-inline"><?php esc_html_e('Installation Variables', 'convoworks-wp'); ?></h1>
    <hr class="wp-header-end">

    <?php
    // Display admin notices
    if (!empty($notice_message)) {
        $notice_class = 'notice-' . ($notice_type ?? 'success');
        echo '<div class="notice ' . esc_attr($notice_class) . ' is-dismissible"><p>' . wp_kses_post($notice_message) . '</p></div>';
    }
settings_errors('convowp_install_vars');
?>

    <!-- Add New Variable Form -->
    <div class="postbox add-variable-form">
        <h2 class="hndle">
            <span><?php esc_html_e('Add New Variable', 'convoworks-wp'); ?></span>
        </h2>
        <form method="post" class="convowp-add-form">
            <?php wp_nonce_field('convowp_install_vars', 'convowp_install_vars_nonce'); ?>
            <input type="hidden" name="convowp_install_vars_action" value="add">
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="name"><?php esc_html_e('Variable Name', 'convoworks-wp'); ?></label>
                    </th>
                    <td>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            class="regular-text"
                            placeholder="<?php esc_attr_e('e.g., OPENAI_API_KEY', 'convoworks-wp'); ?>"
                            pattern="[A-Z0-9_]+"
                            title="<?php esc_attr_e('Only uppercase letters, numbers, and underscores allowed', 'convoworks-wp'); ?>"
                            required
                        >
                        <p class="description">
                            <?php esc_html_e('Variable name must contain only uppercase letters, numbers, and underscores.', 'convoworks-wp'); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="value"><?php esc_html_e('Value', 'convoworks-wp'); ?></label>
                    </th>
                    <td>
                        <textarea
                            name="value"
                            id="value"
                            class="large-text code"
                            rows="4"
                            placeholder="<?php esc_attr_e('Enter the variable value', 'convoworks-wp'); ?>"
                        ></textarea>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="is_secret"><?php esc_html_e('Security', 'convoworks-wp'); ?></label>
                    </th>
                    <td>
                        <label>
                            <input type="checkbox" name="is_secret" id="is_secret" checked>
                            <?php esc_html_e('Mark as secret (value will be encrypted and masked)', 'convoworks-wp'); ?>
                        </label>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" class="button button-primary button-large" value="<?php esc_attr_e('Add Variable', 'convoworks-wp'); ?>">
            </p>
        </form>
    </div>

    <!-- Current Variables List -->
    <div class="postbox variables-list">
        <h2 class="hndle">
            <span><?php esc_html_e('Current Variables', 'convoworks-wp'); ?></span>
        </h2>
        <div>
            <?php if (empty($secrets)): ?>
                <div class="empty-state">
                    <div class="empty-state-icon">🔐</div>
                    <p><strong><?php esc_html_e('No installation variables found.', 'convoworks-wp'); ?></strong></p>
                    <p><?php esc_html_e('Add your first variable using the form above.', 'convoworks-wp'); ?></p>
                </div>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped table-view-list">
                    <thead>
                        <tr>
                            <th scope="col" class="col-name"><?php esc_html_e('Name', 'convoworks-wp'); ?></th>
                            <th scope="col" class="col-value"><?php esc_html_e('Value', 'convoworks-wp'); ?></th>
                            <th scope="col" class="col-type"><?php esc_html_e('Type', 'convoworks-wp'); ?></th>
                            <th scope="col" class="col-updated"><?php esc_html_e('Updated', 'convoworks-wp'); ?></th>
                            <th scope="col" class="col-updated-by"><?php esc_html_e('Updated By', 'convoworks-wp'); ?></th>
                            <th scope="col" class="col-actions"><?php esc_html_e('Actions', 'convoworks-wp'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($secrets as $name => $meta): ?>
                            <?php
                        $masked_value = $meta['is_secret'] ? str_repeat('●', 12) : esc_html($meta['value']);
                            $value_class = $meta['is_secret'] ? 'masked' : '';
                            $badge = $meta['is_secret']
                                ? '<span class="secret-badge">' . esc_html__('Secret', 'convoworks-wp') . '</span>'
                                : '<span class="public-badge">' . esc_html__('Public', 'convoworks-wp') . '</span>';

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
                                $updated_by = $user ? esc_html($user->display_name) : sprintf(esc_html__('User #%s', 'convoworks-wp'), esc_html($meta['updated_by']));
                            }

                            $edit_form_id = 'edit-form-' . md5($name);
                            ?>
                            <tr class="variable-row">
                                <td><strong><?php echo esc_html($name); ?></strong></td>
                                <td>
                                    <span class="value-display <?php echo esc_attr($value_class); ?>">
                                        <?php echo $masked_value; ?>
                                    </span>
                                </td>
                                <td><?php echo $badge; ?></td>
                                <td>
                                    <span class="meta-info"><?php echo esc_html($updated_at); ?></span>
                                </td>
                                <td>
                                    <span class="meta-info"><?php echo esc_html($updated_by); ?></span>
                                </td>
                                <td class="actions-cell">
                                    <a href="#" class="button-link edit-toggle" data-form-id="<?php echo esc_attr($edit_form_id); ?>">
                                        <?php esc_html_e('Edit', 'convoworks-wp'); ?>
                                    </a> |
                                    <form method="post" style="display:inline;" onsubmit="return confirm('<?php echo esc_js(sprintf(__('Are you sure you want to delete the variable \'%s\'? This action cannot be undone.', 'convoworks-wp'), $name)); ?>');">
                                        <?php wp_nonce_field('convowp_install_vars', 'convowp_install_vars_nonce'); ?>
                                        <input type="hidden" name="convowp_install_vars_action" value="delete">
                                        <input type="hidden" name="name" value="<?php echo esc_attr($name); ?>">
                                        <button type="submit" class="button-link delete-link">
                                            <?php esc_html_e('Delete', 'convoworks-wp'); ?>
                                        </button>
                                    </form>
                                </td>
                            </tr>

                            <!-- Edit Form Row -->
                            <tr class="edit-form-row" id="<?php echo esc_attr($edit_form_id); ?>-row">
                                <td colspan="6">
                                    <div class="edit-form">
                                        <form method="post">
                                            <?php wp_nonce_field('convowp_install_vars', 'convowp_install_vars_nonce'); ?>
                                            <input type="hidden" name="convowp_install_vars_action" value="update">
                                            <input type="hidden" name="name" value="<?php echo esc_attr($name); ?>">
                                            <table class="form-table" role="presentation">
                                                <tr>
                                                    <th scope="row">
                                                        <label><?php esc_html_e('Value', 'convoworks-wp'); ?></label>
                                                    </th>
                                                    <td>
                                                        <textarea
                                                            name="value"
                                                            class="large-text code"
                                                            rows="4"
                                                            placeholder="<?php echo esc_attr($meta['is_secret'] ? __('Enter new value (current value is hidden)', 'convoworks-wp') : __('Enter new value', 'convoworks-wp')); ?>"
                                                        ><?php echo esc_textarea($meta['is_secret'] ? '' : $meta['value']); ?></textarea>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">
                                                        <label><?php esc_html_e('Security', 'convoworks-wp'); ?></label>
                                                    </th>
                                                    <td>
                                                        <label>
                                                            <input type="checkbox" name="is_secret" <?php checked($meta['is_secret']); ?>>
                                                            <?php esc_html_e('Mark as secret', 'convoworks-wp'); ?>
                                                        </label>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p class="submit">
                                                <input type="submit" class="button button-primary" value="<?php esc_attr_e('Update Variable', 'convoworks-wp'); ?>">
                                                <a href="#" class="button cancel-edit" data-form-id="<?php echo esc_attr($edit_form_id); ?>">
                                                    <?php esc_html_e('Cancel', 'convoworks-wp'); ?>
                                                </a>
                                            </p>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>

    <p class="description">
        <?php esc_html_e('Recommended: use in service variables view. Works everywhere in a service (expression language) with:', 'convoworks-wp'); ?> <code>${_env('VARIABLE_NAME')}</code>
    </p>
</div>

