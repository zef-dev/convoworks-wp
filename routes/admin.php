<?php

use ConvoPlugin\Services\Route;

// Set namespace
Route::setNamespace('ConvoPlugin\Http');

/**
 * Example routes
 */
Route::adminPage(__('Convoworks WP', 'convo-wp'),       'convo-plugin',               'LegacyController@index', ['position' => 40, 'icon' => 'dashicons-admin-page']);
//Route::adminSubPage(__('Services',  'convo-wp' ), 'convo-plugin', 'convo-plugin', 'DashboardController@index', ['position' => 10]);
//Route::adminSubPage(__('Services',  'convo-wp' ), 'convo-plugin', 'convo-legacy', 'LegacyController@index', ['position' => 10]);
Route::adminSubPage(__('Settings',  'convo-wp' ), 'convo-plugin', 'convo-settings', 'SettingsController@index', ['position' => 20]);
Route::adminSubPage(__('Service Single',  'convo-wp' ), '', 'convo-service-single', 'ServicesController@single', ['position' => 20]);
