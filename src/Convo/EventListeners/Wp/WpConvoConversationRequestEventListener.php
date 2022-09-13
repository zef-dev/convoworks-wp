<?php
namespace Convo\EventListeners\Wp;
use Convo\Core\Events\ConvoServiceConversationRequestEvent;

class WpConvoConversationRequestEventListener
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;

    /**
     * @var \Convo\Data\Wp\WpConvoServiceConversationRequestDao
     */
    private $_wpConvoServiceConversationRequestDao;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Data\Wp\WpConvoServiceConversationRequestDao $wpConvoServiceConversationRequestDao)
    {
        $this->_logger = $logger;
        $this->_wpConvoServiceConversationRequestDao = $wpConvoServiceConversationRequestDao;
    }

    public function onConvoRequestEvent(ConvoServiceConversationRequestEvent $event)
    {
        $this->_logger->info('Handling ['.$event::NAME.'] event.');
        $wp_time = timer_stop(false, 2);
        $this->_logger->info( 'Total time elapsed in WP time: '.$wp_time);
        $data = array(
            'request_id' => $event->getConvoRequest()->getRequestId(),
            'service_id' => $event->getConvoRequest()->getServiceId(),
            'session_id' => $event->getConvoRequest()->getSessionId(),
            'device_id' => $event->getConvoRequest()->getDeviceId(),
            'stage' => $event->getStage(),
            'status_code' => $event->getConvoServiceResponseStatusCode(),
            'platform' => $event->getPlatformId(),
            'intent_name' => $event->getIntentName(),
            'time_created' => time(),
            'request' => json_encode($event->getConvoRequest()->getPlatformData(), JSON_PRETTY_PRINT),
            'response' => json_encode($event->getConvoResponse()->getPlatformResponse(), JSON_PRETTY_PRINT),
            'intent_slots' => json_encode($event->getSlotValues(), JSON_PRETTY_PRINT),
            'service_variables' => json_encode($event->getConvoServiceVariables(), JSON_PRETTY_PRINT),
            'error_stack_trace' => $event->getConvoServiceResponseErrorStackTrace(),
            'time_elapsed' => $wp_time
        );
        $format = array('%s','%s','%s','%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%f');
        $this->_wpConvoServiceConversationRequestDao->insertConvoServiceConversationRequestLog($data, $format);
        // $event->stopPropagation();
    }
}
