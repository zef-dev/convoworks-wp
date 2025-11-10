<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Util\StrUtil;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\ICatalogSource;

class WpValuesCatalog extends AbstractBasicComponent implements ICatalogSource
{
    const CATALOG_VERSION = "1";

    private $_values;
    private $_version;

    public function __construct($values, $version)
    {
        $this->_values = $values;
        $this->_version = $version;
    }

    public function getCatalogValues($platform)
    {
        switch ($platform) {
            case 'amazon':
                return $this->_getAmazonFormattedValues();
            default:
                throw new \Exception("Platform not supported: [$platform]");
        }
    }

    private function _getAmazonFormattedValues()
    {
        $formatted = [
            'values' => []
        ];

        foreach ($this->_values as $value) {
            $id = StrUtil::uuidV4();

            $formatted['values'][] = [
                'id' => $id,
                'name' => ['value' => $value],
                'synonyms' => [$value]
            ];
        }

        return $formatted;
    }

    public function getCatalogVersion()
    {
        return $this->_version;
    }
}
