<?php

use Convo\Core\Rest\RestSystemUser;

add_action('template_redirect', function()
{
    $container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
    /** @var \Psr\Log\LoggerInterface $logger */
    $logger = $container->get('logger');

    $currentUrl = (is_ssl() ? 'https://' : 'http://').$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
    $logger->info( 'Current URL ['.$currentUrl.']');
    $url_components = parse_url($currentUrl);

    if (isset($url_components['query'])) {
        parse_str($url_components['query'], $params);
        if (_canDoRedirect($params)) {
            $user = new \Convo\Wp\AdminUser(wp_get_current_user());

            if (_canSetConvoAccountLinkingQueryParamsSessionCookie($params)) {
                _setConvoAccountLinkingQueryParamsSessionCookie(json_encode($params));
            }

            if (!empty($user->getId())) {
                $logger->info( 'Found user ['.$user->getId().']['.$user->getUsername().']');
                $queryString = parse_url(home_url(add_query_arg(null, null)), PHP_URL_QUERY);
                $queryString .= '&user_id=' . $user->getId();
                $url = _getUserAccountLinkingConsentPageUrlOrAccountLinkingProcessUrl($container, $params, $queryString);
                $logger->info( 'Redirecting user to ['.$url.']');
                wp_redirect($url);
                exit;
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

function convo_clear_account_linking_query_params_session_cookie() {
    _removeConvoAccountLinkingQueryParamsSessionCookie();
}
add_action( 'wp_logout', 'convo_clear_account_linking_query_params_session_cookie' );

function convoworks_shortcode_fn($attributes) {
    $type = $attributes['type'] ?? '';
    $paramsFromCookie = _getAccountLinkingParamsFromCookie();

    $queryString = http_build_query($paramsFromCookie);

    if (!isset($paramsFromCookie['user_id'])) {
        $queryString .= '&user_id='.wp_get_current_user()->ID;
    }

    $link = '#';
    $showButton = false;
    switch ($type) {
        case 'accept':
        case 'decline':
            $showButton = true;
            if (!empty($paramsFromCookie)) {
                $queryString .= '&consent_response=' . $type;
                $link = get_rest_url() . 'convo/v1/oauth/' . $paramsFromCookie['type'] . '/' . $paramsFromCookie['service_id'] . '?' . $queryString;
            }
            break;
        default:
            break;
    }

    if ($showButton) {
        return '<div class="wp-block-button is-style-fill" id="convoworks_account_linking_consent_button_'.$type.'"><a class="wp-block-button__link" href="'.$link.'">'.ucfirst($type).'</a></div>';
    }

    return '';
}
add_shortcode('convoworks_account_linking_consent_button', 'convoworks_shortcode_fn');

function convoworks_user_shortcode_fn($attributes) {
    $field = $attributes['field'] ?? '';
    if (empty($field)) {
        return '';
    }
    return wp_get_current_user()->$field;
}
add_shortcode('convoworks_current_user', 'convoworks_user_shortcode_fn');

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
        $url = _getUserAccountLinkingConsentPageUrlOrAccountLinkingProcessUrl($container, $paramsFromCookie, $queryString);
        $logger->info('Redirecting user to ['.$url.']');
        wp_redirect($url);
        exit;
    }
}

function _canSetConvoAccountLinkingQueryParamsSessionCookie($params) {
    if (!isset($params['type']) && !isset($params['service_id'])) {
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

function _getUserAccountLinkingConsentPageUrlOrAccountLinkingProcessUrl($container, $params, $queryString) {
    /** @var \Psr\Log\LoggerInterface $logger */
    $logger = $container->get('logger');
    /** @var \Convo\Data\Wp\WpServiceDataProvider $convoServiceDataProvider */
    $convoServiceDataProvider = $container->get('convoServiceDataProvider');

    $type = $params['type'] ?? 'unknown';
    $service_id = $params['service_id'] ?? 'unknown';

    $logger->info('Got type ['.$type.'] and service id ['.$service_id.']');
    $platform_config = $convoServiceDataProvider->getServicePlatformConfig(
            new RestSystemUser(),
            $service_id,
            \Convo\Core\Publish\IPlatformPublisher::MAPPING_TYPE_DEVELOP
    )[$type] ?? [];

    $logger->info('Got platform config ['.json_encode($platform_config).']');

    $url = $platform_config['account_linking_consent_page_uri'] ?? '';

    if (empty($url)) {
        $url = get_rest_url() . 'convo/v1/oauth/'.$params['type'].'/' . $params['service_id'] .'?' . $queryString;
    }

    return $url;
}
