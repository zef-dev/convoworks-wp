<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\SessionEndedException;

class WpHookErrorResponse extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_code;
    private $_message;
    private $_data;


    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_code = $properties['code'];
        $this->_message = $properties['message'];
        $this->_data = $properties['data'];
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $this->_logger->debug('Init [' . $this . '] on [' . $request . ']');
        if ($response instanceof WpHooksCommandResponse) {
            /* @var WpHooksCommandResponse $response */
            $error = new \WP_Error(
                $this->evaluateString($this->_code),
                $this->evaluateString($this->_message),
                $this->evaluateString($this->_data)
            );
            $response->setFilterResponse($error);
        } else {
            $this->_logger->warning('Not an WpHooksCommandResponse in [' . $this . '] on [' . $request . ']');
        }

        throw new SessionEndedException();
    }
    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_code . '][' . $this->_message . '][' . $this->_data . ']';
    }
}
