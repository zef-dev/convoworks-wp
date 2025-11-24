<?php

namespace Convo\Core\Adapters\Alexa\Api;

use Convo\Core\Adapters\Alexa\AmazonCommandRequest;
use Convo\Core\Util\IHttpFactory;

abstract class AlexaApi
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;

    /**
     * @var IHttpFactory
     */
    private $_httpFactory;

    public function __construct($logger, $httpFactory)
    {
        $this->_logger = $logger;
        $this->_httpFactory = $httpFactory;
    }

    /**
     * @param AmazonCommandRequest $request
     * @param $method
     * @param $alexaApiUri
     * @param array $alexaApiQueryParams
     * @param array $alexaApiHeaders
     * @param mixed $body
     * @return mixed
     * @throws \Psr\Http\Client\ClientExceptionInterface
     */
    protected function _executeAlexaApiRequest(AmazonCommandRequest $request, $method, $alexaApiUri, $alexaApiQueryParams = [], $alexaApiHeaders = [], $body = null)
    {
        $requestData = $request->getPlatformData();
        $alexaBaseApiEndpoint = $requestData['context']['System']['apiEndpoint'] ?? '';
        $alexaApiAccessToken = $requestData['context']['System']['apiAccessToken'] ?? '';
        $alexaEndpointUri = $alexaBaseApiEndpoint . $alexaApiUri;

        if (empty($alexaApiHeaders)) {
            $alexaApiHeaders = ['Authorization' => 'Bearer ' . $alexaApiAccessToken];
        }

        $this->_logger->info('Going to execute request on [' . $method . ' ' . $alexaEndpointUri . ']');

        $client = $this->_httpFactory->getHttpClient();

        $requestUriString = $this->_httpFactory->buildUri($alexaEndpointUri, $alexaApiQueryParams)->__toString();
        $this->_logger->info('Request URI [' . $requestUriString . ']');

        $apiRequest = $this->_httpFactory->buildRequest($method, $requestUriString, $alexaApiHeaders, $body);

        $response = $client->sendRequest($apiRequest)->getBody()->__toString();
        $this->_logger->info('Response [' . $response . ']');

        return json_decode($response, true);
    }
}
