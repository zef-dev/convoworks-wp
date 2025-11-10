<?php


namespace Convo\Core\Publish;


use Psr\SimpleCache\CacheInterface;

class PlatformPublishingHistory
{
    // AMAZON RELATED PROPAGATION PROPERTIES TO CHECK FOR
    public const AMAZON_ACCOUNT_LINKING_INFORMATION = 'account_linking_information';
    public const AMAZON_MANIFEST = 'manifest';
    public const AMAZON_INTERACTION_MODEL = 'interaction_model';
    public const AMAZON_ENDPOINT_SSL_CERTIFICATE_TYPE = 'endpoint_ssl_certificate_type';
    public const AMAZON_SELF_SIGNED_CERTIFICATE = 'self_signed_certificate';

    // VIBER RELATED PROPAGATION PROPERTIES TO CHECK FOR
    public const VIBER_EVENT_TYPES = 'webhook_events';
    public const VIBER_AUTH_TOKEN = 'auth_token';


    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;

    /**
     * @var CacheInterface
     */
    private $_cache;


    public function __construct($logger, $cache)
    {
        $this->_logger = $logger;
        $this->_cache = $cache;
    }

    public function storePropagationData($serviceId, $platformId, $propagationData)
    {
        $this->_logger->info('Storing propagation data [' . json_encode($propagationData) . "] for service [" . $serviceId . "] and platform [" . $platformId . "]");
        $key = $serviceId . '_' . $platformId . '_previous_propagation_data';
        $ttl = 3600 * 24 * 365;
        $this->_cache->set($key, $propagationData, $ttl);
    }

    public function removeSoredPropagationData($serviceId, $platformId)
    {
        $key = $serviceId . '_' . $platformId . '_previous_propagation_data';
        $this->_logger->info("Going to delete cache under key [" . $key . "]");
        $this->_cache->delete($key);
    }

    public function hasPropertyChangedSinceLastPropagation($serviceId, $platformId, $property, $propagationData)
    {
        $previousPropagationData = $this->_getPreviousPropagationData($serviceId, $platformId);

        if ($previousPropagationData) {
            switch ($platformId) {
                case 'amazon':
                    return $this->_compareAmazon($property, $previousPropagationData, $propagationData);
                case 'viber':
                    return $this->_compareViber($property, $previousPropagationData, $propagationData);
                default:
                    throw new \Exception('Comparison with platform id [' . $platformId . '] is not supported.');
            }
        } else {
            return true;
        }
    }

    private function _getPreviousPropagationData($serviceId, $platformId)
    {
        $key = $serviceId . '_' . $platformId . '_previous_propagation_data';
        $existsUnderKey = $this->_cache->has($key);
        if ($existsUnderKey) {
            $data = $this->_cache->get($key);
            $this->_logger->info("Getting cache data [" . json_encode($data));
            return $data;
        } else {
            return false;
        }
    }

    private function _compareAmazon($property, $previousPropagationData, $currentPropagationData)
    {
        switch ($property) {
            case self::AMAZON_ACCOUNT_LINKING_INFORMATION:
            case self::AMAZON_MANIFEST:
            case self::AMAZON_INTERACTION_MODEL:
                $previousPropagationDataString = json_encode($previousPropagationData[$property]);
                $currentPropagationDataString = json_encode($currentPropagationData);
                if ($previousPropagationDataString !== $currentPropagationDataString) {
                    return true;
                }
                return false;

            case self::AMAZON_ENDPOINT_SSL_CERTIFICATE_TYPE:
            case self::AMAZON_SELF_SIGNED_CERTIFICATE:
                if ($previousPropagationData[$property] !== $currentPropagationData) {
                    return true;
                }
                return false;
            default:
                throw new \Exception("Can't compare property [" . $property . "]");
        }
    }


    private function _compareViber($property, $previousPropagationData, $propagationData)
    {
        if ($property === self::VIBER_EVENT_TYPES) {
            $previousPropagationDataString = json_encode($previousPropagationData[$property]);
            $currentPropagationDataString = json_encode($propagationData);
            if ($previousPropagationDataString !== $currentPropagationDataString) {
                return true;
            } else {
                return false;
            }
        } else if ($property === self::VIBER_AUTH_TOKEN) {
            $previousPropagationAuthToken = $previousPropagationData[$property];
            $currentPropagationAuthToken = $propagationData;
            if ($previousPropagationAuthToken !== $currentPropagationAuthToken) {
                return true;
            } else {
                return false;
            }
        } else {
            throw new \Exception("Can't compare property [" . $property . "]");
        }
    }
}
