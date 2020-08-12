<?php

// Define the namespace for the API controllers
$namespace = 'ConvoPlugin\Http\Api';

register_rest_route('convo/v1', '/services', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/service-platform-propagate/(?P<serviceId>[\w-]+)/(?P<serviceType>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/service-platform-config/(?P<serviceId>[\w-]+)/(?P<serviceType>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)/meta', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/services/(?P<serviceId>[\w-]+)/preview', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/service-test/(?P<serviceId>[\w-]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/user-packages', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/service-releases/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);

register_rest_route('convo/v1', '/service-versions/(?P<serviceId>[\w-]+)', [
	'methods' => 'GET',
	'callback' => [$namespace . '\ServicesController', 'all']
]);