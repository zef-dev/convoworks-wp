<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Adapters\ConvoChat\DefaultTextCommandRequest;
use Convo\Core\DataItemNotFoundException;

class WpHooksCommandRequest extends DefaultTextCommandRequest
{
    private $_hook;
    private $_arguments;
    
    public function __construct( $serviceId, $installationId, $deviceId, $sessionId, $requestId, $hook, $arguments)
	{
	    parent::__construct( $serviceId, $installationId, $sessionId, $requestId, null, true, false, WpHooksPlatform::PLATFORM_ID, []);
	    
	    $this->_hook = $hook;
	    $this->_arguments = $arguments;
	}
	
	public function isEmpty() {
	    return false;
	}
    
	
	public function getHook()
	{
	    return $this->_hook;
	}
	
	public function getArguments()
	{
	    return $this->_arguments;
	}
	
	public function getArgument( $index)
	{
	    if ( !isset( $this->_arguments[$index])) {
	        throw new DataItemNotFoundException( 'Hook ['.$this->_hook.'] argument not defined ['.$index.']');
	    }
	    return $this->_arguments[$index];
	}
	
    
    public function __toString() {
        return parent::__toString().'['.$this->_hook.']';
    }
	
}
