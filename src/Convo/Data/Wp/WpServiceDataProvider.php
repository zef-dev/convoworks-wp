<?php declare(strict_types=1);

namespace Convo\Data\Filesystem;

use Convo\Core\Publish\IPlatformPublisher;
use Convo\Core\IAdminUser;
use Convo\Core\IServiceDataProvider;
use Convo\Core\Rest\NotAuthorizedException;
use Convo\Core\Rest\RestSystemUser;

class FilesystemServiceDataProvider implements IServiceDataProvider
{

	private $_basePath;

	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;

	public function __construct( \Psr\Log\LoggerInterface $logger, $basePath)
	{
		$this->_logger		=	$logger;
		$this->_basePath	=	\Convo\Core\Util\StrUtil::removeTrailingSlashes( $basePath);
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::getAllServices()
	 */
	public function getAllServices( \Convo\Core\IAdminUser $user) {

		$full_path	=	$this->_basePath.'/services/';

		if ( !is_dir( $full_path)) {
			throw new \Exception( 'Expected to have folder at ['.$full_path.']');
		}

		$this->_logger->debug( 'Loading folders ['.$full_path.']');

		$all		=	array();

		$dirs		=	array_filter( glob( $full_path.'*'), 'is_dir');

		$this->_logger->debug( 'Found ['.count( $dirs).']');

		foreach ( $dirs as $filename)
		{
			$service_id	=	basename( $filename);
			$this->_logger->debug( 'Handling service ['.$service_id.']');
			try {
			    $serviceMeta = $this->getServiceMeta( $user, $service_id);
			    if ($this->_checkServiceOwner($user, $serviceMeta)) {
                    $all[]		=	$serviceMeta;
                }
			} catch ( \Convo\Core\DataItemNotFoundException $e) {
				$this->_logger->warning( $e->getMessage());
			}
		}

		return $all;
	}

    /**
     * @param $user IAdminUser
     * @param $serviceMeta array
     * @return boolean
     */
    private function _checkServiceOwner($user, $serviceMeta) {
        $checkedOwner = false;
        if (!$user->isSystem()) {
            if ($user->getEmail() === $serviceMeta["owner"] || $user->getUsername() === $serviceMeta['owner'] || empty($serviceMeta["owner"])) {
                $checkedOwner = true;
            }

            if (in_array($user->getEmail(), $serviceMeta["admins"])) {
                $checkedOwner = true;
            }
        } else if ($user->isSystem()) {
            $checkedOwner = true;
        }

        return $checkedOwner;
    }

	public function getAllServiceVersions( \Convo\Core\IAdminUser $user, $serviceId) {

	    $full_path	=	$this->_basePath.'/services/'.$serviceId.'/versions/';

	    if ( !is_dir( $full_path)) {
	        mkdir( $full_path, 0777, true);
	        if ( !is_dir( $full_path)) {
	            throw new \Exception( 'Failed to create service versions folder ['.$full_path.']');
	        }
	    }

		$this->_logger->debug( 'Loading folders ['.$full_path.']');

		$all		=	array();

		$dirs		=	array_filter( glob( $full_path.'*'), 'is_dir');

		$this->_logger->debug( 'Found ['.count( $dirs).']');

		$meta       =     $this->getServiceMeta( $user, $serviceId);

		foreach ( $dirs as $filename)
		{
			$version_id	     =	basename( $filename);
			try {
			    $version_meta    =  $this->_loadServiceFile( $serviceId, 'meta.json', $version_id);
			} catch ( \Convo\Core\DataItemNotFoundException $e) {
			    // old service definition quickfix - todo: remove this check latter
			    $this->_logger->warning( $e->getMessage());
			    $version_meta      =   [
			        'service_id' => $serviceId,
			        'version_id' => $version_id,
			        'release_id' => null,
			        'time_updated' => time(),
			        'time_created' => time(),
			    ];
			}

			if ( $version_meta['release_id']) {
			    $release         =  $this->getReleaseData( $user, $serviceId, $version_meta['release_id']);
			} else {
			    $release         =   [];
			}


			$this->_logger->debug( 'Handling version ['.$version_id.']');

			$row		=	[
			    'version_id' => $version_id,
			    'platform_id' => $release['platform_id'] ?? null,
			    'alias' => $release['alias'] ?? null,
			    'type' => $release['type'] ?? null,
			    'stage' => $release['stage'] ?? null,
			    'active' => false,
			    'release_id' => $version_meta['release_id'],
                'version_tag' => $version_meta['version_tag'] ?? '',
			    'time_created' => $version_meta['time_created'] ?? 0,
			];

			foreach ( $meta['release_mapping'] as $platform_id => $platform_data) {
			    foreach ( $platform_data as $alias => $mapping) {
			        if ( $mapping['type'] === IPlatformPublisher::MAPPING_TYPE_DEVELOP) {
			            continue;
			        }
			        $release             =   $this->getReleaseData( $user, $serviceId, $mapping['release_id']);

			        if ( $release['version_id'] !== $version_id) {
			            continue;
			        }

			        $this->_logger->debug( 'Found mapping in ['.$serviceId.']['.$platform_id.']['.$alias.']');

			        $row['platform_id']  =    $release['platform_id'];
			        $row['alias']        =    $release['alias'];
			        $row['type']         =    $release['type'];
			        $row['stage']        =    $release['stage'];
			        $row['active']       =    true;
			    }
			}

			$all[]       =   $row;
		}

		usort( $all, [get_class( $this), 'compareVersions']);
        return array_slice( $all, 0, 20);
	}

	public static function compareVersions( $a, $b) {
	    return strnatcmp( $a['version_id'], $b['version_id']) * -1;
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::createNewService()
	 */
	public function createNewService( \Convo\Core\IAdminUser $user, $serviceName, $workflowData)
	{
		$service_id                 =   $this->_generateIdFromName( $serviceName);

		// META
		$meta_data					=	$this->_getDefaultMeta( $user, $service_id, $serviceName);
		$meta_data['service_id']	=	$service_id;
		$meta_data['name']			=	$serviceName;
		$meta_data['owner']			=	$user->getEmail();
		$this->_saveServiceFile( $service_id, 'meta.json', $meta_data);

		// CONFIG
		$this->_saveServiceFile( $service_id, 'platform-config.json', []);

		// WORKFLOW
// 		$full_path						=	$this->_basePath.'/services/__new_service_template.json';
// 		$service_data					=   json_decode( file_get_contents( $full_path), true);
		$service_data					=   array_merge( IServiceDataProvider::DEFAULT_WORKFLOW, $workflowData);
		$service_data['name']   		=	$serviceName;
		$service_data['service_id']		=	$service_id;

		$service_data['time_updated']             =   time();
		$service_data['intents_time_updated']     =   time();

		$this->_saveServiceFile( $service_id, 'workflow.json', $service_data);

		return $service_id;
	}

	private function _generateIdFromName( $serviceName)
	{
	    $service_id   =   \Convo\Core\Util\StrUtil::slugify( $serviceName);

		try {
		    $this->getServiceData( new RestSystemUser(), $service_id, IPlatformPublisher::RELEASE_TYPE_DEVELOP);
		} catch ( \Convo\Core\DataItemNotFoundException $e) {
		    return $service_id;
		}

		$service_id   =   $service_id.'-'.sprintf( '%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));

		try {
		    $this->getServiceData( new RestSystemUser(), $service_id, IPlatformPublisher::RELEASE_TYPE_DEVELOP);
		} catch ( \Convo\Core\DataItemNotFoundException $e) {
		    return $service_id;
		}

		throw new \Exception( 'Failed to create unique service id for ['.$serviceName.']');
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::getServiceData()
	 */
	public function getServiceData( \Convo\Core\IAdminUser $user, $serviceId, $versionId)
	{
        $data = null;
	    if ( $versionId === IPlatformPublisher::RELEASE_TYPE_DEVELOP) {
			$data = $this->_loadServiceFile( $serviceId, 'workflow.json');
	    } else {
	        $data = $this->_loadServiceFile( $serviceId, 'workflow.json', $versionId);
	    }

	    if($data !== null) {
            $serviceMeta = $this->getServiceMeta( $user, $serviceId);
            if(!$this->_checkServiceOwner($user, $serviceMeta)) {
                $errorMessage = "User [" . $user->getEmail() . "] is not authorized to open the service [" . $serviceId ."]";
                throw new NotAuthorizedException($errorMessage);
            }
        }

		return array_merge( IServiceDataProvider::DEFAULT_WORKFLOW, $data);
	}

	public function getServiceMeta( \Convo\Core\IAdminUser $user, $serviceId, $versionId=null)
	{
		try {
		    $meta     =   $this->_loadServiceFile( $serviceId, 'meta.json', $versionId);
		    return array_merge( IServiceDataProvider::DEFAULT_META, $meta);
		} catch ( \Convo\Core\DataItemNotFoundException $e) {
		    $this->_logger->warning( $e->getMessage());
		}

		return $this->_getDefaultMeta( $user, $serviceId, ucwords( str_replace( '-', ' ', $serviceId)));
	}

	private function _getDefaultMeta( \Convo\Core\IAdminUser $user, $serviceId, $serviceName)
	{
	   return array_merge( IServiceDataProvider::DEFAULT_META,
	        [ 'owner' => $user->getEmail(), 'service_id' => $serviceId, 'name' => $serviceName,
	            'time_updated' => time(), 'time_created' => time()]);
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::saveServiceData()
	 */
	public function saveServiceData( \Convo\Core\IAdminUser $user, $serviceId, $data)
	{
	    $data['time_updated']   =   time();
		$this->_saveServiceFile( $serviceId, 'workflow.json', $data);
		return $data;
	}

	public function saveServiceMeta( \Convo\Core\IAdminUser $user, $serviceId, $meta, $versionId=null)
	{
	    $meta['time_updated']   =   time();
		$this->_saveServiceFile( $serviceId, 'meta.json', $meta, $versionId);
		return $meta;
	}

    public function deleteService( \Convo\Core\IAdminUser $user, $serviceId)
    {
        $service_meta = $this->getServiceMeta($user, $serviceId);

        $is_owner = $user->getEmail() === $service_meta['owner'];
        $is_admin = in_array($user->getEmail(), $service_meta['admins']);

        if (!($is_owner || $is_admin))
        {
            throw new \Exception('User ['.$user->getName().']['.$user->getEmail().'] is not allowed to delete skill ['.$serviceId.']');
        }

        $service_dir = $this->_basePath.'/services/'.$serviceId;

        $it = new \RecursiveDirectoryIterator($service_dir, \RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new \RecursiveIteratorIterator($it, \RecursiveIteratorIterator::CHILD_FIRST);

        foreach ($files as $file)
        {
            if ($file->isDir()) {
                rmdir($file->getRealPath());
            } else {
                unlink($file->getRealPath());
            }
        }

        rmdir($service_dir);
    }

	public function createServiceVersion(\Convo\Core\IAdminUser $user, $serviceId, $workflow, $config, $versionTag=null)
	{
	    $version_id	=	$this->_getNextServiceVersion( $serviceId);
	    $this->_logger->debug( 'Got new version ['.$version_id.'] for service ['.$serviceId.']');

	    if (!$versionTag) {
	        $versionTag = $version_id;
        }

	    $meta      =   [
	        'service_id' => $serviceId,
	        'version_id' => $version_id,
            'version_tag' => $versionTag,
	        'release_id' => null,
	        'time_updated' => time(),
	        'time_created' => time(),
	    ];

	    $this->_saveServiceFile( $serviceId, 'workflow.json', $workflow, $version_id);
	    $this->_saveServiceFile( $serviceId, 'platform-config.json', $config, $version_id);
	    $this->_saveServiceFile( $serviceId, 'meta.json', $meta, $version_id);

	    return $version_id;
	}


	private function _getNextServiceVersion( $serviceId) {
		$base	=	$this->_basePath.'/services/'.$serviceId.'/versions/';

		if ( !is_dir( $base)) {
			$this->_logger->debug( 'No versions so far. Returning [1]');
			return sprintf('%08d', 1);
		}

		$dirs		=	array_filter( glob( $base.'*'), 'is_dir');

		$this->_logger->debug( 'Found ['.count( $dirs).']');

		$max	=	0;
		foreach ( $dirs as $filename)
		{
			$version_id	=	intval( basename( $filename));
			$this->_logger->debug( 'version check ['.$version_id.']['.basename( $filename).']');
			if ( $version_id > $max) {
				$max	=	$version_id;
			}
		}

		$max++;
		$this->_logger->debug( 'New max ['.$max.']');
		return sprintf('%08d', $max);
	}


	private function _getNextReleseId( $serviceId) {
		$base	=	$this->_basePath.'/services/'.$serviceId.'/releases/';

		if ( !is_dir( $base)) {
			$this->_logger->debug( 'No releases so far. Returning [1]');
			return sprintf('%08d', 1);
		}

		$dirs		=	array_filter( glob( $base.'*'), 'is_file');

		$this->_logger->debug( 'Found ['.count( $dirs).']');

		$max	=	0;
		foreach ( $dirs as $filename)
		{
		    $version_id	=	intval( str_replace( '.json', '', basename( $filename)));
			$this->_logger->debug( 'version check ['.$version_id.']['.basename( $filename).']');
			if ( $version_id > $max) {
				$max	=	$version_id;
			}
		}

		$max++;
		$this->_logger->debug( 'New max ['.$max.']');
		return sprintf('%08d', $max);
	}


	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::getServicePlatformConfig()
	 */
	public function getServicePlatformConfig( \Convo\Core\IAdminUser $user, $serviceId, $versionId)
	{
	    try {
	        if ( $versionId === IPlatformPublisher::RELEASE_TYPE_DEVELOP) {
	            return $this->_loadServiceFile( $serviceId, 'platform-config.json');
	        }
	    } catch ( \Convo\Core\DataItemNotFoundException $e) {
	        return [];
	    }

		return $this->_loadServiceFile( $serviceId, 'platform-config.json', $versionId);
	}

	/**
	 * {@inheritDoc}
	 * @see \Convo\Core\IServiceDataProvider::updateServicePlatformConfig()
	 */
	public function updateServicePlatformConfig( \Convo\Core\IAdminUser $user, $serviceId, $config)
	{
		$this->_saveServiceFile( $serviceId, 'platform-config.json', $config);
	}

	// LOAD & SAVE
	private function _saveServiceFile( $serviceId, $file, $data, $versionId=null)
	{
		if ( $versionId && $versionId !== 'develop') {
			$service_folder	=	$this->_basePath.'/services/'.$serviceId.'/versions/'.$versionId;
		} else {
			$service_folder	=	$this->_basePath.'/services/'.$serviceId;
		}

		// SERVICE FOLER
		if ( !is_dir( $service_folder)) {
			mkdir( $service_folder, 0777, true);
			if ( !is_dir( $service_folder)) {
				throw new \Exception( 'Failed to create service folder ['.$service_folder.']');
			}
		}

		$full_path	=	$service_folder.'/'.$file;

		$this->_logger->debug( 'Saving service ['.$serviceId.']['.$file.'] to ['.$full_path.']');

		$ret	=	file_put_contents( $full_path, json_encode( $data, JSON_PRETTY_PRINT));
		if ( $ret === false) {
			throw new \Exception( 'Could not save service ['.$serviceId.']['.$file.'] to ['.$full_path.']');
		}
	}

	private function _loadServiceFile( $serviceId, $file, $versionId=null)
	{
		if ( $versionId && $versionId !== 'develop') {
			$full_path	=	$this->_basePath.'/services/'.$serviceId.'/versions/'.$versionId.'/'.$file;
		} else {
			$full_path	=	$this->_basePath.'/services/'.$serviceId.'/'.$file;
		}

		$this->_logger->debug( 'Trying to load service data from ['.$full_path.']');

		if ( !is_file( $full_path)) {
			throw new \Convo\Core\DataItemNotFoundException( 'Service data not found at ['.$full_path.']');
		}

		$data	=	json_decode( file_get_contents( $full_path), true);
		if ( $data === false) {
			throw new \Exception( 'Invalid service ['.$serviceId.']['.$file.']. Reason ['.json_last_error().']['.json_last_error_msg().']');
		}

		return $data;
	}

	// RELEASES
	public function createRelease( IAdminUser $user, $serviceId, $platformId, $type, $stage, $alias, $versionId)
	{
	    $service_folder	=	$this->_basePath.'/services/'.$serviceId.'/releases';

	    // SERVICE FOLER
	    if ( !is_dir( $service_folder)) {
	        mkdir( $service_folder, 0777, true);
	        if ( !is_dir( $service_folder)) {
	            throw new \Exception( 'Failed to create service releases folder ['.$service_folder.']');
	        }
	    }

	    $release_id    =   $this->_getNextReleseId( $serviceId);
	    $full_path	   =   $service_folder.'/'.$release_id.'.json';

	    $this->_logger->debug( 'Saving service ['.$serviceId.'] release ['.$release_id.'] to ['.$full_path.']');

	    $data      =   array_merge( IServiceDataProvider::DEFAULT_RELEASE, [
	        'service_id' => $serviceId,
	        'release_id' => $release_id,
	        'version_id' => $versionId,
	        'platform_id' => $platformId,
	        'type' => $type,
	        'stage' => $stage,
	        'alias' => $alias,
	        'time_created' => time(),
	        'time_updated' => time()
	    ]);

	    $ret	=	file_put_contents( $full_path, json_encode( $data, JSON_PRETTY_PRINT));
	    if ( $ret === false) {
	        throw new \Exception( 'Could not save service release ['.$serviceId.'] release ['.$release_id.'] to ['.$full_path.']');
	    }

	    return $release_id;
	}

	public function updateReleaseData( \Convo\Core\IAdminUser $user, $serviceId, $releaseId, $data)
	{
	    $service_folder	=	$this->_basePath.'/services/'.$serviceId.'/releases';
	    $full_path	    =   $service_folder.'/'.$releaseId.'.json';

	    $release        =   $this->getReleaseData( $user, $serviceId, $releaseId);
	    $release        =   array_merge( $release, $data, [ 'time_updated' => time() ]);

	    $ret	=	file_put_contents( $full_path, json_encode( $release, JSON_PRETTY_PRINT));
	    if ( $ret === false) {
	        throw new \Exception( 'Could not save service release ['.$serviceId.'] release ['.$releaseId.'] to ['.$full_path.']');
	    }

	    return $this->getReleaseData( $user, $serviceId, $releaseId);
	}

	public function getReleaseData( IAdminUser $user, $serviceId, $releaseId)
	{
	    $full_path	=	$this->_basePath.'/services/'.$serviceId.'/releases/'.$releaseId.'.json';

	    $this->_logger->debug( 'Trying to load service ['.$serviceId.']['.$releaseId.'] release data from ['.$full_path.']');

	    if ( !is_file( $full_path)) {
	        throw new \Convo\Core\DataItemNotFoundException( 'Service release data not found at ['.$full_path.']');
	    }

	    $data	=	json_decode( file_get_contents( $full_path), true);
	    if ( $data === false) {
	        throw new \Exception( 'Invalid service ['.$serviceId.'] release ['.$releaseId.']. Reason ['.json_last_error().']['.json_last_error_msg().']');
	    }

	    return $data;

	}

	// UTIL
	public function __toString()
	{
		return get_class( $this).'[]';
	}


}
