<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;


use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\DefaultFilterResult;
use Convo\Core\Workflow\IRequestFilterResult;

class WpLoopPostBlock extends \Convo\Pckg\Core\Elements\ConversationBlock
{

    const ACTION_TYPE_NEXT          =   'next';
    const ACTION_TYPE_PREVIOUS      =   'previous';
    
    
    /**
     * @var \Convo\Core\Factory\PackageProviderFactory
     */
    private $_packageProviderFactory;
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noNext        =	array();
    
    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noPrevious    =	array();

    private $_contextId;
    private $_statusVar;

    /**
     * @var IRequestFilter
     */
    private $_filters  =   [];
    
    public function __construct( $properties,
        \Convo\Core\ConvoServiceInstance $service,
        \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {
        $this->setService( $service);
        $this->_packageProviderFactory    =   $packageProviderFactory;
        
        parent::__construct( $properties);

        $this->_contextId   =   $properties['context_id'];
        $this->_statusVar   =   $properties['status_var'];

        foreach ( $properties['no_next'] as $element) {
            $this->_noNext[]        =   $element;
            $this->addChild( $element);
        }
        
        foreach ( $properties['no_previous'] as $element) {
            $this->_noPrevious[]    =   $element;
            $this->addChild( $element);
        }
        
        
        // PREVOIUS POST
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
        
        // NEXT POST
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
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $post_info  =   $context->getCurrentPostInfo();
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $req_params->setServiceParam( $this->evaluateString( $this->_statusVar), $post_info);
        
        parent::read( $request, $response);
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::run()
     */
    public function run( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $result     =   $this->_getFilerResult( $request);
        
        if ( $result->isEmpty()) {
            $this->_logger->debug( 'Not targeted request. Failing back to defaults ...');
            parent::run( $request, $response);
            return ;
        }
        
        $action     =   $result->getSlotValue( 'action');
        $this->_logger->debug( 'Checking requested action ['.$action.']');
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        
        $post_info   =   $context->getCurrentPostInfo();
        $req_params =   $this->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $req_params->setServiceParam( $this->evaluateString( $this->_postsPageVar), $post_info);
        
        switch ( $action)
        {
            case self::ACTION_TYPE_NEXT:
                
                try {
                    $context->movePreviousPost();
                    parent::read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->info( $e->getMessage());
                    foreach ( $this->_noNext as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
                
            case self::ACTION_TYPE_PREVIOUS:
                
                try {
                    $context->movePreviousPost();
                    parent::read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->info( $e->getMessage());
                    foreach ( $this->_noPrevious as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
                
        }
        
        $this->_logger->notice( 'No match found for action ['.$action.']. Failing back to defaults ...');
        parent::run( $request, $response);
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


    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_contextId.']';
    }
}
