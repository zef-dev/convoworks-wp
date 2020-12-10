<?php declare(strict_types=1);

namespace ConvoPlugin\Convo;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\IAdminUser;
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
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @throws NotAuthorizedException
	 * @return array
	 */
	public function getServiceData($user, $serviceId, $versionId);

	/**
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @return array
	 */
	public function getServiceMeta( $user, $serviceId, $versionId=null);

	/**
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param array $meta
	 * @param string $versionId
	 * @throws DataItemNotFoundException
	 * @return array
	 */
	public function saveServiceMeta( iAdminUser $user, $serviceId, $meta, $versionId=null);

	/**
	 * @param iAdminUser $user
	 * @return array
	 */
	public function getAllServices( iAdminUser $user);

	/**
	 * @param AdminUser $user
	 * @param string $serviceId
	 * @return array
	 */
	public function getAllServiceVersions( iAdminUser $user, $serviceId);

	/**
	 * @param iAdminUser $user
	 * @param string $serviceName
	 * @param $defaultLanguage
	 * @param $isPrivate
	 * @param $serviceAdmins
	 * @param array $workflowData
	 *
	 * @return string new service_id
	 */
	public function createNewService( iAdminUser $user, $serviceName, $defaultLanguage, $isPrivate, $serviceAdmins, $workflowData);


	/**
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param array $data
	 * @return array
	 */
	public function saveServiceData( iAdminUser $user, $serviceId, $data);


	public function createRelease( iAdminUser $user, $serviceId, $platformId, $type, $stage, $alias, $versionId);


	public function getReleaseData( iAdminUser $user, $serviceId, $releaseId);


	public function createServiceVersion( iAdminUser $user, $serviceId, $workflow, $config, $versionTag=null);


	public function updateReleaseData( iAdminUser $user, $serviceId, $releaseId, $data);


	/**
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param string $versionId
	 *
	 * @return array
	 */
	public function getServicePlatformConfig( iAdminUser $user, $serviceId, $versionId);

	/**
	 * @param iAdminUser $user
	 * @param string $serviceId
	 * @param array $config
	 */
	public function updateServicePlatformConfig( iAdminUser $user, $serviceId, $config);
}
