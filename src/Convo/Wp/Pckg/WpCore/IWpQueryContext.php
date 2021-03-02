<?php

namespace Convo\Wp\Pckg\WpCore;


interface IWpQueryContext 
{
    
    
    // QUERY
    /**
     * @return \WP_Query
     */
    public function getWpQuery();
    
    /**
     * @return \Generator
     */
    public function getLoopIterator();
    
    // ACTIONS - PAGES
    public function moveNextPage();
    
    public function movePreviousPage();
    
    public function resetNavi();
    
    // ACTIONS - POSTS SELECTION
    public function selectPagePost( $index);
    
    public function selectLastPagePost();
    
    public function selectPreviousPost();
    
    public function selectNextPost();
    
    public function restoreSelectedPost();
    
    // INFO
    public function getLoopPageInfo();
    
    public function getLoopPostInfo();
    

}
