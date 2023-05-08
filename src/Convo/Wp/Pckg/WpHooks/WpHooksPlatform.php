<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Publish\IPlatformPublisher;
use Convo\Core\IAdminUser;
use Convo\Core\Factory\IPlatform;

class WpHooksPlatform implements IPlatform
{
    const PLATFORM_ID = WpHooksPackageDefinition::NAMESPACE.'.voice';
    
    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;
    
    
    /**
     * @var IPlatformPublisher
     */
    private $_platformPublisher;

    /**
     * @var \Convo\Core\IServiceDataProvider
     */
    private $_convoServiceDataProvider;
    
    /**
     * @var \Convo\Core\Publish\ServiceReleaseManager
     */
    private $_serviceReleaseManager;
    
    
    public function __construct( $logger, $serviceDataProvider, $serviceReleaseManager)
	{
	    $this->_logger = $logger;
	    $this->_convoServiceDataProvider	= 	$serviceDataProvider;
	    $this->_serviceReleaseManager       = 	$serviceReleaseManager;
	}
	
    public function getPlatformId()
    {
        return self::PLATFORM_ID;
    }

    public function getPlatformPublisher( IAdminUser $user, $serviceId)
    {
        if ( !isset( $this->_platformPublisher)) {
            $this->_platformPublisher   =   new WpHooksPublisher(
                $this->_logger, $user, $serviceId, $this->_convoServiceDataProvider, $this->_serviceReleaseManager);
        }
        
        return $this->_platformPublisher;
    }

    // UTIL
    public function __toString()
    {
        return get_class( $this).'['.$this->getPlatformId().']';
    }
}
