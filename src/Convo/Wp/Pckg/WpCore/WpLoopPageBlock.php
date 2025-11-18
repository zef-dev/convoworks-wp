<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Core\Workflow\DefaultFilterResult;

class WpLoopPageBlock extends \Convo\Pckg\Core\Elements\ConversationBlock
{
    public const ACTION_TYPE_NEXT = 'next';
    public const ACTION_TYPE_PREVIOUS = 'previous';
    public const ACTION_TYPE_SELECT = 'select';
    public const ACTION_TYPE_SELECT_LAST = 'select_last';
    public const ACTION_TYPE_START_OVER = 'start_over';

    /**
     * @var \Convo\Core\Factory\PackageProviderFactory
     */
    private $_packageProviderFactory;

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_eachPost = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_afterLoop = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_postSelected = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noSelected = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noNext = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_noPrevious = [];

    private $_contextId;
    private $_postsPageVar;
    private $_singlePostVar;

    /**
     * @var IRequestFilter[]
     */
    private $_filters = [];

    public function __construct(
        $properties,
        \Convo\Core\ConvoServiceInstance $service,
        \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory
    ) {
        $this->setService($service);
        $this->_packageProviderFactory = $packageProviderFactory;

        parent::__construct($properties);

        $this->_contextId = $properties['context_id'];
        $this->_postsPageVar = $properties['page_info_var'];
        $this->_singlePostVar = $properties['single_post_info_var'];

        foreach ($properties['each_post'] as $element) {
            $this->_eachPost[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['after_loop'] as $element) {
            $this->_afterLoop[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['post_selected'] as $element) {
            $this->_postSelected[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['no_selected'] as $element) {
            $this->_noSelected[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['no_next'] as $element) {
            $this->_noNext[] = $element;
            $this->addChild($element);
        }

        foreach ($properties['no_previous'] as $element) {
            $this->_noPrevious[] = $element;
            $this->addChild($element);
        }

        // SELECT NO
        $readers = [];
        $reader = new \Convo\Pckg\Core\Filters\ConvoIntentReader([
            'intent' => 'convo-wp-core.SelectPostIntent',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new \Convo\Pckg\Core\Filters\PlatformIntentReader([
            'intent' => 'Alexa.Presentation.APL.UserEvent',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT,
                'selected' => '${request.selectedOption}'
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new \Convo\Pckg\Core\Filters\PlatformIntentReader([
            'intent' => 'actions.intent.OPTION',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT,
                'selected' => '${request.selectedOption}'
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;
        $reader = new \Convo\Pckg\Alexa\Filters\AplUserEventReader([
            'values' => [
                'action' => self::ACTION_TYPE_SELECT,
                'selected' => '${aplArguments[0]["selected_list_item_key"]}'
            ],
            'use_apl_user_event_argument_part' => true,
            'apl_user_event_argument_part' => 'selected_list_item_key'
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $filter = new \Convo\Pckg\Core\Filters\IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filters[] = $filter;

        // SELECT LAST
        $readers = [];
        $reader = new \Convo\Pckg\Core\Filters\ConvoIntentReader([
            'intent' => 'convo-wp-core.SelectLastIntent',
            'values' => [
                'action' => self::ACTION_TYPE_SELECT_LAST
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $filter = new \Convo\Pckg\Core\Filters\IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filters[] = $filter;

        // START OVER
        $readers = [];
        $reader = new \Convo\Pckg\Core\Filters\ConvoIntentReader([
            'intent' => 'convo-core.StartOverIntent',
            'values' => [
                'action' => self::ACTION_TYPE_START_OVER
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $filter = new \Convo\Pckg\Core\Filters\IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filters[] = $filter;

        // PREVOIUS PAGE
        $readers = [];
        $reader = new \Convo\Pckg\Core\Filters\ConvoIntentReader([
            'intent' => 'convo-core.PreviousIntent',
            'values' => [
                'action' => self::ACTION_TYPE_PREVIOUS
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $filter = new \Convo\Pckg\Core\Filters\IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filters[] = $filter;

        // NEXT PAGE
        $readers = [];
        $reader = new \Convo\Pckg\Core\Filters\ConvoIntentReader([
            'intent' => 'convo-core.NextIntent',
            'values' => [
                'action' => self::ACTION_TYPE_NEXT
            ]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $filter = new \Convo\Pckg\Core\Filters\IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filters[] = $filter;
    }

    public function read(\Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        // inject pagination info to be available for block elements (parent)
        $this->_injectCurrentPageInfo();

        parent::read($request, $response);

        $context = $this->_getWpQueryContext();
        $req_params = $this->getService()->getComponentParams(\Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);

        $this->_logger->info('Starting loop');

        foreach ($context as $index => $post) {
            $this->_logger->debug('Got loop post [' . $index . '][' . $post->post_title . ']');

            $req_params->setServiceParam(
                $this->evaluateString($this->_singlePostVar),
                $context->getLoopPostInfo()
            );

            foreach ($this->_eachPost as $element) {
                $element->read($request, $response);
            }
        }

        foreach ($this->_afterLoop as $element) {
            $element->read($request, $response);
        }
    }

    public function run(\Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $this->_injectCurrentPageInfo();

        $result = $this->_getFilerResult($request);

        if ($result->isEmpty()) {
            $this->_logger->info('Not targeted request. Failing back to defaults ...');
            parent::run($request, $response);
            return;
        }

        $context = $this->_getWpQueryContext();
        $req_params = $this->getService()->getComponentParams(\Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);

        // HANDLE ACTION
        $action = $result->getSlotValue('action');
        $this->_logger->notice('Checking requested action [' . $action . ']');

        switch ($action) {
            // PAGINATION
            case self::ACTION_TYPE_NEXT:

                try {
                    $context->moveNextPage();
                    $this->read($request, $response);
                } catch (NavigateOutOfRangeException $e) {
                    $this->_logger->notice($e->getMessage());

                    $elements = empty($this->_noNext) ? $this->getFallback() : $this->_noNext;
                    foreach ($elements as $element) {
                        $element->read($request, $response);
                    }
                }
                return;

            case self::ACTION_TYPE_PREVIOUS:

                try {
                    $context->movePreviousPage();
                    $this->read($request, $response);
                } catch (NavigateOutOfRangeException $e) {
                    $this->_logger->notice($e->getMessage());
                    $elements = empty($this->_noPrevious) ? $this->getFallback() : $this->_noPrevious;
                    foreach ($elements as $element) {
                        $element->read($request, $response);
                    }
                }
                return;

                // POST SELECTION
            case self::ACTION_TYPE_SELECT:

                // we have 2 utterance variatins
                if ($result->isSlotEmpty('selected') && $result->isSlotEmpty('selectedNumber') && $result->isSlotEmpty('aplArguments')) {
                    $this->_logger->warning('None of the following slots are filled: [selected], [selectedNumber], [aplArguments[0][\'selected_list_item_key\']]. Falling back to default.');
                    break;
                }

                // $selected = $result->isSlotEmpty( 'selected') ?
                //                     $result->getSlotValue( 'selectedNumber') :
                //                     $result->getSlotValue( 'selected');

                $selected = !$result->isSlotEmpty('selected') ?
                    $result->getSlotValue('selected') : (
                        !$result->isSlotEmpty('selectedNumber') ?
                        $result->getSlotValue('selectedNumber') :
                        $result->getSlotValue('aplArguments')[0]['selected_list_item_key']
                    );

                $this->_logger->debug('Found selected value [' . $selected . ']');
                $index = intval($selected) - 1;
                $this->_logger->info('Selecting page post [' . $index . ']');

                try {
                    $context->selectPagePost($index);
                    $req_params->setServiceParam(
                        $this->evaluateString($this->_singlePostVar),
                        $context->getLoopPostInfo()
                    );
                    foreach ($this->_postSelected as $element) {
                        $element->read($request, $response);
                    }
                } catch (NavigateOutOfRangeException $e) {
                    $this->_logger->notice($e->getMessage());
                    $elements = empty($this->_noSelected) ? $this->getFallback() : $this->_noSelected;
                    foreach ($elements as $element) {
                        $element->read($request, $response);
                    }
                }
                return;

            case self::ACTION_TYPE_SELECT_LAST:

                $query = $context->getWpQuery();
                $index = $query->post_count - 1;
                $this->_logger->debug('Selecting last page post [' . $index . ']');
                $context->selectPagePost($index);
                $req_params->setServiceParam(
                    $this->evaluateString($this->_singlePostVar),
                    $context->getLoopPostInfo()
                );
                foreach ($this->_postSelected as $element) {
                    $element->read($request, $response);
                }
                return;
        }

        $this->_logger->notice('No match found for action [' . $action . ']. Failing back to defaults ...');
        parent::run($request, $response);
    }

    private function _injectCurrentPageInfo()
    {
        $context = $this->_getWpQueryContext();
        $req_params = $this->getService()->getComponentParams(\Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);

        $req_params->setServiceParam(
            $this->evaluateString($this->_postsPageVar),
            $context->getLoopPageInfo()
        );
    }

    /**
     * @param \Convo\Core\Workflow\IConvoRequest $request
     * @return IRequestFilterResult
     */
    private function _getFilerResult(\Convo\Core\Workflow\IConvoRequest $request)
    {
        foreach ($this->_filters as $filter) {
            if ($filter->accepts($request)) {
                $result = $filter->filter($request);
                if (!$result->isEmpty()) {
                    return $result;
                }
            }
        }

        return new DefaultFilterResult();
    }



    /**
     * @return IWpQueryContext
     */
    private function _getWpQueryContext()
    {
        return $this->getService()->findContext(
            $this->evaluateString($this->_contextId),
            IWpQueryContext::class
        );
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_contextId . '][' . $this->_postsPageVar . '][' . $this->_singlePostVar . ']';
    }
}
