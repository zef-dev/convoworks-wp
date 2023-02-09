<?php

namespace Convo\Providers;

class PluginActivator
{
    /**
     * Triggered when activating the plugin
     *
     * @param string $plugin
     * @return void
     */
    public static function activate( $networkwide)
    {
        if ( is_multisite() ) {
            if ( $networkwide ) {
                if ( false == is_super_admin() ) {
                    return;
                }
                $blogs = get_sites();
                foreach ( $blogs as $blog ) {
                    /* @var \WP_Site $blog */
                    switch_to_blog( $blog->blog_id );
                    self::activateForBlog();
                    restore_current_blog();
                }
            } else {
                if ( false == current_user_can( 'activate_plugins' ) ) {
                    return;
                }
                self::activateForBlog();
            }
        } else {
            self::activateSingle();
        }
    }
    
    public static function activateForBlog()
    {
        $upgrader = new UpgradesProvider();
        $upgrader->run();
        
        self::_fixRoles();
    }
    
    public static function activateSingle()
    {
        $upgrader = new UpgradesProvider();
        $upgrader->run();
        
        self::_fixRoles();
    }

    /**
     * Triggered when de-activating the plugin
     *
     * @param string $plugin
     * @return void
     */
    public static function deactivate($plugin)
    {
        // @TODO
    }

    /**
     * Triggered after the plugin has been activated
     *
     * @param string $plugin
     * @return void
     */
    public static function afterActivate($plugin)
    {
        if ( !is_multisite() ) {
            if ($plugin === CONVOWP_PLUGIN_SLUG) {
                exit(wp_redirect(admin_url('admin.php?page=convo-getting-started')));
            }
        }
    }
    
    private static function _fixRoles()
    {
        $administratorRole = get_role( 'administrator' );
        $editorRole = get_role( 'editor' );
        
        if (!$administratorRole->has_cap('manage_convoworks')) {
            $administratorRole->add_cap('manage_convoworks');
        }
        
        if (!$editorRole->has_cap('manage_convoworks')) {
            $editorRole->add_cap('manage_convoworks');
        }
    }

    /**
     * Triggered after the plugin has been de-activated
     *
     * @param string $plugin
     * @return void
     */
    public static function afterDeactivate($plugin)
    {
        // @TODO
    }
}
