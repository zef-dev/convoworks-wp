<?php

declare(strict_types=1);

namespace Convo\Core\Publish;

interface IPlatformPublisher
{
    public const RELEASE_TYPE_DEVELOP = 'develop';
    public const RELEASE_TYPE_TEST = 'test';
    public const RELEASE_TYPE_PRODUCTION = 'production';

    public const RELEASE_STAGE_ALPHA = 'alpha';
    public const RELEASE_STAGE_BETA = 'beta';
    public const RELEASE_STAGE_REVIEW = 'review';
    public const RELEASE_STAGE_RELEASE = 'release';

    public const MAPPING_TYPE_DEVELOP = 'develop';
    public const MAPPING_TYPE_RELEASE = 'release';

    public const DEFAULT_PROPAGATE_INFO = [
        'allowed' => false,
        'available' => false
    ];

    public const SERVICE_PROPAGATION_STATUS_IN_PROGRESS = 'SERVICE_PROPAGATION_STATUS_IN_PROGRESS';
    public const SERVICE_PROPAGATION_STATUS_FINISHED = 'SERVICE_PROPAGATION_STATUS_FINISHED';
    public const SERVICE_PROPAGATION_STATUS_MISSING_INTERACTION_MODEL = 'SERVICE_PROPAGATION_STATUS_MISSING_INTERACTION_MODEL';

    /**
     * @return string
     */
    public function getPlatformId();

    /**
     * Propagates changes to development environment. E.g update development Alexa skill data (webhook, conversation model)
     */
    public function propagate();

    /**
     * Gets current propagation availability info
     * @return array
     */
    public function getPropagateInfo();

    /**
     * First time initialization
     */
    public function enable();

    /**
     * @return \Convo\Core\Util\IFileResource
     */
    public function export();

    public function delete(array &$report);

    /**
     * @return array
     */
    public function getStatus();

    // 	public function createRelease( $platformId, $alias, $targerReleaseType, $versionId=null, $targerReleaseStage=null);

    // 	public function promoteToRelease( $targerReleaseType, $versionId, $targerReleaseStage=null);

    public function createRelease($platformId, $targetReleaseType, $targetReleaseStage, $alias, $versionId = null);

    public function createVersionTag($platformId, $versionTagId = null);

    public function promoteToRelease($targetReleaseType, $targetReleaseStage, $alias, $versionId = null);

    public function importToRelease($platformId, $targetReleaseType, $targetReleaseStage, $alias, $versionId = null, $nextVersionId = null);

    public function importToDevelop($platformId, $fromAlias, $toAlias, $versionId = null, $versionTag = null);
}
