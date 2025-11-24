<?php

namespace Convo\Providers;

use Psr\Container\ContainerInterface;
use Convo\Wp\Providers\ConvoWPPlugin as ConvoWpConvoWPPlugin;

/**
 * Class ConvoWPPlugin
 *
 * @package Convo\Providers
 * @deprecated version
 */
class ConvoWPPlugin
{
    /**
     * @return ContainerInterface
     */
    public static function getPublicDiContainer()
    {
        trigger_error('Convo\Providers\ConvoWPPlugin is deprecated. Use Convo\Wp\Providers\ConvoWPPlugin instead.', E_USER_DEPRECATED);
        return ConvoWpConvoWPPlugin::getPublicDiContainer();
    }

    /**
     * @return ContainerInterface
     */
    public static function getAdminDiContainer()
    {
        trigger_error('Convo\Providers\ConvoWPPlugin is deprecated. Use Convo\Wp\Providers\ConvoWPPlugin instead.', E_USER_DEPRECATED);
        return ConvoWpConvoWPPlugin::getAdminDiContainer();
    }
}
