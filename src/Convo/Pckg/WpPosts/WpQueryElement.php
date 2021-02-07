<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;


/**
 * @author Tole
 */
class WpQueryElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noResults = array();
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_hasResults = array();
    
    /**
     * @var string
     */
    private $_statusVar;
    
    public function __construct( $properties)
    {
    	parent::__construct( $properties);
    	
	    foreach ( $properties['has_results'] as $element) {
	        $this->_hasResults[]        =   $element;
	        $this->addChild( $element);
	    }
    	
	    foreach ( $properties['no_results'] as $element) {
	        $this->_noResults[]        =   $element;
	        $this->addChild( $element);
	    }
	    
	    $this->_contextId  =   $properties['context_id'];
	    $this->_statusVar  =   $properties['status_var'];
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $params     =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $context->resetNavi();
        $query      =   $context->getWpQuery();
        $status_var =   $this->evaluateString( $this->_statusVar);
        
        $this->_logger->debug( 'Saving results in component variable ['.$status_var.'] in request scope');
        
        $params->setServiceParam( $status_var, $query);
        
        if ( $query->have_posts()) 
        {
            $this->_logger->debug( 'Got results ['.$query->found_posts.']');
            foreach ( $this->_hasResults as $element) {
                $element->read( $request, $response);
            }
        } 
        else 
        {
            $this->_logger->debug( 'Got no results');
            foreach ( $this->_noResults as $element) {
                $element->read( $request, $response);
            }
        }
    }
    
    public function evaluateString( $string, $context=[]) {
        $own_params	= $this->getService()->getAllComponentParams( $this);
        return parent::evaluateString( $string, array_merge( $own_params, $context));
    }

    public function __toString() {
        return parent::__toString().'['.$this->_statusVar.']';
    }
}