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
    	$services = wp_remote_get(home_url() . '/wp-json/convo/v1/services');

    	$services = json_decode($services['body']);

        view('dashboard/index', ['services' => $services->data]);
    }
}
