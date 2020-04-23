<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';


// services route
register_rest_route('convo/v1', '/services', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'index']
]);