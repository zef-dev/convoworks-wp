<?php

declare(strict_types=1);

namespace Convo\Core\Admin;

use Psr\Http\Server\RequestHandlerInterface;

class UserPlatformsRestHandler implements RequestHandlerInterface
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

        if ($info->get() && $info->route('user-platforms')) {
            return $this->_performUserPlatformsGet($request, $user);
        }

        throw new \Convo\Core\Rest\NotFoundException('Could not map [' . $info . ']');
    }

    private function _performUserPlatformsGet(\Psr\Http\Message\RequestInterface $request, \Convo\Core\IAdminUser $user)
    {
        $availablePackages = $this->_packageProviderFactory->getAvailablePackages();
        $platforms = [];

        $this->_logger->debug('Processing [' . count($availablePackages) . '] packages for platforms');

        foreach ($availablePackages as $packageMeta) {
            $namespace = $packageMeta['namespace'];

            try {
                $package = $this->_packageProviderFactory->getProviderByNamespace($namespace);
                $packageRow = $package->getRow();

                if (isset($packageRow['platforms']) && is_array($packageRow['platforms'])) {
                    foreach ($packageRow['platforms'] as $platformId => $platformData) {
                        $platform = [
                            'platform_id' => $platformId,
                            'package_namespace' => $namespace,
                            'name' => $platformData['name'] ?? $platformId,
                            'description' => $platformData['description'] ?? '',
                            'icon_url' => $platformData['icon_url'] ?? null,
                            'icon_class' => $platformData['icon_class'] ?? null,
                            'route' => $platformData['route'] ?? null,
                            'config_url' => $platformData['config_url'] ?? null,
                            'requires_publish' => $platformData['requires_publish'] ?? false,
                            'warning_tooltip' => $platformData['warning_tooltip'] ?? null,
                            'display_name' => $platformData['display_name'] ?? null,
                        ];

                        $platforms[] = $platform;
                    }
                }
            } catch (\Exception $e) {
                $this->_logger->warning('Could not get platforms from package [' . $namespace . ']: ' . $e->getMessage());
            }
        }

        $this->_logger->info('Got [' . count($platforms) . '] user platforms');

        return $this->_httpFactory->buildResponse($platforms);
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[]';
    }
}

