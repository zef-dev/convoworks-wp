<?php

declare(strict_types=1);

namespace Convo\Wp;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcher;
use Convo\Core\EventDispatcher\ServiceRunRequestEvent;
use Convo\Wp\EventListeners\WpConvoConversationRequestEventListener;

class SaveConvoRequestLogMiddleware implements MiddlewareInterface
{
    /**
     * @var LoggerInterface
     */
    private $_logger;

    /*
     * @var EventDispatcher
     */
    private $_eventDispatcher;

    /**
     * @var WpConvoConversationRequestEventListener
     */
    private $_wpConvoConversationRequestEventListener;

    public function __construct(
        LoggerInterface $logger,
        EventDispatcher $eventDispatcher,
        WpConvoConversationRequestEventListener $wpConvoConversationRequestEventListener
    ) {
        $this->_logger = $logger;
        $this->_eventDispatcher = $eventDispatcher;
        $this->_wpConvoConversationRequestEventListener = $wpConvoConversationRequestEventListener;
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->_logger->info('Going to add listener for event [' . ServiceRunRequestEvent::NAME . ']');
        $this->_eventDispatcher->addListener(
            ServiceRunRequestEvent::NAME,
            [$this->_wpConvoConversationRequestEventListener, 'onServiceRunEvent']
        );

        return $handler->handle($request);
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[]';
    }
}
