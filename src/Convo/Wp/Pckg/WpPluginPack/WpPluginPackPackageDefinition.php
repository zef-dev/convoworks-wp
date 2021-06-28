<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\Factory\AbstractPackageDefinition;

class WpPluginPackPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-plugin-pack';

    public function __construct(\Psr\Log\LoggerInterface $logger)
    {
        parent::__construct($logger, self::NAMESPACE, __DIR__);
    }
    
    protected function _initDefintions()
    {   
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpPluginPack\QSMTriviaAdapterElement',
                'QSM Trivia Adapter Element',
                'Adapt a QSM multiple choice question quiz into a suitable format for Covnoworks Trivia Round Block',
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
                    // '_help' =>  array(
                    //     'type' => 'file',
                    //     'filename' => 'wp-query-element.html'
                    // ),
                ]
            )
        ];
    }
}
