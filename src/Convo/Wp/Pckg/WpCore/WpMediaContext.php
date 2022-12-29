<?php

namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\Media\Mp3File;
use Convo\Core\Workflow\AbstractMediaSourceContext;

class WpMediaContext extends AbstractMediaSourceContext
{
    const DEFAULT_MAX_RESULTS       =   100;
    
    
    private $_args =   [];

    private $_songUrl;
    private $_songTitle;
    private $_artist;
    private $_artworkUrl;
    
    private $_backgroundUrl;
    private $_defaultSongImageUrl;
    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        
        $this->_args                    =   $properties['args'];
        
        $this->_songUrl                 =   $properties['song_url'];
        $this->_songTitle               =   $properties['song_title'];
        $this->_artist                  =   $properties['artist'];
        $this->_artworkUrl              =   $properties['artwork_url'];
        
        $this->_backgroundUrl           =   $properties['background_url'];
        $this->_defaultSongImageUrl     =   $properties['default_song_image_url'];
    }
    
    
    // MEDIA
    public function getCount() : int 
    {
        $query  =   $this->getWpQuery();
        return $query->post_count;
    }
    
    
    // QUERY
    public function getSongs()
    {
        $query  =   $this->getWpQuery();
        $query->rewind_posts();
        while ( $query->have_posts())
        {
            $query->the_post();
            $post   =   $query->post;
            /** @var $post \WP_Post */
            
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

            yield new Mp3File( $url, $song_title, $artist, $artwork, $background);
        }
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
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $model              =   $this->_getQueryModel();
        $args               =   $this->_evaluateArgs();
        $args_changed       =   $args != $model['arguments'];
        
        if ( !isset( $this->_wpQuery) || $args_changed) 
        {
            if ( $args_changed) {
                $this->_logger->info( 'Arguments changed. SToring them and rewinding results ...');
                $model['arguments']     =   $args;
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
    
    protected function _evaluateArgs()
    {
        $args = $this->getService()->evaluateArgs( $this->_args, $this->getService());

        // DEFAULTS & FORCE
        $args['offset']             =   0;
        $args['paged']              =   true;
        
        if ( !isset( $args['posts_per_page']) || !is_numeric( $args['posts_per_page'])) {
            $args['posts_per_page']     =   self::DEFAULT_MAX_RESULTS;
        }
        
        return $args;
    }
    
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.json_encode( $this->_args).']';
    }
}
