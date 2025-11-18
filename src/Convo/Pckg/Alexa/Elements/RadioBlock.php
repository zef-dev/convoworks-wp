<?php

namespace Convo\Pckg\Alexa\Elements;

use Convo\Core\ComponentNotFoundException;
use Convo\Core\ConvoServiceInstance;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Core\Media\RadioStream;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConvoAudioRequest;
use Convo\Core\Workflow\IConvoAudioResponse;
use Convo\Core\Workflow\IConvoRadioStreamResponse;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IRequestFilter;
use Convo\Core\Workflow\IRequestFilterResult;
use Convo\Core\Workflow\IRunnableBlock;
use Convo\Core\Workflow\IConversationElement;
use Convo\Pckg\Core\Filters\ConvoIntentReader;
use Convo\Pckg\Core\Filters\IntentRequestFilter;
use Convo\Pckg\Core\Filters\PlatformIntentReader;

class RadioBlock extends AbstractWorkflowContainerComponent implements IRunnableBlock
{
    public const COMMAND_CONTINUE_PLAYBACK = 'continue_playback';
    public const COMMAND_PLAYBACK_STARTED = 'playback_started';
    public const COMMAND_PLAYBACK_NEARLY_FINISHED = 'playback_nearly_finished';
    public const COMMAND_PLAYBACK_FINISHED = 'playback_finished';
    public const COMMAND_PLAYBACK_STOPPED = 'playback_stopped';
    public const COMMAND_PLAYBACK_FAILED = 'playback_failed';
    public const COMMAND_PAUSE = 'pause';
    public const COMMAND_CANCEL = 'cancel';
    public const COMMAND_STOP = 'stop';
    public const COMMAND_NEXT = 'next';
    public const COMMAND_PREVIOUS = 'previous';
    public const COMMAND_RESUME_PLAYBACK = 'resume_playback';
    public const COMMAND_START_OVER = 'start_over';
    public const COMMAND_REPEAT = 'repeat';
    public const COMMAND_SHUFFLE_ON = 'shuffle_on';
    public const COMMAND_SHUFFLE_OFF = 'shuffle_off';
    public const COMMAND_LOOP_ON = 'loop_on';
    public const COMMAND_LOOP_OFF = 'loop_off';

    /**
     * @var PackageProviderFactory
     */
    private $_packageProviderFactory;

    /**
     * @var IConversationElement[]
     */
    private $_fallback = [];

    /**
     * @var IRequestFilter
     */
    private $_filter = null;

    private $_blockId;

    private $_blockName;

    private $_mediaInfoVar;

    /**
     * @var IConversationElement[]
     */
    private $_onActionNotSupported = [];

