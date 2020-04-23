<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';

register_rest_route('convo/v1',
	'/services',
	['methods' => 'GET',    'callback' => [$namespace . '\ServicesController', 'index'],
	 'permission_callback' => function () {
		 return current_user_can('manage_options');
	 }]);