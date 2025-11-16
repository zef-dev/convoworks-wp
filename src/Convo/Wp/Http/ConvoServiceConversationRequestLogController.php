<?php

namespace Convo\Wp\Http;

class ConvoServiceConversationRequestLogController extends Controller
{
    /**
     * Display general dashboard settings
     *
     * @return void
     */
    public static function index()
    {
        static::isConnectedToAmazon();
    }

    /**
     * Display details
     *
     * @return void
     */
    public static function details()
    {
        static::displayDetails();
    }

    /**
     * Check if the current user is connected to Amazon.
     *
     */
    public static function isConnectedToAmazon()
    {
        \Convo\view('request-log/index');
    }

    /**
     * Check if the current user is connected to Amazon.
     *
     */
    public static function displayDetails()
    {
        \Convo\view('request-log/details');
    }
}
