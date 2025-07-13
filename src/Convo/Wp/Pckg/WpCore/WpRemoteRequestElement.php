<?php

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Params\IServiceParamsScope;

class WpRemoteRequestElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    /**
     * @var IConversationElement[]
     */
    private $_onSuccess = array();

    /**
     * @var IConversationElement[]
     */
    private $_onFailure = array();

    /**
     * @var string
     */
    private $_resultName;

    private $_method;
    private $_url;
    private $_queryParams;
    private $_bodyParams;
    private $_headers;
    private $_contentType;
    private $_timeout;

    public function __construct($properties)
    {
        parent::__construct($properties);

        foreach ($properties['on_success'] as $element) {
            $this->_onSuccess[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['on_failure'] as $element) {
            $this->_onFailure[] = $element;
            $this->addChild($element);
        }

        $this->_resultName = $properties['result_name'];

        $this->_method = $properties['method'];
        $this->_url = $properties['url'];
        $this->_queryParams = $properties['query_params'];
        $this->_bodyParams = $properties['body_params'];
        $this->_headers = $properties['headers'];
        $this->_contentType = $properties['content_type'];
        $this->_timeout = $properties['timeout'];
    }

    /**
     * @param IConvoRequest $request
     * @param IConvoResponse $response
     */
    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $params = $this->getService()->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $var_name = $this->evaluateString($this->_resultName);

        $method = $this->evaluateString($this->_method);
        $url = $this->evaluateString($this->_url);
        $query_params = $this->getService()->evaluateArgs($this->_queryParams, $this);
        $body_params = $this->getService()->evaluateArgs($this->_bodyParams, $this);
        $headers = $this->getService()->evaluateArgs($this->_headers, $this);
        $content_type = $this->evaluateString($this->_contentType);
        $timeout = (int) $this->evaluateString($this->_timeout);

        $this->_logger->info("Executing external request [$method] to [$url]");

        // Build args for wp_remote_request
        $args = [
            'method' => strtoupper($method),
            'headers' => array_merge(['Content-Type' => $content_type], $headers),
            'timeout' => $timeout,
        ];

        // Handle body
        if (!empty($body_params) && in_array(strtoupper($method), ['POST', 'PUT', 'PATCH'])) {
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

        $this->_logger->info("Request URL [$url][" . print_r($args, true) . "]");

        $http_response = wp_remote_request($url, $args);

        if (is_wp_error($http_response)) {
            $params->setServiceParam($var_name, $http_response);
            $this->_logger->error('External request failed: ' . $http_response->get_error_message());
            foreach ($this->_onFailure as $element) {
                $element->read($request, $response);
            }
            return;
        }

        // Normalize response to mimic WP_REST_Response for consistency
        $body = wp_remote_retrieve_body($http_response);
        $status = wp_remote_retrieve_response_code($http_response);
        $headers = wp_remote_retrieve_headers($http_response)->getAll();

        $normalized_response = (object) [
            'data' => json_decode($body, true) ?? $body,  // Assume JSON; fallback to raw
            'status' => $status,
            'headers' => $headers,
        ];

        $params->setServiceParam($var_name, $normalized_response);
        $this->_logger->info("External request succeeded with status [$status]");

        foreach ($this->_onSuccess as $element) {
            $element->read($request, $response);
        }
    }
}
