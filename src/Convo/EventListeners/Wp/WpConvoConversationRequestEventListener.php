<?php
namespace Convo\EventListeners\Wp;
use Convo\Core\Events\ConvoServiceConversationRequestEvent;
use Convo\Core\EventDispatcher\ServiceRunRequestEvent;
use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Workflow\IIntentAwareRequest;

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
    
    /**
     * @var \Convo\Core\IServiceDataProvider
     */
    private $_convoServiceDataProvider;
    
    public function __construct(
        \Psr\Log\LoggerInterface $logger, \Convo\Data\Wp\WpConvoServiceConversationRequestDao $wpConvoServiceConversationRequestDao, $serviceDataProvider)
    {
        $this->_logger = $logger;
        $this->_wpConvoServiceConversationRequestDao = $wpConvoServiceConversationRequestDao;
        $this->_convoServiceDataProvider	= 	$serviceDataProvider;
    }
    
    
    public function onServiceRunEvent( ServiceRunRequestEvent $event)
    {
        $this->_logger->info('Handling ['.$event::NAME.'] event.');
        $wp_time = timer_stop(false, 2);
        $this->_logger->info( 'Total time elapsed in WP time: '.$wp_time);
        
        
        $serviceMeta = $this->_convoServiceDataProvider->getServiceMeta( new RestSystemUser(), $event->getService()->getId());
        $stage = $serviceMeta['release_mapping']['canopy-sms'][$event->getVariant()]['type'] ?? 'develop';
        
        $status_code = '';
        $stacktrace = '';
        
        if ( $event->getException()) {
            $status_code = $event->getException()->getCode();
            $stacktrace = $event->getException()->getMessage().'\n'.$event->getException()->getTraceAsString();
        }
        
        $intent = '';
        $slots = [];
        if ( $event->getConvoRequest() instanceof IIntentAwareRequest) {
            $intent = $event->getConvoRequest()->getIntentName();
            $slots = $event->getConvoRequest()->getSlotValues();
        }
        
        $request_vars = $event->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST)->getData();
        $session_vars = $event->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION)->getData();
        $installation_vars = $event->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_INSTALLATION)->getData();
        $user_vars = $event->getService()->getServiceParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_USER)->getData();
        $variables = [
            'request' => $request_vars,
            'session' => $session_vars,
            'installation' => $installation_vars,
            'user' => $user_vars
        ];
        
        $data = array(
            'request_id' => $event->getConvoRequest()->getRequestId(),
            'service_id' => $event->getConvoRequest()->getServiceId(),
            'session_id' => $event->getConvoRequest()->getSessionId(),
            'device_id' => $event->getConvoRequest()->getDeviceId(),
            'stage' => $stage,
            'status_code' => $status_code,
            'platform' => $event->getConvoRequest()->getPlatformId(),
            'intent_name' => $intent,
            'time_created' => time(),
            'request' => json_encode( $event->getConvoRequest()->getPlatformData(), JSON_PRETTY_PRINT),
            'response' => json_encode( $event->getConvoResponse()->getPlatformResponse(), JSON_PRETTY_PRINT),
            'intent_slots' => json_encode( $slots, JSON_PRETTY_PRINT),
            'service_variables' => json_encode( $variables, JSON_PRETTY_PRINT),
            'error_stack_trace' => $stacktrace,
            'time_elapsed' => $wp_time
        );
        $format = array('%s','%s','%s','%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%f');
        $this->_wpConvoServiceConversationRequestDao->insertConvoServiceConversationRequestLog($data, $format);
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
