<?php

declare(strict_types=1);

namespace Convo\Core\Admin;

use Convo\Core\Rest\RequestInfo;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class ComponentHelpRestHandler implements \Psr\Http\Server\RequestHandlerInterface
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;

    /**
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;

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

    /**
     * @inheritDoc
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $info = new RequestInfo($request);

        if ($info->get() && $route = $info->route('package-help/{packageId}/{component}')) {
            return $this->_provideHtmlPackageComponentHelpFile($route->get('packageId'), $route->get('component'));
        }

        throw new \Convo\Core\Rest\NotFoundException('Could not map info [' . $info . ']');
    }

    private function _provideHtmlPackageComponentHelpFile($packageId, $componentName)
    {
        $provider = $this->_packageProviderFactory->getProviderByNamespace($packageId);
        if (!is_a($provider, '\Convo\Core\Factory\IComponentProvider')) {
            throw new \Convo\Core\Rest\NotFoundException('Package is not component provider [' . $packageId . ']');
        }

        $this->_logger->info('Getting help for component [' . $componentName . '][' . $packageId . ']');

        /** @var \Convo\Core\Factory\IComponentProvider $provider */
        $content = $provider->getComponentHelp($componentName);
        $format = 'html';

        if ($provider instanceof \Convo\Core\Factory\AbstractPackageDefinition
            && method_exists($provider, 'getComponentHelpFileInfo')
        ) {
            $info = $provider->getComponentHelpFileInfo($componentName);

            if (\in_array($info['extension'], ['md', 'markdown'], true)) {
                $format = 'markdown';
            }
        }

        $help = [
            'content' => $content,
            'format' => $format,
        ];

        if ($format === 'html') {
            $help['html_content'] = $content;
        }

        return $this->_httpFactory->buildResponse($help, 200, [
            'Content-Type' => 'application/json'
        ]);
    }
}
