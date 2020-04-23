<?php

namespace ConvoPlugin;

use League\Plates\Engine as ViewEngine;

/**
 * Simply load an admin OPF view
 *
 * @param string $view
 * @param array $data
 */
function view($view, $data = [])
{
    $views = new ViewEngine(__DIR__ . '/../resources/views');

    echo $views->render($view, $data);
}

/**
 * Simply load a partial view
 *
 * @param string $view
 * @param array  $data
 */
function partial($view, $data = [])
{
    $views = new ViewEngine(__DIR__ . '/../resources/views');

    echo $views->render($view, $data);
}

/**
 * Check if we are currently on a Convo WP admin page
 *
 * @return bool
 */
function is_convo_admin()
{
    $screen = get_current_screen();

    return strpos($screen->id, 'convo-plugin') !== false or strpos($screen->id, 'convo-settings') !== false;
}

if (! function_exists('convo_can_edit_pages')) {
	/**
	 * Check if current user can edit page
	 *
	 * @return bool
	 */
	function convo_can_edit_pages()
	{
		return (bool) current_user_can('manage_options');
	}
}
