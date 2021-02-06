<?php

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Core\ConvoServiceInstance;
use Convo\Core\ComponentNotFoundException;
use Convo\Core\Util\ArrayUtil;
use function GuzzleHttp\json_encode;

class WpQueryContext extends AbstractBasicComponent implements IServiceContext
{
    const PARAM_NAME_QUERY_ARGS     =   'query_args';
    const PARAM_NAME_QUERY_MODEL    =   'query_model';
    
    private $_id;
    
    /**
     * @var \WP_Query
     */
    private $_wpQuery;

    private $_queryArgs =   [];
    private $_args =   [];
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_id      =   $properties['id'];
        $this->_args    =   $properties['args'];
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
    
    /**
     * @return \WP_Query
     */
    public function getComponent()
    {
        return $this->getWpQuery();
    }
    
    
    // ACTIONS - PAGES
    public function moveNextPage()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['page_index'] + 1;
        
        if ( $next >= $query->max_num_pages) {
            throw new NavigateOutOfRangeException( 'Can not move to next ['.$next.'] page. Pages count ['.$query->max_num_pages.']');
        }
        
        $this->_logger->debug( 'Moving to next page index ['.$next.']');
        $model['page_index']   =   $next;
        $model['post_index']   =   0;
        $this->_saveQueryModel( $model);
    }
    
    public function movePreviousPage()
    {
        $model  =   $this->_getQueryModel();
        if ( $model['page_index'] === 0) {
            throw new NavigateOutOfRangeException( 'Already at the begining. Previos page does not exists.');
        }
        
        $previous   =   $model['page_index'] - 1;
        $this->_logger->debug( 'Moving to previous page index ['.$previous.']');
        $model['page_index']    =   $previous;
        $model['post_index']    =   $this->getLimit() - 1;
        $this->_saveQueryModel( $model);
    }
    
    // ACTIONS - POSTS SELECTION
    public function selectPagePost( $index)
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        
        if ( isset( $query->posts[$index])) {
            $this->_logger->debug( 'Selecting page post index ['.$index.']');
            $model['post_index']   =   $index;
            $this->_saveQueryModel( $model);
            return;
        }
        
        throw new NavigateOutOfRangeException( 'Select page index ['.$index.'] out of range');
    }
    
    public function movePreviousPost() 
    {
        $model  =   $this->_getQueryModel();
        
        if ( $model['post_index'] === 0) {
            
            if ( $model['page_index'] === 0) {
                throw new NavigateOutOfRangeException( 'Already at the begining. Previos page does not exists.');
            }
            $this->movePreviousPage();
            return ;
        }
        $previous   =   $model['post_index'] - 1;
        $this->_logger->debug( 'Moving to previous post index ['.$previous.']');
        $model['post_index']    =   $previous;
        $this->_saveQueryModel( $model);
    }
    
    public function moveNextPost()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['post_index'] + 1;
        
        if ( isset( $query->posts[$next])) {
            $this->_logger->debug( 'Moving to next post index ['.$next.']');
            $model['post_index']   =   $next;
            $this->_saveQueryModel( $model);
            return;
        }
        
        try {
            $this->moveNextPage();
        } catch ( NavigateOutOfRangeException $e) {
            throw new NavigateOutOfRangeException( 'Can not move to next ['.$next.'] post. Already at last page', 0, $e);
        }
    }
    
    public function resetNavi()
    {
        $this->_logger->debug( 'Reseting navi model');
        
        $model   =   [
            'page_index' => 0,
            'post_index' => 0,
        ];
        $this->_saveQueryModel( $model);
    }
    
    // QUERY
    /**
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $args               =   $this->_evaluateArgs();
        $args['offset']     =   $this->_calculateOffset();
        $args['paged']      =   true;
        
        if ( !isset( $this->_wpQuery) || $args != $this->_queryArgs ) {
            $this->_queryArgs   =   $args;
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->debug( 'Got new query ['.print_r( $this->_wpQuery->request, true).']');
        }
        return $this->_wpQuery;
    }
    
    private function _evaluateArgs()
    {
        $this->_logger->debug( 'Got raw args ['.print_r( $this->_args, true).']');
        $args   =   [];
        foreach ( $this->_args as $key => $val) {
            $key	=	$this->getService()->evaluateString( $key);
            $parsed =   $this->getService()->evaluateString( $val);
            
            if (!ArrayUtil::isComplexKey($key))
            {
                $args[$key] =   $parsed;
            }
            else
            {
                $root = ArrayUtil::getRootOfKey($key);
                $final = ArrayUtil::setDeepObject($key, $parsed, $args[$root] ?? []);
                $args[$root] =   $final;
            }
        }
        $this->_logger->debug( 'Got evaluated args ['.print_r( $args, true).']');
        return $args;
    }
    
    // INFO
    public function getCurrentPageInfo()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        
        $info   =   [
            'last' => $model['page_index'] === $query->max_num_pages - 1,
            'first' => $model['page_index'] === 0,
            'page_no' => $model['page_index'] + 1,
            'posts' => $query->posts
        ];
        
        return $info;
    }
    
    public function getCurrentPostInfo()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        
        $first_on_page  =   $model['post_index'] === 0;
        $last_on_page   =   $model['post_index'] === count( $query->posts) - 1;
        
        $info   =   [
            'last' => ( $model['page_index'] === $query->max_num_pages - 1) && $last_on_page,
            'first' => $model['page_index'] === 0 && $first_on_page,
            'post_no' => $model['page_index'] * $this->getLimit() +  $model['post_index'] + 1,
            'post' => $query->posts[$model['post_index']],
            'meta' => self::getSimplePostMeta( $query->posts[$model['post_index']]->ID)
//            'meta' => get_metadata( 'post', $query->posts[$model['post_index']]->ID)
        ];
        
        $this->_logger->debug( 'Got current post info ['.print_r( $info, true).']');
        
        return $info;
    }
    
    
    
    // PERSISTANT MODEL NAVI
    private function _getQueryModel()
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        
        $model  =   $params->getServiceParam( self::PARAM_NAME_QUERY_MODEL);
        
        if ( empty( $model)) {
            $this->_logger->debug( 'There is no saved model. Going to create default one.');
            $model   =   [
                'page_index' => 0,
                'post_index' => 0,
            ];
            $this->_saveQueryModel( $model);
        }
        
        return $model;
    }
    
    private function _saveQueryModel( $model) 
    {
        $this->_logger->debug( 'Saving query model ['.print_r( $model, true).']['.$this.']');
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $params->setServiceParam( self::PARAM_NAME_QUERY_MODEL, $model);
    }
    
    private function _calculateOffset()
    {
        $model  =   $this->_getQueryModel();
        $offset =   $model['page_index'] * $this->getLimit();
        return $offset;
    }
    
    // ACCESSORS
    public function getLimit()
    {
        $args   =   $this->_evaluateArgs();
        return $args['posts_per_page'] ?? -1;
    }
    
    /**
     * @param string $contextId
     * @param ConvoServiceInstance $service
     * @throws ComponentNotFoundException
     * @return WpQueryContext
     */
    public static function getWpQueryContext( $contextId, $service)
    {
        $context    =   $service->getService()->findContext( $contextId);
        
        if ( is_a( $context, self::class)) {
            return $context;
        }
        throw new ComponentNotFoundException( 'Could not find context ['.$contextId.'] of type ['.self::class.']');
    }
    
    public static function getSimplePostMeta( $postId) {
        $meta   =   get_metadata( 'post', $postId);
        
        $fixed  =   [];

        foreach ( $meta as $key => $val) 
        {
            // skip system 
            if ( strpos( $key, '_') === 0) {
                continue;
            }
            
            if ( is_array( $val) && count( $val) === 1) {
                $fixed[$key] = $val[0];
            } else {
                $fixed[$key] = $val;
            }
        }
        
        return $fixed;
    }
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_id.']['.json_encode( $this->_args).']';
    }
}
