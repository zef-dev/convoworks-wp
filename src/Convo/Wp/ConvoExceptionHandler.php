<?php declare(strict_types=1);

namespace Convo\Convo\Wp;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;

class ConvoExceptionHandler implements \Psr\Http\Server\MiddlewareInterface
{	
	
	/**
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;
	
	/**
	 * @var \Convo\Core\Util\IHttpFactory
	 */
	private $_httpFactory;
	
	public function __construct( \Psr\Log\LoggerInterface $logger, \Convo\Core\Util\IHttpFactory $httpFactory)
	{
		$this->_logger		=	$logger;
		$this->_httpFactory	=	$httpFactory;
	}
	
	public function process( ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
	{
		try {
			return $handler->handle( $request);
		} catch ( \Exception $e) {
			$this->_logger->critical( $e);
			return $this->_httpFactory->buildResponse( [ 'message' => 'Unexpected error'], 500, ['Content-Type'=>'application/json']);
		}
	}
	
	// UTIL
	public function __toString()
	{
		return get_class( $this).'[]';
	}
}