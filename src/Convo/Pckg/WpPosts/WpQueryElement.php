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
    private $_singleResult = array();
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_multipleResults = array();
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noResults = array();
    
    
    private $_contextId;
    
    public function __construct( $properties)
    {
    	parent::__construct( $properties);
    	
	    foreach ( $properties['single_result'] as $element) {
	        $this->_singleResult[]     =   $element;
	        $this->addChild( $element);
	    }
    	
	    foreach ( $properties['multiple_results'] as $element) {
	        $this->_multipleResults[]  =   $element;
	        $this->addChild( $element);
	    }
    	
	    foreach ( $properties['no_results'] as $element) {
	        $this->_noResults[]        =   $element;
	        $this->addChild( $element);
	    }
	    
	    $this->_contextId		=	$properties['context_id'];
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $params     =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        
        $query      =   $this->_getWpQuery();
        
        $status_var =   $this->_getStatusVar();
        
        $this->_logger->debug( 'Saving results in component variable ['.$status_var.'] in request scope');
        
        $params->setServiceParam( $status_var, [
            'data' => $query->posts,
            'count' => $query->found_posts,
            'first' => false,
            'last' => false
        ]);
        
        if ( $query->have_posts()) 
        {
            $this->_logger->debug( 'Got results ['.$query->post_count.']['.print_r( $query->posts, true).']');
            if ( $query->post_count === 1) {
                foreach ( $this->_singleResult as $element) {
                    $element->read( $request, $response);
                }
            } else {
                foreach ( $this->_multipleResults as $element) {
                    $element->read( $request, $response);
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
    
    /**
     * @return \WP_Query
     */
    private function _getWpQuery()
    {
        $contextId  =   $this->evaluateString( $this->_contextId);
        $query      =   $this->getService()->findContext( $contextId)->getComponent();
        
        if ( is_a( $query, '\WP_Query')) {
            return $query;
        }
        throw new \Exception( 'Could not find context ['.$this->_contextId.']');
    }
    
    public function evaluateString( $string, $context=[]) {
        $own_params	= $this->getService()->getAllComponentParams( $this);
        return parent::evaluateString( $string, array_merge( $own_params, $context));
    }

    public function __toString() {
        return parent::__toString().'[]';
    }
}