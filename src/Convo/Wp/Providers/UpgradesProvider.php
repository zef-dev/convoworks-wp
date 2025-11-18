<?php

namespace Convo\Wp\Providers;

use Exception;
use Psr\Log\LoggerInterface;

class UpgradesProvider
{
    /**
     * DB updates and callbacks that need to be run per version.
     * Naming convention for upgrade methods is convoDBVERSIONDescriptionOfWhatWeAreDoing
     * For example convo101RemoveFieldsFromOrdersTable (where 101 means db version 1.0.1)
     *
     * IMPORTANT: if you add new version here, please update CONVO_DB_VERSION constant in root convo-plugin.php
     *
     * @var array
     */
    protected $dbUpdates = [
        '1.0.1' => [
            'add101ServicesTables'
        ],
        '1.0.2' => [
            'add102ServiceReleaseMeta'
        ],
        '1.0.3' => [
            'add103OAuthTable'
        ],
        '1.0.4' => [
            'update104ServiceParamTable',
            'add104CacheTable'
        ],
        '1.0.5' => [
            'drop105OauthTable',
        ],
        '1.0.6' => [
            'add106OServiceConversationLogTable',
        ],
        '1.0.7' => [
            'add107ServiceConversationLogTableIndexes',
        ],
        '1.0.8' => [
            'remove108ServiceConversationLogTableIndexes',
            'update108ServiceConversationLogTable',
            'add108ServiceConversationLogTableIndexes'
        ],
        '1.0.9' => [
            'recreate109OServiceConversationLogTable'
        ],
        '1.0.10' => [
            'update110ServiceConversationLogTableIndexes'
        ],
        '1.0.11' => [
            'update111ConvoServiceReleasesTable',
            'update111ConvoServiceVersionsTable',
        ],
        '1.0.12' => [
            'update112MuFix',
        ]
    ];

    /**
     * name of the db update version option in database
     */
    protected $version = 'convo_db_version';

    /**
     * Get list of DB update callbacks.
     *
     * @return array
     */
    public function getDbUpdateCallbacks()
    {
        return $this->dbUpdates;
    }

    /**
     * Is a DB update needed?
     *
     * @return boolean
     */
    public function needsDbUpdate($currentDbVersion)
    {
        $updates = $this->getDbUpdateCallbacks();
        $updateVersions = array_keys($updates);
        usort($updateVersions, 'version_compare');

        return ! is_null($currentDbVersion) && version_compare($currentDbVersion, end($updateVersions), '<');
    }

    /**
     * Run all needed DB updates according to db version.
     */
    public function run()
    {
        $dbVersion = get_option($this->version);

        if ($this->_fixMuBrokenInstallation($dbVersion)) {
            return;
        }

        if ($this->needsDbUpdate($dbVersion)) {
            error_log('CONVO UPDATE: updating DB');
            foreach ($this->getDbUpdateCallbacks() as $version => $updateCallbacks) {
                error_log('CONVO UPDATE: Cheking version [' . $version . ']');
                if (version_compare($dbVersion, $version, '<')) {
                    error_log('CONVO UPDATE: Updating version [' . $version . ']');
                    foreach ($updateCallbacks as $updateCallback) {
                        error_log('CONVO UPDATE: Applying patch [' . $updateCallback . ']');
                        $this->$updateCallback();
                    }
                    // raising db option
                    update_option($this->version, $version);
                }
            }
        }
    }

    /**
     * @TODO: remove after few versions
     * @param string $dbVersion
     */
    private function _fixMuBrokenInstallation($dbVersion)
    {
        $TO_FIX = '1.0.11';
        if ($dbVersion !== $TO_FIX || !is_multisite()) {
            return false;
        }

        error_log('CONVO UPDATE: Applying 1.0.11 - Broken MU patch');

        foreach ($this->getDbUpdateCallbacks() as $version => $updateCallbacks) {
            error_log('CONVO UPDATE: Applying version [' . $version . ']');
            foreach ($updateCallbacks as $updateCallback) {
                error_log('CONVO UPDATE: Applying patch [' . $updateCallback . ']');
                $this->$updateCallback();
            }

            // raising db option
            update_option($this->version, $version);
        }

        return true;
    }



