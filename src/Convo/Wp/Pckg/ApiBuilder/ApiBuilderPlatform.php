<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Factory\IRestPlatform;
use Convo\Core\Publish\IPlatformPublisher;
use Convo\Core\IAdminUser;

class ApiBuilderPlatform implements IRestPlatform
{
    public const PLATFORM_ID = ApibPackageDefinition::NAMESPACE;

    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;


    /**
     * @var ApiBuilderRestHandler
     */
    private $_publicHandler;

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


    public function __construct($logger, $serviceDataProvider, $serviceReleaseManager, $publicHandler)
    {
        $this->_logger = $logger;
        $this->_publicHandler = $publicHandler;
        $this->_convoServiceDataProvider = $serviceDataProvider;
        $this->_serviceReleaseManager = $serviceReleaseManager;
    }

    public function getPlatformId()
    {
        return self::PLATFORM_ID;
    }

    public function getPublicRestHandler()
    {
        return $this->_publicHandler;
    }

    public function getPlatformPublisher(IAdminUser $user, $serviceId)
    {
        if (!isset($this->_platformPublisher)) {
            $this->_platformPublisher = new ApiBuilderPublisher(
                $this->_logger,
                $user,
                $serviceId,
                $this->_convoServiceDataProvider,
                $this->_serviceReleaseManager
            );
        }

        return $this->_platformPublisher;
    }

    // UTIL
    public function __toString()
    {
        return \get_class($this) . '[' . $this->getPlatformId() . ']';
    }
}
