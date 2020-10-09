<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$user = wp_get_current_user();
$userSettings = get_user_meta($user->ID, 'convo_settings', true);

$amazonClientId     = isset($userSettings['amazon']['client_id']) ? $userSettings['amazon']['client_id']: '';
$amazonClientSecret = isset($userSettings['amazon']['client_secret']) ? $userSettings['amazon']['client_secret']: '';
$amazonOauthToken   = isset($userSettings['amazon']['client_auth']) ? $userSettings['amazon']['client_auth']: '';
$amazonVendorId     = isset($userSettings['amazon']['vendor_id']) ? $userSettings['amazon']['vendor_id'] : '';

?>

<div class="ops-white-box ops-box-size-max">
	<h3><?php _e('Amazon Integration', 'convowp'); ?></h3>

	<form action="<?php echo admin_url('admin-ajax.php') ?>?action=convo_dashboard_update_settings" class="ops-form" data-opd-remote="post">
		<?php wp_nonce_field('convo_update_settings'); ?>
		<input type="hidden" name="convo_settings_section" value="amazon">
		<input type="hidden" name="action" value="convo_update_settings">

        <?php if (empty($amazonClientId)) : ?>
            <div class="ops-form-group">
                <label for="opd_facebook_app_id">Amazon Client ID</label>
                <input type="text" placeholder="Enter your Amazon Client ID" name="convo_amazon_client_id" id="convo_amazon_client_id" value="<?php echo $amazonClientId ?>" class="ops-form-control">
            </div>
        <?php endif; ?>

		<?php if (empty($amazonClientSecret)) : ?>
            <div class="ops-form-group">
                <label for="opd_facebook_app_secret">Amazon Client Secret</label>
                <input type="text" placeholder="Enter your Amazon Client Secret" name="convo_amazon_client_secret" id="convo_amazon_client_secret" value="<?php echo $amazonClientSecret ?>" class="ops-form-control">
            </div>
        <?php endif; ?>

		<?php if (empty($amazonVendorId)) : ?>
            <div class="ops-form-group">
                <label for="opd_facebook_app_secret">Amazon Vendor Id</label>
                <input type="text" placeholder="Enter your Amazon Vendor Id" name="convo_amazon_vendor_id" id="convo_amazon_vendor_id" value="<?php echo $amazonVendorId ?>" class="ops-form-control">
            </div>
		<?php endif; ?>

		<div class="ops-form-actions">
			<?php if (empty($amazonClientId) ||  empty($amazonClientSecret)) : ?>
			    <button class="ops-button" type="submit">Save</button>
            <?php endif; ?>

			<?php if (empty($amazonOauthToken) && ( !empty($amazonClientId) ||  !empty($amazonClientSecret))) : ?>
                <a class="ops-button" href="<?php echo ConvoPlugin\amazon_connect_url() ?>" type="submit">Connect</a>
			<?php endif; ?>
            <?php if (! empty($amazonOauthToken)) : ?>
                <a class="ops-button" href="<?php echo ConvoPlugin\amazon_disconnect_url() ?>" type="submit">Disconnect</a>
			<?php endif; ?>
		</div>
	</form>

</div>