    /**
     * Add Services table
     *
     * @throws Exception
     */
    protected function add101ServicesTables()
    {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}service_params";
        $wpdb->query($sql);
        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}service_releases";
        $wpdb->query($sql);
        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}service_versions";
        $wpdb->query($sql);
        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}service_data";
        $wpdb->query($sql);
        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}convo_service_conversation_log";
        $wpdb->query($sql);
        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}wp_convo_cache";
        $wpdb->query($sql);


        $sql = "
		CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_data (
          service_id VARCHAR(255) NOT NULL,
          workflow LONGTEXT NOT NULL DEFAULT '',
          meta TEXT NOT NULL DEFAULT '',
          config TEXT NOT NULL DEFAULT '',
          PRIMARY KEY  (service_id)
        );
		";

        dbDelta($sql);

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_params (
			  `service_id` VARCHAR(255) NOT NULL,
			  `scope_type` VARCHAR(50) NOT NULL,
			  `level_type` VARCHAR(50) NOT NULL,
			  `key` VARCHAR(255) NOT NULL,
			  `value` LONGTEXT NOT NULL DEFAULT '',
			  UNIQUE INDEX  `{$wpdb->prefix}SERVICE_PARAMS_UNIQUE` (`service_id` ASC, `level_type` ASC, `scope_type` ASC, `key` ASC),
			  CONSTRAINT  `{$wpdb->prefix}FK_PARAMS_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}convo_service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    );
	    ";

        dbDelta($sql);

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_releases (
			  `service_id` VARCHAR(255) NOT NULL,
			  `release_id` VARCHAR(50) NOT NULL,
			  `platform_id` VARCHAR(50) NOT NULL,
			  `version_id` VARCHAR(50) NOT NULL,
			  `type` VARCHAR(50) NOT NULL,
			  `stage` VARCHAR(50) NOT NULL,
			  `alias` VARCHAR(50) NOT NULL,
			  `time_created` INT NULL DEFAULT 0,
			  `time_updated` INT NULL DEFAULT 0,
			  UNIQUE INDEX  `{$wpdb->prefix}UNIQUE_SERVICE_RELEASE` (`service_id` ASC, `release_id` ASC),
			  CONSTRAINT  `{$wpdb->prefix}FK_REKLEASE_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}convo_service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    );
	    ";

        dbDelta($sql);

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_versions (
			  `service_id` VARCHAR(255) NOT NULL,
			  `version_id` VARCHAR(50) NOT NULL,
			  `release_id` VARCHAR(50) NULL DEFAULT NULL,
			  `version_tag` VARCHAR(255) NULL DEFAULT NULL,
			  `workflow` LONGTEXT NOT NULL DEFAULT '',
			  `config` TEXT NOT NULL DEFAULT '',
			  `time_created` INT NULL DEFAULT 0,
			  `time_updated` INT NULL DEFAULT 0,
			  UNIQUE INDEX  `{$wpdb->prefix}UNIQUE_SERVICE_VERSION` (`service_id` ASC, `version_id` ASC),
			  CONSTRAINT  `{$wpdb->prefix}FK_VERSION_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}convo_service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    );
	    ";

        dbDelta($sql);
    }

    protected function add102ServiceReleaseMeta()
    {
        global $wpdb;

        $wpdb->query("ALTER TABLE {$wpdb->prefix}convo_service_releases ADD COLUMN `meta` LONGTEXT NOT NULL AFTER `alias`");
    }

    protected function add103OAuthTable()
    {
        global $wpdb;

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_oauth (
	          `user_id` INTEGER NOT NULL,
			  `service_id` VARCHAR(255) NOT NULL,
			  `type` VARCHAR(50) NOT NULL,
			  `code` VARCHAR(255) NULL DEFAULT NULL,
			  `redeemed` TINYINT NULL DEFAULT 0,
			  `accessToken` LONGTEXT NOT NULL DEFAULT ''
			    );
	    ";

        $wpdb->query($sql);
    }

    protected function update104ServiceParamTable()
    {
        global $wpdb;

        $sql = "
	        ALTER TABLE `{$wpdb->prefix}convo_service_params`
    			ADD COLUMN `time_created` INT NULL DEFAULT 0,
    			ADD COLUMN `time_updated` INT NULL DEFAULT 0;
	    ";

        $wpdb->query($sql);
    }

    protected function add104CacheTable()
    {
        global $wpdb;

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_cache (
	          `key` VARCHAR(255) NOT NULL,
  			  `value` LONGTEXT NOT NULL DEFAULT '',
  			  `time_created` INT NULL DEFAULT 0,
  			  `expires` INT NULL DEFAULT 0,
  				PRIMARY KEY (`key`)
			);
	    ";

        $wpdb->query($sql);
    }

    protected function drop105OauthTable()
    {
        global $wpdb;

        $sql = "DROP TABLE IF EXISTS {$wpdb->prefix}convo_oauth;";

        $wpdb->query($sql);
    }

    protected function add106OServiceConversationLogTable()
    {
        global $wpdb;

        $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_conversation_log (
	          `request_id` VARCHAR(255) NOT NULL,
	          `service_id` VARCHAR(255) NOT NULL,
	          `session_id` VARCHAR(255) NOT NULL,
	          `device_id` VARCHAR(255) NOT NULL,
	          `stage` VARCHAR(255) NOT NULL,
	          `status_code` VARCHAR(255) NOT NULL,
	          `platform` VARCHAR(255) NOT NULL,
	          `intent_name` VARCHAR(255) NOT NULL DEFAULT '',
	          `time_created` INT NULL DEFAULT 0,
	          `time_elapsed` FLOAT NULL DEFAULT 0,
  			  `request` LONGTEXT NOT NULL DEFAULT '',
  			  `response` LONGTEXT NOT NULL DEFAULT '',
  			  `intent_slots` LONGTEXT NOT NULL DEFAULT '',
  			  `service_variables` LONGTEXT NOT NULL DEFAULT '',
  			  `error_stack_trace` LONGTEXT NOT NULL DEFAULT '',
  				PRIMARY KEY (`request_id`)
			);
	    ";

        $wpdb->query($sql);
    }

    protected function add107ServiceConversationLogTableIndexes()
    {
        global $wpdb;
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $logger->info('Upgrading DB to version 1.0.7');

        $fieldsToBeIndexed = [
            'request_id',
            'service_id',
            'session_id',
            'device_id',
            'stage',
            'status_code',
            'platform',
            'time_created'
        ];

        $indexedFieldsSql = "
            SHOW INDEXES FROM {$wpdb->prefix}convo_service_conversation_log;
        ";

        $indexedFieldsRows = $wpdb->get_results($indexedFieldsSql, ARRAY_A);
        $alreadyIndexedFields = [];
        foreach ($indexedFieldsRows as $indexedFieldRow) {
            $alreadyIndexedFields[] = $indexedFieldRow['Column_name'];
        }

        $fieldsNotIndexed = [];
        foreach ($fieldsToBeIndexed as $filedToBeIndexed) {
            if (!in_array($filedToBeIndexed, $alreadyIndexedFields)) {
                $fieldsNotIndexed[] = "`" . $filedToBeIndexed . "`";
            }
        }

        if (!empty($fieldsNotIndexed)) {
            foreach ($fieldsNotIndexed as $key => $value) {
                $createIndexSql = "
	            CREATE INDEX {$wpdb->prefix}convo_request_log_index_{$key} ON
	                {$wpdb->prefix}convo_service_conversation_log({$value});
	        ";
                $logger->info('Going to execute update query [' . $createIndexSql . ']');
                $wpdb->query($createIndexSql);
            }
        }
    }

    protected function remove108ServiceConversationLogTableIndexes()
    {
        global $wpdb;
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $logger->info('Upgrading DB to version 1.0.8');

        $indexedFieldsSql = "
            SHOW INDEXES FROM {$wpdb->prefix}convo_service_conversation_log;
        ";

        $indexedFieldsRows = $wpdb->get_results($indexedFieldsSql, ARRAY_A);
        $alreadyIndexedFields = [];
        foreach ($indexedFieldsRows as $indexedFieldRow) {
            $logger->info('Checking index kex name [' . $indexedFieldRow['Key_name'] . ']');
            if (strpos($indexedFieldRow['Key_name'], 'convo_request_log_index') !== false) {
                $alreadyIndexedFields[] = $indexedFieldRow['Key_name'];
            }
        }

        if (!empty($alreadyIndexedFields)) {
            foreach ($alreadyIndexedFields as $value) {
                $createIndexSql = "
	            DROP INDEX {$value} ON
	                {$wpdb->prefix}convo_service_conversation_log;
	        ";
                $logger->info('Going to execute drop query [' . $createIndexSql . ']');
                $wpdb->query($createIndexSql);
            }
        }
    }

    protected function update108ServiceConversationLogTable()
    {
        global $wpdb;

        $indexedFieldsSql = "
            SHOW COLUMNS FROM {$wpdb->prefix}convo_service_conversation_log;
        ";

        $tableColumnsRows = $wpdb->get_results($indexedFieldsSql, ARRAY_A);
        $tableColumns = [];
        foreach ($tableColumnsRows as $tableColumnsRow) {
            $tableColumns[] = $tableColumnsRow['Field'];
        }

        if (in_array('status_code', $tableColumns)) {
            $sql = "ALTER TABLE {$wpdb->prefix}convo_service_conversation_log DROP COLUMN `status_code`;";
            $wpdb->query($sql);
        }

        if (!in_array('error', $tableColumns) && !in_array('test_view', $tableColumns)) {
            $sql = "
	        ALTER TABLE {$wpdb->prefix}convo_service_conversation_log
    			ADD COLUMN `error` VARCHAR(255) NULL DEFAULT '',
    			ADD COLUMN `test_view` BOOLEAN;
	    ";

            $wpdb->query($sql);
        }
    }

    protected function add108ServiceConversationLogTableIndexes()
    {
        global $wpdb;
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $logger->info('Upgrading DB to version 1.0.8');

        $fieldsToBeIndexed = [
            'service_id',
            'session_id',
            'device_id',
            'stage',
            'test_view',
            'platform',
            'time_created'
        ];

        $indexedFieldsSql = "
            SHOW INDEXES FROM {$wpdb->prefix}convo_service_conversation_log;
        ";

        $indexedFieldsRows = $wpdb->get_results($indexedFieldsSql, ARRAY_A);
        $alreadyIndexedFields = [];
        foreach ($indexedFieldsRows as $indexedFieldRow) {
            $alreadyIndexedFields[] = $indexedFieldRow['Column_name'];
        }

        $fieldsNotIndexed = [];
        foreach ($fieldsToBeIndexed as $filedToBeIndexed) {
            if (!in_array($filedToBeIndexed, $alreadyIndexedFields)) {
                if ($filedToBeIndexed === 'service_id') {
                    $fieldsNotIndexed[] = $filedToBeIndexed . "(100)";
                } elseif ($filedToBeIndexed === 'session_id') {
                    $fieldsNotIndexed[] = $filedToBeIndexed . "(255)";
                } elseif ($filedToBeIndexed === 'device_id') {
                    $fieldsNotIndexed[] = $filedToBeIndexed . "(255)";
                } elseif ($filedToBeIndexed === 'stage') {
                    $fieldsNotIndexed[] = $filedToBeIndexed . "(10)";
                } elseif ($filedToBeIndexed === 'platform') {
                    $fieldsNotIndexed[] = $filedToBeIndexed . "(10)";
                } else {
                    $fieldsNotIndexed[] = $filedToBeIndexed;
                }
            }
        }

        $fieldsToBeIndexedQueryPartString = join(', ', $fieldsNotIndexed);

        $logger->info('Fields to be indexed [' . $fieldsToBeIndexedQueryPartString . ']');

        if (!empty($fieldsToBeIndexedQueryPartString)) {
            $createIndexSql = "
	            CREATE INDEX convo_request_log_indexes ON
	                {$wpdb->prefix}convo_service_conversation_log({$fieldsToBeIndexedQueryPartString});
	        ";

            $logger->info('Going to execute query [' . $createIndexSql . ']');

            $wpdb->query($createIndexSql);
        }
    }

    protected function recreate109OServiceConversationLogTable()
    {
        global $wpdb;

        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $logger->info('Upgrading DB to version 1.0.9');

        // drop old table
        $dropSql = "DROP TABLE IF EXISTS {$wpdb->prefix}convo_service_conversation_log;";

        $wpdb->query($dropSql);

        // create new table
        $createSql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_service_conversation_log
        (
            request_id        VARCHAR(255)            NOT NULL PRIMARY KEY,
            service_id        VARCHAR(100)            NOT NULL,
            session_id        VARCHAR(255)            NOT NULL,
            device_id         VARCHAR(255)            NOT NULL,
            stage             VARCHAR(10)             NOT NULL,
            platform          VARCHAR(20)             NOT NULL,
            intent_name       VARCHAR(255) DEFAULT '' NOT NULL,
            time_created      INT          DEFAULT 0  NOT NULL,
            request           LONGTEXT     DEFAULT '' NOT NULL,
            response          LONGTEXT     DEFAULT '' NOT NULL,
            intent_slots      LONGTEXT     DEFAULT '' NOT NULL,
            service_variables LONGTEXT     DEFAULT '' NOT NULL,
            error_stack_trace LONGTEXT     DEFAULT '' NOT NULL,
            time_elapsed      FLOAT        DEFAULT 0  NOT NULL,
            error             VARCHAR(255) DEFAULT '' NULL,
            test_view         TINYINT(1)              NOT NULL
        );";

        $wpdb->query($createSql);

        // attach indexes to recently created table
        $fieldsToBeIndexed = [
            'service_id',
            'session_id',
            'device_id',
            'stage',
            'test_view',
            'platform',
            'time_created'
        ];

        $indexedFieldsSql = "
            SHOW INDEXES FROM {$wpdb->prefix}convo_service_conversation_log;
        ";

        $indexedFieldsRows = $wpdb->get_results($indexedFieldsSql, ARRAY_A);
        $alreadyIndexedFields = [];
        foreach ($indexedFieldsRows as $indexedFieldRow) {
            $alreadyIndexedFields[] = $indexedFieldRow['Column_name'];
        }

        $fieldsNotIndexed = [];
        foreach ($fieldsToBeIndexed as $filedToBeIndexed) {
            if (!in_array($filedToBeIndexed, $alreadyIndexedFields)) {
                $fieldsNotIndexed[] = $filedToBeIndexed;
            }
        }

        $fieldsToBeIndexedQueryPartString = join(', ', $fieldsNotIndexed);

        $logger->info('Fields to be indexed [' . $fieldsToBeIndexedQueryPartString . ']');

        if (!empty($fieldsToBeIndexedQueryPartString)) {
            $createIndexSql = "
	            CREATE INDEX convo_request_log_indexes ON
	                {$wpdb->prefix}convo_service_conversation_log({$fieldsToBeIndexedQueryPartString});
	        ";

            $logger->info('Going to execute query [' . $createIndexSql . ']');

            $wpdb->query($createIndexSql);
        }
    }

    protected function update110ServiceConversationLogTableIndexes()
    {
        global $wpdb;
        $container = ConvoWPPlugin::getPublicDiContainer();
        /** @var LoggerInterface $logger */
        $logger = $container->get('logger');

        $logger->info('Upgrading DB to version 1.0.10');

        $createIndexSql = "
	            ALTER TABLE {$wpdb->prefix}convo_service_conversation_log
                    CHANGE COLUMN `platform` `platform` VARCHAR(30) NOT NULL AFTER `stage`;
	    ";

        $logger->info('Going to execute query [' . $createIndexSql . ']');

        $wpdb->query($createIndexSql);
    }

    protected function update111ConvoServiceReleasesTable()
    {
        global $wpdb;

        $sql = "
	        ALTER TABLE `{$wpdb->prefix}convo_service_releases`
    			ADD COLUMN `platform_release_data` TEXT NULL DEFAULT NULL
	    ";

        $wpdb->query($sql);
    }

    protected function update111ConvoServiceVersionsTable()
    {
        global $wpdb;

        $sql = "
	        ALTER TABLE `{$wpdb->prefix}convo_service_versions`
    			ADD COLUMN `platform_id` VARCHAR(50) NULL DEFAULT NULL,
    			ADD COLUMN `platform_version_data` TEXT NULL DEFAULT NULL;
	    ";

        $wpdb->query($sql);
    }

    protected function update112MuFix()
    {
        // NOP
    }
}
