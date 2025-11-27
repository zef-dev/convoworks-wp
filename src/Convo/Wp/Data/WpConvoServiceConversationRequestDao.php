<?php

namespace Convo\Wp\Data;

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
        $this->_tableName = $this->_wpdb->prefix . 'convo_service_conversation_log';
    }

    public function insertConvoServiceConversationRequestLog($data, $format)
    {
        $this->_logger->info('Going to insert data into [' . $this->_tableName . '] table.');
        $ret = $this->_wpdb->insert($this->_tableName, $data, $format);
        if ($ret === false) {
            throw new \Exception($this->_wpdb->last_error);
        }
    }

    public function getRecords($filterArgs = [], $sortArgs = [], $paginationArgs = [])
    {
        $base_query = "SELECT request_id, session_id, service_id, device_id, stage, platform, service_variables, intent_name, time_created, time_elapsed, test_view, error FROM {$this->_tableName}";

        $where_clauses = [];
        $params = [];

        foreach ($filterArgs as $key => $value) {
            if ($key === 's') {
                // Search by session_id, device_id or request_id (exact match as before)
                $where_clauses[] = '(session_id = %s OR device_id = %s OR request_id = %s)';
                $params[] = $value;
                $params[] = $value;
                $params[] = $value;
            } elseif ($key === 'test_view' && is_numeric($value)) {
                $where_clauses[] = 'test_view = %d';
                $params[] = (int) $value;
            } else {
                $where_clauses[] = $key . ' = %s';
                $params[] = $value;
            }
        }

        $query = $base_query;

        if (!empty($where_clauses)) {
            $query .= ' WHERE ' . implode(' AND ', $where_clauses);
        }

        // Sorting
        $allowed_sort_columns = [
            'request_id',
            'session_id',
            'service_id',
            'device_id',
            'stage',
            'platform',
            'intent_name',
            'time_created',
            'time_elapsed',
            'test_view',
            'error',
        ];

        $orderByColumn = 'time_created';
        $orderDirection = 'DESC';

        if (!empty($sortArgs) && isset($sortArgs['orderby'], $sortArgs['order'])) {
            $candidateColumn = (string) $sortArgs['orderby'];
            if (\in_array($candidateColumn, $allowed_sort_columns, true)) {
                $orderByColumn = $candidateColumn;
            }

            $candidateDirection = strtoupper((string) $sortArgs['order']);
            if ($candidateDirection === 'ASC' || $candidateDirection === 'DESC') {
                $orderDirection = $candidateDirection;
            }
        }

        $query .= ' ORDER BY ' . $orderByColumn . ' ' . $orderDirection;

        // Pagination
        if (isset($paginationArgs['records_per_page'])) {
            $limit = (int) $paginationArgs['records_per_page'];
            if ($limit > 0) {
                $query .= ' LIMIT ' . $limit;
            }
        }

        if (isset($paginationArgs['records_per_page'], $paginationArgs['paged'])) {
            $limit = (int) $paginationArgs['records_per_page'];
            $page = (int) $paginationArgs['paged'];
            if ($limit > 0 && $page > 0) {
                $offset = $limit * $page - $limit;
                $query .= ' OFFSET ' . $offset;
            }
        }

        if (!empty($params)) {
            $query = $this->_wpdb->prepare($query, $params);
        }

        $this->_logger->debug('Got query in conversation request dao [' . $query . ']');

        return $this->_wpdb->get_results($query, ARRAY_A);
    }

    public function getDetailsOfRecordById($id)
    {
        $query = $this->_wpdb->prepare(
            "SELECT * FROM {$this->_tableName} WHERE request_id = %s",
            $id
        );

        return $this->_wpdb->get_row($query, ARRAY_A);
    }

    public function getDistinctRequestLogElements($element)
    {
        // Only allow known column names to be used as identifiers.
        $allowed_elements = ['service_id', 'stage', 'platform', 'test_view'];
        if (!\in_array($element, $allowed_elements, true)) {
            throw new \InvalidArgumentException('Invalid element requested for distinct log elements.');
        }

        $serviceConversationRequestLogElements = [];
        $query = "SELECT DISTINCT {$element} FROM {$this->_tableName}";
        $rows = $this->_wpdb->get_results($query, ARRAY_A);
        foreach ($rows as $row) {
            $serviceConversationRequestLogElements[] = $row[$element];
        }
        return $serviceConversationRequestLogElements;
    }

    public function getTotalCountOfRecords()
    {
        $query = "SELECT COUNT(request_id) as total_number_of_records FROM {$this->_tableName}";
        return $this->_wpdb->get_row($query, ARRAY_A)['total_number_of_records'] ?? 0;
    }

    public function getCountOfRecords($filterArgs = [])
    {
        $base_query = "SELECT COUNT(request_id) as total_number_of_records FROM {$this->_tableName}";

        $where_clauses = [];
        $params = [];

        foreach ($filterArgs as $key => $value) {
            if ($key === 's') {
                $where_clauses[] = '(session_id = %s OR device_id = %s OR request_id = %s)';
                $params[] = $value;
                $params[] = $value;
                $params[] = $value;
            } elseif ($key === 'test_view' && is_numeric($value)) {
                $where_clauses[] = 'test_view = %d';
                $params[] = (int) $value;
            } else {
                $where_clauses[] = $key . ' = %s';
                $params[] = $value;
            }
        }

        $query = $base_query;

        if (!empty($where_clauses)) {
            $query .= ' WHERE ' . implode(' AND ', $where_clauses);
        }

        if (!empty($params)) {
            $query = $this->_wpdb->prepare($query, $params);
        }

        return $this->_wpdb->get_row($query, ARRAY_A)['total_number_of_records'] ?? 0;
    }
}
