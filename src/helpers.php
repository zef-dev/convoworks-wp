<?php

namespace ConvoPlugin;

use League\Plates\Engine as ViewEngine;

/**
 * The URL for SL authorization
 *
 * @return string
 */
function amazon_connect_url()
{
	return home_url() . '/convo-connect-to-amazon';
}

/**
 * The callback URL for oAuth authorization
 *
 * @param string $provider
 * @return string
 */
function oauth_callback_url($provider = null)
{
	$url = trailingslashit(home_url()) . 'convo-process-oauth-callback';

	if ($provider) {
		$url .= '?provider=' . $provider;
	}

	return $url;
}

/**
 * Return URL for disconnecting from SL
 *
 * @return string
 */
function amazon_disconnect_url()
{
	return home_url('convo-process-oauth-disconnect');
}

/**
 * Get the current domain
 *
 * @return string
 */
function get_current_domain()
{
	$url = defined('WP_SITEURL') ? WP_SITEURL : 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

	return get_domain_from_url($url);
}

if (! function_exists('get_domain_from_url')) {
	/**
	 * Parse URL and return domain
	 *
	 * @param  string $url
	 * @return string
	 */
	function get_domain_from_url($url)
	{
		return parse_url($url, PHP_URL_HOST);
	}
}

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

function startsWith($haystack, $needle) {
	return substr_compare($haystack, $needle, 0, strlen($needle)) === 0;
}
function endsWith($haystack, $needle) {
	return substr_compare($haystack, $needle, -strlen($needle)) === 0;
}
