<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Adapters\ConvoChat\DefaultTextCommandResponse;

class WpHooksCommandResponse extends DefaultTextCommandResponse
{
    /**
     * @var WpHooksCommandRequest
     */
    private $_request;
    private $_filterResponse;

    public function __construct($request)
    {
        parent::__construct();
        $this->_request = $request;
    }

    public function getFilterResponse()
    {
        if (!isset($this->_filterResponse)) {
            return $this->_request->getArgument(0);
        }
        return $this->_filterResponse;
    }

    public function setFilterResponse($filterResponse)
    {
        $this->_filterResponse = $filterResponse;
    }
}
