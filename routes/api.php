<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';

// public routes catch all
register_rest_route('convo/v1', '/public/(?P<serviceId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'publicRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

// admin routes catch all
register_rest_route('convo/v1', '/(?P<serviceId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);