<?php

namespace Convo\Core\Adapters\Viber;

interface IViberWebhookEventType
{
    public const DELIVERED = 'delivered';
    public const SEEN = 'seen';
    public const FAILED = 'failed';
    public const SUBSCRIBED = 'subscribed';
    public const UNSUBSCRIBED = 'unsubscribed';
    public const CONVERSATION_STARTED = 'conversation_started';
    public const WEBHOOK_EVENT = 'webhook';
    public const MESSAGE = 'message';
}
