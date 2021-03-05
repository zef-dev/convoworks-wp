<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';

/// OAUTH routes
///
register_rest_route('convo/v1', '/token/(?P<type>[\S]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\OauthController', 'handleOAuthPost'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/oauth/(?P<type>[\S]+)', [
	'methods' => ['GET'],
	'callback' => [$namespace . '\OauthController', 'handleOAuthGet'],
	'permission_callback' => function ($request) {
		return true;
	},
]);
// END Oauth

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