<?php

declare(strict_types=1);

namespace Convo\Pckg\Forms;

use Convo\Core\Factory\AbstractPackageDefinition;

class FormsPackageDefinition extends AbstractPackageDefinition
{
    public const NAMESPACE = 'convo-forms';

    public function __construct(
        \Psr\Log\LoggerInterface $logger
    ) {
        parent::__construct($logger, self::NAMESPACE, __DIR__);
    }

    protected function _initDefintions()
    {
        $context_id_param = [
            'editor_type' => 'context_id',
            'editor_properties' => [],
            'defaultValue' => 'forms',
            'name' => 'Context ID',
            'description' => 'Id of the referenced forms context',
            'valueType' => 'string'
        ];


        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\CreateEntryElement',
                'Create Form Entry',
                'Creates form entry.',
                [
                    'context_id' => $context_id_param,
                    'entry' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Entry',
                        'description' => 'Associative array containing the entry data',
                        'valueType' => 'array'
                    ],
                    'result_var' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result Variable Name',
                        'description' => 'Variable with additional operation related information',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'OK',
                        'description' => 'Flow to be executed if the form entry is created.',
                        'valueType' => 'class'
                    ],
                    'validation_error' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'Validation error',
                        'description' => 'Flow to be executed if there are validation errors.',
                        'valueType' => 'class'
                    ],
                    '_workflow' => 'read',
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">CREATE FORM ENTRY</span> <span class="statement">IN</span> <b>{{ component.properties.context_id }}</b> ' .
                        ' <span ng-repeat="(key, val) in component.properties.entry track by key">' .
                        ' <b>{{ key}}</b> = <b>{{ val }};</b>' .
                        ' </span>' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'create-entry-element.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\DummyFormContext',
                'Dummy Form Context',
                'Provides dummy, test implementation of the form managing context',
                [
                    'id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'form_ctx',
                        'name' => 'Context ID',
                        'description' => 'Unique ID by which this context is referenced',
                        'valueType' => 'string'
                    ],
                    'required_fields' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => null,
                        'name' => 'Required Fields',
                        'description' => 'Comma separated fields of required list',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        '<span class="statement">DUMMY FORM CONTEXT</span> <b>{{ contextElement.properties.id }}</b>' .
                        '<span ng-if="contextElement.properties.required_fields"> with required fields <b>{{ contextElement.properties.required_fields}}</b></span>' .
                        '</div>'
                    ],
                    '_workflow' => 'datasource',
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'dummy-form-context.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\UpdateEntryElement',
                'Update Form Entry',
                'Updates form entry.',
                [
                    'context_id' => $context_id_param,
                    'entry_id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Entry ID',
                        'description' => 'ID of the Entry to update.',
                        'valueType' => 'string'
                    ],
                    'entry' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Entry',
                        'description' => 'Associative array containing the entry data',
                        'valueType' => 'array'
                    ],
                    'result_var' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result Variable Name',
                        'description' => 'Variable with additional operation related information',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'OK',
                        'description' => 'Flow to be executed if the form entry is updated.',
                        'valueType' => 'class'
                    ],
                    'validation_error' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'Validation error',
                        'description' => 'Flow to be executed if there are validation errors.',
                        'valueType' => 'class'
                    ],
                    '_workflow' => 'read',
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">UPDATE FORM ENTRY</span> <b>{{ component.properties.entry_id }}</b> <span class="statement">IN</span> <b>{{ component.properties.context_id }}</b>' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'update-entry-element.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\DeleteEntryElement',
                'Delete Form Entry',
                'Deletes form entry.',
                [
                    'context_id' => $context_id_param,
                    'entry_id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Entry ID',
                        'description' => 'ID of the Entry to delete.',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'OK',
                        'description' => 'Flow to be executed if the form entry is deleted.',
                        'valueType' => 'class'
                    ],
                    'result_var' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result Variable Name',
                        'description' => 'Variable with additional operation related information',
                        'valueType' => 'string'
                    ],
                    '_workflow' => 'read',
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">DELETE FORM ENTRY</span> <b>{{ component.properties.entry_id }}</b> <span class="statement">IN</span> <b>{{ component.properties.context_id }}</b>' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'delete-entry-element.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\LoadEntryElement',
                'Load Form Entry',
                'Loads form entry.',
                [
                    'context_id' => $context_id_param,
                    'entry_id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Entry ID',
                        'description' => 'ID of the Entry to load.',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'OK',
                        'description' => 'Flow to be executed if the form entry is loaded.',
                        'valueType' => 'class'
                    ],
                    'result_var' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result Variable Name',
                        'description' => 'Variable with additional operation related information',
                        'valueType' => 'string'
                    ],
                    '_workflow' => 'read',
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">LOAD FORM ENTRY</span> <b>{{ component.properties.entry_id }}</b> <span class="statement">FROM</span> <b>{{ component.properties.context_id }}</b>' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'load-entry-element.html'
                    ]
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\Forms\SearchEntriesElement',
                'Search Form Entries',
                'Searches form entries.',
                [
                    'context_id' => $context_id_param,
                    'search' => [
                        'editor_type' => 'desc',
                        'editor_properties' => [
                        ],
                        'defaultValue' => null,
                        'name' => 'Search',
                        'description' => 'Search value, type and structure are defined by referenced forms context',
                        'valueType' => 'string'
                    ],
                    'limit' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => IFormsContext::DEFAULT_LIMIT,
                        'name' => 'Limit',
                        'description' => 'Limit results',
                        'valueType' => 'string'
                    ],
                    'offset' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 0,
                        'name' => 'Offset',
                        'description' => 'Offset from where to start returning results',
                        'valueType' => 'string'
                    ],
                    'order_by' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Order by',
                        'description' => 'Order by. Field name and [ASC|DESC] pairs',
                        'valueType' => 'array'
                    ],
                    'multiple_flow' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'Multiple',
                        'description' => 'Flow to be executed if the requested search has found multiple entries.',
                        'valueType' => 'class'
                    ],
                    'single_flow' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true,
                            'hideWhenEmpty' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'Single',
                        'description' => 'Flow to be executed if the requested search has found a single entry.',
                        'valueType' => 'class'
                    ],
                    'empty_flow' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true,
                            'hideWhenEmpty' => true
                        ],
                        'defaultValue' => [],
                        'defaultOpen' => false,
                        'name' => 'Empty',
                        'description' => "Flow to be executed if the requested search didn't find anything.",
                        'valueType' => 'class'
                    ],
                    'result_var' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result Variable Name',
                        'description' => 'Variable with additional operation related information',
                        'valueType' => 'string'
                    ],
                    '_workflow' => 'read',
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        ' <span class="statement">SEARCH FORM ENTRIES</span> for <b>{{ component.properties.search }}</b> in <b>{{ component.properties.context_id }}</b>' .
                        ' <span ng-repeat="(key, val) in component.properties.order_by track by key">' .
                        ' <span class="statement" ng-if="$first"><br>ORDER BY</span>' .
                        ' <b>{{ key}}</b> = <b>{{ val }};</b>' .
                        ' </span>' .
                        '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'search-entries-element.html'
                    ]
                ]
            )
        ];
    }
}
