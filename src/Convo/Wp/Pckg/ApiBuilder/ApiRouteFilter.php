<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\DefaultFilterResult;
use Convo\Core\Rest\RequestInfo;

/**
 * @author Tole
 */
class ApiRouteFilter extends AbstractWorkflowContainerComponent implements IRequestFilter
{
    private $_method;
    private $_path;

    public function __construct($config)
    {
        parent::__construct($config);

        $this->_method = $config['method'];
        $this->_path = $config['path'];
    }

    public function accepts(IConvoRequest $request)
    {
        if (!($request instanceof ApiCommandRequest)) {
            return false;
        }
        return true;
    }

    public function filter(IConvoRequest $request)
    {
        $result = new DefaultFilterResult();
        if (!($request instanceof ApiCommandRequest)) {
            return $result;
        }

        /* @var ApiCommandRequest $request */

        $info = $request->getRequestInfo();
        $method = strtolower($this->evaluateString($this->_method));
        $path = $this->evaluateString($this->_path);

        if ($this->_isMethodMatch($method, $info) && $path === '*') {
            $this->_logger->debug('Route is wildcard');
            $result->setSlotValue('_uri', $request->getPsrRequest()->getUri()->__toString());
            $result->setSlotValue('_parsedBody', $request->getPsrRequest()->getParsedBody());
            return $result;
        }

        if ($path && stripos($path, '/') !== 0) {
            $path = '/' . $path;
        }

        if (stripos($path, 'service-run/convo-api-builder') === false) {
            $path = 'service-run/convo-api-builder/{variant}/{serviceId}' . $path;
        }

        $this->_logger->debug('Checking request path [' . $path . '] for [' . $info . ']');

        if ($this->_isMethodMatch($method, $info) && $route = $info->route($path)) {
            $this->_logger->debug('Route is match');

            $result->setSlotValue('_uri', $request->getPsrRequest()->getUri()->__toString());
            $result->setSlotValue('_parsedBody', $request->getPsrRequest()->getParsedBody());

            foreach ($route->getData() as $key => $val) {
                $result->setSlotValue($key, $val);
            }
        }

        return $result;
    }

    /**
     * @param string $method
     * @param RequestInfo $info
     * @return boolean
     */
    private function _isMethodMatch($method, $info)
    {
        if ($method === '*') {
            return true;
        }
        return $info->method($method);
    }


    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_method . '][' . $this->_path . ']';
    }
}
