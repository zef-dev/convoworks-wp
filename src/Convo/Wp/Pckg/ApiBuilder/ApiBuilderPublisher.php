<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Publish\IPlatformPublisher;

class ApiBuilderPublisher extends \Convo\Core\Publish\AbstractServicePublisher
{
    public function __construct($logger, \Convo\Core\IAdminUser $user, $serviceId, $serviceDataProvider, $serviceReleaseManager)
    {
        parent::__construct($logger, $user, $serviceId, $serviceDataProvider, $serviceReleaseManager);
    }

    public function getPlatformId()
    {
        return ApiBuilderPlatform::PLATFORM_ID;
    }

    public function export()
    {
        throw new \Exception('Not supported');
    }

    public function enable()
    {
        $this->_checkEnabled();

        $this->_serviceReleaseManager->initDevelopmentRelease($this->_user, $this->_serviceId, $this->getPlatformId(), 'a');
    }

    public function delete(array &$report)
    {
        $this->_serviceReleaseManager->withdrawPlatform($this->_user, $this->_serviceId, $this->getPlatformId());
    }

    public function getStatus()
    {
        return ['status' => IPlatformPublisher::SERVICE_PROPAGATION_STATUS_FINISHED];
    }
}
