<?php
if ( ! defined('ABSPATH')) {
    exit;
}

    $group = isset( $group ) ? $group : "amazon";
?>

<div class="opd-dashboard" style="<?php echo CONVOWP_LOCAL ? 'border-top: 3px solid orange;' : '' ?>">
    <?php Convo\partial('partials/navigation'); ?>

    <div class="opd-dashboard-settings p-4">
        <div class="text-center">
            <h1>
                <i class="ops-iconFont ops-settings-square-icon"></i>
                <span><?php _e('Settings', 'opdash'); ?></span>
            </h1>
             <p class="opd-teaser">&nbsp;</p> 
<!--            <p class="opd-teaser"><?php _e('All your Convoworks WP Settings', 'convo-wp'); ?></p>
            -->
        </div>

        <?php  //\ConvoPlugin\view('settings/general'); ?>

	    <?php Convo\partial('settings/partials/nav', ['group' => $group]) ?>

	    <?php Convo\partial('settings/groups/' . $group) ?>
    </div>
</div>
