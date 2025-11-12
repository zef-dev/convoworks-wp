<?php

namespace Convo\Providers;

use Convo\Services\Route;
use Convo\Http\OAuthController;

class RouteRegistration
{
    /**
     * Register plugin routes
     *
     * @return void
     */
    public function register()
    {
        add_action('template_redirect', [new OAuthController, 'routes']);
        add_action('wp_loaded',     [$this, 'addWebRoutes']);
        add_action('admin_menu',    [$this, 'registerRoutes']);
        add_action('rest_api_init', [$this, 'registerApiRoutes']);

        $this->registerAjaxRoutes();
    }

    /**
     * Include web route definitions
     *
     * @return void
     */
    public function addWebRoutes()
    {
        require CONVOWP_PATH . '/routes/web.php';
    }

    /**
     * Register all added routes and admin pages
     *
     * @return void
     */
    public function registerRoutes()
    {
        // Main admin page
        add_menu_page(
            __("Convoworks WP", "convo-wp"),
            __("Convoworks WP", "convo-wp"),
            "manage_convoworks",
            "convo-plugin",
            [\Convo\Http\LegacyController::class, "index"],
            "dashicons-admin-page",
            40
        );

        // Subpages
        add_submenu_page(
            "convo-plugin",
            __("Settings", "convo-wp"),
            __("Settings", "convo-wp"),
            "manage_convoworks",
            "convo-settings",
            [\Convo\Http\SettingsController::class, "index"],
            20
        );
        add_submenu_page(
            "convo-plugin",
            __("Getting Started", "convo-wp"),
            __("Getting Started", "convo-wp"),
            "manage_convoworks",
            "convo-getting-started",
            [\Convo\Http\GettingStartedController::class, "index"],
            20
        );
        add_submenu_page(
            "convo-plugin",
            __("Request Log", "convo-wp"),
            __("Request Log", "convo-wp"),
            "manage_convoworks",
            "convo-service-conversation-request-log",
            [\Convo\Http\ConvoServiceConversationRequestLogController::class, "index"],
            20
        );
        // "Service Single" subpage with empty parent (may be for direct access, not shown in menu)
        add_submenu_page(
            null,
            __("Service Single", "convo-wp"),
            __("Service Single", "convo-wp"),
            "manage_convoworks",
            "convo-service-single",
            [\Convo\Http\ServicesController::class, "single"],
            20
        );

        // Rename first submenu item to "Dashboard" for consistency with old logic
        global $submenu;
        if (isset($submenu["convo-wp"])) {
            $submenu["convo-wp"][0][0] = __("Dashboard", "convo-wp");
        }
    }

    /**
     * Include API route definitions
     *
     * @return void
     */
    public function registerApiRoutes()
    {
        require CONVOWP_PATH . '/routes/api.php';
    }

    /**
     * All ajax routes
     *
     * @return void
     */
    public function registerAjaxRoutes()
    {
        require CONVOWP_PATH . '/routes/ajax.php';
    }
}
