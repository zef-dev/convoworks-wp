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
        wp_enqueue_script('convo-chat', CONVOWP_ASSETS_URL . 'chat/js/main.js', ['wp-element'], $this->version());
        wp_enqueue_style( 'convo-chat', CONVOWP_ASSETS_URL . 'chat/css/main.css', array(), $this->version() );
        
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
        $str .= '<div id="convo-chat" data-default-settings="' . esc_attr( wp_json_encode( $chat_atts ) ) . '">';
        $str .= '</div>';
        $str .= '<style>';
        $str .= '
            #convo-chat {
                all: revert;
                position: fixed;
                z-index:100;
                right:10px;
                bottom:10px;
                height:400px;
                width:360px;
                font-family: Arial, Helvetica, sans-serif;
                font-size:20px;
            } 
            .convo-chat {

            } 

';
        $str .= '</style>';
        $str .= '<script> //alert("rendered div");';
//         $str .= '
// var Component = React.createElement({
//   render: function() {
//     return (
//       \'<div><ConvoChatComponent apiUrl="'.CONVO_PUBLIC_REST_BASE_URL.'" serviceId="'.$chat_atts['service_id'].'" deviceId="testdevid" variant="'.$chat_atts['variant'].'" /></div>\'
//     );
//   }
// });
// ';
        //$str .= 'wp.element.render(\'<ConvoChatComponent apiUrl="'.CONVO_PUBLIC_REST_BASE_URL.'" serviceId="'.$chat_atts['service_id'].'" deviceId="testdevid" variant="'.$chat_atts['variant'].'" />\', document.getElementById("convo-chat"));';
        $str .= '</script>';
        $str .= '';
        $str .= '';
        
        return $str;
    }

}
