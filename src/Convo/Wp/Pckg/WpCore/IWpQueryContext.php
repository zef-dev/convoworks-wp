<?php

namespace Convo\Wp\Pckg\WpCore;


/**
 * @author Tole
 *
 * WpQuery context serves for navigating and looping through WP_Query in a conversational manner. That means that the 
 * paging and selection information is preserved through session.
 * The selection has to be implemented in such way that the wp post functions can work as in the loop. 
 */
interface IWpQueryContext 
{
    
    
    // QUERY
    /**
     * @return \WP_Query
     */
    public function getWpQuery();
    
    /**
     * Returns iterator over the current wp query.
     * @return \Generator
     */
    public function getLoopIterator();
    
    // ACTIONS - PAGES
    /**
     * Moves page pointer to the next page. If not available, will throw exception.
     * @throws NavigateOutOfRangeException
     */
    public function moveNextPage();
    
    /**
     * Moves page pointer to the previous page. If not available, will throw exception.
     * @throws NavigateOutOfRangeException
     */
    public function movePreviousPage();
    
    /**
     * Resets both the pagination and selection to initial state.
     */
    public function resetNavi();
    
    // ACTIONS - POSTS SELECTION
    /**
     * Selects current page post. If post at the given index does not exists, will throw exception.
     * @param int $index
     * @throws NavigateOutOfRangeException
     */
    public function selectPagePost( $index);
    
    /**
     * Selects last post on the current page.
     * @param int $index
     */
    public function selectLastPagePost();
    
    /**
     * Selects previous post if available. If the previous post is on previous page, it will move the page pointer too.
     * @throws NavigateOutOfRangeException
     */
    public function selectPreviousPost();
    
    /**
     * Selects next post if available. If the next post is on the next page, it will move the page pointer too.
     * @throws NavigateOutOfRangeException
     */
    public function selectNextPost();
    
    /**
     * Selects last selected post again - making it the current in the loop.
     */
    public function restoreSelectedPost();
    
    // INFO
    /**
     * Returns loop page info array.
     * @return array
     */
    public function getLoopPageInfo();
    
    /**
     * Returns loop post info array.
     * @return array
     */
    public function getLoopPostInfo();
    

}
