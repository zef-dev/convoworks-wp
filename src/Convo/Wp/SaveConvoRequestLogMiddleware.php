<?php declare(strict_types=1);

namespace Convo\Wp;

use Convo\Core\Events\ConvoServiceConversationRequestEvent;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;
use Convo\Core\EventDispatcher\ServiceRunRequestEvent;

class SaveConvoRequestLogMiddleware implements \Psr\Http\Server\MiddlewareInterface
{
	/**
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;

    /*
     * @var \Symfony\Component\EventDispatcher\EventDispatcher
     */
    private $_eventDispatcher;

    /**
     * @var \Convo\EventListeners\Wp\WpConvoConversationRequestEventListener
     */
    private $_wpConvoConversationRequestEventListener;

	public function __construct(
        \Psr\Log\LoggerInterface $logger,
        \Symfony\Component\EventDispatcher\EventDispatcher $eventDispatcher,
        \Convo\EventListeners\Wp\WpConvoConversationRequestEventListener $wpConvoConversationRequestEventListener
    ) {
		$this->_logger	                                =	$logger;
		$this->_eventDispatcher	                        =	$eventDispatcher;
		$this->_wpConvoConversationRequestEventListener	=	$wpConvoConversationRequestEventListener;
	}

	public function process( ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
	{
        $this->_logger->info('Going to add listener for event ['.ConvoServiceConversationRequestEvent::NAME.']');
        $this->_eventDispatcher->addListener(
            ConvoServiceConversationRequestEvent::NAME,
            array($this->_wpConvoConversationRequestEventListener, 'onConvoRequestEvent')
        );
        
        $this->_eventDispatcher->addListener(
            ServiceRunRequestEvent::NAME,
            array($this->_wpConvoConversationRequestEventListener, 'onServiceRunEvent')
        );

//         $numberOfEventListeners = count($this->_eventDispatcher->getListeners());
//         $this->_logger->debug('Got ['.$numberOfEventListeners.'] of total event listeners.');

        return $handler->handle($request);
	}

	// UTIL
	public function __toString()
	{
		return get_class( $this).'[]';
	}
}
