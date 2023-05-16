<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;

class EchoElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_text;
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_text = $properties['text'];
    }
    
    public function read( IConvoRequest $request, IConvoResponse $response)
    {
        $this->_logger->debug( 'Init ['.$this.'] on ['.$request.']');
        echo $this->evaluateString( $this->_text);
    }
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_text.']';
    }

}
