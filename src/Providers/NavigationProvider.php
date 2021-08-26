<?php

namespace Convo\Providers;

use Convo\Navigation\Item;
use Convo\Navigation\Menu;
use Convo\Services\Menus;

class NavigationProvider
{
    /**
     * Init the navigation
     *
     * @return void
     */
    public function init()
    {
        $this->registerNavigation();
    }

    /**
     * Register the main Convo WP navigation object globally
     *
     * @return void
     */
    public function registerNavigation()
    {
        $currentPage = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : false;

        $mainMenu = Menu::create()
            // ConvoWP dashboard
            ->add(new Item([
                'uid' => 'convo-plugin',
                'label' => 'Services',
                'url' => admin_url('admin.php?page=convo-plugin'),
                'icon' => 'ops-iconFont ops-dashboard-complex-icon',
                'order' => 100,
                'active' => (bool) ($currentPage and $currentPage === 'convo-plugin'),
            ]));
		// Getting Started
		$mainMenu->add(new Item([
			'uid'    => 'op-getting-started',
			'label'  => 'Getting Started',
			'url'    => admin_url('admin.php?page=convo-getting-started'),
			'order'  => 300,
			'active' => ($currentPage and $currentPage == 'convo-getting-started') ? true : false,
		]));
        // All OP settings
        $mainMenu->add(new Item([
            'uid'    => 'op-settings',
            'label'  => 'Settings',
            'url'    => admin_url('admin.php?page=convo-settings'),
            'icon'   => 'ops-iconFont ops-settings-square-icon',
            'order'  => 400,
            'active' => ($currentPage and $currentPage == 'convo-settings') ? true : false,
        ]));

        // And register the menu to the container
        Menus::register('convo-plugin', $mainMenu);
    }

    /**
     * Add the full screen class if needed
     *
     * @param  string $classes
     * @return string
     */
    public function addFullScreenClass($classes)
    {
        // Fetch user and current option
        $currentUser  = wp_get_current_user();
        $isFullScreen = (int) get_option('convo_isFullScreen_' . $currentUser->ID);

        // Append if needed
        if ($isFullScreen) {
            $classes .= ' convo_isFullScreen';
        }

        return $classes;
    }
}
