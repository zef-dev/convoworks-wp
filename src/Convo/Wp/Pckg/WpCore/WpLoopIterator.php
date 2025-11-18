<?php

declare(strict_types=1);

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


    /**
     * @param \WP_Query $wpQuery
     */
    public function __construct($wpQuery)
    {
        $this->_wpQuery = $wpQuery;
    }

    // ITERABLE
    public function next()
    {
    }

    public function valid()
    {
        return $this->_wpQuery->have_posts();
    }

    public function current()
    {
        $this->_wpQuery->the_post();
        return $this->_wpQuery->post;
    }

    public function rewind()
    {
        $this->_wpQuery->rewind_posts();
    }

    public function key()
    {
        return $this->_wpQuery->current_post;
    }

    // COUNTABLE
    public function count()
    {
        return $this->_wpQuery->post_count;
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[' . $this->_wpQuery->current_post . '][' . $this->_wpQuery->post_count . ']';
    }
}
