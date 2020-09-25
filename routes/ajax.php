<?php

$settingsController = new \ConvoPlugin\Http\SettingsController;

// Settings
add_action('wp_ajax_opd_update_settings', function() use ($settingsController) { $settingsController->update(); });

add_action('wp_ajax_op3toggleFullScreen', function() use ($settingsController) { $settingsController->toggleFullScreen(); });


