<?php

$settingsController = new \Convo\Http\SettingsController;

// Settings
add_action('wp_ajax_convo_update_settings', function() use ($settingsController) { $settingsController->update(); });

add_action('wp_ajax_op3toggleFullScreen', function() use ($settingsController) { $settingsController->toggleFullScreen(); });


