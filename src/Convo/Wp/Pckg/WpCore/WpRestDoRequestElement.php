<?php

namespace Convo\Wp\Pckg\WpCore;

class WpRestDoRequestElement extends AbstractWpRequestElement
{
    private $_route;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_route = $properties['route'];
    }

    protected function _doRequest($method, $query_params, $body_params)
    {
        $route = $this->evaluateString($this->_route);

        $parsed_url = parse_url($route);

        $this->_logger->info('Parsed URL: ' . print_r($parsed_url, true));

        // Clean the route to ensure it starts with a slash and does not include query parameters
        if (isset($parsed_url['path']) && $parsed_url['path'][0] !== '/') {
            $parsed_url['path'] = '/' . $parsed_url['path'];
        }

        $clean_route = $parsed_url['path'] ?? $route;

        // Extract query string from route and merge with provided query_params
        if (isset($parsed_url['query'])) {
            $parsed_query = [];
            parse_str($parsed_url['query'], $parsed_query);
            $query_params = array_merge($parsed_query, $query_params);
        }

        $this->_logger->info('Processing request with method: ' . $method . ', route: ' . $clean_route . ', query_params: ' . print_r($query_params, true) . ', body_params: ' . print_r($body_params, true));

        $wp_request = new \WP_REST_Request($method, $clean_route);
        $wp_request->set_method($method);
        $wp_request->set_route($clean_route);
        $wp_request->set_query_params($query_params);
        $wp_request->set_body_params($body_params);

        $wp_response = rest_do_request($wp_request);

        return $wp_response;
    }
}
