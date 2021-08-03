<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpDbElement extends AbstractWorkflowContainerComponent implements IConversationElement
{
    private $_action;

    private $_tableName;

    private $_query;

    private $_data;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_action = $properties['action'];
        $this->_tableName = $properties['table_name'];

        $this->_data = $properties['data'] ?? [];

        $this->_query = $properties['query'] ?? '';
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $action = $this->evaluateString($this->_action);
        $table_name = $this->evaluateString($this->_tableName);

        $data = [];

        foreach ($this->_data as $key => $value) {
            $data[$this->evaluateString($key)] = $this->evaluateString($value);
        }

        /** @var \wpdb $wpdb */
        global $wpdb;

        switch ($action)
        {
            case 'select':
                break;
            case 'insert':
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
    }
}