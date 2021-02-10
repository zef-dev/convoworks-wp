<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;


/**
 * @author Tole
 */
class WpLoopElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
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
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_eachPost = array();
    
    /**
     * @var string
     */
    private $_statusVar;
    
    /**
     * @var string
     */
    private $_singlePostVar;
    
    public function __construct( $properties)
    {
    	parent::__construct( $properties);
    	
    	foreach ( $properties['has_results'] as $element) {
    	    $this->_hasResults[]        =   $element;
    	    $this->addChild( $element);
    	}
    	
	    foreach ( $properties['each_post'] as $element) {
	        $this->_eachPost[]        =   $element;
	        $this->addChild( $element);
	    }
    	
	    foreach ( $properties['no_results'] as $element) {
	        $this->_noResults[]        =   $element;
	        $this->addChild( $element);
	    }
	    
	    $this->_contextId      =   $properties['context_id'];
	    $this->_statusVar      =   $properties['status_var'];
	    $this->_singlePostVar  =   $properties['single_post_info_var'];
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
//         $context->resetNavi();
        $query      =   $context->getWpQuery();
        
        if ( $query->have_posts()) 
        {
            $this->_logger->debug( 'Got results ['.$query->found_posts.']');
            
            $req_params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
            $req_params->setServiceParam( $this->evaluateString( $this->_statusVar), $query);
            
            foreach ( $this->_hasResults as $element) {
                $element->read( $request, $response);
            }
            
            if ( !empty( $this->_eachPost)) 
            {
                $this->_logger->info( 'Starting loop');
                
                $iterator   =   $context->getLoopIterator();
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
        return parent::__toString().'['.$this->_singlePostVar.']';
    }
}