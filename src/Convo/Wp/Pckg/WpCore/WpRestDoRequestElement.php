<?php

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpRestDoRequestElement extends AbstractWorkflowContainerComponent implements IConversationElement
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
    private $_route;
    private $_queryParams;
    private $_bodyParams;

    public function __construct($properties)
    {
        parent::__construct($properties);

        foreach ($properties['on_success'] as $element) {
            $this->_onSuccess[]        =   $element;
            $this->addChild($element);
        }

        foreach ($properties['on_failure'] as $element) {
            $this->_onFailure[]        =   $element;
            $this->addChild($element);
        }

        $this->_resultName  =   $properties['result_name'];

        $this->_method      =   $properties['method'];
        $this->_route       =   $properties['route'];
        $this->_queryParams =   $properties['query_params'];
        $this->_bodyParams  =   $properties['body_params'];
    }

    /**
     * @param IConvoRequest $request
     * @param IConvoResponse $response
     */
    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $params = $this->getService()->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $var_name = $this->evaluateString($this->_resultName);

        $query_params = $this->getService()->evaluateArgs($this->_queryParams, $this);
        $body_params = $this->getService()->evaluateArgs($this->_bodyParams, $this);

        $method = $this->evaluateString($this->_method);
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

        if (is_wp_error($wp_response)) {
            $params->setServiceParam($var_name, $wp_response);
            $this->_logger->info('Could not process request due to errors [' . print_r($wp_response->errors, true) . ']');
            foreach ($this->_onFailure as $element) {
                $element->read($request, $response);
            }
            return;
        }

        $params->setServiceParam($var_name, $wp_response);
        // $this->_logger->info('Processed request successfully with response [' . print_r($wp_response, true) . ']');

        foreach ($this->_onSuccess as $element) {
            $element->read($request, $response);
        }
    }
}
