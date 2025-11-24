<?php

declare(strict_types=1);

namespace Convo\Pckg\Text\Filters;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\DefaultFilterResult;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Pckg\Text\Filters\Filt\IPlainTextFilter;

class PlainTextRequestFilter extends AbstractWorkflowContainerComponent implements IRequestFilter
{
    /**
     * @var IRequestFilterResult
     */
    protected $_filterResult;

    /**
     * @var IPlainTextFilter[]
     */
    private $_filters;


    private $_id;

    public function __construct($config)
    {
        parent::__construct($config);

        $this->_filters = $config['filters'];
        foreach ($this->_filters as $filter) {
            $this->addChild($filter);
        }

        $this->_id = $config['_component_id'] ?? '';
        $this->_filterResult = new DefaultFilterResult();
    }

    public function getId()
    {
        return $this->_id;
    }

    public function accepts(IConvoRequest $request)
    {
        if (trim($request->getText()) === '') {
            $this->_logger->warning('Empty text request in request filter [' . $this . ']');
            return false;
        }

        return true;
    }

    public function filter(IConvoRequest $request)
    {
        /** @var IPlainTextFilter $filter */
        foreach ($this->_filters as $filter) {
            $filter->filter($request);
            $result = $filter->getFilterResult();

            $this->_filterResult->read($result);
        }

        return $this->_filterResult;
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . "[{$this->_id}]";
    }
}
