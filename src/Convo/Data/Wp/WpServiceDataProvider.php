<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Data\Wp;

use Convo\Core\DataItemNotFoundException;
use ConvoPlugin\Convo\AbstractServiceDataProvider;
use Convo\Core\Publish\IPlatformPublisher;
use ConvoPlugin\Convo\IServiceDataProvider;
use Convo\Core\Rest\NotAuthorizedException;
use ConvoPlugin\Convo\Wp\AdminUser;

class WpServiceDataProvider extends AbstractServiceDataProvider
{
	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	protected $_logger;

	public function __construct( \Psr\Log\LoggerInterface $logger)
	{
		parent::__construct( $logger);
		$this->_logger		=	$logger;
	}

	/**
	 * {@inheritDoc}
	 * @see \ConvoPlugin\Convo\IServiceDataProvider::getAllServices()
	 */
	public function getAllServices(AdminUser $user)
	{
		global $wpdb;

		$services = $wpdb->get_results(
			"SELECT * FROM {$wpdb->prefix}service_data"
		);

		$this->_logger->debug('Loading all services data from WP db');

		$all		=	[];
		$this->_logger->debug( 'Found ['.count( $services).']');

		if (! empty($services)) {
			foreach ($services as $service) {
				$this->_logger->debug( 'Handling service ['.$service->service_id.']');
				try {
				    $serviceMeta = $this->getServiceMeta($user, $service->service_id);
				    if ($this->_checkServiceOwner($user, $serviceMeta)) {
	                    $all[]		=	$serviceMeta;
	                }
				} catch ( \Convo\Core\DataItemNotFoundException $e) {
					$this->_logger->warning( $e->getMessage());
				}
			}
		}

		return $all;
	}

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 *
	 * @return array
	 */
	public function getAllServiceVersions(AdminUser $user, $serviceId)
	{
		global $wpdb;

		$services = $wpdb->get_results(
			"SELECT * FROM {$wpdb->prefix}service_versions"
		);

		$all = [];

		if (! empty($services)) {
			foreach ($services as $service) {
				$all[] = $service['version_id'];
			}
		}

		return $all;
	}

	/**
	 * {@inheritDoc}
	 * @see \ConvoPlugin\Convo\IServiceDataProvider::createNewService()
	 */
	public function createNewService(AdminUser $user, $serviceName, $defaultLanguage, $serviceAdmins, $isPrivate, $workflowData)
	{
		global $wpdb;

		$service_id                 =   $this->_generateIdFromName( $serviceName);

		// META
		$meta_data					=	$this->_getDefaultMeta( $user, $service_id, $serviceName);
		$meta_data['service_id']	=	$service_id;
		$meta_data['name']			=	$serviceName;
		$meta_data['default_language']	=	$defaultLanguage;
		$meta_data['owner']			=	$user->getEmail();
		$meta_data['admins']        =   $serviceAdmins;
		$meta_data['is_private']    =   $isPrivate;

		// WORKFLOW
		$service_data					=   array_merge( IServiceDataProvider::DEFAULT_WORKFLOW, $workflowData);
		$service_data['name']   		=	$serviceName;
		$service_data['service_id']		=	$service_id;

		$service_data['time_updated']             =   time();
		$service_data['intents_time_updated']     =   time();


		$wpdb->query($wpdb->prepare(
			"INSERT INTO {$wpdb->prefix}service_data (`service_id`, `workflow`, `meta`, `config`) VALUES ('%s', '%s', '%s', '%s')",
			$service_id,
			json_encode( $service_data, JSON_PRETTY_PRINT),
			json_encode( $meta_data, JSON_PRETTY_PRINT),
			json_encode( [], JSON_PRETTY_PRINT)
		));

		return $service_id;
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::getServiceData()
	 */
	public function getServiceData($user, $serviceId, $versionId)
	{
		global $wpdb;

		$this->_logger->debug( 'Fetching service ['.$serviceId.']['.$versionId.'] data');
		$serviceMeta = $this->getServiceMeta( $user, $serviceId);
		if( !$this->_checkServiceOwner( $user, $serviceMeta)) {
			$errorMessage = "User [" . $user->getUsername() . "] is not authorized to open the service [" . $serviceId ."]";
			throw new NotAuthorizedException( $errorMessage);
		}

		if ( $versionId === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$data = $wpdb->get_row(
				$wpdb->prepare("
                SELECT workflow FROM {$wpdb->prefix}service_data where `service_id` = '%s'
            ", $serviceId),
				ARRAY_A
			);
		} else {
			$data = $wpdb->get_row(
				$wpdb->prepare("
                SELECT workflow FROM {$wpdb->prefix}service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId),
				ARRAY_A
			);
		}

		if (! empty($data)) {
			$this->_logger->debug( 'handling row ['.print_r( json_decode( $data['workflow'], true), true).'] data');
			return array_merge( IServiceDataProvider::DEFAULT_WORKFLOW, json_decode( $data['workflow'], true));
		}

		throw new DataItemNotFoundException( 'Service data ['.$serviceId.']['.$versionId.'] not found');
	}

	public function getServiceMeta($user, $serviceId, $versionId=null)
	{
		global $wpdb;

		if ( $versionId && $versionId !== IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$row = $wpdb->get_row(
				$wpdb->prepare("
                SELECT service_id, version_id, release_id, version_tag, time_created, time_updated FROM {$wpdb->prefix}service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId),
				ARRAY_A
			);

			if ( !$row) {
				throw new DataItemNotFoundException( 'Service meta ['.$serviceId.']['.$versionId.'] not found');
			}
			$row['time_created'] = intval( $row['time_created']);
			$row['time_updated'] = intval( $row['time_updated']);

			return $row;
		}

		$row = $wpdb->get_row(
			$wpdb->prepare("
                SELECT * FROM {$wpdb->prefix}service_data where `service_id` = '%s'
            ", $serviceId),
			ARRAY_A
		);
		if (! $row) {
			throw new DataItemNotFoundException( 'Service meta ['.$serviceId.'] not found');
		}
		$row['meta']   =   json_decode( $row['meta'], true);

		return array_merge( IServiceDataProvider::DEFAULT_META, $row['meta']);
	}

	/**
	 * {@inheritDoc}
	 * @see \ConvoPlugin\Convo\IServiceDataProvider::saveServiceData()
	 */
	public function saveServiceData( AdminUser $user, $serviceId, $data)
	{
		global $wpdb;

		$data['time_updated']   =   time();

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_data SET `workflow` = '%s' WHERE `service_id` = '%s'",
				json_encode($data, JSON_PRETTY_PRINT),
				$serviceId
			)
		);


		return $data;
	}

	public function saveServiceMeta( AdminUser $user, $serviceId, $meta, $versionId=null)
	{
		global $wpdb;

		$meta['time_updated']   =   time();

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_data SET `meta` = '%s' WHERE `service_id` = '%s'",
				json_encode($meta, JSON_PRETTY_PRINT),
				$serviceId
			)
		);


