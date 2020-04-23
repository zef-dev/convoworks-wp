<?php

$someController = new \ConvoPlugin\Http\DashboardController;

// List of templates in category/collection
add_action('wp_ajax_opp_action_example', function() use ($someController) { $someController->dashboard(); });
