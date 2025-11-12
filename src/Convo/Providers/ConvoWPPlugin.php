<?php

namespace Convo\Providers;


use Convo\Wp\PackageLoader;

class ConvoWPPlugin
{

    private static $_packagesLoaded = false;

    /**
     * @var \Psr\Container\ContainerInterface
     */
    private static $_publicDi;

    /**
     * @var \Psr\Container\ContainerInterface
     */
    private static $_adminDi;

    private static $_logged = false;

    /**
     * Initialize the plugin
     *
     * @return void
     */
    public function init()
    {
        // hooks
        add_action('init', [new HooksRegistration, 'register']);

        // Register routes
        add_action('init', [new RouteRegistration, 'register']);

        // Load translations
        add_action('init', [$this, 'loadPluginTextDomain']);

        // Add assets
        add_action('admin_init', [new AssetsProvider, 'init']);

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
    public function initNotices() {}

    /**
     * @return \Psr\Container\ContainerInterface
     */
    public static function getPublicDiContainer()
    {
        if (!isset(self::$_publicDi)) {
            if (isset(self::$_adminDi)) {
                error_log('WARNING: Admin DI already created');
                // throw new \Exception('Admin DI already created');
            }

            // Load the Symfony container from the public PHP service configuration file
            self::$_publicDi = require CONVOWP_LIB_COMMON_PATH . 'services_public.php';
        }

        return self::$_publicDi;
    }

    /**
     * @return \Psr\Container\ContainerInterface
     */
    public static function getAdminDiContainer()
    {
        if (!isset(self::$_adminDi)) {
            if (isset(self::$_publicDi)) {
                error_log('WARNING: Public DI already created');
                //                 throw new \Exception( 'Public DI already created');
            }

            // Load the Symfony container from the admin PHP service configuration file
            self::$_adminDi = require CONVOWP_LIB_COMMON_PATH . 'services_admin.php';
        }

        return self::$_adminDi;
    }

    public static function getCurrentDiContainer()
    {
        if (self::isAdminRequest()) {
            return self::getAdminDiContainer();
        }

        return self::getPublicDiContainer();
    }

    public static function isAdminRequest()
    {
        if (is_admin() || is_customize_preview()) {
            return true;
        }

        $uri = $_SERVER['REQUEST_URI'];
        if (stripos($uri, 'convo/v1') !== false) {
            if (stripos($uri, 'convo/v1/public') === false && stripos($uri, 'convo/v1/media') === false) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return \Psr\Log\LoggerInterface $logger
     */
    public static function getLogger()
    {
        return self::getCurrentDiContainer()->get('logger');
    }

    /**
     * @param \Psr\Log\LoggerInterface $logger
     */
    public static function logRequest($logger)
    {

        if (self::$_logged) {
            return;
        }

        self::$_logged = true;

        $logger->info('============================================================');
        if (isset($_SERVER['REQUEST_SCHEME']) && isset($_SERVER['HTTP_HOST'])) {
            $logger->info($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
        }

        if (isset($_SERVER['CONTENT_TYPE'])) {
            $logger->info('Content-Type: ' . $_SERVER['CONTENT_TYPE']);
        }

        if (isset($_SERVER['HTTP_USER_AGENT'])) {
            $logger->info('User-Agent: ' . $_SERVER['HTTP_USER_AGENT']);
        }

        if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $logger->info('IP: ' . $_SERVER['HTTP_X_FORWARDED_FOR']);
        } else if (isset($_SERVER['REMOTE_ADDR'])) {
            $logger->info('IP: ' . $_SERVER['REMOTE_ADDR']);
        }

        if (isset($_SERVER['REQUEST_METHOD'])) {
            $logger->info('Method: ' . $_SERVER['REQUEST_METHOD']);
        }

        $logger->info('============================================================');
    }

    public static function loadPackages($container)
    {
        if (!self::$_packagesLoaded) {
            $loader = new PackageLoader($container->get('logger'), $container, $container->get('packageProviderFactory'));
            $loader->load();
        }
        self::$_packagesLoaded = true;
    }
}
