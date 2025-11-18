<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

/**
 * @author Tole
 */
class WpQueryElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noResults = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_hasResults = [];

    /**
     * @var string
     */
    private $_contextId;

    /**
     * @var string
     */
    private $_postsPageVar;

    public function __construct($properties)
    {
        parent::__construct($properties);

        foreach ($properties['has_results'] as $element) {
            $this->_hasResults[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['no_results'] as $element) {
            $this->_noResults[] = $element;
            $this->addChild($element);
        }

        $this->_contextId = $properties['context_id'];
        $this->_postsPageVar = $properties['page_info_var'];
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read(\Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $params = $this->getService()->getComponentParams(\Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $context = $this->_getWpQueryContext();

        $query = $context->getWpQuery();
        $status_var = $this->evaluateString($this->_postsPageVar);

        $this->_logger->info('Saving results in component variable [' . $status_var . '] in request scope');

        $params->setServiceParam($status_var, $context->getLoopPageInfo());

        if ($query->have_posts()) {
            $this->_logger->info('Got results [' . $query->found_posts . ']');
            foreach ($this->_hasResults as $element) {
                $element->read($request, $response);
            }
        } else {
            $this->_logger->info('Got no results');
            foreach ($this->_noResults as $element) {
                $element->read($request, $response);
            }
        }
    }

    /**
     * @return IWpQueryContext
     */
    private function _getWpQueryContext()
    {
        return $this->getService()->findContext(
            $this->evaluateString($this->_contextId),
            IWpQueryContext::class
        );
    }

    public function __toString()
    {
        return parent::__toString() . '[' . $this->_contextId . '][' . $this->_postsPageVar . ']';
    }
}
