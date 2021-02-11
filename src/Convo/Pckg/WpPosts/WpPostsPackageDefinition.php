<?php

declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Workflow\IRunnableBlock;
use Symfony\Component\ExpressionLanguage\ExpressionFunction;

class WpPostsPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-posts';

	/**
	 * @var \Convo\Core\Factory\PackageProviderFactory
	 */
	private $_packageProviderFactory;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {
        $this->_packageProviderFactory  =   $packageProviderFactory;
        
        parent::__construct($logger, self::NAMESPACE, __DIR__);

	    //$this->addTemplate( $this->_loadFile(__DIR__ . '/convo-wp-posts.template.json'));
    }
    
    protected function _initIntents()
    {
        return $this->_loadIntents( __DIR__ .'/system-intents.json');
    }
    
    public function getFunctions()
    {
        $functions = [];
        
        // CUSTOM
        
        $functions[] = new ExpressionFunction(
            'get_the_excerpt',
            function ( $post) {
                return sprintf( 'get_the_excerpt(%1$a)', $post);
            },
            function( $args, $post = null) {
                return get_the_excerpt( $post);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_the_post_thumbnail_url',
            function ( $post, $size) {
                return sprintf( 'get_the_post_thumbnail_url(%1$a, %2$a)', $post, $size);
            },
            function( $args, $post = null, $size = null) {
                return get_the_post_thumbnail_url( $post, $size);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_the_author',
            function () {
                return 'get_the_author()';
            },
            function( $args) {
                return get_the_author();
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_strip_all_tags',
            function ( $string, $removeBreaks) {
                return sprintf( 'wp_strip_all_tags(%1$a, %2$a)', $string, $removeBreaks);
            },
            function( $args, $string, $removeBreaks=null) {
                return wp_strip_all_tags( $string, $removeBreaks);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_trim_words',
            function ( $text, $numWords, $more) {
                return sprintf( 'wp_trim_words(%1$a, %2$a, %3$a)', $text, $numWords, $more);
            },
            function( $args, $text, $numWords=55, $more=null) {
                return wp_trim_words( $text, $numWords, $more);
            }
        );

        return $functions;
    }

    protected function _initDefintions()
    {
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpQueryElement',
                'WP_Query element',
                'Allows access to WP_Query object provided by the WP_Query context component',
                array(
                    'context_id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Source',
                        'description' => 'Referenced WP_Query context id',
                        'valueType' => 'string'
                    ),
                    'posts_info_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'posts_info',
                        'name' => 'Posts info variable name',
                        'description' => 'Name under which to provide posts search result info (available in Page info phase)',
                        'valueType' => 'string'
                    ),
                    'has_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Has results',
                        'description' => 'Executed if there are results',
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
                        'description' => 'Executed if there are no results',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'WP_Query from <b>{{ component.properties.context_id }}</b>' .
                        '</div>'
                    ),
                    '_workflow' => 'read',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-query-element.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpLoopElement',
                'WP Loop Element',
                'Allows simple looping over WP_Query result provided by the WP_Query context component',
                array(
                    'context_id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Source',
                        'description' => 'Referenced WP_Query context id',
                        'valueType' => 'string'
                    ),
                    'single_post_info_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'post_info',
                        'name' => 'Single post info variable name',
                        'description' => 'Name under which to provide post info',
                        'valueType' => 'string'
                    ),
                    'each_post' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Each post',
                        'description' => 'Elements to be executed for each post from result',
                        'valueType' => 'class'
                    ),
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'WP loop over <b>{{ component.properties.context_id }}</b> WP_Query context results' .
                        '</div>'
                    ),
                    '_workflow' => 'read',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-element.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpLoopPageBlock',
                'WP Loop Page',
                'Loop over WP_Query results with pagination support',
                array(
                    'role' => array(
                        'defaultValue' => IRunnableBlock::ROLE_CONVERSATION_BLOCK
                    ),
                    'block_id' => array(
                        'editor_type' => 'block_id',
                        'editor_properties' => array(),
                        'defaultValue' => 'new-block-id',
                        'name' => 'Block ID',
                        'description' => 'Unique string identificator',
                        'valueType' => 'string'
                    ),
                    'name' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'Loop page block',
                        'name' => 'Block name',
                        'description' => 'A user friendly name for the block',
                        'valueType' => 'string'
                    ),
                    'context_id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Source',
                        'description' => 'Referenced WP_Query context id',
                        'valueType' => 'string'
                    ),
                    'posts_info_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'posts_info',
                        'name' => 'Posts info variable name',
                        'description' => 'Name under which to provide posts search result info (available in Page info phase)',
                        'valueType' => 'string'
                    ),
                    'single_post_info_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'post_info',
                        'name' => 'Single post info variable name',
                        'description' => 'Name under which to provide single post info ( available in Each post flow)',
                        'valueType' => 'string'
                    ),
                    'skip_reset' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Skip reset expression',
                        'description' => 'If evaluated to true, will not reset loop when running this block',
                        'valueType' => 'string'
                    ),
                    'elements' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Page info phase',
                        'description' => 'Initial elements upo page change or landing to this step',
                        'valueType' => 'class'
                    ),
                    'each_post' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Each post',
                        'description' => 'Elements to be executed for each post on page',
                        'valueType' => 'class'
                    ),
                    'post_selected' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Post selected flow',
                        'description' => 'Elements to be executed when user selected post',
                        'valueType' => 'class'
                    ),
                    'processors' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationProcessor'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Process phase',
                        'description' => 'Other processors to be executed in process phase. E.g. help, repeat ... This procoessors will not trigger loop iteration.',
                        'valueType' => 'class'
                    ),
                    'no_selected' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Selected not avilable',
                        'description' => 'Elements to be read if selected post is not available (e.g. select 5th post but you have only 3 posts)',
                        'valueType' => 'class'
                    ),
                    'no_next' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Next not avilable',
                        'description' => 'Elements to be read if next page is requested but not available',
                        'valueType' => 'class'
                    ),
                    'no_previous' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Previous not avilable',
                        'description' => 'Elements to be read if previous page is requested but not available',
                        'valueType' => 'class'
                    ),
                    'fallback' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Fallback',
                        'description' => 'Elements to be read if none of the processors match',
                        'valueType' => 'class'
                    ),
                    '_workflow' => 'read',
                    '_system' => true,
                    '_factory' => new class ( $this->_packageProviderFactory) implements \Convo\Core\Factory\IComponentFactory
                    {
                        private $_packageProviderFactory;
                        public function __construct( \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
                        {
                            $this->_packageProviderFactory	=	$packageProviderFactory;
                        }
                        public function createComponent( $properties, $service)
                        {
                            return new \ConvoPlugin\Convo\Pckg\WpPosts\WpLoopPageBlock( $properties, $service, $this->_packageProviderFactory);
                        }
                    },
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-page-block.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\ConvoPlugin\Convo\Pckg\WpPosts\WpLoopPostBlock',
                'WP Post',
                'Single post from a WP_Loop context',
                array(
                    'role' => array(
                        'defaultValue' => IRunnableBlock::ROLE_CONVERSATION_BLOCK
                    ),
                    'block_id' => array(
                        'editor_type' => 'block_id',
                        'editor_properties' => array(),
                        'defaultValue' => 'new-block-id',
                        'name' => 'Block ID',
                        'description' => 'Unique string identificator',
                        'valueType' => 'string'
                    ),
                    'name' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'New block',
                        'name' => 'Block name',
                        'description' => 'A user friendly name for the block',
                        'valueType' => 'string'
                    ),
                    'context_id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Source',
                        'description' => 'Referenced WP_Query context',
                        'valueType' => 'string'
                    ),
                    'single_post_info_var' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'post_info',
                        'name' => 'Results variable name',
                        'description' => 'Name under which to provide posts search result info',
                        'valueType' => 'string'
                    ),
                    'elements' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Page info phase',
                        'description' => 'Initial elements upo page change or landing to this step',
                        'valueType' => 'class'
                    ),
                    'processors' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationProcessor'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Process phase',
                        'description' => 'Other processors to be executed in process phase. E.g. help, repeat ... This procoessors will not trigger loop iteration.',
                        'valueType' => 'class'
                    ),
                    'no_next' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Next not avilable',
                        'description' => 'Elements to be read if next is requested but not available',
                        'valueType' => 'class'
                    ),
                    'no_previous' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Previous not avilable',
                        'description' => 'Elements to be read if previous is requested but not available',
                        'valueType' => 'class'
                    ),
                    'fallback' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Fallback',
                        'description' => 'Elements to be read if none of the processors match',
                        'valueType' => 'class'
                    ),
                    '_workflow' => 'read',
                    '_system' => true,
                    '_factory' => new class ( $this->_packageProviderFactory) implements \Convo\Core\Factory\IComponentFactory
                    {
                        private $_packageProviderFactory;
                        public function __construct( \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
                        {
                            $this->_packageProviderFactory	=	$packageProviderFactory;
                        }
                        public function createComponent( $properties, $service)
                        {
                            return new \ConvoPlugin\Convo\Pckg\WpPosts\WpLoopPostBlock( $properties, $service, $this->_packageProviderFactory);
                        }
                    },
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-post-block.html'
                    ),
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
                    'args' => array(
                        'editor_type' => 'params',
                        'editor_properties' => array(
                            'multiple' => true
                        ),
                        'defaultValue' => array(
                            'post_type' => 'post',
                            'post_status' => 'publish',
                            'posts_per_page' => 3,
                        ),
                        'name' => 'WP_Query args',
                        'description' => 'Arguments passed to the WP_Query object',
                        'valueType' => 'array'
                    ),
                    'resetNaviVar' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Rewind pagination',
                        'description' => 'Expression which if evaluated to true will rewind pagination to the first page',
                        'valueType' => 'string'
                    ),
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        '<span class="statement">WP_Query </span> <b>[{{ contextElement.properties.id }}]</b>' .
                        '</div>'
                    ),
                    '_interface' => '\Convo\Core\Workflow\IServiceContext',
                    '_workflow' => 'datasource',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-query-context.html'
                    ),
                )
                ),
                new \Convo\Core\Factory\ComponentDefinition(
                    $this->getNamespace(),
                    '\ConvoPlugin\Convo\Pckg\WpPosts\WpMediaContext',
                    'WP_Query mp3 source',
                    'Performs WP_Query and exposes result as media player source',
                    array(
                        'id' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Context ID',
                            'description' => 'Unique ID by which this context is referenced',
                            'valueType' => 'string'
                        ),
                        'args' => array(
                            'editor_type' => 'params',
                            'editor_properties' => array(
                                'multiple' => true
                            ),
                            'defaultValue' => array(
                                'post_type' => 'attachment',
                                'post_mime_type' => 'audio/mpeg',
                                'posts_per_page' => 3
                            ),
                            'name' => 'WP_Query args',
                            'description' => 'Arguments passed to the WP_Query object',
                            'valueType' => 'array'
                        ),
                        '_preview_angular' => array(
                            'type' => 'html',
                            'template' => '<div class="code">' .
                            '<span class="statement">WP Media </span> <b>[{{ contextElement.properties.id }}]</b>' .
                            '</div>'
                        ),
                        '_interface' => '\Convo\Core\Workflow\IServiceContext',
                        '_workflow' => 'datasource',
//                         '_help' =>  array(
//                             'type' => 'file',
//                             'filename' => 'wp-media-context.html'
//                         ),
                    )
                )
        ];
    }
}
