<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpCore;


use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\DefaultFilterResult;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Core\Preview\PreviewBlock;
use Convo\Core\Preview\PreviewSection;

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
    private $_postsPageVar;
    private $_singlePostVar;

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

        $this->_contextId       =   $properties['context_id'];
        $this->_postsPageVar    =   $properties['page_info_var'];
        $this->_singlePostVar   =   $properties['single_post_info_var'];

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
        $this->_injectCurrentPostInfo();
        
        parent::read( $request, $response);
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::run()
     */
    public function run( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $result     =   $this->_getFilerResult( $request);
        
        $this->_injectCurrentPostInfo();
        
        if ( $result->isEmpty()) {
            $this->_logger->debug( 'Not targeted request. Failing back to defaults ...');
            parent::run( $request, $response);
            return ;
        }
        
        $action     =   $result->getSlotValue( 'action');
        $this->_logger->debug( 'Checking requested action ['.$action.']');
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        
        switch ( $action)
        {
            case self::ACTION_TYPE_NEXT:
                
                try {
                    $context->selectNextPost();
                    $this->read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->notice( $e->getMessage());
                    $elements   =   empty( $this->_noNext) ? $this->getFallback() : $this->_noNext;
                    foreach ( $elements as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
                
            case self::ACTION_TYPE_PREVIOUS:
                
                try {
                    $context->selectPreviousPost();
                    $this->read( $request, $response);
                } catch ( NavigateOutOfRangeException $e) {
                    $this->_logger->notice( $e->getMessage());
                    $elements   =   empty( $this->_noPrevious) ? $this->getFallback() : $this->_noPrevious;
                    foreach ( $elements as $element) {
                        $element->read( $request, $response);
                    }
                }
                return;
                
        }
        
        $this->_logger->notice( 'No match found for action ['.$action.']. Failing back to defaults ...');
        parent::run( $request, $response);
    }
    
    private function _injectCurrentPostInfo()
    {
        $context    =   WpQueryContext::getWpQueryContext( $this->evaluateString( $this->_contextId), $this->getService());
        $context->restoreSelectedPost();
        
        $req_params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        
        $req_params->setServiceParam( $this->evaluateString( $this->_singlePostVar), $context->getLoopPostInfo());
        $req_params->setServiceParam( $this->evaluateString( $this->_postsPageVar), $context->getLoopPageInfo());
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
    
    
    public function getPreview()
    {
        $pblock = new PreviewBlock( $this->getName(), $this->getComponentId());
        $pblock->setLogger( $this->_logger);
        
        $section = new PreviewSection( 'Page info phase');
        $section->setLogger( $this->_logger);
        $section->collect( $this->getElements(), '\Convo\Core\Preview\IBotSpeechResource');
        if ( !$section->isEmpty()) {
            $pblock->addSection( $section);
        }
        
        foreach ( $this->getProcessors() as $processor)
        {
            $processor_section = new PreviewSection( 'Process - '.(new \ReflectionClass($processor))->getShortName().' ['.$processor->getId().']');
            $processor_section->setLogger( $this->_logger);
            
            $processor_section->collectOne( $processor, '\Convo\Core\Preview\IUserSpeechResource');
            $processor_section->collectOne( $processor, '\Convo\Core\Preview\IBotSpeechResource');
            
            if ( !$processor_section->isEmpty()) {
                $pblock->addSection( $processor_section);
            }
        }
        
        foreach ( $this->_filters as $filter)
        {
            $additional_readers = new PreviewSection( 'Additional intent readers');
            $additional_readers->setLogger( $this->_logger);
            $additional_readers->collectOne( $filter, '\Convo\Core\Preview\IUserSpeechResource');
            if ( !$additional_readers->isEmpty()) {
                $pblock->addSection( $additional_readers);
            }
        }
        
        $section = new PreviewSection( 'No previous');
        $section->setLogger( $this->_logger);
        $section->collect( $this->_noPrevious, '\Convo\Core\Preview\IBotSpeechResource');
        if ( !$section->isEmpty()) {
            $pblock->addSection( $section);
        }
        
        $section = new PreviewSection( 'No next');
        $section->setLogger( $this->_logger);
        $section->collect( $this->_noNext, '\Convo\Core\Preview\IBotSpeechResource');
        if ( !$section->isEmpty()) {
            $pblock->addSection( $section);
        }
        
        $section = new PreviewSection( 'Fallback');
        $section->setLogger( $this->_logger);
        $section->collect( $this->getFallback(), '\Convo\Core\Preview\IBotSpeechResource');
        if ( !$section->isEmpty()) {
            $pblock->addSection( $section);
        }
        
        return $pblock;
    }


    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_contextId.']['.$this->_singlePostVar.']';
    }
}
