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
            'add100ServicesTable'
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
     * Add Orders table
     *
     * @throws Exception
     */
    protected function add100ServicesTable()
    {
	    global $wpdb;
	    $collate = '';

	    if ($wpdb->has_cap('collation')) {
		    $collate = $wpdb->get_charset_collate();
	    }

	    $sql = "
		CREATE TABLE IF NOT EXISTS {$wpdb->prefix}convo_services (
          id BIGINT UNSIGNED NOT NULL auto_increment,
          service_meta TEXT NULL,
          platform_config TEXT NULL,
          workflow TEXT NULL,
          PRIMARY KEY  (id)
        ) $collate;
		";

	    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	    dbDelta($sql);
    }
}