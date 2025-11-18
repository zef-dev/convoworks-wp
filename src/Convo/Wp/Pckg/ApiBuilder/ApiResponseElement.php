<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Workflow\AbstractWorkflowComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\SessionEndedException;

class ApiResponseElement extends AbstractWorkflowComponent implements IConversationElement
{
    private $_status;
    private $_headers;
    private $_body;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_status = $properties['status'] ?? 200;
        $this->_headers = $properties['headers'] ?? '';
        $this->_body = $properties['body'] ?? '';
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        if ($response instanceof ApiCommandResponse) {
            $response->setStatus($this->evaluateString($this->_status));
            $response->setHeaders($this->getService()->evaluateArgs($this->_headers, $this));
            $response->setBody($this->evaluateString($this->_body));
            throw new SessionEndedException();
        }
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_status . ']';
    }
}
