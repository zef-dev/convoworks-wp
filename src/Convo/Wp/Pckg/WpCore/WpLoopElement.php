<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

/**
 * @author Tole
 */
class WpLoopElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_eachPost = array();
    
    /**
     * @var string
     */
    private $_contextId;
    
    /**
     * @var string
     */
    private $_singlePostVar;
    
    public function __construct( $properties)
    {
    	parent::__construct( $properties);
    	
	    foreach ( $properties['each_post'] as $element) {
	        $this->_eachPost[]        =   $element;
	        $this->addChild( $element);
	    }
	    
	    $this->_contextId      =   $properties['context_id'];
	    $this->_singlePostVar  =   $properties['single_post_info_var'];
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $context    =   $this->_getWpQueryContext();
        $query      =   $context->getWpQuery();
        
        if ( $query->have_posts()) 
        {
            $this->_logger->info( 'Got results ['.$query->found_posts.']. Starting loop ...');
            
            $req_params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
            
            $iterator   =   $context->getIterator();
            foreach ( $iterator as $index => $post)
            {
                $this->_logger->debug( 'Got loop post ['.$index.']['.$post->post_title.']');

                $req_params->setServiceParam(
                    $this->evaluateString( $this->_singlePostVar),
                    $context->getLoopPostInfo());

                foreach ( $this->_eachPost as $element) {
                    $element->read( $request, $response);
                }
            }
        } 
    }
    
    /**
     * @return IWpQueryContext
     */
    private function _getWpQueryContext()
    {
        return $this->getService()->findContext(
            $this->evaluateString( $this->_contextId),
            IWpQueryContext::class);
    }

    public function __toString() {
        return parent::__toString().'['.$this->_contextId.']['.$this->_singlePostVar.']';
    }
}