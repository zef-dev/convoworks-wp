<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Publish\IPlatformPublisher;

class WpHooksPublisher extends \Convo\Core\Publish\AbstractServicePublisher
{
    
    const WP_HOOKS_OPTION = 'convoworks_hooks_handler';

    /**
     * @var \Convo\Core\Factory\ConvoServiceFactory
     */
    private $_convoServiceFactory;
    /**
     * @var \Convo\Core\Params\IServiceParamsFactory
     */
    private $_convoServiceParamsFactory;
    
    public function __construct( $logger, \Convo\Core\IAdminUser $user, $serviceId, 
        $serviceDataProvider, $serviceReleaseManager, $convoServiceFactory, $convoServiceParamsFactory)
	{
	    parent::__construct( $logger, $user, $serviceId, $serviceDataProvider, $serviceReleaseManager);
	    $this->_convoServiceFactory = $convoServiceFactory;
	    $this->_convoServiceParamsFactory = $convoServiceParamsFactory;
	}

	public function getPlatformId()
	{
		return WpHooksPlatform::PLATFORM_ID;
	}

	public function export()
	{
	    throw new \Exception( 'Not supported');
	}

	public function enable()
	{
	    $this->_checkEnabled();

	    $this->_serviceReleaseManager->initDevelopmentRelease( $this->_user, $this->_serviceId, $this->getPlatformId(), 'a');
	    $this->propagate();
	}
	
	public function getPropagateInfo() {
	    $stored = get_option( WpHooksPublisher::WP_HOOKS_OPTION, []);
	    $new    = $this->_generateModel();
	    return [
	        'allowed' => true,
	        'available' => $stored != $new
	    ];
	}
	
	public function propagate()
	{
	    parent::propagate();
	    
	    $stored        =   get_option( WpHooksPublisher::WP_HOOKS_OPTION, []);
	    $options_data  =   $this->_generateModel();
	    
	    foreach ( $stored as $hook) {
	        if ( $hook['service_id'] === $this->_serviceId) {
	            continue;
	        }
	        $options_data[] = $hook;
	    }
	    
	    update_option( WpHooksPublisher::WP_HOOKS_OPTION, $options_data);
	}
	
	private function _generateModel()
	{
	    $service	=   $this->_convoServiceFactory->getService(
	        $this->_user, $this->_serviceId, IPlatformPublisher::MAPPING_TYPE_DEVELOP, $this->_convoServiceParamsFactory);
	    
	    $hooks    =   $service->findChildren( '\Convo\Wp\Pckg\WpHooks\IWpHookInfo');
	    
	    $options_data = [];
	    foreach ( $hooks as $hook_handler) {
	        $options_data[] = array_merge( $hook_handler->getWpHookInfo(), [
	            'service_id' => $this->_serviceId,
	            'version' => IPlatformPublisher::MAPPING_TYPE_DEVELOP,
	        ]);
	    }
	    return $options_data;
	}

	public function delete( array &$report)
    {
        $hooks      =   get_option( WpHooksPublisher::WP_HOOKS_OPTION, []);
        $filtered   =   [];
        foreach ( $hooks as $hook) {
            if ( $hook['service_id'] === $this->_serviceId) {
                continue;
            }
            $filtered[] = $hook;
        }
        
        update_option( WpHooksPublisher::WP_HOOKS_OPTION, $filtered);
        
        $this->_serviceReleaseManager->withdrawPlatform( $this->_user, $this->_serviceId, WpHooksPlatform::PLATFORM_ID);
    }

    public function getStatus()
    {
        return ['status' => IPlatformPublisher::SERVICE_PROPAGATION_STATUS_FINISHED];
    }
}
