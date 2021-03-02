<?php

namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\DataItemNotFoundException;
use Convo\Core\Media\IAudioFile;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IMediaSourceContext;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\Media\Mp3File;

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

    private $_songUrl;
    private $_songTitle;
    private $_artist;
    private $_artworkUrl;
    
    private $_backgroundUrl;
    
    private $_defaultSongImageUrl;
    private $_defaultLoop;
    private $_defaultShuffle;
    private $_resetNaviVar;
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_id                      =   $properties['id'];
        $this->_args                    =   $properties['args'];
        
        $this->_songUrl                 =   $properties['song_url'];
        $this->_songTitle               =   $properties['song_title'];
        $this->_artist                  =   $properties['artist'];
        $this->_artworkUrl              =   $properties['artwork_url'];
        
        $this->_backgroundUrl           =   $properties['background_url'];
        
        $this->_defaultSongImageUrl     =   $properties['default_song_image_url'];
        $this->_defaultLoop             =   $properties['default_loop'];
        $this->_defaultShuffle          =   $properties['default_shuffle'];
        
        $this->_resetNaviVar            =   $properties['resetNaviVar'];
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
        return $query->post_count;
    }
    
    public function next() : IAudioFile 
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
    
    public function current() : IAudioFile {
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
            $previous   =   $query->post_count - 1;
        }
        $model['post_index'] = $previous;
        $this->_saveQueryModel( $model);
    }
    
    public function moveNext() {
        $query  =   $this->getWpQuery();
        $model  =   $this->_getQueryModel();
        $next   =   $model['post_index'] + 1;
        if ( $next > $query->post_count - 1) {
            if ( !$model['loop_status']) {
                throw new DataItemNotFoundException( 'Can\'t move next. Already at last result ['.$query->post_count.']');
            }
            $next   =   0;
        }
        $model['post_index'] = $next;
        $this->_saveQueryModel( $model);
    }
    
    public function rewind() {
        $model  =   $this->_getQueryModel();
        $model['post_index'] = 0;
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
    
    public function setShuffleStatus( $shuffleStatus) {
        $model  =   $this->_getQueryModel();
        $model['shuffle_status'] = $shuffleStatus;
        if ( $shuffleStatus) {
            $this->_logger->info( 'Reseting post index and shuffling playlist');
            $model['post_index'] = 0;
            shuffle( $model['playlist']);
        } else {
            $real_index             =   $model['playlist'][$model['post_index']];
            $this->_logger->info( 'Using real post index ['.$real_index.']');
            $model['post_index']    =   $real_index;
            sort( $model['playlist']);
        }
        $this->_saveQueryModel( $model);
    }
    public function getShuffleStatus() : bool {
        $model  =   $this->_getQueryModel();
        return $model['shuffle_status'];
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
     * @return \Convo\Core\Media\IAudioFile
     */
    private function _getSong( $index)
    {
        $model      =   $this->_getQueryModel();
        $real_index =   $model['playlist'][$index];

        $this->_logger->info( 'Getting song ['.$index.'] with real index ['.$real_index.']');
        
        $iterator   =   $this->getLoopIterator();
        
        foreach ( $iterator as $i => $post)
        {
            /** @var $post \WP_Post */
            $this->_logger->debug( 'Checking page post ['.$post->post_title.'] index ['.$i.']['.$real_index.']');
            
            if ( $i === $real_index) 
            {
                $meta       =   wp_get_attachment_metadata( $post->ID);
//                 $this->_logger->debug( 'Post attachment meta ['.print_r( wp_get_attachment_metadata( $post->ID), true).']');
                
                $url        =   $this->_evaluateStringWithPost( $this->_songUrl, $post);
                $url        =   $url ? $url : wp_get_attachment_url( $post->ID);
                
                $song_title =   $this->_evaluateStringWithPost( $this->_songTitle, $post);
                $song_title =   $song_title ? $song_title : $meta['title'] ?? null;
                $song_title =   $song_title ? $song_title : $post->post_title;
                
                $artist     =   $this->_evaluateStringWithPost( $this->_artist, $post);
                $artist     =   $artist ? $artist : $meta['artist'] ?? null;
                $artist     =   is_numeric( $artist) || empty( $artist) ? ($meta['album'] ?? null) : $artist;
                
                $artwork    =   $this->_evaluateStringWithPost( $this->_artworkUrl, $post);
                $artwork    =   $artwork ? $artwork : get_the_post_thumbnail_url();
                $artwork    =   $artwork ? $artwork : $this->_evaluateStringWithPost( $this->_defaultSongImageUrl, $post);
                
                $background =   $this->_evaluateStringWithPost( $this->_backgroundUrl, $post);
                $this->_logger->info( 'Returning song ['.$url.']['.$song_title.']['.$artist.']['.$artwork.']['.$background.']');
                return new Mp3File( $url, $song_title, $artist, $artwork, $background);
            }
        }
        throw new DataItemNotFoundException( 'Could not find post by real index ['.$real_index.']');
    }
    
    /**
     * Evaluates string in service context, with additional "post" placed in evaluation context.
     * @param string $str
     * @param \WP_Post $post
     * @return string
     */
    private function _evaluateStringWithPost( $str, \WP_Post $post) {
        return $this->getService()->evaluateString( $str, ['post' => $post]);
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
        
        if ( !isset( $this->_wpQuery) || $args_changed) 
        {
            $reset  =   $this->getService()->evaluateString( $this->_resetNaviVar);
            
            if ( $args_changed) {
                $this->_logger->info( 'Arguments changed. SToring them and rewinding results ...');
                $model['arguments']     =   $args;
                $model['post_index']    =   0;
            } else if ( $reset) {
                $this->_logger->info( 'Reset navi signal. Rewinding results ...');
                $model['post_index']    =   0;
            }
            
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->info( 'Got new query with ['.$this->_wpQuery->found_posts.'] results');
            $this->_logger->debug( 'Query data ['.print_r( $this->_wpQuery->request, true).']['.print_r( $args, true).']');
            
            $count_changed      =   count( $model['playlist']) !== $this->_wpQuery->post_count; 
            
            if ( $this->_wpQuery->found_posts <= 0) {
                $model['playlist']  =   [];
            } else if ( $args_changed || $count_changed) {
                if ( $count_changed) {
                    $this->_logger->warning( 'Generating playlist because model and query count are different');
                } else {
                    $this->_logger->info( 'Generating playlist because arguments were changed');
                }
                
                $model['playlist'] = range( 0, $this->_wpQuery->post_count- 1);
                if ( $model['shuffle_status']) {
                    $this->_logger->info( 'Shuffling playlist');
                    shuffle( $model['playlist']);
                }
            }
            
            $this->_saveQueryModel( $model);
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
                'playlist' => [],
                'song_offset' => 0,
                'arguments' => [],
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
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_id.']['.json_encode( $this->_args).']';
    }
}
