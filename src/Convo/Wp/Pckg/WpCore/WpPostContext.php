<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Util\ArrayUtil;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\ICatalogSource;
use Convo\Core\Workflow\IServiceContext;

class WpPostContext extends AbstractBasicComponent implements IServiceContext, ICatalogSource
{
    private $_entityName;

    private $_version;

    private $_queryParams;

    private $_finalValue;

    private $_queryArgs;

    /**
     * @var \WP_Query
     */
    private $_wpQuery;

    /**
     * @var \Convo\Core\Workflow\ICatalogSource
     */
    private $_catalog;

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_entityName = $properties['entity_name'] ?? 'WpPost';

        $this->_version = $properties['version'];

        $this->_queryParams = $properties['query_params'] ?? [];
        $this->_finalValue = $properties['final_value'];
    }

    public function getId()
    {
        return "{$this->_entityName}Catalog";
    }

    public function init()
    {
        $wp_query = $this->_getWpQuery();

        $posts = [];

        $wp_query->rewind_posts();
        
        while ($wp_query->have_posts()) {
            $wp_query->the_post();
            
            if ($this->_finalValue !== null) {
                $final_value = $this->getService()->evaluateString($this->_finalValue);
            } else {
                $final_value = \get_the_title();
            }

            $this->_logger->info('Final value of post ['.$final_value.']');

            $posts[] = $final_value;
            $final_value = null;
        }
        \wp_reset_postdata();

        $this->_validateResults($posts);
        $this->_logger->info('Got final posts ['.print_r($posts, true).']');

        $this->_catalog = new WpValuesCatalog($posts);
    }

    public function getComponent()
    {
        if (!$this->_catalog) {
            $this->init();
        }

        return $this->_catalog;
    }

    private function _getWpQuery()
    {
        $query_params = $this->_evaluateParams($this->_queryParams);

        if (!isset($this->_wpQuery) || $query_params != $this->_queryArgs ) {
            $this->_queryArgs = $query_params;
            $this->_wpQuery = new \WP_Query($query_params);
            
            $this->_logger->info( 'Got new query ['.print_r($this->_wpQuery->request, true).']['.print_r( $this->_queryArgs, true).']');
        }
        
        return $this->_wpQuery;
    }

    private function _evaluateParams($params)
    {
        $evaluated = [];
        
        foreach ($params as $key => $val) {
            $key = $this->getService()->evaluateString($key);
            $parsed = $this->getService()->evaluateString($val);

            if (!ArrayUtil::isComplexKey($key)) {
                $evaluated[$key] = $parsed;
            } else {
                $root = ArrayUtil::getRootOfKey($key);
                $final = ArrayUtil::setDeepObject($key, $parsed, $evaluated[$root] ?? []);
                $evaluated[$root] = $final;
            }
        }
        
        return $evaluated;
    }

    public function getCatalogValues($platform)
    {
        return $this->getComponent()->getCatalogValues($platform);
    }

    public function getCatalogVersion()
    {
        return $this->getService()->evaluateString($this->_version);
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
