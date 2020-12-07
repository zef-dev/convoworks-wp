<?php declare(strict_types=1);

namespace ConvoPlugin\Convo;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Rest\NotAuthorizedException;
use ConvoPlugin\Convo\Wp\AdminUser;

interface IServiceDataProvider
{

    const DEFAULT_WORKFLOW	=	[
        'service_id' => null,
        'convo_service_version' => \Convo\Core\Factory\ConvoServiceFactory::SERVICE_VERSION,
        'packages' => ['convo-core'],
        'contexts' => [],
        'variables' => [],
        'preview_variables' => [],
        'entities' => [],
        'intents' => [],
        'blocks' => [],
        'fragments' => [],
        'time_updated' => 0,
        'intents_time_updated' => 0,
    ];

    const DEFAULT_META	=	[
        'service_id' => null,
        'name' => null,
        'description' => null,
        'active' => 0,
        'owner' => null,
        'admins' => [],
        'release_mapping' => [],
        'time_updated' => 0,
    ];

    const DEFAULT_RELEASE	=	[
        'service_id' => null,
        'release_id' => null,
        'platform_id' => null,
        'version_id' => null,
        'type' => null,
        'stage' => null,
        'alias' => null,
        'time_created' => 0,
        'time_updated' => 0,
    ];

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @throws NotAuthorizedException
	 * @return array
	 */
	public function getServiceData($user, $serviceId, $versionId);

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @return array
	 */
	public function getServiceMeta( $user, $serviceId, $versionId=null);

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param array $meta
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @return array
	 */
	public function saveServiceMeta( AdminUser $user, $serviceId, $meta, $versionId=null);

	/**
	 * @param AdminUser $user
	 * @return array
	 */
	public function getAllServices( AdminUser $user);

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @return array
	 */
	public function getAllServiceVersions( AdminUser $user, $serviceId);

	/**
	 * @param AdminUser $user
	 * @param string $serviceName
	 * @param $defaultLanguage
	 * @param $isPrivate
	 * @param $serviceAdmins
	 * @param array $workflowData
	 *
	 * @return string new service_id
	 */
	public function createNewService( AdminUser $user, $serviceName, $defaultLanguage, $isPrivate, $serviceAdmins, $workflowData);


	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param array $data
	 * @return array
	 */
	public function saveServiceData( AdminUser $user, $serviceId, $data);


	public function createRelease( AdminUser $user, $serviceId, $platformId, $type, $stage, $alias, $versionId);


	public function getReleaseData( AdminUser $user, $serviceId, $releaseId);


	public function createServiceVersion( AdminUser $user, $serviceId, $workflow, $config, $versionTag=null);


	public function updateReleaseData( AdminUser $user, $serviceId, $releaseId, $data);


	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 * @return array
	 */
	public function getServicePlatformConfig( AdminUser $user, $serviceId, $versionId);

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @param array $config
	 */
	public function updateServicePlatformConfig( AdminUser $user, $serviceId, $config);
}
