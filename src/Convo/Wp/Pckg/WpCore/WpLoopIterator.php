<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;


/**
 * @author Tole
 */
class WpLoopIterator implements \Iterator, \Countable
{
    /**
     * @var \WP_Query
     */
    private $_wpQuery;
    
    private $_index =   0;
    
    /**
     * @param \WP_Query $wpQuery
     */
    public function __construct( $wpQuery)
    {
        $this->_wpQuery =   $wpQuery;
    }
    
    // ITERABLE
    public function next()
    {
        $this->_index++;
    }

    public function valid()
    {
        return isset( $this->_wpQuery->posts[$this->_index]);
    }

    public function current()
    {
        $current            =   $this->_wpQuery->posts[$this->_index];
        $GLOBALS['post']    =   $current;
        setup_postdata( $current);
        return $current;
    }

    public function rewind()
    {
        $this->_index   =   0;
        $this->current();
    }

    public function key()
    {
        return $this->_index;
    }
    
    // COUNTABLE
    public function count()
    {
        return $this->_wpQuery->post_count;
    }
    
    // UTIL
    public function __toString() {
        return get_class( $this).'['.$this->_index.']';
    }



   
}