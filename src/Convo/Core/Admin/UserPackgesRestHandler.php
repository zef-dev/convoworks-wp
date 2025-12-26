<?php

declare(strict_types=1);

namespace Convo\Core\Admin;

use Psr\Http\Server\RequestHandlerInterface;

class UserPackgesRestHandler implements RequestHandlerInterface
{
    /**
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;

    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;

    /**
     * @var \Convo\Core\Factory\PackageProviderFactory
     */
    private $_packageProviderFactory;

    public function __construct($logger, $httpFactory, $packageProviderFactory)
    {
        $this->_logger = $logger;
        $this->_httpFactory = $httpFactory;
        $this->_packageProviderFactory = $packageProviderFactory;
    }

    public function handle(\Psr\Http\Message\ServerRequestInterface $request): \Psr\Http\Message\ResponseInterface
    {
        $info = new \Convo\Core\Rest\RequestInfo($request);

        $this->_logger->debug('Got info [' . $info . ']');

        $user = $info->getAuthUser();

        if ($info->get() && $route = $info->route('user-packages/{packageId}')) {
            return $this->_performUserPackagesPackageIdGet($request, $user, $route->get('packageId'));
        }

        if ($info->get() && $info->route('user-packages')) {
            return $this->_performUserPackagesGet($request, $user);
        }

        throw new \Convo\Core\Rest\NotFoundException('Could not map [' . $info . ']');
    }


    private function _performUserPackagesGet(\Psr\Http\Message\RequestInterface $request, \Convo\Core\IAdminUser $user)
    {
        $available = $this->_packageProviderFactory->getAvailablePackages();

        $this->_logger->info('Got [' . \count($available) . '] user packages');

        return $this->_httpFactory->buildResponse($available);
    }

    private function _performUserPackagesPackageIdGet(\Psr\Http\Message\RequestInterface $request, \Convo\Core\IAdminUser $user, $packageId)
    {
        $package = $this->_getPackageDefinition($packageId);

        $this->_logger->info('Got package definition for [' . $packageId . ']');

        return $this->_httpFactory->buildResponse($package);
    }


    // UTIL
    private function _getPackageDefinition($packageId)
    {
        $provider = $this->_packageProviderFactory->getProviderByNamespace($packageId);

        return $provider->getRow();
    }

    public function __toString()
    {
        return \get_class($this) . '[]';
    }
}
