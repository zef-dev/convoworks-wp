<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Wp;

use Convo\Core\Factory\FunctionPackageDescriptor;
use Convo\Core\Factory\ClassPackageDescriptor;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;

class LoadPackagesMiddleware implements \Psr\Http\Server\MiddlewareInterface
{

	/**
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;

	/**
	 * @var \Psr\Container\ContainerInterface
	 */
	private $_container;

	/**
	 * @var \Convo\Core\Factory\PackageProviderFactory
	 */
	private $_packageProviderFactory;

	public function __construct( \Psr\Log\LoggerInterface $logger, \Psr\Container\ContainerInterface $container, $packageProviderFactory)
	{
		$this->_logger                  =   $logger;
		$this->_container               =   $container;
		$this->_packageProviderFactory  =   $packageProviderFactory;
	}

	public function process( ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
	{
	    $this->_logger->debug( 'Registering packages');

	    $core = new FunctionPackageDescriptor('\Convo\Pckg\Core\CorePackageDefinition', function() {
	        return new \Convo\Pckg\Core\CorePackageDefinition(
	            $this->_container->get('logger'),
                $this->_container->get('httpFactory'),
                $this->_container->get('packageProviderFactory'),
                $this->_container->get('cache')
            );
        });
	    $core->setLogger($this->_logger);
	    $this->_packageProviderFactory->registerPackage($core);

//         $amazon = new ClassPackageDescriptor('\Convo\Pckg\Alexa\AmazonPackageDefinition', $this->_container);
//         $amazon->setLogger($this->_logger);
//         $this->_packageProviderFactory->registerPackage($amazon);

        $trivia = new ClassPackageDescriptor('\Convo\Pckg\Trivia\TriviaPackageDefinition', $this->_container);
        $trivia->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage( $trivia);

        $dialogflow = new ClassPackageDescriptor('\Convo\Pckg\Dialogflow\DialogflowPackageDefinition', $this->_container);
        $dialogflow->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($dialogflow);

		$filesystem = new ClassPackageDescriptor('\Convo\Pckg\Filesystem\FilesystemPackageDefinition', $this->_container);
		$filesystem->setLogger($this->_logger);
		$this->_packageProviderFactory->registerPackage( $filesystem);

		$mysqli = new ClassPackageDescriptor('\Convo\Pckg\MySQLI\MySQLIPackageDefinition', $this->_container);
		$mysqli->setLogger($this->_logger);
		$this->_packageProviderFactory->registerPackage( $mysqli);

		$visuals = new ClassPackageDescriptor('\Convo\Pckg\Visuals\VisualsPackageDefinition', $this->_container);
		$visuals->setLogger($this->_logger);
		$this->_packageProviderFactory->registerPackage( $visuals);

        $google_nlp = new FunctionPackageDescriptor('\Convo\Pckg\Gnlp\GoogleNlpPackageDefinition', function() {
            return new \Convo\Pckg\Gnlp\GoogleNlpPackageDefinition(
                $this->_container->get('logger'),
                $this->_container->get('googleNlpFactory'),
                $this->_container->get('googleNlpSyntaxParser')
            );
        });
        $google_nlp->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($google_nlp);

        $text = new ClassPackageDescriptor('\Convo\Pckg\Text\TextPackageDefinition', $this->_container);
        $text->setLogger($this->_logger);
        $this->_packageProviderFactory->registerPackage($text);

		do_action('register_convoworks_package', $this->_packageProviderFactory, $this->_container);

//         $mtg = new ClassPackageDescriptor('\Convo\Pckg\Mtg\MtgPackageDefinition', $this->_container);
//         $mtg->setLogger($this->_logger);
//         $this->_packageProviderFactory->registerPackage($mtg);

		$wpPosts = new FunctionPackageDescriptor('\ConvoPlugin\Convo\Pckg\WpPosts\WpPostsPackageDefinition',
		    function() {
		        return new \ConvoPlugin\Convo\Pckg\WpPosts\WpPostsPackageDefinition( $this->_logger, $this->_packageProviderFactory);
		    }
		);
		    
		$wpPosts->setLogger($this->_logger);
		$this->_packageProviderFactory->registerPackage($wpPosts);

		return $handler->handle( $request);
	}

	// UTIL
	public function __toString()
	{
		return get_class( $this).'[]';
	}
}
