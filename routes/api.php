<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';


// services routes
register_rest_route('convo/v1', '/services', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'index']
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'single']
]);