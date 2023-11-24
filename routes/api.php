<?php

// Define the namespace for the API controllers
$namespace = 'Convo\Http\Api';

/// OAUTH routes
///
register_rest_route('convo/v1', '/token/(?P<type>[\S]+)/(?P<serviceId>[\S]+)', [
	'methods' => 'POST',
	'callback' => [$namespace . '\OauthController', 'handleOAuthPost'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/oauth/(?P<type>[\S]+)/(?P<serviceId>[\S]+)', [
	'methods' => ['GET'],
	'callback' => [$namespace . '\OauthController', 'handleOAuthGet'],
	'permission_callback' => function ($request) {
		return true;
	},
]);
// END Oauth

// Handle service-media differently
register_rest_route('convo/v1', '/public/service-media/(?P<serviceId>[\S]+)/(?P<mediaId>[\S]+)', [
	'methods' => ['GET'],
	'callback' => [$namespace . '\ServicesController', 'mediaRoute'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

// public routes catch all
register_rest_route('convo/v1', '/public/(?P<serviceId>[\S]+)', [
	'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
	'callback' => [$namespace . '\ServicesController', 'publicRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

// media
register_rest_route('convo/v1', '/media/(?P<serviceId>[\S]+)/(?P<mediaId>[\S]+)/download', [
	'methods' => ['GET'],
// 	'callback' => [$namespace . '\ServicesController', 'all'],
    'callback' => function ( $data) {
        
        $base_path  =   '/convoworks/services/'.$data['serviceId'].'/media/'.$data['mediaId'];
        $json       =   json_decode( file_get_contents( wp_upload_dir()['basedir'].$base_path.'.json'), true);
        $ext        =   $json['ext'];
        
        $response = new WP_REST_Response();
        $response->set_status( 301);
        
        $response->header( 'Location', wp_upload_dir()['baseurl'].$base_path.'.'.$ext);
        return $response;
    },
	'permission_callback' => function ($request) {
		return true;
	},
]);
// end media

// SPECIAL ROUTES HANDLED differently
register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)', [
	'methods' => ['GET'],
	'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)/(?P<platformId>[\S]+)', [
	'methods' => ['GET'],
	'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
	'permission_callback' => function ($request) {
		return true;
	},
]);

register_rest_route('convo/v1', '/service-imp-exp/export-template/(?P<serviceId>[\S]+)', [
    'methods' => ['GET'],
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
