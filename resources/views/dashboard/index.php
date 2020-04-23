<?php
if ( ! defined('ABSPATH')) {
    exit;
}

?>

<div class="opd-dashboard">
    <?php \ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-connected p-4">

        <div class="text-center">
            <h1>
                <i class="ops-iconFont ops-dashboard-icon"></i>
                <span><?php _e('Services', 'convo-wp'); ?></span>
            </h1>

            <p class="opd-teaser"><?php _e('List of all available services', 'convo-wp'); ?></p>
        </div>

        <div class="opd-dashboard-connected-products ops-box-size-max">
                <div class="opd-product-list">
	                <?php
	                /** @var $services */
	                if (count($services)) : ?>
		                <?php foreach ($services as $service) : ?>
                            <div class="opd-product-list-item opd-product-list-item-<?php echo $service->service_id ?>">
                                <div class="ops-white-box">
					                <?php \ConvoPlugin\view('dashboard/partials/service_item', ['service' => $service]) ?>
                                </div>
                            </div>
		                <?php endforeach; ?>
	                <?php endif; ?>
                </div>
        </div>

    </div>
</div>

<?php //\ConvoPlugin\partial('partials/notifications') ?>
