<?php

declare(strict_types=1);

namespace Convo\Core\Adapters;

use Convo\Core\Adapters\Alexa\AlexaSkillRestHandler;
use Convo\Core\Adapters\Alexa\AmazonAuthRestHandler;
use Convo\Core\Adapters\Alexa\CatalogRestHandler;
use Convo\Core\Adapters\ConvoChat\ConvoChatRestHandler;
use Convo\Core\Adapters\Viber\ViberRestHandler;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Container\ContainerInterface;
use Convo\Core\Factory\IPlatformProvider;
use Psr\Log\LoggerInterface;
use Convo\Core\Factory\IRestPlatform;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Core\Media\MediaRestHandler;
use Convo\Core\Rest\NotFoundException;
use Convo\Core\Rest\RequestInfo;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Helper class which purpose is to group all core convo handlers into single one, ending up with just one convo route to map in your implementation
 * @author Tole
 *
 */
class PublicRestApi implements RequestHandlerInterface
{

    /**
     * @var LoggerInterface
     */
    private $_logger;

    /**
     * @var ContainerInterface
     */
    private $_container;


    /**
     * @var PackageProviderFactory
     */
    private $_packageProviderFactory;

    /**
     * @param LoggerInterface $logger
     * @param ContainerInterface $container
     */
    public function __construct($logger, $container)
    {
        $this->_logger                        =     $logger;
        $this->_container                    =     $container;
        $this->_packageProviderFactory      =    $container->get('packageProviderFactory');
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $info    =    new RequestInfo($request);

        $this->_logger->debug('Got info [' . $info . ']');

        if ($info->startsWith('service-run/external')) {
            if ($route = $info->routePartial('service-run/external/{packageId}/{platformId}')) {
                $package_id  =   $route->get('packageId');
                $platform_id  =   $route->get('platformId');
                $provider     =   $this->_packageProviderFactory->getProviderByNamespace($package_id);
                if ($provider instanceof IPlatformProvider) {
                    /* @var IPlatformProvider $provider */
                    $platform     =   $provider->getPlatform($platform_id);
                    if ($platform instanceof IRestPlatform) {
                        /* @var IRestPlatform $platform */
                        $handler      =   $platform->getPublicRestHandler();
                        return $handler->handle($request);
                    }
                }
                throw new NotFoundException('No appropriate platform provider found for [' . $package_id . '][' . $platform_id . '] at [' . $info . ']');
            }
            throw new NotFoundException('No platform route found for at [' . $info . ']');
        }

        // AMAZON
        if ($info->startsWith('service-run/alexa-skill') || $info->startsWith('service-run/amazon')) {
            $class_name    =    AlexaSkillRestHandler::class;
        } else if ($info->startsWith('admin-auth/amazon')) {
            $class_name    =    AmazonAuthRestHandler::class;
        } else if ($info->startsWith('service-run/convo_chat')) {
            $class_name    =    ConvoChatRestHandler::class;

            // VIBER
        } else if ($info->startsWith('service-run/viber')) {
            $class_name    = ViberRestHandler::class;

            // OTHER
        } else if ($info->startsWith('service-run')) {

            if ($route = $info->routePartial('service-run/{platformId}')) {
                $package_id  =   $route->get('platformId');
                $platform_id  =   $route->get('platformId');
                $provider     =   $this->_packageProviderFactory->getProviderByNamespace($package_id);
                if ($provider instanceof IPlatformProvider) {
                    /* @var IPlatformProvider $provider */
                    $platform     =   $provider->getPlatform($platform_id);
                    if ($platform instanceof IRestPlatform) {
                        /* @var IRestPlatform $platform */
                        $handler      =   $platform->getPublicRestHandler();
                        return $handler->handle($request);
                    }
                }
                throw new NotFoundException('No appropriate platform provider found for [' . $package_id . '][' . $platform_id . '] at [' . $info . ']');
            }

            throw new NotFoundException('We got other [service-run] but it is not handled at [' . $info . ']');
        }

        // MEDIA

        else if ($info->startsWith('service-media')) {
            $class_name = MediaRestHandler::class;
        }

        // CATALOGS

        else if ($info->startsWith('service-catalogs')) {
            $class_name = CatalogRestHandler::class;
        } else {
            throw new NotFoundException('Could not map [' . $info . ']');
        }

        $this->_logger->debug('Searching for handler [' . $class_name . ']');

        /* @var \Psr\Http\Server\RequestHandlerInterface $handler */
        $handler    =    $this->_container->get($class_name);
        return $handler->handle($request);
    }


    // UTIL
    public function __toString()
    {
        return get_class($this) . '[]';
    }
}
