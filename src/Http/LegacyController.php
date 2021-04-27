<?php

namespace Convo\Http;

use function Convo\view;

class LegacyController extends Controller
{
    /**
     * Display the main dashboard page
     */
    public static function index()
    {
        view('legacy/index');
    }
}
