<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Data\Wp;

class WpServiceParams extends \Convo\Core\Params\AbstractServiceParams
{
	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	protected $_logger;

	public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Params\IServiceParamsScope $scope)
	{
		parent::__construct($logger, $scope);
	}

    public function getData()
    {
        global $wpdb;

	    $row = $wpdb->get_row(
		    $wpdb->prepare(
		    	"SELECT value FROM {$wpdb->prefix}convo_service_params WHERE service_id = '%s' AND scope_type = '%s' AND level_type = '%s' AND `key` = '%s'",
                $this->_scope->getServiceId(),
		        $this->_scope->getScopeType(),
		        $this->_scope->getLevelType(),
		        $this->_scope->getKey()
	        ),
		    ARRAY_A
	    );

	    $this->_logger->debug( 'Fetching params for ['.$this->_scope.']['.$wpdb->last_query.'] ...');


	    if (empty($row)) {
		    $this->_logger->debug( 'Returning empty ...');
		    return [];
	    }
	    $this->_logger->debug( 'Returning data ['.$row['value'].'] ...');
	    return json_decode( $row['value'], true);
    }

    // UTIL
    public function __toString()
    {
    	return get_class( $this).'['.$this->_scope.']';
    }

	protected function _storeData( $data ) {
		global $wpdb;

		$this->_logger->debug( 'Storing data ['.json_encode( $data, JSON_PRETTY_PRINT).'] for ['.$this->_scope.'] ...');

		$ret = $wpdb->query(
			$wpdb->prepare(
				"REPLACE INTO {$wpdb->prefix}convo_service_params (service_id, scope_type, level_type, `key`, `value`)
            VALUES ('%s', '%s', '%s', '%s', '%s')",
				$this->_scope->getServiceId(),
				$this->_scope->getScopeType(),
				$this->_scope->getLevelType(),
				$this->_scope->getKey(),
				json_encode( $data, JSON_PRETTY_PRINT)
			)
		);
		
		if ( $ret === false) {
		    throw new \Exception( $wpdb->last_error);
		}
	}
}
