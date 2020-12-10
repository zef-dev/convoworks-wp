<?php

namespace ConvoPlugin\Providers;

use Convo\Core\Factory\PackageProviderFactory;
use DI\Container;

class ConvoWPPlugin
{
    /**
     * Initialize the plugin
     *
     * @return void
     */
    public function init()
    {
        // Register routes
        add_action('init', [new RouteRegistration, 'register']);

        // Load translations
        add_action('init', [$this, 'loadPluginTextDomain']);

        // Add assets
        add_action('init', [new AssetsProvider, 'init']);

        // Initialize navigation
        add_action('init', [new NavigationProvider, 'init']);

	    // Initialize upgrades to the db
	    add_action('admin_init', [new UpgradesProvider, 'run']);

	    // Initialize hooks
	    add_action('init', [$this, 'initHooks']);
    }

	public function initHooks()
	{
		/** @var PackageProviderFactory $packageProviderFactory */
		/** @var Container $container */
		do_action('register_convoworks_package', $packageProviderFactory, $container);
    }

    /**
     * Triggered when installing plugin
     */
    public function install()
    {
        $installer = new PluginInstaller;
        $installer->run();
    }

    /**
     * Load the plugin text domain for translation.
     */
    public function loadPluginTextDomain()
    {
        $domain = 'convo-wp';
        $locale = apply_filters('plugin_locale', get_locale(), $domain);

        load_textdomain($domain, WP_LANG_DIR . '/' . $domain . '/' . $domain . '-' . $locale . '.mo');
        load_plugin_textdomain($domain, FALSE, CONVOWP_PATH . '/lang/');
    }

    /**
     * Add some notices to the admin screens
     *
     * @return void
     */
    public function initNotices()
    {

    }
}
