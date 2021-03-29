<?php

namespace ConvoPlugin\Providers;

use function ConvoPlugin\is_convo_admin;

class AssetsProvider
{
    /**
     * Triggered when deactivating the plugin
     *
     * @return void
     */
    public function init()
    {
        // Add specific class for admin pages
        add_filter('admin_body_class', function($classes) {
            if (is_convo_admin()) {
                return "$classes op-dashboard-admin-app";
            }

            return $classes;
        });
        // Then add the assets
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminAssets']);
    }

	/**
	 * Enqueue admin scripts
	 *
	 * @param $page
	 */
    public function enqueueAdminAssets($page)
    {
	    $pagesNeedingAppJs = [
		    'toplevel_page_convo-plugin',
		    'convo-plugin#!/convoworks-editor',
		    'convoworks-wp_page_convo-settings',
	    ];

	    // Although we could check for suitable pages by checking if
	    // "op-funnels" string exists, by checking against the array decision
	    // on which page to show JS needs to be conscious and not by default
	    if (in_array($page, $pagesNeedingAppJs)) {
		    global $wp_version;

		    // The "updates" dependency breaks some stuff on older WP versions
		    if ( version_compare( $wp_version, '5.5', '>=' ) ) {
			    wp_enqueue_script( 'convo-plugin-dashboard', plugins_url( 'public/assets/js/app.js', CONVOWP_FILE ), [ 'jquery' ], $this->version(), true );
		    } else {
			    wp_enqueue_script( 'convo-plugin-dashboard', plugins_url( 'public/assets/js/app.js', CONVOWP_FILE ), [
				    'jquery',
				    'updates'
			    ], $this->version(), true );
		    }

		    // adding resources needed for the Convo editor
		    wp_enqueue_script('convo-jqueryui', 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', ['jquery'], $this->version());
		    wp_enqueue_style('convo-jqueryui-css', 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css', $this->version());
		    wp_enqueue_style('convo-bootstrap-css', 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css', $this->version());
		    wp_enqueue_script('convo-bootstrap', 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js', ['jquery'], $this->version());
		    wp_enqueue_script('convo-angular', 'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js', ['jquery'], $this->version());
		    wp_enqueue_script('convo-angular-animate', 'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-animate.min.js', ['jquery', 'convo-angular'], $this->version());
		    wp_enqueue_script('convo-angular-cookies', 'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-cookies.min.js', ['jquery', 'convo-angular'], $this->version());
		    wp_enqueue_script('convo-angular-sanitize', 'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-sanitize.min.js', ['jquery', 'convo-angular'], $this->version());
		    wp_enqueue_script('convo-react', 'https://unpkg.com/react@16/umd/react.production.min.js', ['jquery'], $this->version());
		    wp_enqueue_script('convo-react-dom', 'https://unpkg.com/react-dom@16/umd/react-dom.production.min.js', ['jquery', 'convo-react'], $this->version());

		    // Add some required variables to our global script
		    wp_localize_script( "convo-plugin-dashboard", 'ConvoScriptData', [
			    'ajax_url' => admin_url( 'admin-ajax.php' ),
			    'nonce'    => wp_create_nonce( 'wp_rest' ),
		    ] );

		    wp_enqueue_style( "convo-framework", plugins_url( "public/assets/css/framework.css", CONVOWP_FILE ), [], $this->version() );
		    wp_enqueue_style( "convo-app", plugins_url( "public/assets/css/app.css", CONVOWP_FILE ), [], $this->version() );

		    remove_all_actions( "admin_notices" );

		    if ( is_admin() ) {
			    wp_enqueue_style( "convo-wp-dashboard", plugins_url( "public/assets/css/wp.css", CONVOWP_FILE ), [], $this->version() );
		    }
	    }
    }

    /**
     * Return plugin version
     *
     * @return string
     */
    public function version()
    {
        return CONVOWP_VERSION;
    }
}
