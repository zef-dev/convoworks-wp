<?php

namespace Convo\Wp\DI;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Psr\Container\ContainerInterface;

class ServiceContainerFactory
{
    /**
     * Builds and returns the public DI container.
     *
     * @return ContainerBuilder
     * @throws \Exception
     */
    public static function createPublicContainer(): ContainerBuilder
    {
        // Load shared services
        $sharedContainerBuilder = self::createSharedContainer();

        // Create the public-specific container builder
        $containerBuilder = new ContainerBuilder();

        // Merge shared services into the public container
        $containerBuilder->merge($sharedContainerBuilder);

        // Define public-specific constants and services

        // Constants
        if (!defined('\\CONVO_BASE_URL')) {
            throw new \Exception('CONVO_BASE_URL is not defined!');
        }

        // Define parameters for logging
        $containerBuilder->setParameter('convo.log_level', defined('\\CONVO_LOG_LEVEL') ? constant('\\CONVO_LOG_LEVEL') : 'info');
        $containerBuilder->setParameter('convo.log_path', defined('\\CONVO_LOG_PATH') ? constant('\\CONVO_LOG_PATH') : null);
        $containerBuilder->setParameter('convo.log_filename', defined('\\CONVO_LOG_FILENAME') ? constant('\\CONVO_LOG_FILENAME') : 'debug.log');
        $containerBuilder->setParameter('convo.log_level_public', defined('\\CONVO_LOG_LEVEL_PUBLIC') ? constant('\\CONVO_LOG_LEVEL_PUBLIC') : '%convo.log_level%');
        $containerBuilder->setParameter('convo.log_path_public', defined('\\CONVO_LOG_PATH_PUBLIC') ? constant('\\CONVO_LOG_PATH_PUBLIC') : '%convo.log_path%');
        $containerBuilder->setParameter('convo.log_filename_public', defined('\\CONVO_LOG_FILENAME_PUBLIC') ? constant('\\CONVO_LOG_FILENAME_PUBLIC') : '%convo.log_filename%');

        // Load public-specific service registrations from external configuration
        $servicesPublic = require __DIR__ . '/services_public.php';
        if (is_callable($servicesPublic)) {
            $servicesPublic($containerBuilder);
        } else {
            throw new \RuntimeException('Public services configuration must return a callable.');
        }

        return $containerBuilder;
    }

