<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpDbElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_action;

    private $_prefix;
    private $_tableName;

    private $_query;

    private $_data;
    private $_format;

    /**
	 * @var \Convo\Core\Workflow\IConversationElement[]
    */
    private $_ok;

    /**
	 * @var \Convo\Core\Workflow\IConversationElement[]
    */
    private $_nok;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_action = $properties['action'];
        $this->_prefix = $properties['prefix'];
        $this->_tableName = $properties['table_name'];

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
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $action = $this->evaluateString($this->_action);
        $table_name = $this->evaluateString($this->_prefix).$this->evaluateString($this->_tableName);

        /** @var \wpdb $wpdb */
        global $wpdb;

        switch ($action)
        {
            case 'select':
                break;
            case 'insert':
                $data = [];

                foreach ($this->_data as $key => $value) {
                    $data[$this->evaluateString($key)] = $this->evaluateString($value);
                }

                $format = $this->evaluateString($this->_format);

                if (!is_array($format)) {
                    // string, split on ;
                    $format = explode(';', $format);
                    $format = array_map(function($f) { return trim($f); }, $format);
                }

                $this->_logger->info('Inserting ['.$table_name.']['.print_r($data, true).']['.print_r($format, true).']');

                $wpdb->insert($table_name, $data, $format);

                break;
            case 'delete':
                break;
            case 'replace':
                break;
            case 'update':
                break;
            case 'query':
                $query = $this->evaluateString($this->_query);
            default:
                throw new \Exception("Unexpected DB action [$action]");
        }

        if ($wpdb->last_error !== false || $wpdb->last_error !== '') {
            $this->_logger->error("WPDB error: {$wpdb->last_error}");

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