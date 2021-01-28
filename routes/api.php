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

// SPECIAL ROUTES HANDLED differently
register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/service-imp-exp/import/(?P<serviceId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)/(?P<platformId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
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