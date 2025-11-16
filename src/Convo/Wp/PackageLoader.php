<?php

declare(strict_types=1);

namespace Convo\Wp;

use Convo\Core\Factory\FunctionPackageDescriptor;
use Convo\Core\Factory\ClassPackageDescriptor;
use Convo\Core\Factory\PackageProviderFactory;
use Convo\Pckg\Alexa\AmazonPackageDefinition;
use Convo\Pckg\Appointments\AppointmentsPackageDefinition;
use Convo\Pckg\Core\CorePackageDefinition;
use Convo\Pckg\Filesystem\FilesystemPackageDefinition;
use Convo\Pckg\Forms\FormsPackageDefinition;
use Convo\Pckg\MySQLI\MySQLIPackageDefinition;
use Convo\Pckg\Text\TextPackageDefinition;
use Convo\Pckg\Trivia\TriviaPackageDefinition;
use Convo\Pckg\Visuals\VisualsPackageDefinition;
use Convo\Wp\Pckg\ApiBuilder\ApibPackageDefinition;
use Convo\Wp\Pckg\WpHooks\WpHooksPlatform;
use Convo\Wp\Pckg\ApiBuilder\ApiBuilderPlatform;
use Convo\Wp\Pckg\ApiBuilder\ApiBuilderRestHandler;
use Convo\Wp\Pckg\WpCore\WpPostsPackageDefinition;
use Convo\Wp\Pckg\WpHooks\WpHooksPackageDefinition;
use Convo\Wp\Pckg\WpPluginPack\WpPluginPackPackageDefinition;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

class PackageLoader
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

    public function __construct(LoggerInterface $logger, ContainerInterface $container, PackageProviderFactory $packageProviderFactory)
    {
        $this->_logger                  =   $logger;
        $this->_container               =   $container;
        $this->_packageProviderFactory  =   $packageProviderFactory;
    }

    public function load(): void
    {
        $this->_logger->debug('Registering packages');

        $core = new FunctionPackageDescriptor(CorePackageDefinition::class, function () {
            return new CorePackageDefinition(
                $this->_container->get('logger'),
                $this->_container->get('httpFactory'),
                $this->_container->get('packageProviderFactory'),
                $this->_container->get('cache')
            );
        });
        $core->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($core);

        $amazon = new ClassPackageDescriptor(AmazonPackageDefinition::class, $this->_container);
        $amazon->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($amazon);

        $trivia = new ClassPackageDescriptor(TriviaPackageDefinition::class, $this->_container);
        $trivia->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($trivia);

        $filesystem = new ClassPackageDescriptor(FilesystemPackageDefinition::class, $this->_container);
        $filesystem->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($filesystem);

        $mysqli = new ClassPackageDescriptor(MySQLIPackageDefinition::class, $this->_container);
        $mysqli->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($mysqli);

        $visuals = new ClassPackageDescriptor(VisualsPackageDefinition::class, $this->_container);
        $visuals->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($visuals);

        $text = new ClassPackageDescriptor(TextPackageDefinition::class, $this->_container);
        $text->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($text);

        $convoAppointments = new FunctionPackageDescriptor(AppointmentsPackageDefinition::class, function () {
            return new AppointmentsPackageDefinition($this->_logger, $this->_container->get('alexaSettingsApi'));
        });
        $convoAppointments->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($convoAppointments);


        $convoForms = new FunctionPackageDescriptor(FormsPackageDefinition::class, function () {
            return new FormsPackageDefinition($this->_logger);
        });
        $this->_packageProviderFactory->registerPackage($convoForms);

        $this->_logger->info('Triggering [register_convoworks_package] WP action');
        do_action('register_convoworks_package', $this->_packageProviderFactory, $this->_container);

        $wpPosts = new FunctionPackageDescriptor(
            WpPostsPackageDefinition::class,
            function () {
                return new WpPostsPackageDefinition($this->_logger, $this->_packageProviderFactory, $this->_container->get('serviceUserDao'));
            }
        );

        $wpPosts->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($wpPosts);

        $wpPluginPack = new FunctionPackageDescriptor(WpPluginPackPackageDefinition::class, function () {
            return new WpPluginPackPackageDefinition(
                $this->_container->get('logger'),
                $this->_container->get('httpFactory')
            );
        });
        $wpPluginPack->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($wpPluginPack);

        $wpHooks = new FunctionPackageDescriptor(WpHooksPackageDefinition::class, function () {
            $platform = new WpHooksPlatform(
                $this->_container->get('logger'),
                $this->_container->get('convoServiceDataProvider'),
                $this->_container->get('serviceReleaseManager'),
                $this->_container->get('convoServiceFactory'),
                $this->_container->get('convoServiceParamsFactory')
            );
            return new WpHooksPackageDefinition(
                $this->_container->get('logger'),
                $platform
            );
        });
        $wpHooks->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($wpHooks);


        $apiBuilder = new FunctionPackageDescriptor(ApibPackageDefinition::class, function () {
            $publicHandler = new ApiBuilderRestHandler(
                $this->_logger,
                $this->_container->get('httpFactory'),
                $this->_container->get('convoServiceFactory'),
                $this->_container->get('convoServiceParamsFactory'),
                $this->_container->get('convoServiceDataProvider'),
                $this->_container->get('platformRequestFactory'),
                $this->_container->get('eventDispatcher')
            );
            $platform = new ApiBuilderPlatform(
                $this->_logger,
                $this->_container->get('convoServiceDataProvider'),
                $this->_container->get('serviceReleaseManager'),
                $publicHandler
            );
            return new ApibPackageDefinition(
                $this->_logger,
                $publicHandler,
                $platform,
                $this->_packageProviderFactory
            );
        });
        $apiBuilder->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($apiBuilder);
    }

    // UTIL
    public function __toString(): string
    {
        return get_class($this) . '[]';
    }
}
