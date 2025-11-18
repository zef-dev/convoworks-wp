<?php

namespace Convo\Core\Factory;

use Convo\Core\Adapters\Alexa\AlexaSkillLanguageMapper;
use Convo\Core\Adapters\Alexa\AmazonCommandRequest;
use Convo\Core\ComponentNotFoundException;
use Convo\Core\Rest\OwnerNotSpecifiedException;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IntentAwareWrapperRequest;
use Convo\Core\Publish\IPlatformPublisher;
use Convo\Core\Intent\DefaultIntentAndEntityLocator;
use Convo\Core\ConvoServiceInstance;

class PlatformRequestFactory implements IPlatformRequestFactory
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;

    /**
     * @var \Convo\Core\IServiceDataProvider
     */
    protected $_convoServiceDataProvider;

    /**
     * @var \Convo\Core\IAdminUserDataProvider
     */
    private $_adminUserDataProvider;

    /**
     * @var \Convo\Core\Adapters\Alexa\AmazonPublishingService
     */
    private $_amazonPublishingService;


    /**
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;


    /**
     * @var PackageProviderFactory
     */
    private $_packageProviderFactory;

    public function __construct($logger, $convoServiceDataProvider, $amazonPublishingService, $adminUserDataProvider, $packageProviderFactory, $httpFactory)
    {
        $this->_logger = $logger;
        $this->_convoServiceDataProvider = $convoServiceDataProvider;
        $this->_amazonPublishingService = $amazonPublishingService;
        $this->_adminUserDataProvider = $adminUserDataProvider;
        $this->_packageProviderFactory = $packageProviderFactory;
        $this->_httpFactory = $httpFactory;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Factory\IPlatformRequestFactory::toIntentRequest()
     */
    public function toIntentRequest(IConvoRequest $request, \Convo\Core\IAdminUser $user, ConvoServiceInstance $service, $platformId, $variant = '')
    {
        switch ($platformId) {
            case AmazonCommandRequest::PLATFORM_ID:
                $this->_logger->info("Accessing Platform Request Factory with Amazon Command Request");
                return $this->_prepareAmazonIntentRequest($request, $user, $service->getId(), $platformId);
            default:
                throw new ComponentNotFoundException('Platform ' . $platformId . ' not supported.');
        }
    }

    private function _prepareAmazonIntentRequest(IConvoRequest $request, \Convo\Core\IAdminUser $user, $serviceId, $platformId)
    {
        $this->_logger->debug('Exec platform id [' . $platformId . ']');

        if ($request->isEmpty()) {
            return new IntentAwareWrapperRequest($request, '', [], [], $platformId);
        }

        $service_meta = $this->_convoServiceDataProvider->getServiceMeta(
            $user,
            $serviceId
        );
        $config = $this->_convoServiceDataProvider->getServicePlatformConfig(
            $user,
            $serviceId,
            IPlatformPublisher::MAPPING_TYPE_DEVELOP
        );

        //		if (!isset($service_meta['platform_data'][$this->getPlatformId()]['skillId'])) {
        //			throw new \Exception('Cannot simulate request for ['.$this->_serviceId.']. missing Amazon skill ID');
        //		}

        if (!$service_meta['owner']) {
            throw new \Exception('Could not determine owner for service [' . $serviceId . ']');
        }

        $owner = $this->_adminUserDataProvider->findUser($service_meta['owner']);

        $skill_id = $config[$platformId]['app_id'];
        $language = AlexaSkillLanguageMapper::getDefaultLocale($service_meta['default_language']);
        $simulation_data = $this->_amazonPublishingService->simulateRequest(
            $owner,
            $skill_id,
            $request->getText(),
            $language
        );

        $this->_logger->debug('Got simulation data [' . print_r($simulation_data, true) . ']');

        if (!isset($simulation_data['selectedIntent'])) {
            $this->_logger->warning('Filed [Selected Intent] is not present, going to set the field with name [AMAZON.FallbackIntent]');
            $simulation_data['selectedIntent'] = ['name' => 'AMAZON.FallbackIntent'];
        }

        $intent_name = $simulation_data['selectedIntent']['name'];
        $slots = [];
        $rawSlots = [];

        if (isset($simulation_data['selectedIntent']['slots'])) {
            $rawSlots = $simulation_data['selectedIntent']['slots'];
            foreach ($simulation_data['selectedIntent']['slots'] as $definition) {
                $name = $definition['name'];
                $value = null;

                if (!isset($definition['resolutions'])) {
                    $value = $definition['value'] ?? null;
                }

                $statusCode = $definition['slotValue']['resolutions']['resolutionsPerAuthority'][0]['status']['code'] ?? null;
                if ($statusCode === 'ER_SUCCESS_MATCH') {
                    $value = $definition['slotValue']['resolutions']['resolutionsPerAuthority'][0]['values'][0]['name'] ?? null;
                }

                $slots[$name] = $value;
            }
        }

        $this->_logger->info('Final matched intent data [' . $intent_name . '][' . print_r($slots, true) . ']');

        return new IntentAwareWrapperRequest($request, $intent_name, $slots, $rawSlots, $platformId);
    }
}
