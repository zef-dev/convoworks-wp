<?php

namespace Convo\Pckg\Forms;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IServiceContext;

abstract class AbstractFormsElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    /**
     * @var string
     */
    protected $_contextId;

    /**
     * @param array $properties
     */
    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_contextId = $properties['context_id'];
    }


    /**
     * @return IFormsContext
     */
    protected function _getFormsContext(): IServiceContext
    {
        /** @var IFormsContext $formsContext */
        $formsContext = $this->getService()->findContext(
            $this->evaluateString($this->_contextId),
            IFormsContext::class
        );
        return $formsContext;
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_contextId . ']';
    }
}
