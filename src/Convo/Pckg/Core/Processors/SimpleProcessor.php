<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Processors;

use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IRequestFilterResult;

class SimpleProcessor extends AbstractServiceProcessor
{
    /**
     * @var IConversationElement[]
     */
    protected $_ok;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_ok = $properties['ok'];
        if (is_array($this->_ok)) {
            foreach ($this->_ok as $ok) {
                $this->addChild($ok);
            }
        }

    }

    public function process(IConvoRequest $request, IConvoResponse $response, IRequestFilterResult $result)
    {
        $this->_logger->debug('Processing OK');
        foreach ($this->_ok as $ok) {
            $ok->read($request, $response);
        }
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[]';
    }
}
