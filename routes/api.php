<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';

register_rest_route('convo/v1', '/services', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-platform-propagate/(?P<serviceId>[\w-]+)/(?P<serviceType>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-platform-config/(?P<serviceId>[\w-]+)/(?P<serviceType>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-platform-config/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)/meta', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)/preview', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-test/(?P<serviceId>[\w-]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/user-packages', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-releases/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-versions/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-packages/(?P<serviceId>[\w-]+)', [
	'methods' => ['GET', 'POST', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)', [
	'methods' => ['PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/services', [
	'methods' => 'POST',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/templates', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/config-options', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-platform-config/(?P<serviceId>[\w-]+)/(?P<platform>[\w-]+)', [
	'methods' => ['PUT', 'POST'],
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1', '/service-platform-propagate/(?P<serviceId>[\w-]+)/(?P<platform>[\w-]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\ServicesController', 'all'],
	'permission_callback' => function ($request) {
		return current_user_can('publish_posts');
	},
]);

register_rest_route('convo/v1/public', '/service-run/(?P<platform>[\w-]+)/a/(?P<serviceId>[\w-]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\ServicesController', 'publicRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);