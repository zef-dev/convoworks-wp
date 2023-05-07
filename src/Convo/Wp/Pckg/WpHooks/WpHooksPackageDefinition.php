<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Gpt\GptApiFactory;
use Convo\Core\Expression\ExpressionFunction;

class WpHooksPackageDefinition extends AbstractPackageDefinition 
{
    const NAMESPACE    =    'convo-wp-hooks';
    
    
    public function __construct( \Psr\Log\LoggerInterface $logger) 
    {
        parent::__construct( $logger, self::NAMESPACE, __DIR__);
//         $this->addTemplate( $this->_loadFile( __DIR__ .'/gpt-examples.template.json'));
    }
    
    protected function _initDefintions()
    {
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpHooks\WpFilterHookResponse',
                'WP Filter Result',
                '',
                [
                    'return_value' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '${request.getArgument( 0)}',
                        'name' => 'Return value',
                        'description' => 'Expression which wil evalueate to the filter result',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code"><span class="statement">WP FILTER RESPONSE</span>' .
                        '{{component.properties.return_value}}' .
                        '</div>'
                    ],
                    '_workflow' => 'read',
                    //                     '_factory' => new class ( $this->_gptApiFactory) implements \Convo\Core\Factory\IComponentFactory
        //                     {
        //                         private $_gptApiFactory;
                    
        //                         public function __construct( $gptApiFactory)
        //                         {
        //                             $this->_gptApiFactory	   =   $gptApiFactory;
        //                         }
        //                         public function createComponent( $properties, $service)
        //                         {
        //                             return new ChatCompletionElement( $properties, $this->_gptApiFactory);
        //                         }
        //                     },
                    '_help' =>  [
                        'type' => 'file',
                        'filename' => 'chat-completion-element.html'
                    ],
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpHooks\WpFilterHookFilter',
                'WP Action',
                '',
                [
                    'hook' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => null,
                        'name' => 'Action',
                        'description' => 'Action name',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code"><span class="statement">WP ACTION</span>' .
                        '{{component.properties.hook}}' .
                        '</div>'
                    ],
                    '_workflow' => 'filter',
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpHooks\WpFilterHookFilter',
                'WP Filter',
                '',
                [
                    'hook' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => null,
                        'name' => 'Filter',
                        'description' => 'Filter name',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code"><span class="statement">WP FILTER</span>' .
                        '{{component.properties.hook}}' .
                        '</div>'
                    ],
                    '_workflow' => 'filter',
                ]
            ),
        ];
    }
}
