<?php

namespace Convo\Wp;

use Psr\Log\LoggerInterface;

class RequestLogCleanup
{
    /**
     * Hook name for the scheduled cleanup event.
     */
    public const HOOK = 'convo_request_log_cleanup';

    /**
     * Schedule the cleanup event if not already scheduled.
     */
    public static function schedule()
    {
        if (!wp_next_scheduled(self::HOOK)) {
            // Run once per day; retention window determines how much is deleted.
            wp_schedule_event(time(), 'daily', self::HOOK);
        }
    }

    /**
     * Perform the actual cleanup of old request log records.
     */
    public static function cleanup()
    {
        global $wpdb;

        $retention_days = \defined('CONVO_REQUEST_LOG_RETENTION_DAYS')
            ? (int) CONVO_REQUEST_LOG_RETENTION_DAYS
            : 90;

        if ($retention_days <= 0) {
            // Non‑positive value disables cleanup.
            return;
        }

        $threshold = time() - $retention_days * DAY_IN_SECONDS;

        $table = $wpdb->prefix . 'convo_service_conversation_log';

        $sql = $wpdb->prepare(
            "DELETE FROM {$table} WHERE time_created < %d",
            $threshold
        );

        /** @var LoggerInterface|null $logger */
        $logger = null;
        if (class_exists('\\Convo\\Wp\\Providers\\ConvoWPPlugin')) {
            try {
                $container = \Convo\Wp\Providers\ConvoWPPlugin::getPublicDiContainer();
                if ($container->has('logger')) {
                    $logger = $container->get('logger');
                }
            } catch (\Throwable $e) {
                // If DI container is not available, skip logging but still attempt cleanup.
            }
        }

        $deleted = $wpdb->query($sql);

        if ($logger instanceof LoggerInterface) {
            $logger->info(\sprintf(
                'Request log cleanup removed %d records older than %d days.',
                (int) $deleted,
                $retention_days
            ));
        }
    }
}
