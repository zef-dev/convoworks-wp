<?php

namespace Convo\Providers;

use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Util\StrUtil;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandResponse;
use Convo\Core\Adapters\ConvoChat\DefaultTextCommandResponse;

class HooksRegistration
{
    const WP_HOOKS_OPTION = 'convoworks_hooks_handler';
    
    private $_loadedServices = [];
    
    public function register()
    {
        $hooks = self::getRequiredHooks();
        
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
        $key = $serviceId.'_'.$versionId;
        
        if ( !isset( $this->_loadedServices[$key]))
        {
            /* @var \Convo\Core\Factory\ConvoServiceFactory $convoServiceFactory */
            /* @var \Convo\Core\Params\IServiceParamsFactory $convoServiceParamsFactory */
            
            $owner  =   new RestSystemUser();
            $di     =   ConvoWPPlugin::getPublicDiContainer();
            $convoServiceFactory        =   $di->get( 'convoServiceFactory');
            $convoServiceParamsFactory  =   $di->get( 'convoServiceParamsFactory');
            
            ConvoWPPlugin::loadPackages( $di);
            
            $this->_loadedServices[$key]    =   $convoServiceFactory->getService(
                $owner, $serviceId, $versionId, $convoServiceParamsFactory);
        }
        
        return $this->_loadedServices[$key];
    }
    
    public static function getRequiredHooks()
    {
        return get_option( self::WP_HOOKS_OPTION, []);
    }

    public static function setRequiredHooks( $hooks)
    {
        update_option( self::WP_HOOKS_OPTION, $hooks);
    }
}
