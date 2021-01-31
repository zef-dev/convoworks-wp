<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;


/**
 * @author Tole
 */
class WpPostsElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
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
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        
        $args   =   [
            's' => $this->_getSearchQuery(),
            'post_type' => $this->_getPostType(),
            'posts_per_page' => $this->_getLimit(),
            'offset' => $this->_getOffset(),
            'paged' => true
        ];
        
        
        $query      =   new \WP_Query( $args);
        
        $status_var =   $this->_getStatusVar();
        $this->_logger->debug( 'Saving results in ['.$status_var.']');
        
        $params->setServiceParam( $status_var, [
            'data' => $query->posts,
            'count' => $query->found_posts,
            'has_previous' => false,
            'has_more' => false
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
    
    public function evaluateString( $string, $context=[]) {
        $own_params	= $this->getService()->getAllComponentParams( $this);
        return parent::evaluateString( $string, array_merge( $own_params, $context));
    }
    
    private function _getSearchQuery()
    {
        return $this->evaluateString( $this->_properties['search_query']);
    }
    
    private function _getPostType()
    {
        return $this->evaluateString( $this->_properties['post_type']);
    }
    
    private function _getStatusVar()
    {
        return $this->evaluateString( $this->_properties['status_var']);
    }
    
    private function _getOffset()
    {
        return intval( $this->evaluateString( $this->_properties['offset']));
    }

    private function _getLimit()
    {
        return intval( $this->evaluateString( $this->_properties['limit']));
    }

    public function __toString() {
        return parent::__toString().'[]';
    }
}