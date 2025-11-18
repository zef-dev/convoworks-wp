<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpDbElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_action;

    private $_tableName;

    private $_query;

    private $_lastResultName;

    private $_insertIdName;

    private $_data;
    private $_format;

    private $_where;
    private $_whereFormat;

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
    */
    private $_ok;

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
    */
    private $_nok;

    private $_wpdb;

    public function __construct($properties, $wpdb)
    {
        parent::__construct($properties);

        $this->_action = $properties['action'];

        $this->_tableName = $properties['table_name'];

        $this->_lastResultName = $properties['last_result_name'] ?? 'last_result';
        $this->_insertIdName = $properties['insert_id_name'] ?? 'insert_id';

        $this->_data = $properties['data'] ?? [];
        $this->_format = $properties['format'] ?? '';

        $this->_query = $properties['query'] ?? '';

        $this->_ok = $properties['ok'] ?? [];
        foreach ($this->_ok as $ok) {
            $this->addChild($ok);
        }

        $this->_nok = $properties['nok'] ?? [];
        foreach ($this->_nok as $nok) {
            $this->addChild($nok);
        }

        $this->_wpdb = $wpdb;
    }

    public function evaluateString($string, $context = [], $useHashtagSign = false)
    {
        $context['wpdb'] = $this->_wpdb;

        return parent::evaluateString($string, $context, $useHashtagSign);
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        // @TODO: cache results.

        $action = $this->evaluateString($this->_action);
        $table_name = $this->evaluateString($this->_tableName);

        $last_result_name = $this->evaluateString($this->_lastResultName);
        $last_result_scope = IServiceParamsScope::SCOPE_TYPE_REQUEST;

        $insert_id_name = $this->evaluateString($this->_insertIdName);
        $insert_id_scope = IServiceParamsScope::SCOPE_TYPE_REQUEST;

        $last_result = [];

        try {
            switch ($action) {
                case 'select':
                    $query = $this->evaluateString($this->_query);
                    $this->_logger->info('Parsed query [' . $query . ']');

                    $last_result = $this->_wpdb->get_results($query, ARRAY_A);

                    $this->_logger->debug('Select results [' . print_r($last_result, true) . ']');

                    $last_result_params = $this->getService()->getServiceParams($last_result_scope);
                    $last_result_params->setServiceParam($last_result_name, $last_result);

                    break;
                case 'insert':
                    $data = [];

                    foreach ($this->_data as $key => $value) {
                        $data[$this->evaluateString($key)] = $this->evaluateString($value);
                    }

                    $format = $this->evaluateString($this->_format);

                    if ($format !== null && !is_array($format)) {
                        // string, split on ;
                        $format = explode(';', $format);
                        $format = array_map(function ($f) {
                            return trim($f);
                        }, $format);
                    }

                    $this->_logger->info('Inserting [' . $table_name . '][' . print_r($data, true) . '][' . print_r($format, true) . ']');

                    $this->_wpdb->insert($table_name, $data, $format);

                    $insert_id_params = $this->getService()->getServiceParams($insert_id_scope);
                    $insert_id_params->setServiceParam($insert_id_name, $this->_wpdb->insert_id);

                    break;
                case 'delete':
                    $where = [];

                    foreach ($this->_where as $key => $value) {
                        $where[$this->evaluateString($key)] = $this->evaluateString($value);
                    }

                    $where_format = $this->evaluateString($this->_whereFormat);

                    if (!is_array($where_format)) {
                        // string, split on ;
                        $where_format = explode(';', $where_format);
                        $where_format = array_map(function ($f) {
                            return trim($f);
                        }, $where_format);
                    }

                    $this->_wpdb->delete($table_name, $where, $where_format);

                    break;
                case 'replace':
                    $data = [];

                    foreach ($this->_data as $key => $value) {
                        $data[$this->evaluateString($key)] = $this->evaluateString($value);
                    }

                    $format = $this->evaluateString($this->_format);

                    if (!is_array($format)) {
                        // string, split on ;
                        $format = explode(';', $format);
                        $format = array_map(function ($f) {
                            return trim($f);
                        }, $format);
                    }

                    $this->_logger->info('Replacing on [' . $table_name . '][' . print_r($data, true) . '][' . print_r($format, true) . ']');

                    $this->_wpdb->replace($table_name, $data, $format);

                    $insert_id_params = $this->getService()->getServiceParams($insert_id_scope);
                    $insert_id_params->setServiceParam($insert_id_name, $this->_wpdb->insert_id);

                    break;
                case 'update':
                    $data = [];

                    foreach ($this->_data as $key => $value) {
                        $data[$this->evaluateString($key)] = $this->evaluateString($value);
                    }

                    $format = $this->evaluateString($this->_format);

                    if (!is_array($format)) {
                        // string, split on ;
                        $format = explode(';', $format);
                        $format = array_map(function ($f) {
                            return trim($f);
                        }, $format);
                    }

                    $where = [];

                    foreach ($this->_where as $key => $value) {
                        $where[$this->evaluateString($key)] = $this->evaluateString($value);
                    }

                    $where_format = $this->evaluateString($this->_whereFormat);

                    if ($where_format !== null && !is_array($where_format)) {
                        // string, split on ;
                        $where_format = explode(';', $where_format);
                        $where_format = array_map(function ($f) {
                            return trim($f);
                        }, $where_format);
                    }

                    $this->_wpdb->update($table_name, $data, $where, $format, $where_format);

                    break;
                case 'query':
                default:
                    $query = $this->evaluateString($this->_query);

                    $last_result = $this->_wpdb->query($query);

                    $last_result_params = $this->getService()->getServiceParams($last_result_scope);
                    $last_result_params->setServiceParam($last_result_name, $last_result);
            }
        } catch (\Exception $e) {
            $this->_logger->error($e);

            foreach ($this->_nok as $nok) {
                $nok->read($request, $response);
            }

            return;
        }

        if (!empty($this->_wpdb->last_error)) {
            $this->_logger->error("WPDB error: {$this->_wpdb->last_error}");

            foreach ($this->_nok as $nok) {
                $nok->read($request, $response);
            }

            return;
        }

        foreach ($this->_ok as $ok) {
            $ok->read($request, $response);
        }
    }
}
