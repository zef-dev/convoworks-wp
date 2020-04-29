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
				<span><?php _e('Edit Service', 'convo-wp'); ?></span>
			</h1>

			<p class="opd-teaser"><?php _e('Here, the editing of service will take part one day', 'convo-wp'); ?></p>
		</div>

        <div class="opd-dashboard-connected-products ops-box-size-max">
            <p>Just to see we got service data:</p>
            <pre>
            <?php
            print_r($service);
            ?>
        </pre>
        </div>

	</div>
</div>