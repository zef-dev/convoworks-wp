<?php
if (! defined( 'ABSPATH' )) {
	exit;
}
?>

<div class="ops-white-box ops-box-size-max">
	<h3><?php _e('General settings', 'convowp'); ?></h3>

	<form action="<?php echo admin_url('admin-ajax.php') ?>?action=convo_dashboard_update_settings" class="ops-form" data-opd-remote="post">
		<?php wp_nonce_field('convo_update_settings'); ?>
		<input type="hidden" name="convo_settings_section" value="advanced">
		<input type="hidden" name="action" value="convo_update_settings">

		<div class="ops-form-group">
			<label for="">Request Timeout</label>
			<input type="number" placeholder="Request timeout in milliseconds" name="convo_request_timeout" value="<?php echo get_option('convowp_request_timeout') ?>" class="ops-form-control">
		</div>

		<div class="ops-form-actions">
			<button class="ops-button" type="submit">Save</button>
		</div>
	</form>

</div>