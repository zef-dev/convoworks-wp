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
    </div>
</div>

<?php //\ConvoPlugin\partial('partials/notifications') ?>
