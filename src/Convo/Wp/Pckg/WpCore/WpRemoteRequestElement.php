<?php

namespace Convo\Wp\Pckg\WpCore;

class WpRemoteRequestElement extends AbstractWpRequestElement
{
    private $_url;
    private $_headers;
    private $_contentType;
    private $_timeout;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_url = $properties['url'];
        $this->_headers = $properties['headers'];
        $this->_contentType = $properties['content_type'];
        $this->_timeout = $properties['timeout'];
    }

    protected function _doRequest($method, $query_params, $body_params)
    {
        $url = $this->evaluateString($this->_url);
        $headers = $this->getService()->evaluateArgs($this->_headers, $this);
        $content_type = $this->evaluateString($this->_contentType);
        $timeout = (int) $this->evaluateString($this->_timeout);

        $this->_logger->info("Executing external request [$method] to [$url]");

        // Build args for wp_remote_request
        $args = [
            'method' => $method,
            'headers' => array_merge(['Content-Type' => $content_type], $headers),
            'timeout' => $timeout,
        ];

        // Handle body
        if (!empty($body_params) && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            if ($content_type === 'application/json') {
                $args['body'] = json_encode($body_params);
            } else if ($content_type === 'application/x-www-form-urlencoded') {
                $args['body'] = http_build_query($body_params);
            }
        }

        // Append query params to URL
        if (!empty($query_params)) {
            $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($query_params);
        }

        $this->_logger->info("Request URL [$url][" . json_encode($args) . "]");

        $http_response = wp_remote_request($url, $args);

        if (is_wp_error($http_response)) {
            return $http_response;
        }

        $body = wp_remote_retrieve_body($http_response);
        $status = wp_remote_retrieve_response_code($http_response);
        $headers = wp_remote_retrieve_headers($http_response)->getAll();

        $wp_response = new \WP_REST_Response();
        $wp_response->set_data(json_decode($body, true) ?? $body);
        $wp_response->set_status($status);
        foreach ($headers as $key => $value) {
            $wp_response->header($key, is_array($value) ? implode(',', $value) : $value);
        }

        return $wp_response;
    }
}
