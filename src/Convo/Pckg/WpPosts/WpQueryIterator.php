<?php

namespace ConvoPlugin\Convo\Pckg\WpPosts;


class WpQueryIterator implements \Iterator
{
    
    /**
     * @var \WP_Query
     */
    private $_wpQuery;

    public function __construct( $query)
    {
        $this->_wpQuery =   $query;
    }

    
    // ITERATOR - PAGE POSTS
    public function next()
    {
        $this->_wpQuery->the_post();
    }
    
    /**
     * @return boolean
     */
    public function valid()
    {
        return $this->_wpQuery->have_posts();
    }
    
    /**
     * @return \WP_Post
     */
    public function current()
    {
        return $this->_wpQuery->post;
    }
    
    public function rewind()
    {
        $this->_wpQuery->rewind_posts();
    }
    
    /**
     * @return int
     */
    public function key()
    {
        return $this->_wpQuery->current_post;
    }
    
    // UTIL
    public function __toString()
    {
        return get_class( $this).'['.$this->_wpQuery->request.']';
    }


}
