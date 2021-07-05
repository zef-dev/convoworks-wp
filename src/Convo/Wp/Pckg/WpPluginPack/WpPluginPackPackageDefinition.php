<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Factory\IComponentFactory;
use Convo\Core\Util\IHttpFactory;

class WpPluginPackPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-plugin-pack';

    private $_httpFactory;

    public function __construct(\Psr\Log\LoggerInterface $logger, IHttpFactory $httpFactory)
    {
        $this->_httpFactory = $httpFactory;

        parent::__construct($logger, self::NAMESPACE, __DIR__);
    }
    
    protected function _initDefintions()
    {   
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpPluginPack\QSMTriviaAdapterElement',
                'QSM Trivia Adapter Element',
                'Adapt a QSM multiple choice question quiz into a suitable format for Convoworks Trivia',
                [
                    'quiz_id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => null,
                        'name' => 'QSM Quiz ID',
                        'description' => 'QSM quiz ID to fetch questions for (check the shortcode for the quiz ID)',
                        'valueType' => 'string'
                    ],
                    'scope_type' => [
                        'editor_type' => 'select',
                        'editor_properties' => [
                            'options' => ['request' => 'Request', 'session' => 'Session', 'installation' => 'Installation']
                        ],
                        'defaultValue' => 'session',
                        'name' => 'Storage type',
                        'description' => 'Where to store the adapted quiz',
                        'valueType' => 'string'
                    ],
                    'scope_name' => [
                        'editor_type' => 'text',
                        'editor_properties' => array(
                            'multiple' => false
                        ),
                        'defaultValue' => 'questions',
                        'name' => 'Name',
                        'description' => 'Name under which to store the quiz',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'Get questions from QSM quiz [<b>{{ component.properties.quiz_id }}</b>]' .
                        '</div>'
                    ],
                    '_workflow' => 'read',
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'qsm-trivia-adapter-element.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpPluginPack\OpenTDBTriviaAdapterElement',
                'OpenTDB Adapter Element',
                'Adapt an OpenTDB multiple choice question quiz into a suitable format for Convoworks Trivia',
                [
                    'scope_type' => [
                        'editor_type' => 'select',
                        'editor_properties' => [
                            'options' => ['request' => 'Request', 'session' => 'Session', 'installation' => 'Installation']
                        ],
                        'defaultValue' => 'session',
                        'name' => 'Storage type',
                        'description' => 'Where to store the adapted quiz',
                        'valueType' => 'string'
                    ],
                    'scope_name' => [
                        'editor_type' => 'text',
                        'editor_properties' => array(
                            'multiple' => false
                        ),
                        'defaultValue' => 'questions',
                        'name' => 'Name',
                        'description' => 'Name under which to store the quiz',
                        'valueType' => 'string'
                    ],
                    'amount' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '4',
                        'name' => 'Question Amount',
                        'description' => 'How many questions to fetch from OpenTDB',
                        'valueType' => 'string'
                    ],
                    'category' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => null,
                        'name' => 'Question Category',
                        'description' => 'OpenTDB category to fetch questions for',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'OK',
                        'description' => 'Executed if the quiz is successfully loaded',
                        'valueType' => 'class'
                    ],
                    'nok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Not OK',
                        'description' => 'Executed if an error occurred',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'Get {{ component.properties.amount }} question(s) from OpenTDB quiz category <code>{{ component.properties.category }}</code>' .
                        '</div>'
                    ],
                    '_workflow' => 'read',
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'opentdb-trivia-adapter-element.html'
                    ],
                    '_factory' => new class ($this->_httpFactory) implements IComponentFactory
                    {
                        private $_httpFactory;

                        public function __construct(\Convo\Core\Util\IHttpFactory $httpFactory)
                        {
                            $this->_httpFactory = $httpFactory;
                        }

                        public function createComponent($properties, $service)
                        {
                            return new \Convo\Wp\Pckg\WpPluginPack\OpenTDBTriviaAdapterElement($properties, $this->_httpFactory);
                        }
                    }
                ]
            )
        ];
    }
}
