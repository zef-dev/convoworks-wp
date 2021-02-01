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

    private $_dataCollection;
    private $_item;
    private $_skipReset;

    /**
     * @var IRequestFilter[]
     */
    private $_filters  =   [];
    
    public function __construct( $properties,
        \Convo\Core\ConvoServiceInstance $service,
        \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {
        parent::__construct( $properties);
        $this->setService( $service);
        $this->_packageProviderFactory    =   $packageProviderFactory;
        
        $this->_dataCollection  =   $properties['posts_info_var'];
        $this->_item            =   $properties['single_post_info_var'];
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
            $this->_noPrevious[]  =   $element;
            $this->addChild( $element);
        }
        
        // SELECT
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
        
//         // put myself as last filter - not to catch dialogflow text
//         $this->_filters[] =   $this;
    }

    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        parent::read( $request, $response);
        
        $query      =   WpQueryContext::getWpQuery( $this->_contextId, $this->getService());
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        
        foreach ( $query->posts as $post) 
        {
            /** @var \WP_Post $post */
            
            $req_params->setServiceParam( 'post', $post); // single_post_info_var
            
            foreach ( $this->_eachPost as $element) {
                $element->read( $request, $response);
            }
        }
    }
    
    
    public function run( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $result     =   $this->_getFilerResult( $request);

        if ( $result->isEmpty()) {
            $this->_logger->debug( 'Not targeted request. Failing back to defaults ...');
            parent::run( $request, $response);
            return ;
        }

        $action     =   $result->getSlotValue( 'action');
        $context    =   WpQueryContext::getWpQueryContext( 'search_posts', $this->getService()); // context_id
        
        switch ( $action)
        {
            case self::ACTION_TYPE_NEXT:
                
                try {
                    $context->moveNextPage();
                    parent::read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->info( $e->getMessage());
                    foreach ( $this->_noNext as $element) {
                        $element->read( $request, $response);
                    }
                }
                break;
                
            case self::ACTION_TYPE_SELECT:
                
                $index  =   intval( $result->getSlotValue(' selected'));
                
                try {
                    $context->selectPagePost( $index);
                    foreach ( $this->_postSelected as $element) {
                        $element->read( $request, $response);
                    }
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->info( $e->getMessage());
                    foreach ( $this->_noSelected as $element) {
                        $element->read( $request, $response);
                    }
                }
                break;
        }
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
    
    private function _getStatus( $items)
    {
        $items         =   $this->getItems();
        $slot_name     =   $this->evaluateString( $this->_item);
        $skip_reset    =   $this->evaluateString( $this->_skipReset);

        $block_params  =   $this->getBlockParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_INSTALLATION);
        $req_params    =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $returning     =   $req_params->getServiceParam( 'returning');

        $this->_logger->debug( 'Got returning ['.$returning.']');
        $this->_logger->debug( 'Got skip reset ['.$skip_reset.']');

        if ( !$returning && !$skip_reset) {
            $this->_logger->debug( 'Reset array iterration status when coming first time');
            $block_params->setServiceParam( $slot_name, $this->_getDefaultStatus( $items));
        }

        $status        =   $block_params->getServiceParam( $slot_name);
        $this->_logger->debug( 'Got loop status ['.print_r( $status, true).']');
        if ( empty( $status)) {
            $status    =   $this->_getDefaultStatus( $items);
        }

        $this->_logger->debug( 'Returning loop status ['.print_r( $status, true).']');

        return $status;
    }

    private function _getDefaultStatus( $items) {

        $start = $this->getOffset();

        $status    =   [
            'value' => null,
            'index' => $start,
            'natural' => $start + 1,
            'first' => true,
            'last' => !count( $items)
        ];
        return $status;
    }



    // UTIL
    public function __toString()
    {
        return parent::__toString().'[]';
    }
}
