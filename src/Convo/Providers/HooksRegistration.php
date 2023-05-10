<?php

namespace Convo\Providers;

use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Util\StrUtil;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandResponse;
use Convo\Wp\Pckg\WpHooks\WpHooksPublisher;
use Convo\Core\Adapters\ConvoChat\DefaultTextCommandResponse;

class HooksRegistration
{
    public function register()
    {
        $hooks = $this->_getRequiredHooks();
        
        foreach ( $hooks as $hook) {
            if ( $hook['hook_type'] === 'action') {
                $this->_registerActionHook( $hook);
            } else if ( $hook['hook_type'] === 'filter') {
                $this->_registerFilterHook( $hook);
            } else {
                throw new \Exception( 'Unexpected hook type ['.$hook['hook_type'].']');
            }
            
        }
    }
    
    private function _registerFilterHook( $hook)
    {
        add_filter( $hook['hook'], function () use ( $hook) {
            
            $di     =   ConvoWPPlugin::getPublicDiContainer();
            ConvoWPPlugin::loadPackages( $di);
            $args   =   func_get_args();
            
            $owner		        =	new RestSystemUser();
            $request_id         =   StrUtil::uuidV4();
            
            $convoServiceFactory =  $di->get( 'convoServiceFactory');
            $convoServiceParamsFactory = $di->get( 'convoServiceParamsFactory');
            /* @var \Convo\Core\Factory\ConvoServiceFactory $convoServiceFactory */
            /* @var \Convo\Core\Params\IServiceParamsFactory $convoServiceParamsFactory */
            
//             $convoServiceDataProvider = $di->get( 'convoServiceDataProvider');
            
//             $version_id			=	$convoServiceFactory->getVariantVersion( 
//                 $owner, $hook['service_id'], WpHooksCommandRequest::PLATFORM_ID, $hook['variant']);
//             $platform_config	=	$convoServiceDataProvider->getServicePlatformConfig( $owner, $hook['service_id'], $version_id);
            
//             $this->_logger->debug( 'Got config ['.print_r( $platform_config, true).']');
            
//             if ( !isset( $platform_config[WpHooksCommandRequest::PLATFORM_ID])) {
//                 throw new \Convo\Core\Rest\InvalidRequestException( 'Service ['.$hook['service_id'].'] version ['.$version_id.'] is not enabled for platform ['.'convo_chat'.']');
//             }
            
            $text_request		=	new WpHooksCommandRequest(
                $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, null);
            $text_response		=	new WpHooksCommandResponse( $text_request);
            
            $service			=	$convoServiceFactory->getService( 
                $owner, $hook['service_id'], $hook['version'], $convoServiceParamsFactory);
            $service->run( $text_request, $text_response);
            
            return $text_response->getFilterResponse();
        }, $hook['priority'], $hook['accepted_args']);
    }
    
    private function _registerActionHook( $hook) 
    {
        add_action( $hook['hook'], function () use ( $hook) {
            $di     =   ConvoWPPlugin::getPublicDiContainer();
            ConvoWPPlugin::loadPackages( $di);
            $args   =   func_get_args();
            
            $owner		        =	new RestSystemUser();
            $request_id         =   StrUtil::uuidV4();
            
            $convoServiceFactory =  $di->get( 'convoServiceFactory');
            $convoServiceParamsFactory = $di->get( 'convoServiceParamsFactory');
            
            /* @var \Convo\Core\Factory\ConvoServiceFactory $convoServiceFactory */
            /* @var \Convo\Core\Params\IServiceParamsFactory $convoServiceParamsFactory */
            
//             $convoServiceDataProvider = $di->get( 'convoServiceDataProvider');
            
            //             $version_id			=	$convoServiceFactory->getVariantVersion(
            //                 $owner, $hook['service_id'], WpHooksCommandRequest::PLATFORM_ID, $hook['variant']);
            //             $platform_config	=	$convoServiceDataProvider->getServicePlatformConfig( $owner, $hook['service_id'], $version_id);
            
            //             $this->_logger->debug( 'Got config ['.print_r( $platform_config, true).']');
            
            //             if ( !isset( $platform_config[WpHooksCommandRequest::PLATFORM_ID])) {
            //                 throw new \Convo\Core\Rest\InvalidRequestException( 'Service ['.$hook['service_id'].'] version ['.$version_id.'] is not enabled for platform ['.'convo_chat'.']');
            //             }
            
            $text_request		=	new WpHooksCommandRequest(
                $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, null);
            $text_response		=	new DefaultTextCommandResponse();
            
            $service			=	$convoServiceFactory->getService( 
                $owner, $hook['service_id'], $hook['version'], $convoServiceParamsFactory);
            $service->run( $text_request, $text_response);
            
        }, $hook['priority'], $hook['accepted_args']);
    }
    
    private function _getRequiredHooks()
    {
        return get_option( WpHooksPublisher::WP_HOOKS_OPTION, []);
    }

}
