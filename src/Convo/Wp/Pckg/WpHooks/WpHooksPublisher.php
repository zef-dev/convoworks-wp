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
	}
	
	public function propagate()
	{
	    parent::propagate();
	    
	    $service	=   $this->_convoServiceFactory->getService( 
	        $this->_user, $this->_serviceId, IPlatformPublisher::MAPPING_TYPE_DEVELOP, $this->_convoServiceParamsFactory);
	    
	    $hooks    =   $service->findChildren( '\Convo\Wp\Pckg\WpHooks\IWpHookInfo');
	    
	    $options_data = [];
	    foreach ( $hooks as $hook) {
	        $options_data[] = array_merge( $hook, [
	            'service_id' => $this->_serviceId
	        ]);
	    }
	    
// 	    [
// 	    'type' => 'action',
// 	    'name' => 'preprocess_comment',
// 	    'priority' => 10,
// 	    'accepted_args' => 1,
// 	    'service_id' => 'hook-test',
// 	    'variant' => 'develop',
// 	    'role' => 'wp-action-hook',
// 	    ],
	    
// 	    return [
// 	        'hook_type' => $this->_hookType,
// 	        'hook' => $this->_hook,
// 	        'priority' => $this->_priority,
// 	        'accepted_args' => $this->_acceptedArgs,
// 	    ];
	    
	    update_option( WpHooksPublisher::WP_HOOKS_OPTION, $options_data);
	}

	public function delete(array &$report)
    {
//         throw new NotImplementedException('Deletion not yet implemented for ['.$this->getPlatformId().'] platform');
    }

    public function getStatus()
    {
        return ['status' => IPlatformPublisher::SERVICE_PROPAGATION_STATUS_FINISHED];
    }
}
