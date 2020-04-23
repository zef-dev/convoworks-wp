<?php

namespace ConvoPlugin\Providers;

use ConvoPlugin\Services\Route;

class RouteRegistration
{
    /**
     * Register plugin routes
     *
     * @return void
     */
    public function register()
    {
        add_action('wp_loaded',     [$this, 'addAdminRoutes']);
        add_action('wp_loaded',     [$this, 'addWebRoutes']);
        add_action('admin_menu',    [$this, 'registerRoutes']);
        add_action('rest_api_init', [$this, 'registerApiRoutes']);

        $this->registerAjaxRoutes();
    }

    /**
     * Include admin route definitions
     *
     * @return void
     */
    public function addAdminRoutes()
    {
        require CONVOWP_PATH.'/routes/admin.php';
    }

    /**
     * Include web route definitions
     *
     * @return void
     */
    public function addWebRoutes()
    {
        require CONVOWP_PATH.'/routes/web.php';
    }

    /**
     * Register all added routes and admin pages
     *
     * @return void
     */
    public function registerRoutes()
    {
        // Admin routes
        Route::registerAdminPages();
    }

    /**
     * Include API route definitions
     *
     * @return void
     */
    public function registerApiRoutes()
    {
        require CONVOWP_PATH.'/routes/api.php';
    }

    /**
     * All ajax routes
     *
     * @return void
     */
    public function registerAjaxRoutes()
    {
        require CONVOWP_PATH.'/routes/ajax.php';
    }
}
