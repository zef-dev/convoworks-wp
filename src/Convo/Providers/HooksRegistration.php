<?php

namespace Convo\Providers;

class HooksRegistration
{
    public function register()
    {
        $hooks = $this->_getRequiredHooks();
        
        foreach ( $hooks as $hook) {
            if ( $hook['type'] === 'action') {
                $this->_registerActionHook( $hook);
            } else if ( $hook['type'] === 'filter') {
                $this->_registerFilterHook( $hook);
            } else {
                throw new \Exception( 'Unexpected hook type ['.$hook['type'].']');
            }
            
        }
    }
    
    private function _registerFilterHook( $hook)
    {
        add_filter( $hook['name'], function () {
            $args = func_get_args();
            return $args[0];
        });
    }
    
    private function _registerActionHook( $hook) 
    {
        add_action( $hook['name'], function () {
            $args = func_get_args();
        });
    }
    
    private function _getRequiredHooks()
    {
        return [
            [
                'type' => 'action',
                'name' => 'preprocess_comment',
            ],
            [
                'type' => 'filter',
                'name' => 'get_the_excerpt',
            ],
        ];
    }

}