    public function __construct($properties, ConvoServiceInstance $service, PackageProviderFactory $packageProviderFactory)
    {
        parent::__construct($properties);
        $this->setService($service);
        $this->_packageProviderFactory = $packageProviderFactory;

        $this->_blockId = $properties['block_id'];
        $this->_blockName = $properties['name'] ?? 'Nameless block';
        $this->_mediaInfoVar = $properties['media_info_var'] ?? 'media_info';

        foreach ($properties['on_action_not_supported'] as $element) {
            $this->_onActionNotSupported[] = $element;
            $this->addChild($element);
        }

        if (isset($properties['fallback'])) {
            foreach ($properties['fallback'] as $fallback) {
                $this->addFallback($fallback);
            }
        }

        // intents
        // next intent
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.NextIntent',
            'values' => ["command" => self::COMMAND_NEXT]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'actions.intent.MEDIA_STATUS',
            'values' => ["command" => self::COMMAND_NEXT]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // previous intent
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.PreviousIntent',
            'values' => ["command" => self::COMMAND_PREVIOUS]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.CancelIntent',
            'values' => ["command" => self::COMMAND_CANCEL]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // pause song intent
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.StopIntent',
            'values' => ["command" => self::COMMAND_PAUSE]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.PauseIntent',
            'values' => ["command" => self::COMMAND_PAUSE]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // resume song intent
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.ResumeIntent',
            'values' => ["command" => self::COMMAND_RESUME_PLAYBACK]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.ContinuePlayback',
            'values' => ["command" => self::COMMAND_CONTINUE_PLAYBACK]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // repeat intent
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.RepeatIntent',
            'values' => ["command" => self::COMMAND_REPEAT]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.StartOverIntent',
            'values' => ["command" => self::COMMAND_START_OVER]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // shuffle intent's
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.ShuffleOffIntent',
            'values' => ["command" => self::COMMAND_SHUFFLE_OFF]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.ShuffleOnIntent',
            'values' => ["command" => self::COMMAND_SHUFFLE_ON]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // loop intent's
        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.LoopOffIntent',
            'values' => ["command" => self::COMMAND_LOOP_OFF]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new ConvoIntentReader([
            'intent' => 'convo-core.LoopOnIntent',
            'values' => ["command" => self::COMMAND_LOOP_ON]
        ], $this->_packageProviderFactory);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // amazon alexa audio controls
        $reader = new PlatformIntentReader([
            'intent' => 'PlaybackController.NextCommandIssued',
            'values' => ["command" => self::COMMAND_NEXT]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'PlaybackController.PreviousCommandIssued',
            'values' => ["command" => self::COMMAND_PREVIOUS]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'PlaybackController.PlayCommandIssued',
            'values' => ["command" => self::COMMAND_RESUME_PLAYBACK]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'PlaybackController.PauseCommandIssued',
            'values' => ["command" => self::COMMAND_STOP]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'PlaybackController.PauseCommandIssued',
            'values' => ["command" => self::COMMAND_STOP]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // amazon alexa audio events
        $reader = new PlatformIntentReader([
            'intent' => 'AudioPlayer.PlaybackStarted',
            'values' => ["command" => self::COMMAND_PLAYBACK_STARTED]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'AudioPlayer.PlaybackNearlyFinished',
            'values' => ["command" => self::COMMAND_PLAYBACK_NEARLY_FINISHED]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'AudioPlayer.PlaybackFinished',
            'values' => ["command" => self::COMMAND_PLAYBACK_FINISHED]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'AudioPlayer.PlaybackStopped',
            'values' => ["command" => self::COMMAND_PLAYBACK_STOPPED]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        $reader = new PlatformIntentReader([
            'intent' => 'AudioPlayer.PlaybackFailed',
            'values' => ["command" => self::COMMAND_PLAYBACK_FAILED]
        ]);
        $reader->setLogger($this->_logger);
        $reader->setService($this->getService());
        $readers[] = $reader;

        // filters to be added
        $filter = new IntentRequestFilter([
            'readers' => $readers
        ]);
        $filter->setLogger($this->_logger);
        $filter->setService($this->getService());
        $this->addChild($filter);
        $this->_filter = $filter;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::getRole()
     */
    public function getRole()
    {
        return IRunnableBlock::ROLE_RADIO_STREAM;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::getName()
     */
    public function getName()
    {
        return $this->_blockName;
    }

    /**
     * @inheritDoc
     */
    public function getComponentId()
    {
        return $this->_blockId;
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
    }

    public function getElements()
    {
        return [];
    }

    public function getProcessors()
    {
        return [];
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IRunnableBlock::run()
     */
    public function run(IConvoRequest $request, IConvoResponse $response)
    {
        $info_var = $this->evaluateString($this->_mediaInfoVar);

        $result = new \Convo\Core\Workflow\DefaultFilterResult();

        if (is_a($request, '\Convo\Core\Workflow\IIntentAwareRequest')) {
            $result = $this->_filter->filter($request);
        }

        $req_params = $this->getService()->getComponentParams(\Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $req_params->setServiceParam($info_var, $request->getPlatformData());

        $this->_logger->debug("Filter result empty [" . $result->isEmpty() . "] and [" . print_r($result->getData(), true) . "]");

        if (!$result->isEmpty()) {
            /** @var IConvoRadioStreamResponse $response */
            /** @var IConvoAudioRequest $request */
            $this->_handleResult($result, $response, $request);
        } else {
            $this->_logger->info('Result is empty. Going to read failback.');
            $this->_readFallback($request, $response);
        }
    }

    private function _handleResult(IRequestFilterResult $result, IConvoRadioStreamResponse $response, IConvoAudioRequest $request)
    {
        $command = $result->getSlotValue('command');

        $this->_logger->info("Handling [" . $command . "]");

        switch ($command) {
            // SESSION
            case self::COMMAND_CANCEL:
                $response->emptyResponse();
                break;
            case self::COMMAND_PAUSE:
                $response->stopRadioStream();
                break;
            case self::COMMAND_CONTINUE_PLAYBACK:
            case self::COMMAND_RESUME_PLAYBACK:
                $audioItem = $this->_getAudioItemFromToken($request);
                $this->_logger->debug('Logging audio item [' . json_encode($audioItem) . ']');
                $radioStream = new RadioStream(
                    $audioItem['stream_url'],
                    $audioItem['radio_station_name'],
                    $audioItem['radio_station_slogan'],
                    $audioItem['radio_station_logo_url']
                );
                $response->startRadioStream($radioStream);
                break;

            case self::COMMAND_START_OVER:
            case self::COMMAND_REPEAT:
            case self::COMMAND_NEXT:
            case self::COMMAND_PREVIOUS:
            case self::COMMAND_LOOP_ON:
            case self::COMMAND_LOOP_OFF:
            case self::COMMAND_SHUFFLE_ON:
            case self::COMMAND_SHUFFLE_OFF:
                $this->_readFallbackOr($request, $response, $this->_onActionNotSupported);
                break;
            default:
                $this->_logger->notice("Using default, empty response for [" . $command . "]");
                $response->emptyResponse();
                break;
        }
    }


    public function addFallback(IConversationElement $element)
    {
        $this->_fallback[] = $element;
        $this->addChild($element);
    }

    /**
     * @return IConversationElement[]
     */
    public function getFallback(): array
    {
        return $this->_fallback;
    }

    private function _readFallback($request, $response)
    {
        if (!empty($this->_fallback)) {
            foreach ($this->_fallback as $fallback) {
                /** @var IConversationElement $fallback */
                $fallback->read($request, $response);
            }
        } else {
            try {
                $default_fallback = $this->getService()->getBlockByRole(IRunnableBlock::ROLE_DEFAULT_FALLBACK);
                $default_fallback->read($request, $response);
            } catch (ComponentNotFoundException $e) {
            }
        }
    }


    /**
     * Executes read on given collection of elements or failback if collection is empty
     * @param IConvoRequest $request
     * @param IConvoAudioResponse $response
     * @param IConversationElement[] $collection
     */
    private function _readFallbackOr($request, $response, $collection = [])
    {
        if (empty($request->getSessionId())) {
            $this->_logger->info('Sessionless request. Exiting with empty response ...');
            $response->emptyResponse();
            return;
        }

        if (empty($collection)) {
            $collection = $this->_fallback;
        }

        foreach ($collection as $element) {
            $element->read($request, $response);
        }

        $response->setShouldEndSession(true);
    }

    private function _getAudioItemFromToken(IConvoAudioRequest $request)
    {
        $audioItemTokenData = $request->getAudioItemToken();
        if (!empty($audioItemTokenData)) {
            $this->_logger->info('Decoded audio token [' . base64_decode($audioItemTokenData) . ']');
            $audioItemTokenData = unserialize(base64_decode($audioItemTokenData));
        }

        return $audioItemTokenData['radio_stream'] ?? [];
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_blockId . '][' . $this->_blockName . '][' . $this->_mediaInfoVar . ']';
    }
}
