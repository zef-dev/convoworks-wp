<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;

class WpTableContext extends AbstractBasicComponent implements IServiceContext
{
    private $_wpdb;

    private $_entityName;

    private $_query;

    private $_finalValue;

    /**
     * @var \Convo\Core\Workflow\ICatalogSource
     */
    private $_catalog;

    public function __construct($properties, $wpdb)
    {
        parent::__construct($properties);

        $this->_wpdb = $wpdb;

        $this->_entityName = $properties['entity_name'] ?? 'WpTable';
        
        $this->_query = $properties['query'];
        $this->_finalValue = $properties['final_value'];
    }

    public function getId() {
        return "{$this->_entityName}Catalog";
    }

    public function init() {
        $query = $this->getService()->evaluateString($this->_query, ['wpdb' => $this->_wpdb]);
        $this->_wpdb->query($query);

        $last_result = $this->_wpdb->last_result;
        
        $formatted = [];
        foreach ($last_result as $row) {
            $formatted[] = $this->getService()->evaluateString(
                $this->_finalValue,
                ['row' => $row]
            );
        }

        $this->_validateResults($formatted);

        $this->_logger->info('Final formatted values ['.print_r($formatted, true).']');

        $this->_catalog = new WpValuesCatalog($formatted);
    }

    public function getComponent() {
        if (!$this->_catalog) {
            $this->init();
        }

        return $this->_catalog;
    }

    private function _validateResults($results)
    {
        foreach ($results as $result) {
            if (!is_string($result)) {
                throw new \Exception('Item ['.is_array($result) ? print_r($result, true) : $result.'] is not a string.');
            }
        }
    }
}