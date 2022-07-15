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
    public static function activate($plugin)
    {
        // @TODO
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
        exit(wp_redirect(admin_url('admin.php?page=convo-getting-started')));
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
