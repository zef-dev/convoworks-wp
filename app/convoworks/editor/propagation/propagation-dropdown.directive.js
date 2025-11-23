import template from './propagation-dropdown.tmpl.html';

/* @ngInject */
export default function propagationDropdown( $log, $state, $timeout, $q,
    ConvoworksApi, AlertService, UserPreferencesService, PlatformStatusService, NotificationsService, SystemPlatformsService)
{
    return {
        restrict: 'E',
        scope: { serviceId: '=' },
        require: '^serviceContext',
        template,
        link: function($scope, $element, $attributes, serviceContext)
        {
            $log.log('propagationDropdown linked ' + $scope.serviceId);

            const TIMEOUT_LENGTH = 2000;
            let auto_propagate_timeout = null;
            let platformAvailabilities = {};

            $scope.propagating = false;
            $scope.platformStatus = new Map();

            $scope.owner = '';

            $scope.autoPropagateEnabled = UserPreferencesService.get('autoPropagate', true);

            $scope.enabledPlatforms = [];

            let platform_config_info = {};
            let platforms = [];
            let system_platforms = [];

            $scope.$watch(serviceContext.isLoaded, function(val) {
                if (val) {
                    _load();
                }
            });

            $scope.$on('ServiceConfigUpdated', function(evt, data) {
                $log.log('ServiceConfigUpdated in convowork-editor.controller.js', data);

                const platformData = data.platform_config;
                const platformId = data.platform_id;

                if (platformData.time_created === platformData.time_updated) {
                    AlertService.addInfo(`Going to check build status of ${_fixPlatformId(platformId)}.`);
                    PlatformStatusService.checkStatus($scope.serviceId, platformId);
                }

                const doAutoPropagate = platformData.time_created < platformData.time_updated;
                if (doAutoPropagate) {
                    $log.log('doing auto propagate in convoworks-editor.controller.js');
                }

                _load(doAutoPropagate);
            });

            $scope.$on('ServiceWorkflowUpdated', () => _load(true));
            $scope.$on('ServiceReleasesUpdated', () => _load(true));
            $scope.$on('ServiceMetaUpdated', () => _load(true));

            function _handleBuildFinished(data) {
                const platformName = _fixPlatformId(data.platformName);
                AlertService.addSuccess(`${platformName} finished building.`);
                NotificationsService.addSuccess('Build finished', `${platformName} finished building.`);

                if (data.platformName === 'amazon') {
                    ConvoworksApi.enableAlexaSkillForTest($scope.owner, $scope.serviceId)
                        .then(function(response) {
                            if (response.can_be_enabled_for_testing) {
                                AlertService.addSuccess(`${platformName} is enabled for testing.`);
                                NotificationsService.addInfo('Enabled for testing', `${platformName} is enabled for testing.`);
                            }
                        })
                        .catch(function(reason) {
                            $log.log('convoworks-editor PlatformStatusUpdated enableAlexaSkillForTest', reason);
                        });
                }

                if (auto_propagate_timeout !== null) {
                    _autoPropagate();
                }
            }

            function _handleMissingInteractionModel(data) {
                const platformName = _fixPlatformId(data.platformName);
                AlertService.addWarning(`The interaction model for ${platformName} could not be created.`);
                NotificationsService.addWarning('Interaction model missing', `Propagation for ${platformName} failed, the interaction model is missing.`);
            }

            $scope.$on('PlatformStatusUpdated', function(evt, data) {
                $log.log('PlatformStatusUpdated', data);
                $scope.platformStatus.set(data.platformName, data);

                if (data.errorMessage) {
                    AlertService.addDanger(data.errorMessage);
                    NotificationsService.addDanger('Platform status failure', data.errorMessage);
                    return;
                }

                if (data.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_FINISHED) {
                    _handleBuildFinished(data);
                } else if (data.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_MISSING_INTERACTION_MODEL) {
                    _handleMissingInteractionModel(data);
                }
            });

            $scope.$on('$destroy', function() {
                $log.log('convoworks-editor $destroy');
                PlatformStatusService.cancelAllPolls();
                _cancelAutoPropagateTimeout();
            });

            $scope.toggleAutoPropagate = function() {
                $scope.autoPropagateEnabled = !$scope.autoPropagateEnabled;
                UserPreferencesService.registerData('autoPropagate', $scope.autoPropagateEnabled);
            };

            $scope.isPlatformPropagateAvailable = function(platformId) {
                if (!platformAvailabilities[platformId]) {
                    return false;
                }
                return platformAvailabilities[platformId].available;
            };

            $scope.getPropagationText = function() {
                if ($scope.enabledPlatforms.length === 0) {
                    return 'No platforms';
                }
                return $scope.propagating ? 'Propagating...' : 'Propagate to all';
            };

            $scope.getPropagationIconClass = function() {
                if ($scope.enabledPlatforms.length === 0) {
                    return 'fa fa-ban';
                }
                return $scope.propagating ? 'fa fa-cog spinning' : 'fa fa-play';
            };

            function _propagateSinglePlatform(platformId) {
                return ConvoworksApi.propagateServicePlatform($scope.serviceId, platformId)
                    .then(function(data) {
                        $log.log('propagationDropdown propagatePlatformChanges() propagating to', data);
                        _handlePropagationSuccess(platformId, data);
                        return data;
                    })
                    .catch(function(reason) {
                        $log.log('propagationDropdown propagatePlatformChanges() reason', reason);
                        _notifyPropagationError(platformId, reason);
                        throw reason;
                    });
            }

            $scope.propagatePlatformChanges = function(platformId) {
                $log.log('propagationDropdown propagatePlatformChanges() platformId', platformId);

                $scope.propagating = true;

                if (platformId === 'all') {
                    // Only propagate to enabled platforms that require publish and are available
                    const availablePlatforms = $scope.enabledPlatforms
                        .filter(platform => {
                            const availability = platformAvailabilities[platform.platform_id];
                            return availability && availability.allowed && availability.available;
                        })
                        .map(platform => platform.platform_id);

                    const promises = availablePlatforms.map(id => _propagateSinglePlatform(id));

                    $q.all(promises)
                        .then(function(data) {
                            $log.log('propagationDropdown propagatePlatformChanges() all done', data);
                        })
                        .catch(function(reason) {
                            $log.log('propagationDropdown propagatePlatformChanges() all rejected, reason', reason);
                        })
                        .finally(function() {
                            $log.log('propagationDropdown propagatePlatformChanges() all finally');
                            $scope.propagating = false;
                        });
                } else {
                    _propagateSinglePlatform(platformId)
                        .finally(function() {
                            $log.log('propagationDropdown propagatePlatformChanges finally');
                            $scope.propagating = false;
                        });
                }
            }

            $scope.getPropagationStatusText = function(platformId) {
                if ($scope.enabledPlatforms.length === 0) {
                    return '';
                }

                if ($scope.platformStatus.has(platformId)) {
                    const status = $scope.platformStatus.get(platformId);
                    if (status.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_FINISHED) {
                        return '';
                    } else if (status.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_IN_PROGRESS) {
                        return `Building ${_fixPlatformId(status.platformName)}...`;
                    }
                }

                return '';
            };

            $scope.getPropagationStatusIconClass = function() {
                if ($scope.enabledPlatforms.length === 0) {
                    return '';
                }

                const hasCheckingStatus = $scope.enabledPlatforms.some(platform =>
                    $scope.platformStatus.has(platform.platform_id) &&
                    $scope.platformStatus.get(platform.platform_id).checkingServiceStatus
                );

                return hasCheckingStatus ? 'fa fa-cog spinning' : '';
            };

            function _fixPlatformId(platform) {
                return platform.charAt(0).toUpperCase() + platform.slice(1);
            }

            function _notifyPropagationSuccess(platformId) {
                const platformName = _fixPlatformId(platformId);
                AlertService.addSuccess(`Service propagation to ${platformName} was successful.`);
                NotificationsService.addSuccess('Propagation successful', `Service propagation to ${platformName} was successful.`);
            }

            function _notifyPropagationError(platformId, reason) {
                const platformName = _fixPlatformId(platformId);
                const message = (reason.data && reason.data.message) || 'Unknown error';
                const details = (reason.data && reason.data.details) || '';
                AlertService.addDanger(`${platformName} propagation error: ${message}. Error details: ${details}`);
                NotificationsService.addDanger(`${platformName}: ${message}`, details);
            }

            function _handlePropagationSuccess(platformId, data) {
                platformAvailabilities[platformId] = data;
                _notifyPropagationSuccess(platformId);
                AlertService.addInfo(`Going to check build status of ${_fixPlatformId(platformId)}.`);
                PlatformStatusService.checkStatus($scope.serviceId, platformId);
            }

            function _load(doAutoPropagate = false) {
                _initPlatforms();

                _loadConfigs().then(function() {
                    _initEnabledPlatforms();
                    _checkPropagationStatus()
                        .then(function() {
                            $log.log('propagationDropdown _load() ConvoworksApi.getPropagateInfo all done', platformAvailabilities);
                            if (doAutoPropagate) {
                                $log.log('propagationDropdown _load() doing auto propagate');
                                _autoPropagate();
                            }
                        })
                        .catch(function(reason) {
                            $log.log('propagationDropdown _load() ConvoworksApi.getPropagateInfo all rejected, reason', reason);
                        })
                        .finally(function() {
                            $log.log('propagationDropdown _load() ConvoworksApi.getPropagateInfo all finally');
                        });
                });
            }

            function _initPlatforms() {
                platforms = [];
                const definitions = serviceContext.getComponentDefinitions();
                $log.log('propagationDropdown definitions', definitions);

                definitions.forEach(function(definition) {
                    if ('platforms' in definition) {
                        Object.keys(definition.platforms).forEach(function(platform_id) {
                            platforms.push({ ...definition.platforms[platform_id], platform_id: platform_id });
                        });
                    }
                });

                system_platforms = SystemPlatformsService.getSystemPlatforms();
            }

            function _initEnabledPlatforms() {
                $log.log('propagationDropdown _initEnabledPlatforms() platforms', platforms);
                $scope.enabledPlatforms = system_platforms.concat(platforms).filter(function(platform) {
                    return platform.requires_publish === true && platform.platform_id in platform_config_info;
                });
            }

            function _loadConfigs() {
                platform_config_info = {};

                const configPromise = ConvoworksApi.loadPlatformConfig($scope.serviceId)
                    .then(function(config) {
                        $log.log('propagationDropdown got config', config);
                        platform_config_info = Object.keys(config).reduce(function(acc, key) {
                            acc[key] = true;
                            return acc;
                        }, {});
                    })
                    .catch(function(reason) {
                        NotificationsService.addDanger('Error fetching platform config', _extractErrorDetails(reason));
                    });

                const metaPromise = ConvoworksApi.getServiceMeta($scope.serviceId)
                    .then(function(serviceMeta) {
                        $log.log('propagationDropdown got meta', serviceMeta);
                        $scope.owner = serviceMeta.owner;
                    });

                return $q.all([configPromise, metaPromise]).then(function(results) {
                    $log.log('propagationDropdown final platform_config_info', platform_config_info);
                    return results;
                });
            }

            function _checkPropagationStatus() {
                platformAvailabilities = {};

                const promises = $scope.enabledPlatforms.map(platform =>
                    ConvoworksApi.getPropagateInfo($scope.serviceId, platform.platform_id)
                        .then(function(data) {
                            platformAvailabilities[platform.platform_id] = data;
                        })
                        .catch(function(reason) {
                            NotificationsService.addDanger(platform.name + ' propagation error', _extractErrorDetails(reason));
                        })
                );

                return $q.all(promises);
            }

            function _autoPropagate() {
                if ($scope.autoPropagateEnabled && $scope.enabledPlatforms.length > 0) {
                    _cancelAutoPropagateTimeout();
                    auto_propagate_timeout = $timeout(function() {
                        $scope.propagatePlatformChanges('all');
                    }, TIMEOUT_LENGTH);
                }
            }

            function _cancelAutoPropagateTimeout() {
                $log.debug('testViewNlp _cancelPoll() auto_propagate_polls', auto_propagate_timeout);
                $timeout.cancel(auto_propagate_timeout);
                auto_propagate_timeout = null;
            }

            function _extractErrorDetails(error) {
                if (!error) {
                    return 'An unknown error occurred';
                }

                if (typeof error === 'string') {
                    return error;
                }

                const errorProps = ['errorMessage', 'message', 'errorMsg', 'errMsg'];
                for (const prop of errorProps) {
                    if (error.hasOwnProperty(prop)) {
                        return error[prop];
                    }

                    if (error.data && error.data[prop]) {
                        return error.data[prop];
                    }
                }

                return 'An unknown error occurred';
            }
        }
    }
}
