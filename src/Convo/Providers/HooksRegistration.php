<?php

namespace Convo\Providers;

use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Util\StrUtil;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandResponse;

class HooksRegistration
{
    public function register()
    {
        $hooks = $this->_getRequiredHooks();
        
        foreach ( $hooks as $hook) {
            if ( $hook['type'] === 'action') {
                $this->_registerActionHook( $hook);
            } else if ( $hook['type'] === 'filter') {
                $this->_registerFilterHook( $hook);
            } else {
                throw new \Exception( 'Unexpected hook type ['.$hook['type'].']');
            }
            
        }
    }
    
    private function _registerFilterHook( $hook)
    {
        add_filter( $hook['name'], function () use ( $hook) {
            
            $di     =   ConvoWPPlugin::getPublicDiContainer();
            ConvoWPPlugin::loadPackages( $di);
            $args   =   func_get_args();
            
            $owner		        =	new RestSystemUser();
            $request_id         =   StrUtil::uuidV4();
            
            $convoServiceFactory =  $di->get( 'convoServiceFactory');
            $convoServiceParamsFactory = $di->get( 'convoServiceParamsFactory');
            $convoServiceDataProvider = $di->get( 'convoServiceDataProvider');
            
//             $version_id			=	$convoServiceFactory->getVariantVersion( 
//                 $owner, $hook['service_id'], WpHooksCommandRequest::PLATFORM_ID, $hook['variant']);
//             $platform_config	=	$convoServiceDataProvider->getServicePlatformConfig( $owner, $hook['service_id'], $version_id);
            
//             $this->_logger->debug( 'Got config ['.print_r( $platform_config, true).']');
            
//             if ( !isset( $platform_config[WpHooksCommandRequest::PLATFORM_ID])) {
//                 throw new \Convo\Core\Rest\InvalidRequestException( 'Service ['.$hook['service_id'].'] version ['.$version_id.'] is not enabled for platform ['.'convo_chat'.']');
//             }
            
            $text_request		=	new WpHooksCommandRequest(
                $hook['service_id'], 'system', 'wo', null, $request_id, $hook['name'], $args, $hook['role']);
            $text_response		=	new WpHooksCommandResponse();
            
            $service			=	$convoServiceFactory->getService( $owner, $hook['service_id'], 'develop', $convoServiceParamsFactory);
            $service->run( $text_request, $text_response);
            
            return $text_response->getFilterResponse();
        });
    }
    
    private function _registerActionHook( $hook) 
    {
        add_action( $hook['name'], function () {
            $di     =   ConvoWPPlugin::getPublicDiContainer();
            ConvoWPPlugin::loadPackages( $di);
            $args   =   func_get_args();
        });
    }
    
    private function _getRequiredHooks()
    {
        return [
            [
                'type' => 'action',
                'name' => 'preprocess_comment',
                'service_id' => 'hook-test',
                'variant' => 'develop',
                'role' => 'wp-action-hook',
            ],
            [
                'type' => 'filter',
                'name' => 'get_the_excerpt',
                'service_id' => 'hook-test',
                'role' => 'wp-filter-hook',
            ],
            [
                'type' => 'filter',
                'name' => 'wp_title',
                'service_id' => 'hook-test',
                'role' => 'wp-filter-hook',
            ],
        ];
    }

}
