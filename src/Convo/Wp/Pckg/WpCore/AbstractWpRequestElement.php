<?php

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Params\IServiceParamsScope;

abstract class AbstractWpRequestElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    /**
     * @var IConversationElement[]
     */
    protected $_onSuccess = [];

    /**
     * @var IConversationElement[]
     */
    protected $_onFailure = [];

    /**
     * @var string
     */
    protected $_resultName;

    protected $_method;
    protected $_queryParams;
    protected $_bodyParams;

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
        $this->_queryParams = $properties['query_params'];
        $this->_bodyParams = $properties['body_params'];
    }

    /**
     * @param IConvoRequest $request
     * @param IConvoResponse $response
     */
    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $params = $this->getService()->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $var_name = $this->evaluateString($this->_resultName);

        $method = strtoupper($this->evaluateString($this->_method));
        $query_params = $this->getService()->evaluateArgs($this->_queryParams, $this);
        $body_params = $this->getService()->evaluateArgs($this->_bodyParams, $this);

        $this->_logger->info("Executing request [$method]");

        $response_or_error = $this->_doRequest($method, $query_params, $body_params);

        if (is_wp_error($response_or_error)) {
            $params->setServiceParam($var_name, $response_or_error);
            $this->_logger->error('Request failed: ' . $response_or_error->get_error_message());
            foreach ($this->_onFailure as $element) {
                $element->read($request, $response);
            }
            return;
        }

        // Assume $response_or_error is a WP_REST_Response
        $status = $response_or_error->get_status();

        if ($status >= 200 && $status < 300) {
            $params->setServiceParam($var_name, $response_or_error);
            $this->_logger->info("Request succeeded with status [$status]");
            foreach ($this->_onSuccess as $element) {
                $element->read($request, $response);
            }
        } else {
            $error = new \WP_Error('request_error', "Non-successful status code: $status", $response_or_error);
            $params->setServiceParam($var_name, $error);
            $this->_logger->error("Request returned non-successful status [$status]");
            foreach ($this->_onFailure as $element) {
                $element->read($request, $response);
            }
        }
    }

    /**
     * Performs the actual request and returns either a WP_REST_Response or WP_Error.
     *
     * @param string $method
     * @param array $query_params
     * @param array $body_params
     * @return \WP_REST_Response|\WP_Error
     */
    abstract protected function _doRequest($method, $query_params, $body_params);
}
