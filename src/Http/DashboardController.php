<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

class DashboardController extends Controller
{
    /**
     * Display the main dashboard page
     */
    public static function index()
    {
        view('dashboard/index');
    }
}
