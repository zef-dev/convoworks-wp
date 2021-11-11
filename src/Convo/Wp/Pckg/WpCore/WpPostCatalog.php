<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Util\StrUtil;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\ICatalogSource;

class WpPostCatalog extends AbstractBasicComponent implements ICatalogSource
{
    const CATALOG_VERSION = "1";

    private $_posts;

    public function __construct($posts)
    {
        $this->_posts = $posts;
    }

    public function getCatalogValues($platform)
    {
        switch ($platform) {
            case 'amazon':
                return $this->_getAmazonFormattedValues();
            case 'dialogflow':
                return $this->_posts;
            default:
                throw new \Exception("Platform not supported: [$platform]");
        }
    }

    private function _getAmazonFormattedValues()
    {
        $formatted = [
            'values' => []
        ];

        foreach ($this->_posts as $post) {
            $id = StrUtil::slugify($post);

            $formatted['values'][] = [
                'id' => $id,
                'name' => ['value' => $post],
                'synonyms' => [$post]
            ];
        }

        return $formatted;
    }

    public function getCatalogVersion()
    {
        return self::CATALOG_VERSION;
    }
}
