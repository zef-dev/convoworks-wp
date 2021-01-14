<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Data\Wp;

use Convo\Core\IServiceDataProvider;
use Convo\Core\AbstractServiceDataProvider;
use Convo\Core\DataItemNotFoundException;
use Convo\Core\iAdminUser;
use Convo\Core\Publish\IPlatformPublisher;
use Convo\Core\Rest\NotAuthorizedException;

class WpServiceDataProvider extends AbstractServiceDataProvider
{
	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	protected $_logger;

	protected $_wpdb;

	public function __construct( \Psr\Log\LoggerInterface $logger)
	{
		// temp solution, hard to inject global
		global $wpdb;

		$this->_logger		=	$logger;
		$this->_wpdb        =   $wpdb;
	}

	/**
	 * {@inheritDoc}
	 * @see IServiceDataProvider::getAllServices()
	 */
	public function getAllServices(iAdminUser $user)
	{
		$services = $this->_wpdb->get_results(
			"SELECT * FROM {$this->_wpdb->prefix}convo_service_data"
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
	 * @param iAdminUser $user
	 * @param string $serviceId
	 *
	 * @return array
	 */
	public function getAllServiceVersions(iAdminUser $user, $serviceId)
	{
		$services = $this->_wpdb->get_results(
		    "SELECT * FROM {$this->_wpdb->prefix}convo_service_versions", ARRAY_A
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
	 * @see IServiceDataProvider::createNewService()
	 */
	public function createNewService(iAdminUser $user, $serviceName, $defaultLanguage, $serviceAdmins, $isPrivate, $workflowData)
	{
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


		$this->_checkError( $this->_wpdb->query( $this->_checkPrepare( $this->_wpdb->prepare(
			"INSERT INTO {$this->_wpdb->prefix}convo_service_data (`service_id`, `workflow`, `meta`, `config`) VALUES ('%s', '%s', '%s', '%s')",
			$service_id,
			json_encode( $service_data, JSON_PRETTY_PRINT),
			json_encode( $meta_data, JSON_PRETTY_PRINT),
			json_encode( [], JSON_PRETTY_PRINT)
		))));

		return $service_id;
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::getServiceData()
	 */
	public function getServiceData($user, $serviceId, $versionId)
	{
		$this->_logger->debug( 'Fetching service ['.$serviceId.']['.$versionId.'] data');
		$serviceMeta = $this->getServiceMeta( $user, $serviceId);
		if( !$this->_checkServiceOwner( $user, $serviceMeta)) {
			$errorMessage = "User [" . $user->getUsername() . "] is not authorized to open the service [" . $serviceId ."]";
			throw new NotAuthorizedException( $errorMessage);
		}

		if ( $versionId === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$data = $this->_wpdb->get_row(
			    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT workflow FROM {$this->_wpdb->prefix}convo_service_data where `service_id` = '%s'
            ", $serviceId)),
				ARRAY_A
			);
		} else {
			$data = $this->_wpdb->get_row(
			    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT workflow FROM {$this->_wpdb->prefix}convo_service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId)),
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

		if ( $versionId && $versionId !== IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$row = $this->_wpdb->get_row(
			    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT service_id, version_id, release_id, version_tag, time_created, time_updated FROM {$this->_wpdb->prefix}convo_service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId)),
				ARRAY_A
			);

			if ( !$row) {
				throw new DataItemNotFoundException( 'Service meta ['.$serviceId.']['.$versionId.'] not found');
			}
			$row['time_created'] = intval( $row['time_created']);
			$row['time_updated'] = intval( $row['time_updated']);

			return $row;
		}

		$row = $this->_wpdb->get_row(
		    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT * FROM {$this->_wpdb->prefix}convo_service_data where `service_id` = '%s'
            ", $serviceId)),
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
	 * @see IServiceDataProvider::saveServiceData()
	 */
	public function saveServiceData( iAdminUser $user, $serviceId, $data)
	{
		$data['time_updated']   =   time();

		$this->_checkError( $this->_wpdb->query(
		    $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_data SET `workflow` = '%s' WHERE `service_id` = '%s'",
				json_encode($data, JSON_PRETTY_PRINT),
				$serviceId
			))
		));

		return $data;
	}

	public function saveServiceMeta( iAdminUser $user, $serviceId, $meta, $versionId=null)
	{
		$meta['time_updated']   =   time();

		$this->_checkError( $this->_wpdb->query(
		    $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_data SET `meta` = '%s' WHERE `service_id` = '%s'",
				json_encode($meta, JSON_PRETTY_PRINT),
				$serviceId
			))
		));

		return $meta;
	}

    public function deleteService( iAdminUser $user, $serviceId)
    {
	    $service_meta = $this->getServiceMeta($user, $serviceId);

	    $is_owner = $user->getEmail() === $service_meta['owner'];
	    if (! is_array($service_meta['admins'])) {
	    	$service_meta['admins'] = [];
	    }
	    $is_admin = in_array($user->getEmail(), $service_meta['admins']);

	    if (!($is_owner || $is_admin)) {
		    throw new \Exception('User ['.$user->getName().']['.$user->getEmail().'] is not allowed to delete skill ['.$serviceId.']');
	    }

	    $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM `{$this->_wpdb->prefix}convo_service_params`
                WHERE `service_id` = '%s'
            ", $serviceId))
	    );

	    $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM `{$this->_wpdb->prefix}convo_service_releases`
                WHERE `service_id` = '%s'
            ", $serviceId))
	    );

