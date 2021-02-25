<?php

namespace ConvoPlugin\Http;

use function ConvoPlugin\view;

class AmazonOAuthController extends Controller
{
    /**
     * All the request routes
     *
     * @var array
     */
    protected $routes = [
        'login/amazon'                          => 'loginAmazon',
    ];

    /**
     * Route requests
     *
     * @return mixed
     */
    public function routes()
    {
        global $wp;

        $method = isset($this->routes[$wp->request]) ? $this->routes[$wp->request] : false;

        if ($method and method_exists($this, $method)) {
            return $this->$method();
        }

        return [];
    }

	public function loginAmazon()
	{
		view('amazon/login');
    }
}