		return $meta;
	}

    public function deleteService( AdminUser $user, $serviceId)
    {
    	global $wpdb;

	    $service_meta = $this->getServiceMeta($user, $serviceId);

	    $is_owner = $user->getEmail() === $service_meta['owner'];
	    $is_admin = in_array($user->getEmail(), $service_meta['admins']);

	    if (!($is_owner || $is_admin)) {
		    throw new \Exception('User ['.$user->getName().']['.$user->getEmail().'] is not allowed to delete skill ['.$serviceId.']');
	    }

	    $wpdb->query(
		    $wpdb->prepare("
                DELETE FROM `{$wpdb->prefix}service_params`
                WHERE `service_id` = '%s'
            ", $serviceId)
	    );

	    $wpdb->query(
		    $wpdb->prepare("
                DELETE FROM `{$wpdb->prefix}service_releases`
                WHERE `service_id` = '%s'
            ", $serviceId)
	    );

	    $wpdb->query(
		    $wpdb->prepare("
                DELETE FROM `{$wpdb->prefix}service_versions`
                WHERE `service_id` = '%s'
            ", $serviceId)
	    );

	    $wpdb->query(
		    $wpdb->prepare("
                DELETE FROM `{$wpdb->prefix}service_data`
                WHERE `service_id` = '%s'
            ", $serviceId)
	    );
    }

	public function createServiceVersion(AdminUser $user, $serviceId, $workflow, $config, $versionTag=null)
	{
		global $wpdb;

		$version_id	=	$this->_getNextServiceVersion( $serviceId);
		$this->_logger->debug( 'Got new version ['.$version_id.'] for service ['.$serviceId.']');

		$wpdb->query($wpdb->prepare(
			"INSERT INTO {$wpdb->prefix}service_versions (service_id, version_id, version_tag, workflow, config, time_created, time_updated) VALUES ('%s', '%s', '%s', '%s', '%s', %d, %d)",
			$serviceId,
			$version_id,
			$versionTag,
			json_encode( $workflow, JSON_PRETTY_PRINT),
			json_encode( $config, JSON_PRETTY_PRINT),
			time(),
			time()
		));


		return $version_id;
	}


	private function _getNextServiceVersion( $serviceId) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare("
                SELECT version_id FROM {$wpdb->prefix}service_versions WHERE service_id = '%s' ORDER BY version_id DESC LIMIT 0,1
            ", $serviceId),
			ARRAY_A
		);

		if (! empty($row)) {
			$curr = intval($row['version_id']);
		} else {
			$curr = 0;
		}

		$curr++;
		return sprintf('%08d', $curr);
	}


	private function _getNextReleseId( $serviceId) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare("
                SELECT version_id FROM {$wpdb->prefix}service_releases WHERE service_id = '%s' ORDER BY version_id DESC LIMIT 0,1
            ", $serviceId),
			ARRAY_A
		);

		if (! empty($row)) {
			$curr = intval($row['release_id']);
		} else {
			$curr = 0;
		}

		$curr++;
		return sprintf('%08d', $curr);
	}


	/**
	 * {@inheritDoc}
	 * @throws DataItemNotFoundException
	 * @see \Convo\Core\IServiceDataProvider::getServicePlatformConfig()
	 */
	public function getServicePlatformConfig( AdminUser $user, $serviceId, $versionId)
	{
		global $wpdb;

		if ( $versionId === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$data = $wpdb->get_row(
				$wpdb->prepare("
                SELECT config FROM {$wpdb->prefix}service_data where `service_id` = '%s'
            ", $serviceId),
				ARRAY_A
			);
		} else {
			$data = $wpdb->get_row(
				$wpdb->prepare("
                SELECT workflow FROM {$wpdb->prefix}service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId),
				ARRAY_A
			);
		}

		if (! empty($data)) {
			return json_decode($data['config'], true);
		}

		if ($versionId === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			return [];
		}

		// if there is version, config has to be present
		throw new \Convo\Core\DataItemNotFoundException( 'Service config ['.$serviceId.']['.$versionId.']');
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::updateServicePlatformConfig()
	 */
	public function updateServicePlatformConfig( AdminUser $user, $serviceId, $config)
	{
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_data SET `config` = '%s' WHERE `service_id` = '%s'",
				json_encode($config, JSON_PRETTY_PRINT),
				$serviceId
			)
		);
	}

	// RELEASES
	public function createRelease( AdminUser $user, $serviceId, $platformId, $type, $stage, $alias, $versionId)
	{
		global $wpdb;

		$release_id    =   $this->_getNextReleseId( $serviceId);

		$wpdb->prepare( "INSERT INTO service_releases
            ( service_id, release_id, platform_id, version_id, type, stage, alias, time_created, time_updated)
            VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s', %d, %d)",
			$serviceId,
			$release_id,
			$platformId,
			$versionId,
			$type,
			$stage,
			$alias,
			time(),
			time()
		);

		return $release_id;
	}


	public function getReleaseData( AdminUser $user, $serviceId, $releaseId)
	{
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare("
                SELECT config FROM {$wpdb->prefix}service_releases where `service_id` = '%s' AND release_id = '%s'
            ", $serviceId, $releaseId),
			ARRAY_A
		);

		if (! empty($row)) {
			$row['time_created'] = intval( $row['time_created']);
			$row['time_updated'] = intval( $row['time_updated']);
			return $row;
		}

		throw new \Convo\Core\DataItemNotFoundException( 'Service ¸release ['.$serviceId.']['.$releaseId.'] not found');

	}

	// UTIL
	public function __toString()
	{
		return get_class( $this).'[]';
	}


	public function markVersionAsRelease( AdminUser $user, $serviceId, $versionId, $releaseId ) {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_versions SET `release_id` = '%s' WHERE `service_id` = '%s' AND `version_id` = '%s'",
				$releaseId,
				$serviceId,
				$versionId
			)
		);

		return $this->getServiceMeta($user, $serviceId, $versionId);
	}

	public function promoteRelease( AdminUser $user, $serviceId, $releaseId, $type, $stage ) {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_releases SET `type` = '%s', `stage` = '%s',`time_updated` = '%s' WHERE `service_id` = '%s' AND `release_id` = '%s'",
				$type,
				$stage,
				$serviceId,
				$releaseId
			)
		);
	}

	public function setReleaseVersion( AdminUser $user, $serviceId, $releaseId, $versionId ) {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}service_releases SET `version_id` = '%s',`time_updated` = %d WHERE `service_id` = '%s' AND `release_id` = '%s'",
				$versionId,
				time(),
				$serviceId,
				$releaseId
			)
		);
	}

	public function updateReleaseData( AdminUser $user, $serviceId, $releaseId, $data ) {
		// TODO: Implement updateReleaseData() method.
	}
}