	    $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM `{$this->_wpdb->prefix}convo_service_versions`
                WHERE `service_id` = '%s'
            ", $serviceId))
	    );

	    $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM `{$this->_wpdb->prefix}convo_service_data`
                WHERE `service_id` = '%s'
            ", $serviceId))
	    );
    }

	public function createServiceVersion(iAdminUser $user, $serviceId, $workflow, $config, $versionTag=null)
	{
		$version_id	=	$this->_getNextServiceVersion( $serviceId);
		$this->_logger->debug( 'Got new version ['.$version_id.'] for service ['.$serviceId.']');

		$this->_checkError( $this->_wpdb->query( $this->_checkPrepare( $this->_wpdb->prepare(
			"INSERT INTO {$this->_wpdb->prefix}convo_service_versions (service_id, version_id, version_tag, workflow, config, time_created, time_updated) VALUES ('%s', '%s', '%s', '%s', '%s', %d, %d)",
			$serviceId,
			$version_id,
			$versionTag,
			json_encode( $workflow, JSON_PRETTY_PRINT),
			json_encode( $config, JSON_PRETTY_PRINT),
			time(),
			time()
		))));

		return $version_id;
	}


	private function _getNextServiceVersion( $serviceId) {

		$row = $this->_wpdb->get_row(
		    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT version_id FROM {$this->_wpdb->prefix}convo_service_versions WHERE service_id = '%s' ORDER BY version_id DESC LIMIT 0,1
            ", $serviceId)),
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


	private function _getNextReleseId( $serviceId)
	{
		$row = $this->_wpdb->get_row(
		    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT release_id FROM {$this->_wpdb->prefix}convo_service_releases WHERE service_id = '%s' ORDER BY version_id DESC LIMIT 0,1
            ", $serviceId)),
			ARRAY_A
		);

		if (! empty($row)) {
		    if ( !isset( $row['release_id'])) {
		        $this->_logger->debug( 'Got relese row ['.print_r( $row, true).']');
		    }
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
	public function getServicePlatformConfig( iAdminUser $user, $serviceId, $versionId)
	{
		if ( $versionId === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			$data = $this->_wpdb->get_row(
			    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT config FROM {$this->_wpdb->prefix}convo_service_data where `service_id` = '%s'
            ", $serviceId)),
				ARRAY_A
			);
		} else {
			$data = $this->_wpdb->get_row(
			    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT config FROM {$this->_wpdb->prefix}convo_service_versions where `service_id` = '%s' AND `version_id` = '%s'
            ", $serviceId, $versionId)),
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
	public function updateServicePlatformConfig( iAdminUser $user, $serviceId, $config)
	{
	    $this->_checkError( $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_data SET `config` = '%s' WHERE `service_id` = '%s'",
				json_encode($config, JSON_PRETTY_PRINT),
				$serviceId
			))
		));
	}

	// RELEASES
	public function createRelease( iAdminUser $user, $serviceId, $platformId, $type, $stage, $alias, $versionId)
	{
		$release_id   =   $this->_getNextReleseId( $serviceId);

		$this->_logger->debug( 'Creating relese ['.$release_id.']['.$serviceId.']['.$platformId.']');
		
		$this->_checkError( $this->_wpdb->query( $this->_checkPrepare( $this->_wpdb->prepare( "INSERT INTO {$this->_wpdb->prefix}convo_service_releases
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
		))));
		
		return $release_id;
	}


	public function getReleaseData( iAdminUser $user, $serviceId, $releaseId)
	{
		$row = $this->_wpdb->get_row(
		    $this->_checkPrepare( $this->_wpdb->prepare("
                SELECT * FROM {$this->_wpdb->prefix}convo_service_releases where `service_id` = '%s' AND release_id = '%s'
            ", $serviceId, $releaseId)),
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


	public function markVersionAsRelease( iAdminUser $user, $serviceId, $versionId, $releaseId )
	{
	    $this->_checkError( $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_versions SET `release_id` = '%s' WHERE `service_id` = '%s' AND `version_id` = '%s'",
				$releaseId,
				$serviceId,
				$versionId
			))
		));

		return $this->getServiceMeta($user, $serviceId, $versionId);
	}

	public function promoteRelease( iAdminUser $user, $serviceId, $releaseId, $type, $stage )
	{
	    $this->_checkError( $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_releases SET `type` = '%s', `stage` = '%s',`time_updated` = '%s' WHERE `service_id` = '%s' AND `release_id` = '%s'",
				$type,
				$stage,
				time(),
				$serviceId,
				$releaseId
			)
		)));
	}

	public function setReleaseVersion( iAdminUser $user, $serviceId, $releaseId, $versionId )
	{
	    $this->_checkError( $this->_wpdb->query(
	        $this->_checkPrepare( $this->_wpdb->prepare(
				"UPDATE {$this->_wpdb->prefix}convo_service_releases SET `version_id` = '%s',`time_updated` = %d WHERE `service_id` = '%s' AND `release_id` = '%s'",
				$versionId,
				time(),
				$serviceId,
				$releaseId
			))
		));
	}

	public function updateReleaseData( iAdminUser $user, $serviceId, $releaseId, $data ) {
		// TODO: Implement updateReleaseData() method.
	}

	/**
	 * Returns true if the user has access to the service.
	 * @param $user iAdminUser
	 * @param $serviceMeta array
	 * @return boolean
	 */
	protected function _checkServiceOwner( iAdminUser $user, $serviceMeta) {
		$checkedOwner = false;
		if (!$user->isSystem()) {
			if ($user->getEmail() === $serviceMeta["owner"] || $user->getUsername() === $serviceMeta['owner'] || empty($serviceMeta["owner"])) {
				$checkedOwner = true;
			}

			if (! is_array($serviceMeta['admins'])) {
				$serviceMeta['admins'] = [];
			}

			if (in_array($user->getEmail(), $serviceMeta["admins"])) {
				$checkedOwner = true;
			}

			if (!$serviceMeta["is_private"] && !empty($user->getId()) ) {
				$checkedOwner = true;
			}
		} else if ($user->isSystem()) {
			$checkedOwner = true;
		}

		return $checkedOwner;
	}
	
	// COMMON
	private function _checkError( $ret) {
	    if ( $ret === false && $this->_wpdb->last_error) {
	        throw new \Exception( $this->_wpdb->last_error);
	    }
	    return $ret;
	}

	private function _checkPrepare( $ret) {
	    if ( is_null( $ret) || empty( $ret)) {
	        throw new \Exception( 'Failed to prepare query');
	    }
	    return $ret;
	}
	
}
