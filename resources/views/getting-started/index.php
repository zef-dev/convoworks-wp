<?php
if ( ! defined('ABSPATH')) {
	exit;
}

$is_connected_to_amazon = $is_connected_to_amazon ?? false;
?>

<div class="opd-dashboard" style="margin-left: -20px;">
	<?php Convo\partial('partials/navigation'); ?>

    <div class="opd-dashboard-settings p-4">
        <div class="text-center">
            <h1>Welcome to Convoworks WP</h1>
            <p>Thank you for choosing Convoworks WP - the latest drag & drop WordPress conversational service builder in the market.</p>
        </div>

        <div class="row row-cols-1 row-cols-md-1">
            <div class="col d-flex justify-content-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Amazon Alexa</h5>
                        <p class="card-text"><?php echo $is_connected_to_amazon ? "You can always edit your connection to Amazon if you want to use another Amazon Developer Account." : "In order to be able to propagate your services to Amazon Alexa, you'll have to connect to Amazon Alexa with an Amazon Developer Account."?></p>
                        <a href="<?php echo admin_url('admin.php?page=convo-settings&convo-settings-group=amazon') ?>" class="btn <?php echo $is_connected_to_amazon ? "btn-success" : "btn-primary" ?>"><?php echo $is_connected_to_amazon ? "Edit Your Amazon Connection" : "Connect to Amazon Now" ?></a>
                        <a href="https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/" target="_blank" class="btn btn-outline-secondary">Read the full guide</a>
                    </div>
                </div>
            </div>
            <div class="col d-flex justify-content-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Create Your First Service</h5>
                        <p class="card-text">Convoworks makes it easy to create conversational services in WordPress. You can read our guide on how create your first form or start creating your first service on your own.</p>
                        <a href="<?php echo admin_url('admin.php?page=convo-plugin#!/add-new-service') ?>" class="btn btn-primary">Create your first service</a>
                        <a href="https://convoworks.com/docs/publishers/tutorial-getting-started/" target="_blank" class="btn btn-outline-secondary">Read the full guide</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
