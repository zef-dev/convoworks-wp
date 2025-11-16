<?php

namespace Convo\Http;

use Convo\Providers\ConvoWPPlugin;
use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Publish\IPlatformPublisher;
use Convo\Wp\AdminUser;
use Convo\Wp\Data\WpServiceDataProvider;
use Psr\Log\LoggerInterface;

class AccountLinkingWebRoutes
{
    /**
     * Register all web routes, hooks, and shortcodes related to account linking.
     */
    public function register(): void
    {
        add_action('template_redirect', [$this, 'handleTemplateRedirect']);
        add_action('user_register', [$this, 'handleUserRegister'], 10, 2);
        add_action('wp_login', [$this, 'handleUserLogin'], 10, 2);
        add_action('wp_logout', [$this, 'handleUserLogout']);

        add_shortcode('convoworks_account_linking_consent_button', [$this, 'renderConsentButtonShortcode']);
        add_shortcode('convoworks_current_user', [$this, 'renderCurrentUserShortcode']);
    }

    /**
     * Handle template redirect for account linking.
     */
    public function handleTemplateRedirect(): void
    {
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $currentUrl = (is_ssl() ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        $logger->info('Current URL [' . $currentUrl . ']');
        $url_components = parse_url($currentUrl);

        if (!isset($url_components['query'])) {
            return;
        }

        parse_str($url_components['query'], $params);
        if (!$this->canDoRedirect($params)) {
            return;
        }

        $user = new AdminUser(wp_get_current_user());

        if ($this->canSetQueryParamsCookie($params)) {
            $this->setQueryParamsCookie($params);
        }

        if (empty($user->getId())) {
            return;
        }

        $logger->info('Found user [' . $user->getId() . '][' . $user->getUsername() . ']');
        $queryString = parse_url(home_url(add_query_arg(null, null)), PHP_URL_QUERY);
        $queryString .= '&user_id=' . $user->getId();

        $url = $this->getConsentPageOrProcessUrl($container, $params, $queryString);
        $logger->info('Redirecting user to [' . $url . ']');

        wp_redirect($url);
        exit;
    }

    /**
     * On user registration, trigger account linking.
     */
    public function handleUserRegister($user_id, $userdata): void
    {
        $this->triggerAccountLinkingProcess($user_id);
    }

    /**
     * On user login, trigger account linking.
     */
    public function handleUserLogin($user_login, $user): void
    {
        $this->triggerAccountLinkingProcess($user->ID);
    }

    /**
     * On logout, clear the account linking params cookie.
     */
    public function handleUserLogout(): void
    {
        $this->removeQueryParamsCookie();
    }

    /**
     * Shortcode for account linking consent buttons.
     */
    public function renderConsentButtonShortcode($attributes): string
    {
        $type = $attributes['type'] ?? '';
        $paramsFromCookie = $this->getParamsFromCookie();

        $queryString = http_build_query($paramsFromCookie);

        if (!isset($paramsFromCookie['user_id'])) {
            $queryString .= '&user_id=' . wp_get_current_user()->ID;
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
            return '<div class="wp-block-button is-style-fill" id="convoworks_account_linking_consent_button_' . $type . '"><a class="wp-block-button__link" href="' . $link . '">' . ucfirst($type) . '</a></div>';
        }

        return '';
    }

    /**
     * Shortcode for printing current user fields.
     */
    public function renderCurrentUserShortcode($attributes): string
    {
        $field = $attributes['field'] ?? '';
        if (empty($field)) {
            return '';
        }

        return wp_get_current_user()->{$field};
    }

    /**
     * Trigger the account linking process based on cookie data.
     */
    private function triggerAccountLinkingProcess($user_id): void
    {
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');
        ConvoWPPlugin::logRequest($logger);

        $paramsFromCookie = $this->getParamsFromCookie();

        $queryString = http_build_query($paramsFromCookie);
        $logger->info('Query String [' . $queryString . ']');

        if (!isset($paramsFromCookie['user_id'])) {
            $queryString .= '&user_id=' . $user_id;
        }

        if ($this->canRedirectToAccountLinkingProcess($paramsFromCookie)) {
            $url = $this->getConsentPageOrProcessUrl($container, $paramsFromCookie, $queryString);
            $logger->info('Redirecting user to [' . $url . ']');
            wp_redirect($url);
            exit;
        }
    }

    /**
     * Whether we can set the query params cookie.
     */
    private function canSetQueryParamsCookie(array $params): bool
    {
        if (!isset($params['type']) && !isset($params['service_id'])) {
            return false;
        }

        switch ($params['type']) {
            case 'amazon':
                return isset($params['client_id'], $params['redirect_uri'], $params['response_type'], $params['state']);
            default:
                return false;
        }
    }

    /**
     * Whether we can do a redirect based on query params.
     */
    private function canDoRedirect(array $params): bool
    {
        return isset($params['type'], $params['service_id']);
    }

    /**
     * Whether we can redirect to the account linking process.
     */
    private function canRedirectToAccountLinkingProcess(array $params): bool
    {
        // Note: mirrors old _canRedirectToAccountLinkingProcess implementation.
        return isset($_COOKIE['convo_account_linking_query_params']);
    }

    /**
     * Read params from the session cookie.
     */
    private function getParamsFromCookie(): array
    {
        $raw = $_COOKIE['convo_account_linking_query_params'] ?? '';
        if ($raw === '') {
            return [];
        }

        $decoded = base64_decode($raw, true);
        if ($decoded === false) {
            return [];
        }

        $json = json_decode($decoded, true);

        return is_array($json) ? $json : [];
    }

    /**
     * Set the account linking query params session cookie.
     */
    private function setQueryParamsCookie(array $params): void
    {
        $value = base64_encode(json_encode($params));
        setcookie('convo_account_linking_query_params', $value, 0, '/', '', is_ssl(), true);
    }

    /**
     * Remove the account linking query params session cookie.
     */
    private function removeQueryParamsCookie(): void
    {
        setcookie('convo_account_linking_query_params', '', 0, '/', '', is_ssl(), true);
    }

    /**
     * Build the consent page or account linking process URL.
     */
    private function getConsentPageOrProcessUrl($container, array $params, string $queryString): string
    {
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');
        /** @var WpServiceDataProvider $convoServiceDataProvider */
        $convoServiceDataProvider = $container->get('convoServiceDataProvider');

        $type = $params['type'] ?? 'unknown';
        $service_id = $params['service_id'] ?? 'unknown';

        $logger->info('Got type [' . $type . '] and service id [' . $service_id . ']');
        $platform_config = $convoServiceDataProvider->getServicePlatformConfig(
            new RestSystemUser(),
            $service_id,
            IPlatformPublisher::MAPPING_TYPE_DEVELOP
        )[$type] ?? [];

        $logger->info('Got platform config [' . json_encode($platform_config) . ']');

        $url = $platform_config['account_linking_consent_page_uri'] ?? '';

        if (empty($url)) {
            $url = get_rest_url() . 'convo/v1/oauth/' . $params['type'] . '/' . $params['service_id'] . '?' . $queryString;
        }

        return $url;
    }
}
