<?php

declare(strict_types=1);

namespace Convo\Core\Admin;

use Convo\Core\Rest\NotFoundException;
use Convo\Core\Rest\RequestInfo;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;

/**
 * Helper class which purpose is to group all core convo handlers into single one, ending up with just one convo route to map in your implementation
 * @author Tole
 *
 */
class AdminRestApi implements RequestHandlerInterface
{
    /**
     * @var LoggerInterface
     */
    private $_logger;

    /**
     * @var ContainerInterface
     */
    private $_container;

    public function __construct($logger, $container)
    {
        $this->_logger = $logger;
        $this->_container = $container;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $info = new RequestInfo($request);

        $this->_logger->info('Got info [' . $info . ']');

        if ($info->startsWith('services')) {
            $class_name = ServicesRestHandler::class;
        } elseif ($info->startsWith('service-versions') || $info->startsWith('service-releases')) {
            $class_name = ServiceVersionsRestHandler::class;
        } elseif ($info->startsWith('user-packages')) {
            $class_name = UserPackgesRestHandler::class;
        } elseif ($info->startsWith('user-platforms')) {
            $class_name = UserPlatformsRestHandler::class;
        } elseif ($info->startsWith('service-packages')) {
            $class_name = ServicePackagesRestHandler::class;
        } elseif ($info->startsWith('service-test')) {
            $class_name = TestServiceRestHandler::class;
        } elseif ($info->startsWith('service-imp-exp')) {
            $class_name = ServiceImpExpRestHandler::class;
        } elseif ($info->startsWith('service-platform-config') || $info->startsWith('service-platform-propagate') || $info->startsWith('service-platform-status')) {
            $class_name = ServicePlatformConfigRestHandler::class;
        } elseif ($info->startsWith('media')) {
            $class_name = MediaRestHandler::class;
        } elseif ($info->startsWith('user-platform-config')) {
            $class_name = UserPlatformConfigRestHandler::class;
        } elseif ($info->startsWith('package-help')) {
            $class_name = ComponentHelpRestHandler::class;
        } elseif ($info->startsWith('templates')) {
            $class_name = TemplatesRestHandler::class;
        } elseif ($info->startsWith('config-options')) {
            $class_name = ConfigurationRestHandler::class;
        } elseif ($info->startsWith('get-existing-alexa-skill')) {
            $class_name = AmazonAlexaSkillInfo::class;
        } elseif ($info->startsWith('supply-urls')) {
            $class_name = URLSupplierRestHandler::class;
        } else {
            throw new NotFoundException('Could not map [' . $info . ']');
        }

        $this->_logger->info('Searching for handler [' . $class_name . ']');

        /* @var RequestHandlerInterface $handler */
        $handler = $this->_container->get($class_name);
        return $handler->handle($request);
    }


    // UTIL
    public function __toString()
    {
        return get_class($this) . '[]';
    }
}
