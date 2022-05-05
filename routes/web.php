<?php

add_action('template_redirect', function()
{
    $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
    /** @var \Psr\Log\LoggerInterface $logger */
    $logger   =   $container->get('logger');

    $currentUrl = $_SERVER['REQUEST_SCHEME'].'://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
    $logger->info( 'Current URL ['.$currentUrl.']');
    $url_components = parse_url($currentUrl);
    $user = new \Convo\Wp\AdminUser(wp_get_current_user());

    if (isset($url_components['query'])) {
        parse_str($url_components['query'], $params);
        if (_canDoRedirect($params)) {
            if (!empty($user->getId())) {
                $logger->info( 'Found user ['.$user->getId().']['.$user->getUsername().']');
                $queryString = parse_url(home_url(add_query_arg(null, null)), PHP_URL_QUERY);
                $queryString .= '&user_id=' . $user->getId();
                // TODO redirect to a consent page
                $url = get_rest_url() . 'convo/v1/oauth/'.$params['type'].'/' . $params['service_id'] .'?' . $queryString;
                $logger->info( 'Redirecting user to ['.$url.']');
                wp_redirect($url);
                exit;
            } else {
                if (_canSetConvoAccountLinkingQueryParamsSessionCookie($params)) {
                    _setConvoAccountLinkingQueryParamsSessionCookie(json_encode($params));
                }
            }
        }
    }
});

function reroute_to_alexa_amazon_after_registration($user_id, $userdata) {
    _triggerAccountLinkingProcess($user_id);
}
add_action('user_register', 'reroute_to_alexa_amazon_after_registration', 10, 2);

function reroute_to_alexa_amazon_after_login($user_login, $user) {
    _triggerAccountLinkingProcess($user->ID);
}
add_action('wp_login', 'reroute_to_alexa_amazon_after_login', 10, 2);

function _triggerAccountLinkingProcess($user_id) {
    $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
    /** @var \Psr\Log\LoggerInterface $logger */
    $logger   =   $container->get('logger');
    \Convo\Providers\ConvoWPPlugin::logRequest( $logger);

    $paramsFromCookie = _getAccountLinkingParamsFromCookie();

    $queryString = http_build_query($paramsFromCookie);
    $logger->info('Query String ['.$queryString.']');

    if (!isset($paramsFromCookie['user_id'])) {
        $queryString .= '&user_id='.$user_id;
    }

    if (_canRedirectToAccountLinkingProcess($paramsFromCookie)) {
        // TODO redirect to a consent page
        $url = get_rest_url().'convo/v1/oauth/'.$paramsFromCookie['type'].'/'.$paramsFromCookie['service_id'].'?'.$queryString;
        $logger->info('Redirecting user to ['.$url.']');
        _removeConvoAccountLinkingQueryParamsSessionCookie();
        wp_redirect($url);
        exit;
    }
}

function _canSetConvoAccountLinkingQueryParamsSessionCookie($params) {
    if (!is_array($params) && !isset($params['type']) && !isset($params['service_id'])) {
        return false;
    }

    switch ($params['type']) {
        case 'amazon':
        case 'google':
            return isset($params['client_id'])
                && isset($params['redirect_uri'])
                && isset($params['response_type'])
                && isset($params['state']);
        default:
            return false;
    }
}

function _canDoRedirect($params) {
    return isset($params['type']) && isset($params['service_id']);
}

function _canRedirectToAccountLinkingProcess($params) {
    return isset($_COOKIE['convo_account_linking_query_params']);
}

function _getAccountLinkingParamsFromCookie() {
    $params = isset($_COOKIE['convo_account_linking_query_params']) ? base64_decode($_COOKIE['convo_account_linking_query_params']) : '';
    return !empty(json_decode($params, true)) ? json_decode($params, true) : [];
}

function _setConvoAccountLinkingQueryParamsSessionCookie($value) {
    setcookie('convo_account_linking_query_params', base64_encode($value), 0, '/', '', is_ssl(), true);
}

function _removeConvoAccountLinkingQueryParamsSessionCookie() {
    setcookie('convo_account_linking_query_params', '', 0, '/', '', is_ssl(), true);
}
