<?php

declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Factory\AbstractPackageDefinition;

class WpPostsPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-posts';

	/**
	 * @var \Convo\Core\Factory\PackageProviderFactory
	 */
	private $_packageProviderFactory;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {

        parent::__construct($logger, self::NAMESPACE, __DIR__);

	    //$this->addTemplate( $this->_loadFile(__DIR__ . '/convo-wp-posts.template.json'));
    }

    protected function _initDefintions()
    {
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpPostsElement',
                'Search WP posts',
                'Returns search query posts results',
                array(
                    'search_query' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Search query',
                        'description' => 'Expression to evaluate search phrase',
                        'valueType' => 'string'
                    ),
                    'post_type' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'post',
                        'name' => 'Post type',
                        'description' => 'Post type/s to query',
                        'valueType' => 'string'
                    ),
                    'status_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'posts',
                        'name' => 'Results variable name',
                        'description' => 'Name under which to provide posts search result info',
                        'valueType' => 'string'
                    ),
                    'offset' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '0',
                        'name' => 'Offset',
                        'description' => 'Offset to start from',
                        'valueType' => 'string'
                    ),
                    'limit' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '3',
                        'name' => 'Limit results',
                        'description' => 'Max products to return at once',
                        'valueType' => 'string'
                    ),
                    'single_result' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Single result',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    'multiple_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Multiple results',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    'no_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'No results',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'Search posts for {{ component.properties.search_query }}' .
                        '</div>'
                    ),
                    '_workflow' => 'read'
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpQueryElement',
                'WP_Query element',
                'Allows access to WP_Query result',
                array(
                    'context_id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Source',
                        'description' => 'Referenced WP_Query context',
                        'valueType' => 'string'
                    ),
                    'status_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'posts',
                        'name' => 'Results variable name',
                        'description' => 'Name under which to provide posts search result info',
                        'valueType' => 'string'
                    ),
                    'single_result' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Single result',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    'multiple_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Multiple results',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    'no_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'No results',
                        'description' => '',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'WP_Query from {{ component.properties.context_id }}' .
                        '</div>'
                    ),
                    '_workflow' => 'read'
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpQueryContext',
                'WP_Query context',
                'Perform search with WP_Query',
                array(
                    'id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Context ID',
                        'description' => 'Unique ID by which this context is referenced',
                        'valueType' => 'string'
                    ),
                    'search_query' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Search query',
                        'description' => 'Expression to evaluate search phrase',
                        'valueType' => 'string'
                    ),
                    'post_type' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'post',
                        'name' => 'Post type',
                        'description' => 'Post type/s to query',
                        'valueType' => 'string'
                    ),
                    'offset' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '0',
                        'name' => 'Offset',
                        'description' => 'Offset to start from',
                        'valueType' => 'string'
                    ),
                    'limit' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '3',
                        'name' => 'Limit results',
                        'description' => 'Max products to return at once',
                        'valueType' => 'string'
                    ),
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        '<span class="statement">WP_Query </span> <b>{{ contextElement.properties.search_query }}</b>' .
                        '</div>'
                    ),
//                     '_help' =>  array(
//                         'type' => 'file',
//                         'filename' => 'filesystem-media-context.html'
//                     ),
                    '_interface' => '\Convo\Core\Workflow\IServiceContext',
                    '_workflow' => 'datasource'
                )
            )
        ];
    }
}
