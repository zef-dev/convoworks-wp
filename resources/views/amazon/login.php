<?php
    if ( ! defined('ABSPATH')) {
        exit;
    }
    global $wp_query;

    // if we have a 404 status
    if ($wp_query->is_404) {
        // set status of 404 to false
        $wp_query->is_404 = false;
        $wp_query->is_archive = true;
    }
    // change the header to 200 OK
    header("HTTP/1.1 200 OK");

    $user = wp_get_current_user();

    $user = new \ConvoPlugin\Convo\Wp\AdminUser($user);

    if (! empty($user)) {
	    include(CONVOWP_PATH . '/resources/views/amazon/partials/loggedIn.php');
	    exit;
    } else {
	    include(CONVOWP_PATH . '/resources/views/amazon/partials/loginForm.php');
	    exit;
    }
