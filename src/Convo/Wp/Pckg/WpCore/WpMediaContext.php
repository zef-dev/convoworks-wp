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
    const DEFAULT_MAX_RESULTS       =   20;
    
    private $_id;

    /**
     *
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;
    
    private $_args =   [];
    
    private $_defaultLoop;
    private $_defaultShuffle;

    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_id              =   $properties['id'];
        $this->_args            =   $properties['args'];
        $this->_defaultLoop     =   $properties['default_loop'];
        $this->_defaultShuffle  =   $properties['default_shuffle'];
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
        return $model['post_index'] >= $query->post_count - 1;
    }
    
    public function getCount() : int 
    {
        $query  =   $this->getWpQuery();
        return $query->found_posts;
    }
    
    public function next() : Mp3File 
    {
        $query      =   $this->getWpQuery();
        if ( $query->found_posts === 1 && $this->getLoopStatus()) {
            return $this->_getSong( 0);
        }
        
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
        return $model['song_offset'];
    }
    public function setOffset( $offset) {
        $model  =   $this->_getQueryModel();
        $model['song_offset'] = $offset;
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
    
    
    // INFO
    public function getMediaInfo() : array
    {
        $info   =   IMediaSourceContext::DEFAULT_MEDIA_INFO;
        
        // has to be before _getQueryModel() is called
        if ( !$this->isEmpty()) {
            $info['current'] = $this->current();
            try {
                $info['next'] = $this->next();
            } catch ( DataItemNotFoundException $e) {
                $this->_logger->debug( $e->getMessage());
            }
        }
        
        $model  =   $this->_getQueryModel();
        
        $info   =   array_merge( $info, [
            'count' => $this->getCount(),
            'last' => $this->isLast(),
            'first' => $model['post_index'] === 0,
            'song_no' => $model['post_index'] + 1,
            'loop_status' => $model['loop_status'],
            'shuffle_status' => $model['shuffle_status'],
        ]);
        
        $this->_logger->debug( 'Got current media info ['.print_r( $info, true).']');
        
        return $info;
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
                    $this->_logger->notice( $e->getMessage());
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
        $model              =   $this->_getQueryModel();
        $args               =   $this->_evaluateArgs();
        $args_changed       =   $args != $model['arguments'];
        
        if ( !isset( $this->_wpQuery) || $args_changed) {
            
            if ( $args_changed) {
                $this->_logger->info( 'Arguments changed. Rewinding results ...');
                $model['arguments']     =   $args;
                $model['post_index']    =   0;
                $this->_saveQueryModel( $model);
            }
            
            $this->_queryArgs   =   $args;
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->info( 'Got new query with ['.$this->_wpQuery->found_posts.'] results');
            $this->_logger->debug( 'Got new query ['.print_r( $this->_wpQuery->request, true).']['.print_r( $this->_queryArgs, true).']');
        }
        
        return $this->_wpQuery;
    }
    
    private function _evaluateArgs()
    {
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
        
        // DEFAULTS & FORCE
        $args['offset']             =   0;
        $args['paged']              =   true;
        
        if ( !isset( $args['posts_per_page']) || !is_int( isset( $args['posts_per_page']))) {
            $args['posts_per_page']     =   self::DEFAULT_MAX_RESULTS;
        }
        
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
                'post_index' => 0,
                'loop_status' => empty( $this->_defaultLoop) ? false : $this->getService()->evaluateString( $this->_defaultLoop),
                'shuffle_status' => empty( $this->_defaultShuffle) ? false : $this->getService()->evaluateString( $this->_defaultShuffle),
                'song_offset' => 0,
                'arguments' => $this->_evaluateArgs(),
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
