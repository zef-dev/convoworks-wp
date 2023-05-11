<?php

namespace Convo\Providers;

use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Util\StrUtil;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandRequest;
use Convo\Wp\Pckg\WpHooks\WpHooksCommandResponse;
use Convo\Core\Adapters\ConvoChat\DefaultTextCommandResponse;
use Convo\Wp\Pckg\WpHooks\WpHooksPlatform;

class HooksRegistration
{
    const WP_HOOKS_OPTION = 'convoworks_hooks_handler';
    
    private $_loadedServices = [];
    private $_loadedConfigs = [];
    
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
            
            try {
                $config         =   $this->_getLoadedServiceConfig( $hook['service_id'], $hook['version']);
                $text_request   =    new WpHooksCommandRequest(
                    $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, $config['special_role']);
                $text_response  =    new WpHooksCommandResponse( $text_request);
                
                $service        =   $this->_getLoadedService( $hook['service_id'], $hook['version']);
                $service->run( $text_request, $text_response);
                
                return $text_response->getFilterResponse();
            } catch ( \Throwable $e) {
                error_log( $e->getMessage().': '.$e->getTraceAsString());
                return $args[0];
            }
        }, $hook['priority'], $hook['accepted_args']);
    }
    
    private function _registerActionHook( $hook) 
    {
        add_action( $hook['hook'], function () use ( $hook) 
        {
            $args           =   func_get_args();
            $request_id     =   StrUtil::uuidV4();
            
            try {
                $config         =   $this->_getLoadedServiceConfig( $hook['service_id'], $hook['version']);
                $text_request   =   new WpHooksCommandRequest(
                    $hook['service_id'], 'system', 'wo', null, $request_id, $hook['hook'], $args, $config['special_role']);
                $text_response  =   new DefaultTextCommandResponse();
                
                $service        =   $this->_getLoadedService( $hook['service_id'], $hook['version']);
                $service->run( $text_request, $text_response);
            } catch ( \Throwable $e) {
                error_log( $e->getMessage().': '.$e->getTraceAsString());
            }
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
            $di     =   ConvoWPPlugin::getCurrentDiContainer();
            $convoServiceFactory        =   $di->get( 'convoServiceFactory');
            $convoServiceParamsFactory  =   $di->get( 'convoServiceParamsFactory');
            
            ConvoWPPlugin::loadPackages( $di);
            
            $this->_loadedServices[$key]    =   $convoServiceFactory->getService(
                $owner, $serviceId, $versionId, $convoServiceParamsFactory);
        }
        
        return $this->_loadedServices[$key];
    }
    
    /**
     * @param string $serviceId
     * @param string $versionId
     * @return array
     */
    private function _getLoadedServiceConfig( $serviceId, $versionId)
    {
        $key = $serviceId.'_'.$versionId;
        
        if ( !isset( $this->_loadedConfigs[$key]))
        {
            /* @var \Convo\Core\IServiceDataProvider $convoServiceDataProvider */
            
            $owner  =   new RestSystemUser();
            $di     =   ConvoWPPlugin::getCurrentDiContainer();
            $convoServiceDataProvider      =   $di->get( 'convoServiceDataProvider');
            
            $config    =   $convoServiceDataProvider->getServicePlatformConfig(
                $owner, $serviceId, $versionId);
            $this->_loadedConfigs[$key] = $config[WpHooksPlatform::PLATFORM_ID];
        }
        
        return $this->_loadedConfigs[$key];
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
