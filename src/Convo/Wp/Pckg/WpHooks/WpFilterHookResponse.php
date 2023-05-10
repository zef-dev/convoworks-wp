<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\SessionEndedException;

class WpFilterHookResponse extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_returnValue;
    
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_returnValue = $properties['return_value'];
    }
    
    public function read( IConvoRequest $request, IConvoResponse $response)
    {
        $this->_logger->debug( 'Init ['.$this.'] on ['.$request.']');
        if ( $response instanceof WpHooksCommandResponse) {
            /* @var WpHooksCommandResponse $response */
            $response->setFilterResponse( $this->evaluateString( $this->_returnValue));
        } else {
            $this->_logger->warning( 'Not an WpHooksCommandResponse in ['.$this.'] on ['.$request.']');
        }
        
        throw new SessionEndedException();
    }
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_returnValue.']';
    }

}
