<?php

namespace Convo\Providers;


class ShortcodeRegistration
{
    public function register()
    {
        add_shortcode( 'convo_chat', [$this, 'convoChatShortcode']);
    }

    public function convoChatShortcode( $atts = [], $content = null, $tag = '')
    {
        wp_enqueue_script('convo-angular', CONVOWP_RESOURCES_URL . 'assets/external/angular.js', ['jquery'], CONVOWP_VERSION, false);
        wp_enqueue_script('convo-chat-vendor', CONVOWP_ASSETS_URL . 'chat/js/vendor.js', [ 'convo-angular'], CONVOWP_VERSION, false);
        wp_enqueue_script('convo-chat', CONVOWP_ASSETS_URL . 'chat/js/main.js', [ 'convo-angular'], CONVOWP_VERSION, false);
        wp_enqueue_style( 'load-fa', 'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css');
        
        $atts   =   array_change_key_case( (array) $atts, CASE_LOWER );
        
        $chat_atts = shortcode_atts(
            array(
                'service_id' => null,
                'title' => 'Chat',
                'variant' => 'b',
                'font_size' => '18px',
                'default_width' => '420px',
            ), $atts, $tag
        );
        
        $nounce             =   wp_create_nonce('wp_rest');
        
        $str = '';
        $str .= '<div id="convo-chat">';
        $str .= '
            <convo-chatbox
                name="\''.$chat_atts['title'].'\'"
                service-id="\''.$chat_atts['service_id'].'\'"
            >
            </convo-chatbox>

';
        $str .= '</div>';
        $str .= '<style>';
        $str .= '
            #convo-chat {
                all: revert;
                position: fixed;
                z-index: 100;
                right: 10px;
                font-family: Arial, Helvetica, sans-serif;
                bottom: 10px;
                font-size: '.$chat_atts['font_size'].';
            } 

            #convo-chat .convo-chat .card {
                width: '.$chat_atts['default_width'].';
            }

            #convo-chat .card-body {
                height: 420px;
            }

            @media screen and (max-width: 600px) {
                #convo-chat {
                    bottom: 0px;
                    right: 0px;
                } 
                #convo-chat .convo-chat .card {
                    width:96vw;
                }
                
                #convo-chat .card-body {
                   
                }
            }

';
        $str .= '</style>';
        $str .= '      
            <script type="text/javascript">

                window.onload = (event) => {
                    var appModule   =   angular.module("publicChat", ["convo.chat"]);
                    appModule.constant( "CONVO_PUBLIC_API_BASE_URL", "'.CONVO_BASE_URL.'/wp-json/convo/v1/public");
                    appModule.constant( "WP_NONCE", "'.$nounce.'");
                
                    appModule.factory( "authInterceptor", function ( WP_NONCE) {
                        return {
                            "request": function(config) {
                                if (WP_NONCE !== undefined && WP_NONCE !== null && WP_NONCE !== "") {
                                    config.headers["X-WP-Nonce"] = WP_NONCE;
                                }
                    
                                return config;
                            }
                        };
                    });
                
                    appModule.config( function ($httpProvider) {
                        $httpProvider.interceptors.push("authInterceptor");
                    });

                    angular.element(document).ready(function() {
                    	angular.bootstrap(document, ["publicChat"]);
                    });
                };

            </script>
';
        $str .= '';
        
        return $str;
    }

}
