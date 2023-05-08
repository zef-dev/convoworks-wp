<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Factory\IPlatformProvider;
use Convo\Core\ComponentNotFoundException;

class WpHooksPackageDefinition extends AbstractPackageDefinition implements IPlatformProvider
{
    const NAMESPACE    =    'convo-wp-hooks';
    
    /**
     * @var WpHooksPlatform
     */
    private $_platform;
    
    public function __construct( \Psr\Log\LoggerInterface $logger, $platform) 
    {
        $this->_platform = $platform;
        
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
    public function getPlatform( $platformId)
    {
        if ( strpos( $platformId, '.') === false) {
            $search = self::NAMESPACE.'.'.$platformId;
        } else {
            $search = $platformId;
        }
        
        $this->_logger->info( 'Searching for platform ['.$platformId.']['.$search.']');
        $this->_logger->debug( 'Comparing to platform ['.$this->_platform->getPlatformId().']');
        
        if ( $search === $this->_platform->getPlatformId()) {
            return $this->_platform;
        }
        
        throw new ComponentNotFoundException( 'Could not locate platform ['.$platformId.']['.$search.']');
    }
    
    public function getRow()
    {
        $data = parent::getRow();
        $data['platforms'] = [
            WpHooksPlatform::PLATFORM_ID => [
                'name' => 'WordPress Hooks',
                'description' => 'WordPress hooks configuration',
                'route' => 'convoworks-editor-service.configuration-wp-hooks',
//                 'icon_url' => CONVO_TWILIO_URL.'/assets/twilio-logo.png',
//                 'config_url' => CONVO_BASE_URL.'/wp-admin/admin.php?page=convoworks-twilio-settings&service_id={serviceId}',
                //                 'enabled' => true,
            ],
        ];
        
        return $data;
    }

}
