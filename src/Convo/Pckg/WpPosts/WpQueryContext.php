<?php

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Core\ConvoServiceInstance;

class WpQueryContext extends AbstractBasicComponent implements IServiceContext
{
    const PARAM_NAME_QUERY_ARGS =   'query_args';
    
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
        $query      =   new \WP_Query( $this->_getQueryArgs());
        return $query;
    }
    
    
    public function moveNextPage()
    {
        throw new NavigateOutOfRangeException( 'Can not move to next page');
    }
    
    public function movePreviousPage()
    {
        throw new NavigateOutOfRangeException( 'Can not move to previous page');
    }
    
    public function selectPagePost( $index)
    {
        throw new NavigateOutOfRangeException( 'Select index ['.$index.'] out of range');
    }
    
    
    public function getCurrentPageInfo()
    {
        
    }
    
    public function getCurrentPostInfo()
    {
        
    }
    
    
    private function _getQueryArgs()
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        
        $args   =   $params->getServiceParam( self::PARAM_NAME_QUERY_ARGS);
        
        if ( empty( $args)) {
            $args   =   [
                's' => $this->_getSearchQuery(),
                'post_type' => $this->_getPostType(),
                'posts_per_page' => $this->_getLimit(),
                'offset' => $this->_getOffset(),
                'paged' => true,
                'page_no' => 1,
                'current_no' => 1,
            ];
            $params->setServiceParam( self::PARAM_NAME_QUERY_ARGS, $args);
        }
        
        return $args;
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
     * @param string $contextIdString
     * @param ConvoServiceInstance $service
     * @throws \Exception
     * @return \WP_Query
     */
    public static function getWpQuery( $contextIdString, $service)
    {
        $contextId  =   $service->evaluateString( $contextIdString);
        $query      =   $service->getService()->findContext( $contextId)->getComponent();
        
        if ( is_a( $query, '\WP_Query')) {
            return $query;
        }
        throw new \Exception( 'Could not find context ['.$contextIdString.']['.$contextId.']');
    }
    
    /**
     * @param string $contextIdString
     * @param ConvoServiceInstance $service
     * @throws \Exception
     * @return WpQueryContext
     */
    public static function getWpQueryContext( $contextIdString, $service)
    {
        $contextId  =   $service->evaluateString( $contextIdString);
        $context    =   $service->getService()->findContext( $contextId);
        
        if ( is_a( $context, self::class)) {
            return $context;
        }
        throw new \Exception( 'Could not find context ['.$contextIdString.']['.$contextId.'] of type ['.self::class.']');
    }
}
