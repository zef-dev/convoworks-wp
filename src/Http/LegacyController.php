<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

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
