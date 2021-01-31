<?php

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;

class WpQueryContext extends AbstractBasicComponent implements IServiceContext
{
    private $_id;
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_id  =   $properties['id'];
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IServiceContext::init()
     */
    public function init()
    {
    }

    
    private function _getSearchQuery()
    {
        return $this->getService()->evaluateString( $this->_properties['search_query']);
    }
    
    private function _getPostType()
    {
        return $this->getService()->evaluateString( $this->_properties['post_type']);
    }
    
    private function _getStatusVar()
    {
        return $this->getService()->evaluateString( $this->_properties['status_var']);
    }
    
    private function _getOffset()
    {
        return intval( $this->getService()->evaluateString( $this->_properties['offset']));
    }
    
    private function _getLimit()
    {
        return intval( $this->getService()->evaluateString( $this->_properties['limit']));
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\AbstractBasicComponent::getId()
     */
    public function getId()
    {
        return $this->_id;
    }

    public function getComponent()
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
        return $query;
    }
}
