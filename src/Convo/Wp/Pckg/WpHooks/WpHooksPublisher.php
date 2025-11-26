<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Publish\IPlatformPublisher;
use Convo\Wp\Providers\HooksRegistration;

class WpHooksPublisher extends \Convo\Core\Publish\AbstractServicePublisher
{
    /**
     * @var \Convo\Core\Factory\ConvoServiceFactory
     */
    private $_convoServiceFactory;
    /**
     * @var \Convo\Core\Params\IServiceParamsFactory
     */
    private $_convoServiceParamsFactory;

    public function __construct(
        $logger,
        \Convo\Core\IAdminUser $user,
        $serviceId,
        $serviceDataProvider,
        $serviceReleaseManager,
        $convoServiceFactory,
        $convoServiceParamsFactory
    ) {
        parent::__construct($logger, $user, $serviceId, $serviceDataProvider, $serviceReleaseManager);
        $this->_convoServiceFactory = $convoServiceFactory;
        $this->_convoServiceParamsFactory = $convoServiceParamsFactory;
    }

    public function getPlatformId()
    {
        return WpHooksPlatform::PLATFORM_ID;
    }

    public function export()
    {
        throw new \Exception('Not supported');
    }

    public function enable()
    {
        $this->_checkEnabled();

        $this->_serviceReleaseManager->initDevelopmentRelease($this->_user, $this->_serviceId, $this->getPlatformId(), 'a');
        $this->propagate();
    }

    public function getPropagateInfo()
    {
        $stored = HooksRegistration::getRequiredHooks();
        $filtered = [];
        foreach ($stored as $hook) {
            if ($hook['service_id'] !== $this->_serviceId) {
                continue;
            }
            $filtered[] = $hook;
        }

        $new = $this->_generateModel();

        $stored_normalized = $this->_normalizeHooks($filtered);
        $new_normalized = $this->_normalizeHooks($new);

        return [
            'allowed' => true,
            'available' => $stored_normalized !== $new_normalized,
        ];
    }

    public function propagate()
    {
        parent::propagate();

        $stored = HooksRegistration::getRequiredHooks();
        $options_data = $this->_generateModel();

        foreach ($stored as $hook) {
            if ($hook['service_id'] === $this->_serviceId) {
                continue;
            }
            $options_data[] = $hook;
        }

        HooksRegistration::setRequiredHooks($options_data);
    }

    private function _generateModel()
    {
        $service = $this->_convoServiceFactory->getService(
            $this->_user,
            $this->_serviceId,
            IPlatformPublisher::MAPPING_TYPE_DEVELOP,
            $this->_convoServiceParamsFactory
        );

        $hooks = $service->findChildren('\Convo\Wp\Pckg\WpHooks\IWpHookInfo');

        $options_data = [];
        foreach ($hooks as $hook_handler) {
            /** @var IWpHookInfo $hook_handler */
            $options_data[] = array_merge($hook_handler->getWpHookInfo(), [
                'service_id' => $this->_serviceId,
                'version' => IPlatformPublisher::MAPPING_TYPE_DEVELOP,
            ]);
        }
        return $options_data;
    }

    public function delete(array &$report)
    {
        $hooks = HooksRegistration::getRequiredHooks();
        $filtered = [];
        foreach ($hooks as $hook) {
            if ($hook['service_id'] === $this->_serviceId) {
                continue;
            }
            $filtered[] = $hook;
        }

        HooksRegistration::setRequiredHooks($filtered);

        $this->_serviceReleaseManager->withdrawPlatform($this->_user, $this->_serviceId, WpHooksPlatform::PLATFORM_ID);
    }

    /**
     * Normalize hooks array for deterministic comparison.
     *
     * - Sorts keys within each hook
     * - Sorts hooks list by key properties (service, version, hook, type, priority)
     *
     * @param array $hooks
     * @return array
     */
    private function _normalizeHooks(array $hooks)
    {
        // Normalize keys order within each hook entry
        foreach ($hooks as &$hook) {
            if (is_array($hook)) {
                ksort($hook);
            }
        }
        unset($hook);

        // Sort hooks deterministically so comparison is order-independent
        usort($hooks, function (array $a, array $b) {
            $a_key = [
                $a['service_id'] ?? '',
                $a['version'] ?? '',
                $a['hook'] ?? '',
                $a['hook_type'] ?? '',
                (int)($a['priority'] ?? 10),
            ];

            $b_key = [
                $b['service_id'] ?? '',
                $b['version'] ?? '',
                $b['hook'] ?? '',
                $b['hook_type'] ?? '',
                (int)($b['priority'] ?? 10),
            ];

            if ($a_key === $b_key) {
                return 0;
            }

            return $a_key < $b_key ? -1 : 1;
        });

        return $hooks;
    }

    public function getStatus()
    {
        return ['status' => IPlatformPublisher::SERVICE_PROPAGATION_STATUS_FINISHED];
    }
}
