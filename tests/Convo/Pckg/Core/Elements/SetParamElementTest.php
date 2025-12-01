<?php

declare(strict_types=1);

use Convo\Core\ConvoServiceInstance;
use Convo\Core\Expression\EvaluationContext;
use Convo\Core\Expression\ExpressionFunction;
use Convo\Core\Expression\ExpressionFunctionProviderInterface;
use Convo\Core\Factory\ConvoServiceFactory;
use Convo\Core\Params\IServiceParamsFactory;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Params\SimpleParams;
use Convo\Core\Util\EchoLogger;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Pckg\Core\Elements\SetParamElement;
use Convo\Wp\Data\WpOptionSecretStore;
use Convo\Wp\Tests\ConvoTestCase;
use Convo\Wp\Util\ApacheServerVarsResolver;
use PHPUnit\Framework\MockObject\MockObject;
use Zef\Zel\ArrayResolver;

class SetParamElementTest extends ConvoTestCase
{
    /**
     * @var EvaluationContext
     */
    private $_evalContext;

    /**
     * @var ConvoServiceInstance
     */
    private $_service;

    /**
     * @var SimpleParams
     */
    private $_params;

    public function setUp(): void
    {
        parent::setUp();

        $this->_params = new SimpleParams();

        $this->_evalContext = new EvaluationContext(
            $this->_logger,
            new class () implements ExpressionFunctionProviderInterface {
                public function getFunctions()
                {
                    $functions = [];
                    $functions[] = ExpressionFunction::fromPhp('count');
                    return $functions;
                }
            }
        );

        $serverVarResolver = new ApacheServerVarsResolver();
        $this->_service = new ConvoServiceInstance(
            $this->_logger,
            $this->_evalContext,
            new class ($this->_params) implements IServiceParamsFactory {
                private $_params;

                public function __construct($params)
                {
                    $this->_params = $params;
                }

                public function getServiceParams(IServiceParamsScope $scope)
                {
                    return $this->_params;
                }
            },
            new WpOptionSecretStore($this->_logger),
            $serverVarResolver,
            'test'
        );
    }

    /**
     * @dataProvider dynamicKeyEvaluationProvider
     * @param array $initialData Initial data to set in params before the test
     * @param array $properties Properties for SetParamElement (key-value pairs)
     * @param string $expectedKey The key path to check after setting
     * @param mixed $expectedValue The expected value at that path
     */
    public function testDynamicKeyEvaluation(array $initialData, array $properties, string $expectedKey, $expectedValue)
    {
        // Set up initial data
        foreach ($initialData as $key => $value) {
            $this->_params->setServiceParam($key, $value);
        }

        $this->_logger->info('Properties: ' . json_encode($properties));

        // Create SetParamElement
        $element = new SetParamElement([
            '_component_id' => ConvoServiceFactory::generateId(),
            'scope_type' => IServiceParamsScope::SCOPE_TYPE_SESSION,
            'parameters' => 'service',
            'properties' => $properties
        ]);
        $element->setService($this->_service);
        $element->setLogger($this->_logger);
        $element->setParent($this->_service);

        // Create mock request and response
        /** @var IConvoRequest|MockObject $request */
        $request = $this->createMock(IConvoRequest::class);
        $request->method('getInstallationId')->willReturn('test_installation');
        $request->method('getSessionId')->willReturn('test_session');
        $request->method('getRequestId')->willReturn('test_request');

        /** @var IConvoResponse|MockObject $response */
        $response = $this->createMock(IConvoResponse::class);

        // Set request on service using reflection
        $reflection = new \ReflectionClass($this->_service);
        $requestProperty = $reflection->getProperty('_request');
        $requestProperty->setAccessible(true);
        $requestProperty->setValue($this->_service, $request);

        // Execute the element
        $element->read($request, $response);

        // Verify the result
        $context = new ArrayResolver($this->_params->getData());
        $this->_logger->info('Context: ' . json_encode($this->_params->getData()));
        $actual = $this->_evalContext->evalString('${' . $expectedKey . '}', $context->getValues());

        $this->assertEquals($expectedValue, $actual, "Failed to set value using dynamic key evaluation");
    }

    public function dynamicKeyEvaluationProvider()
    {
        return [
            // Test case 1: Simple dynamic index using count()
            // my_arr[${count(my_arr)}] should evaluate to my_arr[2] if my_arr has 2 elements
            [
                [
                    'my_arr' => [
                        ['name' => 'John'],
                        ['name' => 'Jane']
                    ]
                ],
                [
                    'my_arr[${count(my_arr)}]["name"]' => 'Bob'
                ],
                'my_arr[2]["name"]',
                'Bob'
            ],

            // Test case 2: Dynamic index with variable
            [
                [
                    'my_arr' => [
                        ['name' => 'John'],
                        ['name' => 'Jane']
                    ],
                    'index' => 1
                ],
                [
                    'my_arr[${index}]["name"]' => 'Updated'
                ],
                'my_arr[1]["name"]',
                'Updated'
            ],

            // Test case 3: Nested dynamic key
            [
                [
                    'data' => [
                        'users' => [
                            ['id' => 1, 'name' => 'John'],
                            ['id' => 2, 'name' => 'Jane']
                        ]
                    ],
                    'user_index' => 0
                ],
                [
                    'data["users"][${user_index}]["name"]' => 'Johnny'
                ],
                'data["users"][0]["name"]',
                'Johnny'
            ],

            // Test case 4: Multiple dynamic keys in sequence (using list-of-pairs format)
            [
                [
                    'arr' => []
                ],
                [
                    ['key' => 'arr[${count(arr)}]', 'val' => 'first'],
                    ['key' => 'arr[${count(arr)}]', 'val' => 'second'],
                    ['key' => 'arr[${count(arr)}]', 'val' => 'third']
                ],
                'arr[2]',
                'third'
            ],

            // Test case 5: Complex nested structure with dynamic index
            [
                [
                    'players' => [
                        ['name' => 'Player1', 'score' => 10],
                        ['name' => 'Player2', 'score' => 20]
                    ],
                    'current_index' => 1
                ],
                [
                    'players[${current_index}]["score"]' => 25
                ],
                'players[1]["score"]',
                25
            ],

            // Test case 6: Using count() to append to array
            [
                [
                    'items' => ['a', 'b']
                ],
                [
                    'items[${count(items)}]' => 'c'
                ],
                'items[2]',
                'c'
            ]
        ];
    }
}
