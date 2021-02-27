<?php

namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\DataItemNotFoundException;
use Convo\Core\Media\Mp3File;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IMediaSourceContext;
use wapmorgan\Mp3Info\Mp3Info;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\ComponentNotFoundException;
use Convo\Core\ConvoServiceInstance;

class WpMediaContext extends AbstractBasicComponent implements IMediaSourceContext
{
    const PARAM_NAME_QUERY_MODEL    =   'query_model';

    private $_id;

    /** @var boolean */
    private $_shouldMovePonter = true;

    /**
     * @var array
     */
    private $_searchQuery = [];

    /**
     *
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;
    
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
     * @return IMediaSourceContext
     */
    public function getComponent()
    {
        return $this;
    }
    
    
    // MEDIA
    public function isEmpty() : bool 
    {
        return empty( $this->getCount());
    }
    
    public function isLast() : bool 
    {
        $query          =   $this->getWpQuery();
        $model          =   $this->_getQueryModel();
        $post_index     =   $query->current_post;
        $page_index     =   $model['page_index'];
        $last_on_page   =   $post_index === count( $query->posts) - 1;
        $last_page      =   $page_index === $query->max_num_pages - 1;
        return $last_page && $last_on_page;
    }
    
    public function getCount() : int 
    {
        $query  =   $this->getWpQuery();
        return $query->found_posts;
    }
    
    public function next() : Mp3File 
    {
        if ( $this->isLast()) {
            if ( !$this->getLoopStatus()) {
                throw new DataItemNotFoundException( 'Can\'t get next. Loop is off and we are on the last result.');
            }
            return $this->_getSong( 0);
        }
        $model      =   $this->_getQueryModel();
        return $this->_getSong( $model['post_index'] + 1);
    }
    
    public function current() : Mp3File {
        $model      =   $this->_getQueryModel();
        return $this->_getSong( $model['post_index']);
    }
    
    public function movePrevious() {
        $model      =   $this->_getQueryModel();
        $previous   =   $model['post_index'] - 1;
        if ( $previous < 0) {
            if ( !$model['loop_status']) {
                throw new DataItemNotFoundException( 'Can\'t move previous. Already at last first result');
            }
            $query      =   $this->getWpQuery();
            $previous   =   $query->found_posts - 1;
        }
        $model['post_index'] = $previous;
        $this->_saveQueryModel( $model);
    }
    
    public function moveNext() {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['post_index'] + 1;
        if ( $next > $query->found_posts - 1) {
            if ( !$model['loop_status']) {
                throw new DataItemNotFoundException( 'Can\'t move next. Already at last result ['.$query->found_posts.']');
            }
            $next   =   0;
        }
        $model['post_index'] = $next;
        $this->_saveQueryModel( $model);
    }
    
    
    public function getOffset() : int {
        $model  =   $this->_getQueryModel();
        return $model['offset'];
    }
    public function setOffset( $offset) {
        $model  =   $this->_getQueryModel();
        $model['offset'] = $offset;
        $this->_saveQueryModel( $model);
    }
    
    public function setLoopStatus( $loopStatus) {
        $model  =   $this->_getQueryModel();
        $model['loop_status'] = $loopStatus;
        $this->_saveQueryModel( $model);
    }
    public function getLoopStatus() : bool {
        $model  =   $this->_getQueryModel();
        return $model['loop_status'];
    }
    
    
    
    
    // QUERY
    /**
     * @param int $index
     * @throws DataItemNotFoundException
     * @return \Convo\Core\Media\Mp3File
     */
    private function _getSong( $index)
    {
        $iterator   =   $this->getLoopIterator();
        
        foreach ( $iterator as $i => $post)
        {
            $this->_logger->debug( 'Checking page post ['.$post->post_title.'] index ['.$i.']['.$index.']');
            
            if ( $i === $index) {
                $meta       =   [];
                $path       =   get_attached_file( $post->ID);
                $url        =   wp_get_attachment_url( $post->ID);
                $filename   =   basename( $path);
                
                try {
                    $audio  =   new Mp3Info( $path, true);
                    $meta   =   $audio->tags;
                } catch ( \Exception $e) {
                    $this->_logger->warning( $e->getMessage());
                }
                
                return new Mp3File( $filename, $url, $meta, 'all');
            }
        }
        throw new DataItemNotFoundException( 'Could not find post by index ['.$index.']');
    }
    
    /**
     * @return \Generator
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
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $args               =   $this->_evaluateArgs();
        if ( !isset( $args['offset'])) {
            $args['offset']     =   $this->_calculateOffset();
            $this->_logger->debug( 'Offset not set, going to use claculated one ['.$args['offset'].']');
        }
        
        $args['paged']      =   true;
        
        if ( !isset( $this->_wpQuery) || $args != $this->_queryArgs ) {
            $this->_queryArgs   =   $args;
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->info( 'Got new query with ['.$this->_wpQuery->found_posts.'] results');
            $this->_logger->debug( 'Got new query ['.print_r( $this->_wpQuery->request, true).']['.print_r( $this->_queryArgs, true).']');
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
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_INSTALLATION, $this);
        $model  =   $params->getServiceParam( self::PARAM_NAME_QUERY_MODEL);
        
        if ( empty( $model)) {
            $this->_logger->info( 'There is no saved model. Going to create default one.');
            $model   =   [
                'page_index' => 0,
                'post_index' => 0,
                'loop_status' => false,
                'offset' => 0,
            ];
            $this->_saveQueryModel( $model);
        }
        
        return $model;
    }
    
    private function _saveQueryModel( $model)
    {
        $this->_logger->info( 'Saving query model ['.print_r( $model, true).']['.$this.']');
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_INSTALLATION, $this);
        $params->setServiceParam( self::PARAM_NAME_QUERY_MODEL, $model);
    }
    
    private function _calculateOffset()
    {
        $model  =   $this->_getQueryModel();
        $reset  =   $this->getService()->evaluateString( $this->_resetNaviVar);
        
        if ( $reset) {
            $this->_logger->info( 'Reseting navigation because ['.$this->_resetNaviVar.']['.$reset.'] evaluated to true');
            $model['page_index']    =   0;
            $this->_saveQueryModel( $model);
        }
        
        $args       =   $this->_evaluateArgs();
        $page_size  =   $args['posts_per_page'] ?? -1;
        
        if ( $page_size > 0) {
            $offset =   $model['page_index'] * $this->getLimit();
        } else {
            $offset =   0;
        }
        
        return $offset;
    }
    
    public function getLimit()
    {
        $args   =   $this->_evaluateArgs();
        return $args['posts_per_page'] ?? -1;
    }
    
    /**
     * @param string $contextId
     * @param ConvoServiceInstance $service
     * @throws ComponentNotFoundException
     * @return WpMediaContext
     */
    public static function getWpMediaContext( $contextId, $service)
    {
        $context    =   $service->getService()->findContext( $contextId);
        
        if ( is_a( $context, self::class)) {
            return $context;
        }
        throw new ComponentNotFoundException( 'Could not find context ['.$contextId.'] of type ['.self::class.']');
    }
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_id.']['.json_encode( $this->_args).']';
    }
}
