<?php

namespace Convo\Providers;


use Twilio\Rest\Accounts\V1;

class ConvoWPPlugin
{
    /**
     * @var \Psr\Container\ContainerInterface
     */
    private static $_publicDi;
    
    /**
     * @var \Psr\Container\ContainerInterface
     */
    private static $_adminDi;
    
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
        
        // shortcodes
        add_action('init', [new ShortcodeRegistration, 'register']);

	    // Initialize upgrades to the db
	    add_action('admin_init', [new UpgradesProvider, 'run']);
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

    
    /**
     * @return \Psr\Container\ContainerInterface
     */
    public static function getPublicDiContainer() {
        if ( !isset( self::$_publicDi)) {
            $builder = new \DI\ContainerBuilder();
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-client.php');
            
            self::$_publicDi = $builder->build();
        }
        
        return self::$_publicDi;
    }

    /**
     * @return \Psr\Container\ContainerInterface
     */
    public static function getAdminDiContainer() {
        if ( !isset( self::$_adminDi)) {
            $builder = new \DI\ContainerBuilder();
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-wp.php');
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-data-wp.php');
            $builder->addDefinitions(CONVOWP_LIB_COMMON_PATH . 'di-admin.php');
            
            self::$_adminDi = $builder->build();
        }
        
        return self::$_adminDi;
    }
    
    /**
     * @param \Psr\Log\LoggerInterface $logger
     */
    public static function logRequest( $logger) {
        $logger->info( '============================================================');
        if (isset($_SERVER['REQUEST_SCHEME']) && isset($_SERVER['HTTP_HOST'])) {
            $logger->info( $_SERVER['REQUEST_SCHEME'].'://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']);
        }
        
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $logger->info( 'Content-Type: '.$_SERVER['CONTENT_TYPE']);
        }
        
        if (isset($_SERVER['HTTP_USER_AGENT'])) {
            $logger->info( 'User-Agent: '.$_SERVER['HTTP_USER_AGENT']);
        }
        
        if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $logger->info( 'IP: '.$_SERVER['HTTP_X_FORWARDED_FOR']);
        }
        
        else if (isset($_SERVER['REMOTE_ADDR'])) {
            $logger->info( 'IP: '.$_SERVER['REMOTE_ADDR']);
        }
        
        if (isset($_SERVER['REQUEST_METHOD'])) {
            $logger->info( 'Method: '.$_SERVER['REQUEST_METHOD']);
        }
        
        $logger->info( '============================================================');
    }
}
