<?php

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Core\ConvoServiceInstance;

class WpQueryContext extends AbstractBasicComponent implements IServiceContext
{
    const PARAM_NAME_QUERY_ARGS     =   'query_args';
    const PARAM_NAME_QUERY_MODEL    =   'query_model';
    
    private $_id;
    
    /**
     * @var \WP_Query
     */
    private $_wpQuery;
    
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
        return $this->_getWpQuery();
    }
    
    
    public function moveNextPage()
    {
        $query  =   $this->_getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['page_index'] + 1;
        
        if ( $next >= $query->max_num_pages) {
            throw new NavigateOutOfRangeException( 'Can not move to next ['.$next.'] page. Pages count ['.$query->max_num_pages.']');
        }
        
        $model['page_index']   =   $next;
        $model['post_index']   =   0;
        $this->_saveQueryModel( $model);
        unset( $this->_wpQuery);
    }
    
    public function movePreviousPage()
    {
        throw new NavigateOutOfRangeException( 'Can not move to previous page');
    }
    
    public function selectPagePost( $index)
    {
        $query  =   $this->_getWpQuery();
        $model  =   $this->_getQueryModel();
        
        if ( !isset( $query->posts[$index])) {
            $this->_logger->debug( 'Selecting page post index ['.$index.']');
            $model['post_index']   =   $index;
            $this->_saveQueryModel( $model);
            unset( $this->_wpQuery);
            return;
        }
        
        throw new NavigateOutOfRangeException( 'Select page index ['.$index.'] out of range');
    }
    
    public function moveNextPost()
    {
        $query  =   $this->_getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['post_index'] + 1;
        
        if ( isset( $query->posts[$next])) {
            $this->_logger->debug( 'Moving to post index ['.$next.']');
            $model['post_index']   =   $next;
            $this->_saveQueryModel( $model);
            unset( $this->_wpQuery);
            return;
        }
        
        try {
            $this->moveNextPage();
        } catch ( NavigateOutOfRangeException $e) {
            throw new NavigateOutOfRangeException( 'Can not move to next ['.$next.'] post. Already at last page', 0, $e);
        }
    }
    
    
    private function _getWpQuery()
    {
        if ( !isset( $this->_wpQuery)) {
            $model  =   $this->_getQueryModel();
            $limit  =   $this->_getLimit();
            $offset =   ($model['page_index']-1) * $limit;
            $args   =   [
                's' => $this->_getSearchQuery(),
                'post_type' => $this->_getPostType(),
                'posts_per_page' => $limit,
                'offset' => $offset,
                'paged' => true,
            ];
            $this->_wpQuery =   new \WP_Query( $args);
        }
        return $this->_wpQuery;
    }
    
    
    // PERSISTANT MODEL NAVI
    private function _getQueryModel()
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        
        $model  =   $params->getServiceParam( self::PARAM_NAME_QUERY_MODEL);
        
        if ( empty( $model)) {
            $model   =   [
                'page_index' => 1,
                'post_index' => 1,
            ];
            $this->_saveQueryModel( $model);
        }
        
        return $model;
    }
    
    private function _saveQueryModel( $model) 
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $params->setServiceParam( self::PARAM_NAME_QUERY_MODEL, $model);
    }
    
    private function _getOffset()
    {
        $model  =   $this->_getQueryModel();
        $offset =   $model['page_index'] * $this->_getLimit();
        return $offset;
    }
    
    // ACCESSORS
    private function _getSearchQuery()
    {
        return $this->getService()->evaluateString( $this->_properties['search_query']);
    }
    
    private function _getPostType()
    {
        return $this->getService()->evaluateString( $this->_properties['post_type']);
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
