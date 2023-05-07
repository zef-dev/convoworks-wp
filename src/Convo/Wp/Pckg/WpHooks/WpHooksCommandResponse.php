<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpHooks;

use Convo\Core\Adapters\ConvoChat\DefaultTextCommandResponse;

class WpHooksCommandResponse extends DefaultTextCommandResponse
{

	private $_filterResponse;

	public function __construct()
    {
	    parent::__construct();
    }

    public function getFilterResponse() {
        return $this->_filterResponse;
    }
    
    public function setFilterResponse( $filterResponse) {
        $this->_filterResponse = $filterResponse;
    }
    
}
