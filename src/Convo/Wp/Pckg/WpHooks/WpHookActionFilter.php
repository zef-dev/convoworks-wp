<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;

class WpHookActionFilter extends AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IRequestFilter
{

    private $_hook;
    private $_priority;
    private $_acceptedArgs;

    public function __construct( $config)
    {
        parent::__construct( $config);

        $this->_hook            =   $config['hook'];
        $this->_priority        =   $config['priority'];
        $this->_acceptedArgs    =   $config['accepted_args'];
    }

    public function accepts( \Convo\Core\Workflow\IConvoRequest $request)
    {
        if ( !is_a( $request, '\Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest')) {
            $this->_logger->info('Request is not WpHooksCommandRequest. Exiting.');
            return false;
        }
        return true;
    }

    public function filter( \Convo\Core\Workflow\IConvoRequest $request)
    {
        /** @var \Convo\Core\Workflow\IIntentAwareRequest $request */

        $this->_logger->debug( 'No match. Returning empty result.');

        return new \Convo\Core\Workflow\DefaultFilterResult();
    }

    // UTIL
    public function __toString()
    {
        return get_class($this).'['.$this->_id.']';
    }
}
