<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Elements;

use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Workflow\IRunnableBlock;
use Convo\Core\StateChangedException;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConversationProcessor;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class SpecialRoleProcessorBlock extends ElementCollection implements IRunnableBlock
{
    private $_blockId;

    /**
     * @var IConversationProcessor[]
     */
    private $_processors = [];

    /**
     * @var IConversationElement[]
     */
    private $_failback = [];

    /**
     * @var string
     */
    private $_role;

    private $_blockName;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_blockId = $properties['block_id'];
        $this->_role = $properties['role'];

        foreach ($properties['processors'] as $processor) {
            /** @var IConversationProcessor $processor */
            $this->addProcessor($processor);
        }

        if (isset($properties['failback'])) {
            foreach ($properties['failback'] as $elem) {
                $this->_failback[] = $elem;
                $this->addChild($elem);
            }
        }

        $this->_blockName = $properties['name'] ?? 'Nameless block';
    }


    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IIdentifiableComponent::getComponentId()
     */
    public function getComponentId()
    {
        return $this->_blockId;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::getRole()
     */
    public function getRole()
    {
        return $this->_role;
    }

    public function getName()
    {
        return $this->_blockName;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Pckg\Core\Elements\ElementCollection::read()
     */
    public function read(IConvoRequest $request, IConvoResponse $response)
    {
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::run()
     */
    public function run(IConvoRequest $request, IConvoResponse $response)
    {
        $processors = $this->_collectAllAccountableProcessors();
        if (empty($processors)) {
            return;
        }

        $this->_logger->info('Processing request in [' . $this . ']');

        $session_params = $this->getBlockParams(IServiceParamsScope::SCOPE_TYPE_SESSION);

        $session_params->setServiceParam('failure_count', \intval($session_params->getServiceParam('failure_count')));

        // $default_processor	=	null;
        // $default_result		=	null;
        foreach ($processors as $processor) {
            try {
                if ($this->_processProcessor($request, $response, $processor)) {
                    $session_params->setServiceParam('failure_count', 0);
                    return;
                }
            } catch (StateChangedException $e) {
                $session_params->setServiceParam('failure_count', 0);
                throw $e;
            }
        }

        $session_params->setServiceParam('failure_count', intval($session_params->getServiceParam('failure_count')) + 1);

        foreach ($this->_failback as $elem) {
            /** @var IConversationElement $elem */
            $elem->read($request, $response);
        }
    }

    protected function _processProcessor(
        IConvoRequest $request,
        IConvoResponse $response,
        IConversationProcessor $processor
    ) {
        $processor->setParent($this);
        $result = $processor->filter($request);

        // if ( is_null( $default_processor)) {
        // 	$default_processor	=	$processor;
        // 	$default_result		=	$result;
        // }

        if ($result->isEmpty()) {
            $this->_logger->info('Processor [' . $processor->getId() . '] not appliable for [' . $request->getRequestId() . ']. Skipping ...');
            return false;
        }

        $params = $this->getBlockParams(IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $params->setServiceParam('result', $result->getData());

        $this->_logger->info('Processing with [' . $processor->getId() . ']');

        $processor->process($request, $response, $result);

        return true;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IServiceWorkflowComponent::getBlockParams()
     */
    public function getBlockParams($scopeType)
    {
        // Is it top level block?
        if ($this->getParent() === $this->getService()) {
            return $this->getService()->getComponentParams($scopeType, $this);
        }

        return parent::getBlockParams($scopeType);
    }


    public function addProcessor(IConversationProcessor $processor)
    {
        $this->_processors[] = $processor;
        $this->addChild($processor);
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::getProcessors()
     */
    public function getProcessors()
    {
        return $this->_processors;
    }

    protected function _collectAllAccountableProcessors()
    {
        $processors = array_merge($this->_processors);

        if (strpos($this->getComponentId(), '__') === 0) {
            $this->_logger->debug('Do not use system processors in system block');
            return $processors;
        }

        try {
            $block = $this->getService()->getBlockByRole(IRunnableBlock::ROLE_SERVICE_PROCESSORS);
            $processors = array_merge($processors, $block->getProcessors());
        } catch (\Convo\Core\ComponentNotFoundException $e) {
        }

        return $processors;
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_blockId . ']';
    }
}
