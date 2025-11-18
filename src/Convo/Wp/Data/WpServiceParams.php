<?php

declare(strict_types=1);

namespace Convo\Wp\Data;

class WpServiceParams extends \Convo\Core\Params\AbstractServiceParams
{
    /**
     * Logger
     *
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;

    /**
     * @var \wpdb
     */
    private $_wpdb;

    /**
     * @var array
     */
    private $_cached;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Params\IServiceParamsScope $scope, $wpdb)
    {
        $this->_wpdb = $wpdb;
        parent::__construct($logger, $scope);
    }

    public function getData()
    {
        if (isset($this->_cached)) {
            return $this->_cached;
        }

        $row = $this->_wpdb->get_row(
            $this->_wpdb->prepare(
                "SELECT value FROM {$this->_wpdb->prefix}convo_service_params WHERE service_id = '%s' AND scope_type = '%s' AND level_type = '%s' AND `key` = '%s'",
                $this->_scope->getServiceId(),
                $this->_scope->getScopeType(),
                $this->_scope->getLevelType(),
                $this->_scope->getKey()
            ),
            ARRAY_A
        );

        // 	    $this->_logger->debug( 'Fetching params for ['.$this->_scope.']['.$this->_wpdb->last_query.'] ...');


        if (empty($row)) {
            // 		    $this->_logger->debug( 'Returning empty ...');
            return [];
        }
        // 	    $this->_logger->debug( 'Returning data ['.$row['value'].'] ...');
        return json_decode($row['value'], true);
    }

    protected function _storeData($data)
    {

        // 		$this->_logger->debug( 'Storing data ['.json_encode( $data, JSON_PRETTY_PRINT).'] for ['.$this->_scope.'] ...');
        // 		$this->_logger->debug( 'Storing data for ['.$this->_scope.'] ...');

        $timeCreated = $this->_getTimeCreatedOfExistingServiceParam();

        $ret = $this->_wpdb->query(
            $this->_wpdb->prepare(
                "REPLACE INTO {$this->_wpdb->prefix}convo_service_params (service_id, scope_type, level_type, `key`, `value`, time_created, time_updated)
            VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s')",
                $this->_scope->getServiceId(),
                $this->_scope->getScopeType(),
                $this->_scope->getLevelType(),
                $this->_scope->getKey(),
                json_encode($data, JSON_PRETTY_PRINT),
                $timeCreated,
                time()
            )
        );

        if ($ret === false) {
            throw new \Exception($this->_wpdb->last_error);
        }

        $this->_cached = $data;
    }

    private function _getTimeCreatedOfExistingServiceParam()
    {
        $this->_logger->debug('Fetching time created of params for [' . $this->_scope . '] ...');

        $row = $this->_wpdb->get_row(
            $this->_wpdb->prepare(
                "SELECT time_created FROM {$this->_wpdb->prefix}convo_service_params WHERE service_id = '%s' AND scope_type = '%s' AND level_type = '%s' AND `key` = '%s'",
                $this->_scope->getServiceId(),
                $this->_scope->getScopeType(),
                $this->_scope->getLevelType(),
                $this->_scope->getKey()
            ),
            ARRAY_A
        );

        if (! $row) {
            $this->_logger->debug('Returning new time created ...');
            return time();
        }

        $timeCreated = intval($row['time_created']);
        if ($timeCreated === 0) {
            $timeCreated = time();
        }

        $this->_logger->debug('Returning time created [' . $row['time_created'] . '] ...');
        return $timeCreated;
    }

    // UTIL
    public function __toString()
    {
        return get_class($this) . '[' . $this->_scope . ']';
    }
}
