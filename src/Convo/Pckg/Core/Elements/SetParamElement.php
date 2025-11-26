<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Elements;

use Convo\Core\Factory\InvalidComponentDataException;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\Util\StrUtil;
use Convo\Core\Workflow\AbstractWorkflowComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IScopedFunction;

class SetParamElement extends AbstractWorkflowComponent implements IConversationElement
{
    private $_scopeType = IServiceParamsScope::SCOPE_TYPE_SESSION;

    private $_parameters;

    private $_params = [];

    public function __construct($properties)
    {
        parent::__construct($properties);

        if (isset($properties['scope_type'])) {
            $this->_scopeType = $properties['scope_type'];
        }

        $this->_parameters = $properties['parameters'];

        $this->_params = $properties['properties'];
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $service = $this->getService();
        $scope_type = $this->evaluateString($this->_scopeType);
        $parameters = $this->evaluateString($this->_parameters);

        if ($parameters === 'block') {
            $params = $this->getBlockParams($scope_type);
        } elseif ($parameters === 'service') {
            $params = $service->getServiceParams($scope_type);
            ;
        } elseif ($parameters === 'parent') {
            $params = $service->getComponentParams($scope_type, $this->getParent());
        } elseif ($parameters === 'function') {
            $function_elem = $this->findAncestor('\Convo\Core\Workflow\IScopedFunction');
            /** @var IScopedFunction $function_elem */
            $params = $function_elem->getFunctionParams();
        } else {
            throw new \Exception("Unrecognized parameters type [$parameters]");
        }

        if (\is_string($this->_params) && StrUtil::startsWith($this->_params, '${')) {
            $this->_logger->debug('Params are a string to be evaluated');

            /** @var array $parsed */
            $parsed = $this->evaluateString($this->_params);

            foreach ($parsed as $key => $value) {
                // $params->setServiceParam($key, $value);

                if (!ArrayUtil::isComplexKey($key)) {
                    $this->_logger->info('Setting param [' . $key . ']');
                    $params->setServiceParam($key, $value);
                } else {
                    $root = ArrayUtil::getRootOfKey($key);
                    $final = ArrayUtil::setDeepObject($key, $value, $params->getServiceParam($root) ?? []);
                    $this->_logger->info('Setting complex param [' . $key . '][' . $root . ']');
                    $params->setServiceParam($root, $final);
                }
            }

            return;
        } elseif (\is_array($this->_params)) {
            $this->_logger->debug('Params are regular array');

            foreach ($this->_params as $key => $val) {
                $key = $this->evaluateString($key);
                $parsed = $this->evaluateString($val);

                if (!ArrayUtil::isComplexKey($key)) {
                    $this->_logger->info('Setting param [' . $key . ']');
                    $params->setServiceParam($key, $parsed);
                } else {
                    $root = ArrayUtil::getRootOfKey($key);
                    $final = ArrayUtil::setDeepObject($key, $parsed, $params->getServiceParam($root) ?? []);
                    $this->_logger->info('Setting complex param [' . $key . '][' . $root . ']');
                    // 					$this->_logger->debug( 'Setting at value ['.print_r( $final, true).']');
                    $params->setServiceParam($root, $final);
                }
            }
        } else {
            throw new InvalidComponentDataException('Properties must be either array or expression language string');
        }
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[' . json_encode($this->_params) . ']';
    }
}
