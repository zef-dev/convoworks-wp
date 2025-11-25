<?php

declare(strict_types=1);

namespace Convo\Core\Util;

/**
 * Provides server/environment variables for expression evaluation context.
 */
interface IServerVarsResolver
{
    /**
     * Returns an associative array that will be merged into the evaluation context.
     *
     * Example keys:
     *  - '_SERVER'
     *  - '_REQUEST'
     *  - '_POST'
     *  - '_GET'
     *  - '_FILES'
     *  - '_ENV'
     *  - '_COOKIE'
     *  - '_SESSION'
     *
     * @return array
     */
    public function getEnvironmentContext(): array;
}


