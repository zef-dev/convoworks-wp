<?php
if ( ! defined('ABSPATH')) {
    exit;
}

?>

<div class="opd-dashboard">
    <?php ConvoPlugin\partial('partials/navigation'); ?>

    <div class="opd-dashboard-settings p-4">
        <div class="text-center">
            <h1>
                <i class="ops-iconFont ops-settings-square-icon"></i>
                <span><?php _e('Settings', 'opdash'); ?></span>
            </h1>
            <p class="opd-teaser"><?php _e('All your Convo WP Settings', 'convo-wp'); ?></p>
        </div>
    </div>
</div>
