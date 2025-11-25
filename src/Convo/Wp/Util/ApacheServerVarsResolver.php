<?php

declare(strict_types=1);

namespace Convo\Wp\Util;

use Convo\Core\Util\IServerVarsResolver;

/**
 * Default implementation that exposes PHP superglobals (Apache/HTTP environment).
 */
class ApacheServerVarsResolver implements IServerVarsResolver
{
    public function getEnvironmentContext(): array
    {
        $context = [
            '_SERVER'  => $_SERVER ?? [],
            '_REQUEST' => $_REQUEST ?? [],
            '_POST'    => $_POST ?? [],
            '_GET'     => $_GET ?? [],
            '_FILES'   => $_FILES ?? [],
            '_ENV'     => $_ENV ?? [],
            '_COOKIE'  => $_COOKIE ?? [],
        ];

        if (isset($_SESSION)) {
            $context['_SESSION'] = $_SESSION;
        }

        return $context;
    }
}


