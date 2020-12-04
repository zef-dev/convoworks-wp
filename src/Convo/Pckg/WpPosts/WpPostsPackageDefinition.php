<?php

declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;

use Convo\Core\Factory\AbstractPackageDefinition;

class WpPostsPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-posts';

	/**
	 * @var \Convo\Core\Factory\PackageProviderFactory
	 */
	private $_packageProviderFactory;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
    {
	    $this->_packageProviderFactory    =   $packageProviderFactory;

        parent::__construct($logger, self::NAMESPACE, __DIR__);

	    //$this->addTemplate( $this->_loadFile(__DIR__ . '/convo-wp-posts.template.json'));
    }

    protected function _initDefintions()
    {
        return [];
    }
}
