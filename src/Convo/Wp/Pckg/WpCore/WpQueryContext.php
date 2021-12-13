<?php

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Core\Util\ArrayUtil;

class WpQueryContext extends AbstractBasicComponent implements IServiceContext, IWpQueryContext
{
    const PARAM_NAME_QUERY_MODEL    =   'query_model';
    
    private $_id;
    
    /**
     * @var \WP_Query
     */
    private $_wpQuery;

    private $_queryArgs =   [];
    
    private $_args;
    private $_resetNaviVar;
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_id              =   $properties['id'];
        $this->_args            =   $properties['args'];
        $this->_resetNaviVar    =   $properties['resetNaviVar'];
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
    
    /**
     * @return \Generator
     * @deprecated
     */
    public function getLoopIterator()
    {
        $query  =   $this->getWpQuery();
        $query->rewind_posts();
        while ( $query->have_posts()) {
            $query->the_post();
            yield $query->current_post => $query->post;
        }
    }
    
    /**
     * @return \Iterator
     */
    public function getIterator()
    {
        return new WpLoopIterator( $this->getWpQuery());
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
        
        $this->_logger->info( 'Moving to next page index ['.$next.']');
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
        $this->_logger->info( 'Moving to previous page index ['.$previous.']');
        $model['page_index']    =   $previous;
        $model['post_index']    =   $this->getLimit() - 1;
        $this->_saveQueryModel( $model);
    }
    
    // ACTIONS - POSTS SELECTION
    public function selectPagePost( $index)
    {
        $iterator   =   $this->getIterator();
        foreach ( $iterator as $i => $post) 
        {
            $this->_logger->debug( 'Checking page post ['.$post->post_title.'] index ['.$i.']['.$index.']');
            
            if ( $i === $index) 
            {
                $this->_logger->info( 'Selecting page post ['.$post->post_title.'] index ['.$index.']');
                $model                  =   $this->_getQueryModel();
                $model['post_index']    =   $index;
                $this->_saveQueryModel( $model);
                return;
            }
        }
        
        throw new NavigateOutOfRangeException( 'Select page post index ['.$index.'] out of range');
    }
    
    public function selectLastPagePost()
    {
        $query  =   $this->getWpQuery();
        $index  =   $query->post_count -1;
        $this->_logger->info( 'Selecting last page post ['.$index.']');
        $this->selectPagePost( $index);
    }
    
    public function selectPreviousPost() 
    {
        $model  =   $this->_getQueryModel();
        
        if ( $model['post_index'] === 0) 
        {
            if ( $model['page_index'] === 0) {
                throw new NavigateOutOfRangeException( 'Already at the begining. Previos page does not exists.');
            }
            
            $this->_logger->info( 'Will select previous page, last post...');
            $this->movePreviousPage();
            $this->selectLastPagePost();
            return ;
        }
        
        $previous   =   $model['post_index'] - 1;
        $this->_logger->info( 'Selecting previous page post ['.$previous.']');
        $this->selectPagePost( $previous);
    }
    
    public function selectNextPost()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['post_index'] + 1;
        
        if ( !isset( $query->posts[$next])) {
            try {
                $this->_logger->info( 'Going to select next page first post ...');
                $this->moveNextPage();
                $this->selectPagePost( 0);
                return ;
            } catch ( NavigateOutOfRangeException $e) {
                throw new NavigateOutOfRangeException( 'Can not move to next ['.$next.'] post. Already at last page', 0, $e);
            }
        }
        