    /**
     * Returns the admin middlewares array.
     *
     * @param \Psr\Container\ContainerInterface $container
     * @return array
     * @throws \Exception
     */
    public static function getAdminMiddlewares(ContainerInterface $container): array
    {
        if (!isset($container)) {
            throw new \Exception('No container present');
        }

        if (!defined('\\CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
            define('CONVO_UTIL_DISABLE_GZIP_ENCODING', true);
        }

        return [
            // LOG REQUEST
            $container->get('convo.middleware.log_request'),
            $container->get('convo.middleware.save_request'),

            // PARSE BODY
            $container->get('convo.middleware.body_parser'),

            // CONVO EXCEPTIONS
            $container->get('convo.middleware.wp_exception'),
            $container->get('convo.middleware.convo_exception'),

            // Trailing slash removal
            $container->get('convo.middleware.trailing_slash'),

            // Content-Type negotiation
            $container->get('convo.middleware.json_header'),
        ];
    }

    /**
     * Builds and returns the admin DI container.
     *
     * @return ContainerBuilder
     * @throws \Exception
     */
    public static function createAdminContainer(): ContainerBuilder
    {
        // Load shared services
        $sharedContainerBuilder = self::createSharedContainer();

        // Create the admin-specific container builder
        $containerBuilder = new ContainerBuilder();

        // Merge shared services into the admin container
        $containerBuilder->merge($sharedContainerBuilder);

        // Define admin-specific constants and services
        $containerBuilder->setParameter('convo.log_level', defined('\\CONVO_LOG_LEVEL') ? constant('\\CONVO_LOG_LEVEL') : 'info');
        $containerBuilder->setParameter('convo.log_path', defined('\\CONVO_LOG_PATH') ? constant('\\CONVO_LOG_PATH') : null);
        $containerBuilder->setParameter('convo.log_filename', defined('\\CONVO_LOG_FILENAME') ? constant('\\CONVO_LOG_FILENAME') : 'debug.log');
        $containerBuilder->setParameter('convo.log_level_admin', defined('\\CONVO_LOG_LEVEL_ADMIN') ? constant('\\CONVO_LOG_LEVEL_ADMIN') : '%convo.log_level%');
        $containerBuilder->setParameter('convo.log_path_admin', defined('\\CONVO_LOG_PATH_ADMIN') ? constant('\\CONVO_LOG_PATH_ADMIN') : '%convo.log_path%');
        $containerBuilder->setParameter('convo.log_filename_admin', defined('\\CONVO_LOG_FILENAME_ADMIN') ? constant('\\CONVO_LOG_FILENAME_ADMIN') : '%convo.log_filename%');

        // Load admin-specific service registrations from external configuration
        $servicesAdmin = require __DIR__ . '/services_admin.php';
        if (is_callable($servicesAdmin)) {
            $servicesAdmin($containerBuilder);
        } else {
            throw new \RuntimeException('Admin services configuration must return a callable.');
        }

        return $containerBuilder;
    }

    /**
     * Builds and returns the shared DI container.
     */
    public static function createSharedContainer(): ContainerBuilder
    {
        $containerBuilder = new ContainerBuilder();

        if (!defined('\\CONVO_PUBLIC_REST_BASE_URL')) {
            throw new \Exception('CONVO_PUBLIC_REST_BASE_URL is not defined!');
        }
        $containerBuilder->setParameter('CONVO_PUBLIC_REST_BASE_URL', \CONVO_PUBLIC_REST_BASE_URL);

        global $wpdb;

        if (!defined('\\CONVO_DATA_PATH')) {
            throw new \Exception('CONVO_DATA_PATH is not defined!');
        }

        if (!defined('\\CONVO_MEDIA_BASE_URL')) {
            throw new \Exception('CONVO_MEDIA_BASE_URL is not defined!');
        }

        if (!defined('\\CONVO_BASE_URL')) {
            throw new \Exception('CONVO_BASE_URL is not defined!');
        }

        if (!defined('\\CONVO_DISABLE_SERVICE_COMPRESSION')) {
            define('CONVO_DISABLE_SERVICE_COMPRESSION', false);
        }

        $containerBuilder->setParameter('CONVO_DISABLE_SERVICE_COMPRESSION', \CONVO_DISABLE_SERVICE_COMPRESSION);
        $containerBuilder->setParameter('CONVO_BASE_URL', \CONVO_BASE_URL);
        $containerBuilder->setParameter('CONVO_MEDIA_BASE_URL', \CONVO_MEDIA_BASE_URL);
        $containerBuilder->setParameter('CONVO_DATA_PATH', \CONVO_DATA_PATH);

        // Load shared service registrations from external configuration
        $servicesShared = require __DIR__ . '/services_shared.php';
        if (is_callable($servicesShared)) {
            $servicesShared($containerBuilder, $wpdb);
        } else {
            throw new \RuntimeException('Shared services configuration must return a callable.');
        }

        return $containerBuilder;
    }

    /**
     * Returns the public middlewares array.
     *
     * @param \Psr\Container\ContainerInterface $container
     * @return array
     * @throws \Exception
     */
    public static function getPublicMiddlewares(ContainerInterface $container): array
    {
        if (!isset($container)) {
            throw new \Exception('No container present');
        }

        if (!defined('\\CONVO_UTIL_DISABLE_GZIP_ENCODING')) {
            define('CONVO_UTIL_DISABLE_GZIP_ENCODING', true);
        }

        $middlewares = [
            // LOG REQUEST
            $container->get('convo.middleware.log_request'),
            $container->get('convo.middleware.save_request'),

            // PARSE BODY
            $container->get('convo.middleware.body_parser'),

            // CONVO EXCEPTIONS
            $container->get('convo.middleware.wp_exception'),
            $container->get('convo.middleware.convo_exception'),

            // Trailing slash removal
            $container->get('convo.middleware.trailing_slash'),

            // Content-Type negotiation
            $container->get('convo.middleware.json_header'),
        ];

        if (!\CONVO_UTIL_DISABLE_GZIP_ENCODING) {
            $middlewares[] = $container->get('convo.middleware.gzip_encoder');
        }

        return $middlewares;
    }
}
