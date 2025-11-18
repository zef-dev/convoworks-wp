<?php

namespace Convo\Pckg\MySQLI;

use Convo\Core\Factory\AbstractPackageDefinition;

class MySQLIPackageDefinition extends AbstractPackageDefinition
{
    public const NAMESPACE = 'convo-mysqli';

    public function __construct(
        \Psr\Log\LoggerInterface $logger
    ) {
        parent::__construct($logger, self::NAMESPACE, __DIR__);
    }

    protected function _initDefintions()
    {
        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\MySQLI\MysqlConnectionComponent',
                'MySQL connection context',
                'Setup connection params for MySQL',
                [
                    'id' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Context ID',
                        'description' => 'Unique ID by which this context is referenced',
                        'valueType' => 'string'
                    ],
                    'host' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Host',
                        'description' => 'Host to connect to',
                        'valueType' => 'string'
                    ],
                    'port' => [
                        'editor_type' => 'text',
                        'editor_properties' => [], 'defaultValue' => '',
                        'name' => 'Port',
                        'description' => 'Port to which to connect to on the host',
                        'valueType' => 'string'
                    ],
                    'user' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Username',
                        'description' => 'Username to authenticate with',
                        'valueType' => 'string'
                    ],
                    'pass' => [
                        'editor_type' => 'password',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Password',
                        'description' => 'Password to use when connecting',
                        'valueType' => 'string'
                    ],
                    'dbName' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Database name',
                        'description' => 'Name of database to use',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">CONNECT TO</span> <b>{{ contextElement.properties.host }}{{ contextElement.properties.port ? \':\'+contextElement.properties.port : \'\' }}</b> <span class="statement">AS</span> {{ contextElement.properties.user }}' .
                            '<br/>' .
                            '<span class="statement">USE DB</span> <b>{{ contextElement.properties.dbName }}</b>' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'mysql-connection-component.html'
                    ],
                    '_workflow' => 'datasource'
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Pckg\MySQLI\MysqliQueryElement',
                'MySQLI query',
                'Perform an SQL query via a connection',
                [
                    'name' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'status',
                        'name' => 'Result name',
                        'description' => 'Name under which to save the result in parameters',
                        'valueType' => 'string'
                    ],
                    'conn' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Connection',
                        'description' => 'Connection to use for executing queries',
                        'valueType' => 'string'
                    ],
                    'query' => [
                        'editor_type' => 'desc',
                        'editor_properties' => [],
                        'defaultValue' => '',
                        'name' => 'Query',
                        'description' => 'SQL query to execute',
                        'valueType' => 'string'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                            '<span class="statement">PERFORM</span> {{ component.properties.query }}' .
                            '</div>'
                    ],
                    '_help' => [
                        'type' => 'file',
                        'filename' => 'mysqli-query-element.html'
                    ],
                    '_workflow' => 'read'
                ]
            )
        ];
    }
}
