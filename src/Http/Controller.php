<?php

namespace Convo\Http;

class Controller
{
    /**
     * Abort HTTP request
     *
     * @param $code
     */
    public static function abort($code)
    {
        echo esc_attr('Error: '. $code);
        die();
    }
}
