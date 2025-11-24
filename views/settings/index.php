<?php
if (! defined('ABSPATH')) {
    exit;
}

$group = isset($group) ? $group : "amazon";
?>

<div class="opd-dashboard" style="<?php echo CONVOWP_LOCAL ? 'border-top: 3px solid orange;' : '' ?>">
    <?php \Convo\Wp\partial('partials/navigation'); ?>

    <div class="opd-dashboard-settings p-4">
        <div class="text-center">
            <h1>
                <i class="ops-iconFont ops-settings-square-icon"></i>
                <span><?php _e('Settings', 'convoworks-wp'); ?></span>
            </h1>
            <p class="opd-teaser">&nbsp;</p>
            <!--            <p class="opd-teaser"><?php _e('All your Convoworks WP Settings', 'convoworks-wp'); ?></p>
            -->
        </div>

        <?php  //\ConvoPlugin\view('settings/general');
        ?>

        <?php \Convo\Wp\partial('settings/partials/nav', ['group' => $group]) ?>

        <?php \Convo\Wp\partial('settings/groups/' . $group) ?>
    </div>
</div>
