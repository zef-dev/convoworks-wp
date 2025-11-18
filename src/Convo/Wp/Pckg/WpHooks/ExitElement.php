<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\EndRequestException;

class ExitElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    public function __construct($properties)
    {
        parent::__construct($properties);
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $this->_logger->debug('Init [' . $this . '] on [' . $request . ']');
        throw new EndRequestException();
    }
}
