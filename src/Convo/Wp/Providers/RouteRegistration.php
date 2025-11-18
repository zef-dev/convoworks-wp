<?php

namespace Convo\Wp\Providers;

use Convo\Wp\Http\AccountLinkingWebRoutes;
use Convo\Wp\Http\ConvoServiceConversationRequestLogController;
use Convo\Wp\Http\GettingStartedController;
use Convo\Wp\Http\LegacyController;
use Convo\Wp\Http\OAuthController;
use Convo\Wp\Http\ServicesController;
use Convo\Wp\Http\SettingsController;

class RouteRegistration
{
    /**
     * Register plugin routes
     *
     * @return void
     */
    public function register()
    {
        add_action('template_redirect', [new OAuthController(), 'routes']);
        add_action('wp_loaded', [$this, 'addWebRoutes']);
        add_action('admin_menu', [$this, 'registerRoutes']);
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
        (new AccountLinkingWebRoutes())->register();
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
            __("Convoworks WP", 'convoworks-wp'),
            __("Convoworks WP", 'convoworks-wp'),
            "manage_convoworks",
            "convo-plugin",
            [LegacyController::class, "index"],
            "dashicons-admin-page",
            40
        );

        // Subpages
        add_submenu_page(
            "convo-plugin",
            __("Settings", 'convoworks-wp'),
            __("Settings", 'convoworks-wp'),
            "manage_convoworks",
            "convo-settings",
            [SettingsController::class, "index"],
            20
        );
        add_submenu_page(
            "convo-plugin",
            __("Getting Started", 'convoworks-wp'),
            __("Getting Started", 'convoworks-wp'),
            "manage_convoworks",
            "convo-getting-started",
            [GettingStartedController::class, "index"],
            20
        );
        add_submenu_page(
            "convo-plugin",
            __("Request Log", 'convoworks-wp'),
            __("Request Log", 'convoworks-wp'),
            "manage_convoworks",
            "convo-service-conversation-request-log",
            [ConvoServiceConversationRequestLogController::class, "index"],
            20
        );
        // "Service Single" subpage with empty parent (may be for direct access, not shown in menu)
        add_submenu_page(
            null,
            __("Service Single", 'convoworks-wp'),
            __("Service Single", 'convoworks-wp'),
            "manage_convoworks",
            "convo-service-single",
            [ServicesController::class, "single"],
            20
        );

        // Rename first submenu item to "Dashboard" for consistency with old logic
        global $submenu;
        if (isset($submenu["convo-wp"])) {
            $submenu["convo-wp"][0][0] = __("Dashboard", 'convoworks-wp');
        }
    }

    /**
     * Include API route definitions
     *
     * @return void
     */
    public function registerApiRoutes()
    {
        // Moved from routes/api.php

        $namespace = 'Convo\Wp\Http\Api';

        // OAUTH routes
        register_rest_route('convo/v1', '/token/(?P<type>[\S]+)/(?P<serviceId>[\S]+)', [
            'methods' => 'POST',
            'callback' => [$namespace . '\OauthController', 'handleOAuthPost'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        register_rest_route('convo/v1', '/oauth/(?P<type>[\S]+)/(?P<serviceId>[\S]+)', [
            'methods' => ['GET'],
            'callback' => [$namespace . '\OauthController', 'handleOAuthGet'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        // Handle service-media differently
        register_rest_route('convo/v1', '/public/service-media/(?P<serviceId>[\S]+)/(?P<mediaId>[\S]+)', [
            'methods' => ['GET'],
            'callback' => [$namespace . '\ServicesController', 'mediaRoute'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        // public routes catch all
        register_rest_route('convo/v1', '/public/(?P<serviceId>[\S]+)', [
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => [$namespace . '\ServicesController', 'publicRoutes'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        // media
        register_rest_route('convo/v1', '/media/(?P<serviceId>[\S]+)/(?P<mediaId>[\S]+)/download', [
            'methods' => ['GET'],
            'callback' => function ($data) {
                $base_path = '/convoworks/services/' . $data['serviceId'] . '/media/' . $data['mediaId'];
                $json = json_decode(file_get_contents(wp_upload_dir()['basedir'] . $base_path . '.json'), true);
                $ext = $json['ext'];

                $response = new \WP_REST_Response();
                $response->set_status(301);

                $response->header('Location', wp_upload_dir()['baseurl'] . $base_path . '.' . $ext);
                return $response;
            },
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        // SPECIAL ROUTES HANDLED differently
        register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)', [
            'methods' => ['GET'],
            'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        register_rest_route('convo/v1', '/service-imp-exp/export/(?P<serviceId>[\S]+)/(?P<platformId>[\S]+)', [
            'methods' => ['GET'],
            'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        register_rest_route('convo/v1', '/service-imp-exp/export-template/(?P<serviceId>[\S]+)', [
            'methods' => ['GET'],
            'callback' => [$namespace . '\ServicesController', 'specialRoutes'],
            'permission_callback' => function ($request) {
                return true;
            },
        ]);

        // admin routes catch all
        register_rest_route('convo/v1', '/(?P<serviceId>[\S]+)', [
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => [$namespace . '\ServicesController', 'all'],
            'permission_callback' => function ($request) {
                return current_user_can('publish_posts');
            },
        ]);
    }

    /**
     * All ajax routes
     *
     * @return void
     */
    public function registerAjaxRoutes()
    {
        // Moved from routes/ajax.php

        $settingsController = new SettingsController();

        // Settings
        add_action('wp_ajax_convo_update_settings', function () use ($settingsController) {
            $settingsController->update();
        });

        add_action('wp_ajax_op3toggleFullScreen', function () use ($settingsController) {
            $settingsController->toggleFullScreen();
        });
    }
}
