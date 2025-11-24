<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Processors;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\DefaultFilterResult;
use Convo\Core\Workflow\IConversationProcessor;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IFragmentComponent;
use Convo\Core\Workflow\IIdentifiableComponent;
use Convo\Core\Workflow\IRequestFilterResult;

class ProcessorFragment extends AbstractWorkflowContainerComponent implements IConversationProcessor, IFragmentComponent, IIdentifiableComponent
{
    /**
     * @var IConversationProcessor[]
     */
    private $_processors = [];

    /**
     * @var IConversationProcessor
     */
    private $_matched;

    private $_fragmentId;

    private $_fragmentName;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_fragmentId = $properties['fragment_id'];

        if (isset($properties['processors']) && is_array($properties['processors'])) {
            foreach ($properties['processors'] as $processor) {
                $this->_processors[] = $processor;
                $this->addChild($processor);
            }
        }

        $this->_fragmentName = $properties['name'] ?? 'Nameless Process Fragment';
    }

    public function getComponentId()
    {
        return $this->_fragmentId;
    }

    public function getName()
    {
        return $this->_fragmentId;
    }

    public function getWorkflowName()
    {
        return $this->_fragmentName;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationProcessor::process()
     */
    public function process(IConvoRequest $request, IConvoResponse $response, IRequestFilterResult $result)
    {
        $this->_matched->process($request, $response, $result);
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationProcessor::filter()
     */
    public function filter(IConvoRequest $request)
    {
        foreach ($this->_processors as $processor) {
            $result = $processor->filter($request);
            if ($result->isEmpty()) {
                continue;
            }
            $this->_matched = $processor;
            return $result;
        }

        return new DefaultFilterResult();
    }


    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_fragmentId . '][' . $this->_matched->getId() . ']';
    }
}
