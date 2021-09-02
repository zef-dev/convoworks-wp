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

$disabled = ! empty($amazonOauthToken) ? 'disabled' : '';

?>

<div class="ops-white-box ops-box-size-max">
	<h3><?php _e('Amazon Integration', 'convowp'); ?></h3>
	<form action="<?php echo admin_url('admin-ajax.php') ?>?action=convo_dashboard_update_settings" class="ops-form" data-opd-remote="post">
		<?php wp_nonce_field('convo_update_settings'); ?>
		<input type="hidden" name="convo_settings_section" value="amazon">
		<input type="hidden" name="action" value="convo_update_settings">

        <label>Get your Vendor ID <a target="_blank" href="https://developer.amazon.com/settings/console/mycid">here</a>.</label>
        <div class="ops-form-group input-group mb-3">
            <div class="input-group-prepend">
                <span style="width: 230px" class="input-group-text">Amazon Vendor ID</span>
            </div>
            <input type="text" placeholder="Enter your Amazon Vendor Id" name="convo_amazon_vendor_id" id="convo_amazon_vendor_id" value="<?php echo $amazonVendorId ?>" class="form-control" <?php echo $disabled ?>>
        </div>

        <label>Create security profile <a target="_blank" href="https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html">here</a> and enter client data bellow.
            Learn more about Amazon configurations <a target="_blank" href="https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/">here</a>
        </label>
        <div class="ops-form-group input-group mb-3">
            <div class="input-group-prepend">
                <span style="width: 230px" class="input-group-text">Amazon Client ID</span>
            </div>
            <input type="text" placeholder="Enter your Amazon Client ID" name="convo_amazon_client_id" id="convo_amazon_client_id" value="<?php echo $amazonClientId ?>" class="form-control" <?php echo $disabled ?>>
        </div>

        <div class="ops-form-group input-group mb-3">
            <div class="input-group-prepend">
                <span style="width: 230px" class="input-group-text">Amazon Client Secret</span>
            </div>
            <input type="text" aria-label="Amazon Client Secret" placeholder="Enter your Amazon Client Secret" name="convo_amazon_client_secret" id="convo_amazon_client_secret" value="<?php echo $amazonClientSecret ?>" class="form-control" <?php echo $disabled ?>>
        </div>

        <label>To be able to connect Convoworks with Amazon, add this URL to your selected Security Profile in Security Profile Management under Allowed Return URLs.</label>
        <div class="ops-form-group input-group mb-3">
            <div class="input-group-prepend btn-blue">
                <span style="width: 230px" class="input-group-text">Amazon Oauth Callback URL</span>
            </div>
            <input type="text" placeholder="<?php echo CONVO_BASE_URL . '/wp-json/convo/v1/public/admin-auth/amazon'; ?>" value="<?php echo CONVO_BASE_URL . '/wp-json/convo/v1/public/admin-auth/amazon'; ?>" class="form-control" aria-label="Amazon Oauth Callback URL" aria-describedby="button-addon2" disabled>
            <div onload="initToolTip()" class="input-group-append">
                <button class="btn btn-outline-secondary" type="button" onclick="copyUrlToClipboard('<?php echo CONVO_BASE_URL . "/wp-json/convo/v1/public/admin-auth/amazon"; ?>')" id="button-addon2" data-toggle="tooltip" data-placement="top" title="Tooltip on top">Copy URL</button>
            </div>
        </div>

		<div class="ops-form-actions">
			<?php if (empty($amazonOauthToken)) : ?>
                <button class="ops-button pull-right" type="submit">Save</button>
            <?php endif; ?>

			<?php if (empty($amazonOauthToken) && ( !empty($amazonClientId) &&  !empty($amazonClientSecret) && !empty($amazonVendorId))) : ?>
                <a class="ops-button" href="<?php echo Convo\amazon_connect_url() ?>" type="submit">Connect</a>
			<?php endif; ?>
            <?php if (! empty($amazonOauthToken)) : ?>
                <a class="ops-button" href="<?php echo Convo\amazon_disconnect_url() ?>" type="submit">Disconnect</a>
			<?php endif; ?>
            <br>
		</div>
	</form>

    <script>

        function copyUrlToClipboard(text) {
            console.log('Copying text ', text);
            var textArea = document.createElement("textarea");
            textArea.value = text
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
            } catch (err) {
                console.log('Oops, unable to copy', text);
            }

            document.body.removeChild(textArea);
        }
    </script>

</div>
