<?php declare(strict_types=1);

namespace Convo\Data\Wp;

class WpServiceParamsFactory implements \Convo\Core\Params\IServiceParamsFactory
{

	/**
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	protected $_logger;

	/**
	 * @var \Convo\Core\Params\SimpleParams[]
	 */
	private $_params	=	[];

	public function __construct( \Psr\Log\LoggerInterface $logger)
	{
		$this->_logger		=	$logger;
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\Params\IServiceParamsFactory::getServiceParams()
	 */
	public function getServiceParams( \Convo\Core\Params\IServiceParamsScope $scope) {

		if ( $scope->getScopeType() === \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST) {

			if ( !isset( $this->_params[$scope->getKey()])) {
				$this->_params[$scope->getKey()]	=	new \Convo\Core\Params\SimpleParams();
			}

			return $this->_params[$scope->getKey()];
		}

		return new WpServiceParams( $this->_logger, $scope);
	}


	// UTIL
	public function __toString()
	{
		return get_class( $this);
	}
}
