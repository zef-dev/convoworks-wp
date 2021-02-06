<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Core\Workflow\DefaultFilterResult;

class WpLoopPageBlock extends \Convo\Pckg\Core\Elements\ConversationBlock
{
    const ACTION_TYPE_NEXT          =   'next';
    const ACTION_TYPE_PREVIOUS      =   'previous';
    const ACTION_TYPE_SELECT        =   'select';
    const ACTION_TYPE_SELECT_LAST   =   'select_last';
    const ACTION_TYPE_START_OVER    =   'start_over';
    
    /**
     * @var \Convo\Core\Factory\PackageProviderFactory
     */
    private $_packageProviderFactory;
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_eachPost      =   array();

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_postSelected  =   array();

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noSelected    =	array();

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noNext        =	array();

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noPrevious    =	array();

    private $_contextId;
    private $_postsPageVar;
    private $_singlePostVar;
    private $_skipReset;

    /**
     * @var IRequestFilter[]
     */
    private $_filters  =   [];
    
    public function __construct( $properties,
        \Convo\Core\ConvoServiceInstance $service,
        \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {
        $this->setService( $service);
        $this->_packageProviderFactory    =   $packageProviderFactory;
        
        parent::__construct( $properties);
        
        $this->_contextId		=	$properties['context_id'];
        $this->_postsPageVar    =   $properties['posts_info_var'];
        $this->_singlePostVar   =   $properties['single_post_info_var'];
        $this->_skipReset       =   $properties['skip_reset'];

        foreach ( $properties['each_post'] as $element) {
            $this->_eachPost[]      =   $element;
            $this->addChild( $element);
        }

        foreach ( $properties['post_selected'] as $element) {
            $this->_postSelected[]  =   $element;
            $this->addChild( $element);
        }

        foreach ( $properties['no_selected'] as $element) {
            $this->_noSelected[]    =   $element;
            $this->addChild( $element);
        }

        foreach ( $properties['no_next'] as $element) {
            $this->_noNext[]        =   $element;
            $this->addChild( $element);
        }

        foreach ( $properties['no_previous'] as $element) {
            $this->_noPrevious[]    =   $element;
            $this->addChild( $element);
        }
        
        // SELECT NO
        $readers    =   [];
        $reader     =   new \Convo\Pckg\Core\Filters\ConvoIntentReader( [
            'intent' => 'convo-wp-posts.SelectPostIntent',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT 
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger( $this->_logger);
        $reader->setService( $this->getService());
        $readers[]    =   $reader;
        
        $filter =   new \Convo\Pckg\Core\Filters\IntentRequestFilter( [
            'readers' => $readers
        ]);
        $filter->setLogger( $this->_logger);
        $filter->setService( $this->getService());
        $this->addChild( $filter);
        $this->_filters[] =   $filter;

        // SELECT LAST
        $readers    =   [];
        $reader     =   new \Convo\Pckg\Core\Filters\ConvoIntentReader( [
            'intent' => 'convo-wp-posts.SelectLastIntent',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT_LAST 
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger( $this->_logger);
        $reader->setService( $this->getService());
        $readers[]    =   $reader;
        
        $filter =   new \Convo\Pckg\Core\Filters\IntentRequestFilter( [
            'readers' => $readers
        ]);
        $filter->setLogger( $this->_logger);
        $filter->setService( $this->getService());
        $this->addChild( $filter);
        $this->_filters[] =   $filter;
        
        // START OVER
        $readers    =   [];
        $reader     =   new \Convo\Pckg\Core\Filters\ConvoIntentReader( [
            'intent' => 'convo-core.StartOverIntent',
            'values' => [
                'action' => self::ACTION_TYPE_START_OVER 
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger( $this->_logger);
        $reader->setService( $this->getService());
        $readers[]    =   $reader;
        
        $filter =   new \Convo\Pckg\Core\Filters\IntentRequestFilter( [
            'readers' => $readers
        ]);
        $filter->setLogger( $this->_logger);
        $filter->setService( $this->getService());
        $this->addChild( $filter);
        $this->_filters[] =   $filter;
        
        // PREVOIUS PAGE
        $readers    =   [];
        $reader     =   new \Convo\Pckg\Core\Filters\ConvoIntentReader( [
            'intent' => 'convo-core.PreviousIntent',
            'values' => [
                'action' => self::ACTION_TYPE_PREVIOUS
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger( $this->_logger);
        $reader->setService( $this->getService());
        $readers[]    =   $reader;
        
        $filter =   new \Convo\Pckg\Core\Filters\IntentRequestFilter( [
            'readers' => $readers
        ]);
        $filter->setLogger( $this->_logger);
        $filter->setService( $this->getService());
        $this->addChild( $filter);
        $this->_filters[] =   $filter;
        
        // NEXT PAGE
        $readers    =   [];
        $reader     =   new \Convo\Pckg\Core\Filters\ConvoIntentReader( [
            'intent' => 'convo-core.NextIntent',
            'values' => [
                'action' => self::ACTION_TYPE_NEXT
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger( $this->_logger);
        $reader->setService( $this->getService());
        $readers[]    =   $reader;
        
        $filter =   new \Convo\Pckg\Core\Filters\IntentRequestFilter( [
            'readers' => $readers
        ]);
        $filter->setLogger( $this->_logger);
        $filter->setService( $this->getService());
        $this->addChild( $filter);
        $this->_filters[] =   $filter;
    }

    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $this->_checkReset();
        
        // inject pagination info to be available for block elements (parent)
        $this->_injectCurrentPageInfo();
        
        parent::read( $request, $response);
        
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        
        $this->_logger->info( 'Starting loop');
        
        $iterator   =   $context->getIterator();
        foreach ( $iterator as $post)  
        {
            $req_params->setServiceParam( 
                $this->evaluateString( $this->_singlePostVar), 
                $context->getLoopPostInfo());
            
            foreach ( $this->_eachPost as $element) {
                $element->read( $request, $response);
            }
        }
    }
    
    public function run( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $this->_checkReset();
        $this->_injectCurrentPageInfo();
        
        $result     =   $this->_getFilerResult( $request);
        
        if ( $result->isEmpty()) {
            $this->_logger->debug( 'Not targeted request. Failing back to defaults ...');
            parent::run( $request, $response);
            return ;
        }

        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        
        // HANDLE ACTION
        $action     =   $result->getSlotValue( 'action');
        $this->_logger->debug( 'Checking requested action ['.$action.']');
        
        switch ( $action)
        {
            // PAGINATION
            case self::ACTION_TYPE_NEXT:
                
                try {
                    $context->moveNextPage();
                    $this->read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->notice( $e->getMessage());
                    foreach ( $this->_noNext as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;

            case self::ACTION_TYPE_PREVIOUS:
                
                try {
                    $context->movePreviousPage();
                    $this->read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->notice( $e->getMessage());
                    foreach ( $this->_noPrevious as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
            
            // POST SELECTION
            case self::ACTION_TYPE_SELECT:
                
                // we have 2 utterance variatins
                $selected  =   $result->isSlotEmpty( 'selected') ? 
                                    $result->getSlotValue( 'selectedNumber') : 
                                    $result->getSlotValue( 'selected');
                $this->_logger->debug( 'Found selected value ['.$selected.']');
                $index  =   intval( $selected) - 1;
                $this->_logger->info( 'Selecting page post ['.$index.']');
                
                try {
                    $context->selectPagePost( $index);
                    $req_params->setServiceParam( 
                        $this->evaluateString( $this->_singlePostVar), 
                        $context->getLoopPostInfo());
                    foreach ( $this->_postSelected as $element) {
                        $element->read( $request, $response);
                    }
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->notice( $e->getMessage());
                    foreach ( $this->_noSelected as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
                
            case self::ACTION_TYPE_SELECT_LAST:
                
                $query      =   $context->getWpQuery();
                $index      =   $query->post_count - 1;
                $this->_logger->debug( 'Selecting last page post ['.$index.']');
                $context->selectPagePost( $index);
                $req_params->setServiceParam( 
                    $this->evaluateString( $this->_singlePostVar), 
                    $context->getLoopPostInfo());
                foreach ( $this->_postSelected as $element) {
                    $element->read( $request, $response);
                }
                return;
        }
        
        $this->_logger->notice( 'No match found for action ['.$action.']. Failing back to defaults ...');
        parent::run( $request, $response);
    }
    
    /**
     * Reset navigation when coming for first time on the block. Except if skip reset signal is set.
     */
    private function _checkReset()
    {
        $skip_reset    =   $this->evaluateString( $this->_skipReset);
        $req_params    =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $returning     =   $req_params->getServiceParam( 'returning');
        
        $this->_logger->debug( 'Got returning ['.$returning.'] skip reset ['.$skip_reset.']');
        
        if ( !$returning && !$skip_reset) {
            $this->_logger->info( 'Reset loop navi status returning ['.$returning.'] skip reset ['.$skip_reset.']');
            $context    =   WpQueryContext::getWpQueryContext( 
                                $this->evaluateString( $this->_contextId), 
                                $this->getService());
            $context->resetNavi();
        }
    }
    
    private function _injectCurrentPageInfo()
    {
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        
        $req_params->setServiceParam( 
            $this->evaluateString( $this->_postsPageVar), 
            $context->getLoopPageInfo());
    }

    /**
     * @param \Convo\Core\Workflow\IConvoRequest $request
     * @return IRequestFilterResult
     */
    private function _getFilerResult( \Convo\Core\Workflow\IConvoRequest $request)
    {
        foreach ( $this->_filters as $filter) {
            if ( $filter->accepts( $request)) {
                $result =   $filter->filter( $request);
                if ( !$result->isEmpty()) {
                    return $result;
                }
            }
        }
        
        return new DefaultFilterResult();
    }
    
    private function _buildPagePostInfo( $index)
    {
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $page_info  =   $context->getLoopPageInfo();
        $query      =   $context->getWpQuery();
        
        $first_on_page  =   $index === 0;
        $last_on_page   =   $index === count( $query->posts) - 1;
        $post_no        =   $index + 1;
        
        $post_info   =   [
            'post' => $query->posts[$index],
            'abs_last' => $page_info['last'] && $last_on_page,
            'abs_first' => $page_info['first'] === 0 && $first_on_page,
            'abs_post_no' => ( $page_info['page_no'] - 1) * $context->getLimit() +  $post_no,
            'last' => $last_on_page,
            'first' => $first_on_page,
            'post_no' => $post_no,
            'meta' => WpQueryContext::getSimplePostMeta( $query->posts[$index]->ID)
//             'meta' => get_metadata( 'post', $query->posts[$index]->ID)
        ];
        
        $this->_logger->debug( 'Got page post info ['.print_r( $post_info, true).']');
        
        return $post_info;
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_contextId.']['.$this->_postsPageVar.']['.$this->_singlePostVar.']['.$this->_skipReset.']';
    }
}