        $this->_logger->info( 'Selecting next page post ['.$next.']');
        $this->selectPagePost( $next);
    }
    
    public function restoreSelectedPost()
    {
        $model  =   $this->_getQueryModel();
        $this->selectPagePost( $model['post_index']);
    }
    
    public function resetNavi()
    {
        $this->_logger->info( 'Reseting navi model');
        $model   =   [
            'page_index' => 0,
            'post_index' => 0,
        ];
        $this->_saveQueryModel( $model);
    }
    
    
    // INFO
    public function getLoopPageInfo()
    {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        
        $info   =   [
            'last' => $model['page_index'] === $query->max_num_pages - 1,
            'first' => $model['page_index'] === 0,
            'page_no' => $model['page_index'] + 1,
            'query' => $query,
        ];
        
        $this->_logger->debug( 'Got current page info ['.print_r( $info, true).']');
        
        return $info;
    }
    
    public function getLoopPostInfo()
    {
        $query          =   $this->getWpQuery();
        
        if ( !$query->post) {
            throw new \Exception( 'Seems that the loop is not started. There is no current post.');
        }
        
        $page_info      =   $this->getLoopPageInfo();
        
        $post_index     =   $query->current_post;
        $first_on_page  =   $post_index === 0;
        $last_on_page   =   $post_index === count( $query->posts) - 1;
        $post_no        =   $post_index + 1;
        
        $info   =   [
            'abs_last' => $page_info['last'] && $last_on_page,
            'abs_first' => $page_info['first'] && $first_on_page,
            'abs_post_no' => ( $page_info['page_no'] - 1) * $this->getLimit() +  $post_no,
            'last' => ( $post_index === $query->max_num_pages - 1) && $last_on_page,
            'first' => $post_index === 0 && $first_on_page,
            'post_no' => $post_no,
            'post' => $query->post,
            'meta' => self::getSimplePostMeta( $query->post->ID)
        ];
        
        $this->_logger->debug( 'Got current post info ['.print_r( $info, true).']');
        
        return $info;
    }
    
    
    // QUERY
    /**
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $args               =   $this->_evaluateArgs();
        if ( !isset( $args['offset'])) {
            $this->_logger->debug( 'Offset not set, going to claculate it ...');
            $args['offset']     =   $this->_calculateOffset();
        }
        
        $args['paged']      =   true;
        
        if ( !isset( $this->_wpQuery) || $args != $this->_queryArgs ) {
            $this->_queryArgs   =   $args;
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->info( 'Got new query ['.print_r( $this->_wpQuery->request, true).']['.print_r( $this->_queryArgs, true).']');
        }
        return $this->_wpQuery;
    }
    
    private function _evaluateArgs()
    {
//         $this->_logger->debug( 'Got raw args ['.print_r( $this->_args, true).']');
        $args   =   [];
        foreach ( $this->_args as $key => $val) 
        {
            $key	=	$this->getService()->evaluateString( $key);
            $parsed =   $this->getService()->evaluateString( $val);
            
            if ( !ArrayUtil::isComplexKey( $key))
            {
                $args[$key] =   $parsed;
            }
            else
            {
                $root           =   ArrayUtil::getRootOfKey( $key);
                $final          =   ArrayUtil::setDeepObject( $key, $parsed, $args[$root] ?? []);
                $args[$root]    =   $final;
            }
        }
//         $this->_logger->debug( 'Got evaluated args ['.print_r( $args, true).']');
        return $args;
    }
    
    // PERSISTANT MODEL NAVI
    private function _getQueryModel()
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $model  =   $params->getServiceParam( self::PARAM_NAME_QUERY_MODEL);
        
        if ( empty( $model)) {
            $this->_logger->info( 'There is no saved model. Going to create default one.');
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
        $this->_logger->info( 'Saving query model ['.print_r( $model, true).']['.$this.']');
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $params->setServiceParam( self::PARAM_NAME_QUERY_MODEL, $model);
    }
    
    private function _calculateOffset()
    {
        $model  =   $this->_getQueryModel();
        $reset  =   $this->getService()->evaluateString( $this->_resetNaviVar);
        
        if ( $reset) {
            $this->_logger->info( 'Reseting navigation because ['.$this->_resetNaviVar.']['.$reset.'] evaluated to true');
            $this->resetNavi();
            $model  =   $this->_getQueryModel();
        }
        
        $offset =   $model['page_index'] * $this->getLimit();
        return $offset;
    }
    
    // ACCESSORS
    public function getLimit()
    {
        $args   =   $this->_evaluateArgs();
        return $args['posts_per_page'] ?? -1;
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
