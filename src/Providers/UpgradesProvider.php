<?php

namespace ConvoPlugin\Providers;

use Exception;

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
        '1.0.0' => [
            'add100ServicesTables'
        ],
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
    public function getDbUpdateCallbacks() {
        return $this->dbUpdates;
    }

    /**
     * Is a DB update needed?
     *
     * @return boolean
     */
    public function needsDbUpdate()
    {
        $currentDbVersion  = get_option($this->version);
        $updates           = $this->getDbUpdateCallbacks();
        $updateVersions    = array_keys($updates);
        usort($updateVersions, 'version_compare');

        return ! is_null($currentDbVersion) && version_compare($currentDbVersion, end($updateVersions), '<');
    }

    /**
     * Run all needed DB updates according to db version.
     */
    public function run()
    {
        if ($this->needsDbUpdate()) {
            $dbVersion = get_option($this->version);

            foreach ($this->getDbUpdateCallbacks() as $version => $updateCallbacks) {
                if (version_compare($dbVersion, $version, '<')) {
                    foreach ($updateCallbacks as $updateCallback) {
                        $this->$updateCallback();
                    }

                    // raising db option
                    update_option($this->version, $version);
                }
            }
        }
    }

    /**
     * Add Services table
     *
     * @throws Exception
     */
    protected function add100ServicesTables()
    {
	    global $wpdb;
	    $collate = '';

	    if ($wpdb->has_cap('collation')) {
		    $collate = $wpdb->get_charset_collate();
	    }

	    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	    $sql = "
		CREATE TABLE IF NOT EXISTS {$wpdb->prefix}service_data (
          service_id VARCHAR(255) NOT NULL,
          workflow LONGTEXT NOT NULL DEFAULT '',
          meta TEXT NOT NULL DEFAULT '',
          config TEXT NOT NULL DEFAULT '',
          PRIMARY KEY  (service_id)
        ) $collate;
		";

	    dbDelta($sql);

	    $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}service_params (
			  `service_id` VARCHAR(255) NOT NULL,
			  `scope_type` VARCHAR(50) NOT NULL,
			  `level_type` VARCHAR(50) NOT NULL,
			  `key` VARCHAR(255) NOT NULL,
			  `value` LONGTEXT NOT NULL DEFAULT '',
			  UNIQUE INDEX  `SERVICE_PARAMS_UNIQUE` (`service_id` ASC, `level_type` ASC, `scope_type` ASC, `key` ASC),
			  CONSTRAINT  `FK_PARAMS_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    ) $collate; 
	    ";

	    dbDelta($sql);

	    $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}service_releases (
			  `service_id` VARCHAR(255) NOT NULL,
			  `release_id` VARCHAR(50) NOT NULL,
			  `platform_id` VARCHAR(50) NOT NULL,
			  `version_id` VARCHAR(50) NOT NULL,
			  `type` VARCHAR(50) NOT NULL,
			  `stage` VARCHAR(50) NOT NULL,
			  `alias` VARCHAR(50) NOT NULL,
			  `time_created` INT NULL DEFAULT 0,
			  `time_updated` INT NULL DEFAULT 0,
			  UNIQUE INDEX  `UNIQUE_SERVICE_RELEASE` (`service_id` ASC, `release_id` ASC),
			  CONSTRAINT  `FK_REKLEASE_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    ) $collate;
	    ";

	    dbDelta($sql);

	    $sql = "
	        CREATE TABLE IF NOT EXISTS {$wpdb->prefix}service_versions (
			  `service_id` VARCHAR(255) NOT NULL,
			  `version_id` VARCHAR(50) NOT NULL,
			  `release_id` VARCHAR(50) NULL DEFAULT NULL,
			  `version_tag` VARCHAR(255) NULL DEFAULT NULL,
			  `workflow` LONGTEXT NOT NULL DEFAULT '',
			  `config` TEXT NOT NULL DEFAULT '',
			  `time_created` INT NULL DEFAULT 0,
			  `time_updated` INT NULL DEFAULT 0,
			  UNIQUE INDEX  `UNIQUE_SERVICE_VERSION` (`service_id` ASC, `version_id` ASC),
			  CONSTRAINT  `FK_VERSION_SERVICE`
			    FOREIGN KEY  (`service_id`)
			    REFERENCES  {$wpdb->prefix}service_data (`service_id`)
			    ON DELETE NO ACTION
			    ON UPDATE NO ACTION
			    ) $collate;
	    ";

	    dbDelta($sql);
    }
}