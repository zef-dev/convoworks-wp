<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Factory\IPlatformProvider;
use Convo\Core\ComponentNotFoundException;
use Convo\Core\Factory\PackageProviderFactory;

class ApibPackageDefinition extends AbstractPackageDefinition implements IPlatformProvider
{
    public const NAMESPACE = 'convo-api-builder';

    /**
     * @var ApiBuilderRestHandler
     */
    private $_publicHandler;

    /**
     * @var ApiBuilderPlatform
     */
    private $_apiPlatform;

    /**
     * @var PackageProviderFactory
     */
    private $_packageProviderFactory;

    public function __construct(
        \Psr\Log\LoggerInterface $logger,
        $publicHandler,
        $apiPlatform,
        $packageProviderFactory
    ) {
        $this->_publicHandler = $publicHandler;
        $this->_apiPlatform = $apiPlatform;
        $this->_packageProviderFactory = $packageProviderFactory;

        parent::__construct($logger, self::NAMESPACE, __DIR__);

        $this->registerTemplate(__DIR__ . '/api-builder-project.template.json');
    }

    public function getFunctions()
    {
        $functions = [];
        return $functions;
    }

    protected function _initEntities()
    {
        $entities = [];
        return $entities;
    }

    protected function _initDefintions()
    {
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\ApiBuilder\ApiResponseElement',
                'API Response',
                'This component allows you to define an HTTP response.',
                [
                    'status' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 200,
                        'name' => 'Http status',
                        'description' => 'Defines the HTTP status code for the response',
                        'valueType' => 'int'
                    ],
                    'headers' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true,
                        ],
                        'defaultValue' => [
                            'Content-Type' => 'application/json'
                        ],
                        'name' => 'Headers',
                        'description' => 'A key-value pair field for setting the headers of the HTTP response.',
                        'valueType' => 'array'
                    ],
                    'body' => [
                        'editor_type' => 'desc',
                        'editor_properties' => [],
                        'defaultValue' => '{}',
                        'name' => 'Body',
                        'description' => 'Allows you to define the body of the HTTP response.',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code"><span class="statement">API RESPONSE</span>' .
                        ' <b>{{component.properties.status}}</b>' .
                        ' <br>{{component.properties.body}}' .
                        '</div>'
                    ],
                    '_interface' => '\Convo\Core\Workflow\IConversationElement',
                    '_workflow' => 'read',
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'api-response-element.html'
                    ],
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\ApiBuilder\ApiRouteFilter',
                'API Route Filter',
                'This component allows you to set up filters for your API routes',
                [
                    'method' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'GET',
                        'name' => 'Http method',
                        'description' => 'Defines the HTTP method (GET, POST, PUT, DELETE, etc.) to match for the route.',
                        'valueType' => 'string'
                    ],
                    'path' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Uri path',
                        'description' => 'Defines the URI path to match for the route',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code"><span class="statement">API ROUTE</span>' .
                        ' <b>{{component.properties.method}}</b>' .
                        ' <br>{{component.properties.path}}' .
                        '</div>'
                    ],
                    '_workflow' => 'filter',
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'api-route-filter.html'
                    ],
                ]
            ),
        ];
    }

    public function getPlatform($platformId)
    {
        $this->_logger->info('Searching for platform [' . $platformId . ']');
        $this->_logger->debug('Comparing to Api Builder [' . $this->_apiPlatform->getPlatformId() . ']');

        if ($platformId === $this->_apiPlatform->getPlatformId()) {
            return $this->_apiPlatform;
        }

        throw new ComponentNotFoundException('Could not locate platform [' . $platformId . ']');
    }

    public function getRow()
    {
        $data = parent::getRow();
        $data['platforms'] = [
            ApiBuilderPlatform::PLATFORM_ID => [
                'name' => 'API Builder',
                'description' => 'Create API endpoints',
                'icon_url' => CONVOWP_ASSETS_URL . '/images/api-icon.png',
                'route' => 'convoworks-editor-service.configuration-api-builder',
            ],
        ];

        return $data;
    }
}
