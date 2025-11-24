<?php

namespace Convo\Wp;

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
 * The URL for SL authorization check
 *
 * @return string
 */
function amazon_check_connection_url()
{
    return home_url() . '/convo-check-connection-to-amazon';
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
 * Simply load an admin OPF view
 *
 * @param string $view
 * @param array $data
 */
function view($view, $data = [])
{
    $views = new ViewEngine(__DIR__ . '/../../../views');

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
    $views = new ViewEngine(__DIR__ . '/../../../views');

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



