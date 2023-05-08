<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationProcessor;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\DefaultFilterResult;

class WpHookProcessor extends AbstractWorkflowContainerComponent implements IConversationProcessor, IWpHookInfo
{
    
    /**
     * @var IConversationElement[]
     */
    private $_ok;
    
    private $_hookType;
    private $_hook;
    private $_priority;
    private $_acceptedArgs;
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_ok    =   $properties['ok'];
        foreach ( $this->_ok as $ok) {
            $this->addChild( $ok);
        }
        
        $this->_hookType        =   $properties['hookType'];
        $this->_hook            =   $properties['hook'];
        $this->_priority        =   $properties['priority'];
        $this->_acceptedArgs    =   $properties['accepted_args'];
    }
    
    public function process( IConvoRequest $request, IConvoResponse $response, IRequestFilterResult $result)
    {
        $this->_logger->debug( 'Processing OK');
        foreach ( $this->_ok as $ok) {
            $ok->read( $request, $response);
        }
    }
    
    public function filter( IConvoRequest $request)
    {
        $result = new DefaultFilterResult();
        
        if ( !is_a( $request, '\Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest')) {
            $this->_logger->info('Request is not WpHooksCommandRequest. Exiting.');
            return $result;
        }
        
        /** @var \Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest $request */
        
        if ( $this->_hook === $request->getHook()) {
            $result->setSlotValue( 'hook_name', $this->_hook);
        }
        
        return $result;
    }
    
    public function getWpHookInfo()
    {
        return [
            'hook_type' => $this->_hookType,
            'hook' => $this->_hook,
            'priority' => $this->_priority,
            'accepted_args' => $this->_acceptedArgs,
        ];
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_hook.']['.$this->_priority.']['.$this->_acceptedArgs.']';
    }


}