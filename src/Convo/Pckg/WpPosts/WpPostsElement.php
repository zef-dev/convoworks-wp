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
        $args   =   [
        //             'category_name' => 'investor-news',
            'post_type' => $this->_getPostType(),
            'posts_per_page' => $this->_getLimit(),
            'paged' => true
        ];
        
        
        $query = new \WP_Query( $args);
        
        if ( $query->have_posts()) {
            $this->_logger->debug( 'Got results ['.$query->post_count.']');
            if ( $query->post_count === 1) {
                foreach ($this->_singleResult as $element) {
                    $element->read($request, $response);
                }
            } else {
                foreach ($this->_multipleResults as $element) {
                    $element->read($request, $response);
                }
            }
        } else {
            $this->_logger->debug( 'Got no results');
            foreach ($this->_noResults as $element) {
                $element->read($request, $response);
            }
        }
        
        $response->addText( 'Youlou from example!');
        return;
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
        return $this->evaluateString( $this->_properties['offset']);
    }

    private function _getLimit()
    {
        return $this->evaluateString( $this->_properties['limit']);
    }

    public function __toString() {
        return parent::__toString().'[]';
    }
}