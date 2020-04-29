<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

class ServicesController extends Controller
{
    /**
     * Display single service
     *
     * @return void
     */
    public static function single()
    {
        view('services/single');
    }
}
