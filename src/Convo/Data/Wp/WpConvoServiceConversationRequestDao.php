<?php

namespace Convo\Data\Wp;

class WpConvoServiceConversationRequestDao
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $_logger;

    /**
     * @var \wpdb
     */
    private $_wpdb;

    private $_tableName;

    public function __construct(\Psr\Log\LoggerInterface $logger, $wpdb)
    {
        $this->_logger = $logger;
        $this->_wpdb = $wpdb;
        $this->_tableName = $this->_wpdb->prefix.'convo_service_conversation_log';
    }

    public function insertConvoServiceConversationRequestLog($data, $format) {
        $this->_logger->info('Going to insert data into ['.$this->_tableName.'] table.');
        $ret = $this->_wpdb->insert($this->_tableName, $data, $format);
        if ( $ret === false) {
            throw new \Exception( $this->_wpdb->last_error);
        }
    }

    public function getRecords($filterArgs = [], $sortArgs = [], $paginationArgs = []) {
        $query = "SELECT request_id, session_id, service_id, device_id, stage, status_code, platform, service_variables, intent_name, time_created, time_elapsed FROM $this->_tableName";

        if (!empty($filterArgs)) {
            $query .= " WHERE ";
        }
        $filterKeyValuePairs = [];
        foreach ($filterArgs as $key => $value) {
            if ($key === 's') {
                $filterKeyValuePairs[] = sprintf('(session_id = "%s" OR device_id = "%s" OR request_id = "%s")', $value, $value, $value);
            } else {
                $filterKeyValuePairs[] = $key.'='."'".$value."'";
            }
        }
        $query .= join(' AND ', $filterKeyValuePairs);

        $orderByColumn = 'time_created';
        $orderDirection = 'DESC';
        if (!empty($sortArgs) && isset($sortArgs['orderby']) && isset($sortArgs['order'])) {
            $orderByColumn = $sortArgs['orderby'];
            $orderDirection = $sortArgs['order'];
            $orderDirection = strtoupper($orderDirection);
        }

        $query .= " ORDER BY " . $orderByColumn . " " . $orderDirection;

        if (isset($paginationArgs['records_per_page'])) {
            $query .= " LIMIT " . $paginationArgs['records_per_page'];
        }

        if ( isset($paginationArgs['records_per_page']) && isset($paginationArgs['paged'])) {
            $offset = intval($paginationArgs['records_per_page']) * intval($paginationArgs['paged']) - $paginationArgs['records_per_page'];
            $query .= " OFFSET " . $offset;
        }

        $this->_logger->debug('Got query in conversation request dao ['.$query.']');

        return $this->_wpdb->get_results($this->_checkPrepare( $query), ARRAY_A);
    }

    public function getDetailsOfRecordById($id) {
        $query = "SELECT * FROM $this->_tableName WHERE request_id = '$id'";
        return $this->_wpdb->get_row($this->_checkPrepare( $query), ARRAY_A);
    }

    public function getDistinctRequestLogElements($element) {
        $serviceConversationRequestLogElements = [];
        $query = "SELECT DISTINCT $element FROM $this->_tableName";
        $rows = $this->_wpdb->get_results($this->_checkPrepare( $query), ARRAY_A);
        foreach ($rows as $row) {
            $serviceConversationRequestLogElements[] = $row[$element];
        }
        return $serviceConversationRequestLogElements;
    }

    public function getTotalCountOfRecords() {
        $query = "SELECT COUNT(request_id) as total_number_of_records FROM $this->_tableName";
        return $this->_wpdb->get_row($this->_checkPrepare( $query), ARRAY_A)['total_number_of_records'] ?? 0;
    }

    public function getCountOfRecords($filterArgs = []) {
        $query = "SELECT COUNT(request_id) as total_number_of_records FROM $this->_tableName";

        if (!empty($filterArgs)) {
            $query .= " WHERE ";
        }
        $filterKeyValuePairs = [];
        foreach ($filterArgs as $key => $value) {
            if ($key === 's') {
                $filterKeyValuePairs[] = sprintf('(session_id = "%s" OR device_id = "%s" OR request_id = "%s")', $value, $value, $value);
            } else {
                $filterKeyValuePairs[] = $key.'='."'".$value."'";
            }
        }
        $query .= join(' AND ', $filterKeyValuePairs);

        return $this->_wpdb->get_row($this->_checkPrepare( $query), ARRAY_A)['total_number_of_records'] ?? 0;
    }

    private function _checkPrepare( $ret) {
        if ( is_null( $ret) || empty( $ret)) {
            throw new \Exception( 'Failed to prepare query');
        }
        return $ret;
    }
}
