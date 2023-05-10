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
        add_filter( $hook['hook'], function () use ( $hook) 
        {
            $args           =   func_get_args();
            $request_id     =   StrUtil::uuidV4();
            
            $text_request   =    new WpHooksCommandRequest(
                $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, null);
            $text_response  =    new WpHooksCommandResponse( $text_request);
            
            $service        =   $this->_getLoadedService( $hook['service_id'], $hook['version']);
            $service->run( $text_request, $text_response);
            
            return $text_response->getFilterResponse();
            
        }, $hook['priority'], $hook['accepted_args']);
    }
    
    private function _registerActionHook( $hook) 
    {
        add_action( $hook['hook'], function () use ( $hook) 
        {
            $args           =   func_get_args();
            $request_id     =   StrUtil::uuidV4();
            
            $text_request   =   new WpHooksCommandRequest(
                $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, null);
            $text_response  =   new DefaultTextCommandResponse();
            
            $service        =   $this->_getLoadedService( $hook['service_id'], $hook['version']);
            $service->run( $text_request, $text_response);
            
        }, $hook['priority'], $hook['accepted_args']);
    }
    
    /**
     * @param string $serviceId
     * @param string $versionId
     * @return \Convo\Core\ConvoServiceInstance
     */
    private function _getLoadedService( $serviceId, $versionId)
    {
        /* @var \Convo\Core\Factory\ConvoServiceFactory $convoServiceFactory */
        /* @var \Convo\Core\Params\IServiceParamsFactory $convoServiceParamsFactory */
        
        $owner  =   new RestSystemUser();
        $di     =   ConvoWPPlugin::getPublicDiContainer();
        $convoServiceFactory        =   $di->get( 'convoServiceFactory');
        $convoServiceParamsFactory  =   $di->get( 'convoServiceParamsFactory');
        
        ConvoWPPlugin::loadPackages( $di);

        $service    =   $convoServiceFactory->getService(
            $owner, $serviceId, $versionId, $convoServiceParamsFactory);
        return $service;
    }
    
    private function _getRequiredHooks()
    {
        return get_option( WpHooksPublisher::WP_HOOKS_OPTION, []);
    }

}
