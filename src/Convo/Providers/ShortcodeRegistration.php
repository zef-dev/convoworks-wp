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
        wp_enqueue_script('convo-angular', CONVOWP_RESOURCES_URL . 'assets/external/angular.js', ['jquery'], CONVOWP_VERSION);
  //      wp_enqueue_script('convo-angular-animate', CONVOWP_RESOURCES_URL . 'assets/external/angular-animate.js', ['convo-angular'], CONVOWP_VERSION);
        wp_enqueue_script('convo-chat-vendor', CONVOWP_ASSETS_URL . 'chat/js/vendor.js', [ 'convo-angular'], CONVOWP_VERSION);
        wp_enqueue_script('convo-chat', CONVOWP_ASSETS_URL . 'chat/js/main.js', [ 'convo-angular'], CONVOWP_VERSION);
        wp_enqueue_style( 'convo-chat', CONVOWP_ASSETS_URL . 'chat/css/main.css', [], CONVOWP_VERSION );

//         wp_enqueue_style( 'load-fa', 'https://use.fontawesome.com/releases/v5.15.4/css/all.css' );
//         wp_enqueue_script( 'load-fa', 'https://use.fontawesome.com/releases/v5.15.4/js/all.js' );
        // normalize attribute keys, lowercase
        $atts   =   array_change_key_case( (array) $atts, CASE_LOWER );
        
        // override default attributes with user attributes
        $chat_atts = shortcode_atts(
            array(
                'base_url' => 'https://tole.eu.ngrok.io/wordpress/wp-json/convo/v1/public',
                'service_id' => null,
                'variant' => 'b',
            ), $atts, $tag
        );
        
        $str = '';
        
        $str .= 'service_id: '.$chat_atts['service_id'];
        $str .= '<br>';
        $str .= 'variant: '.$chat_atts['variant'];
        $str .= '<br>';
        $str .= '<div id="convo-chat" ng-app="publicChat">';
        $str .= '
            <convo-chatbox
                name="\'Test chat\'"
                device-id="\'dev-id\'"
                session-id="\'sess-id\'"
                service-id="\''.$chat_atts['service_id'].'\'"
                collapsed="false"
                mode="public"
                on-chat-reset="regenerateSessionId()"
                toggle-debug="toggleDebug"
                delegate-nlp="delegateNlp"
                variables="variables"
                exception="exception"
                intent="intent">
            </convo-chatbox>

';
        $str .= '</div>';
        $str .= '<style>';
        $str .= '
            #convo-chat {
                all: revert;
                position: fixed;
                z-index:100;
                right:10px;
                height:400px;
                width:360px;
                font-family: Arial, Helvetica, sans-serif;
                font-size:20px;
                background-color: white;

            } 
            .convo-chat {

            } 
.fa{
    font-family: FontAwesome !important;
   }

';
        $str .= '</style>';
        $str .= '      
            <script type="text/javascript">
                var appModule   =   angular.module("publicChat", ["convo.chat"]);
                appModule.constant( "CONVO_PUBLIC_API_BASE_URL", "'.CONVO_BASE_URL.'/wp-json/convo/v1/public");
                appModule.constant( "WP_NONCE", "'.wp_create_nonce('wp_rest').'");

appModule.factory( "authInterceptor", function ( $rootScope, $q, $log, WP_NONCE) {
    return {
        "request": function(config) {
            if (WP_NONCE !== undefined && WP_NONCE !== null && WP_NONCE !== "") {
                $log.log("authInterceptor set X-WP-Nonce header", WP_NONCE);
                config.headers["X-WP-Nonce"] = WP_NONCE;
            }

            return config;
        }
    };
});

appModule.config( function ($httpProvider) {
    $httpProvider.interceptors.push("authInterceptor");
});



            </script>
';
        $str .= '';
        
        return $str;
    }

}
