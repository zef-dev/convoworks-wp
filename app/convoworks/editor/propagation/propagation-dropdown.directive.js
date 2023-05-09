import template from './propagation-dropdown.tmpl.html';

/* @ngInject */
export default function propagationDropdown( $log, $state, $timeout, $q, 
    ConvoworksApi, AlertService, UserPreferencesService, PlatformStatusService, NotificationsService)
{
    return {
        restrict: 'E',
        scope: { serviceId: '=' },
        require: '^propertiesContext',
        template,
        link: function($scope, $element, $attributes, propertiesContext)
        {
            $log.log('propagationDropdown linked ' + $scope.serviceId);
            
            const TIMEOUT_LENGTH = 2000;
            let auto_propagate_timeout = null;
            let platform_config_info = {}
            
            $scope.platformAvailabilities = {};
    
            $scope.propagating = false;
            $scope.platformStatus = new Map();
    
            $scope.owner = '';
    
            $scope.autoPropagateEnabled      =   UserPreferencesService.get( 'autoPropagate', true);
    
            $scope.enabledPlatforms = [];

            var platforms = [];
            var system_platforms = [];
            
            $scope.$watch( propertiesContext.isLoaded, function( val) 
            {
                if ( val) 
                {
                    platforms = [];
                    var definitions = propertiesContext.getComponentDefinitions();
                    $log.log( 'propagationDropdown definitions', definitions);
                    
                    for ( var i=0; i<definitions.length; i++) 
                    {
                        var definition = definitions[i];
                        if ( 'platforms' in definition) {
                            for ( var platform_id in definition['platforms']) {
                                var platform = definition['platforms'][platform_id];
                                platforms[platforms.length] = {
                                    platform_id : platform_id,
                                    name : platform.name
                                };
                            }
                        }
                    }
                    
                    system_platforms = getSystemPlatforms();
                    
                    _loadConfigs().then( _load);
                }
            });
            
    
            $scope.toggleAutoPropagate       =   function() {
                $scope.autoPropagateEnabled = !$scope.autoPropagateEnabled;
                UserPreferencesService.registerData( 'autoPropagate', $scope.autoPropagateEnabled)
            }
    
            $scope.$on( 'ServiceConfigUpdated', function ( evt, data) {
                $log.log('ServiceConfigUpdated in convowork-editor.controller.js', data);
    
                const platformData = data.platform_config;
                const platformId = data.platform_id;
    
                if (platformData.time_created === platformData.time_updated) {
                    AlertService.addInfo(`Going to check build status of ${_fixPlatformId(platformId)}.`);
                    PlatformStatusService.checkStatus($scope.serviceId, platformId);
                }
    
                let doAutoPropagate = false;
                if (platformData.time_created < platformData.time_updated) {
                    $log.log('doing auto propagate in convoworks-editor.controller.js');
                    doAutoPropagate = true;
                }
    
                _load(doAutoPropagate);
                _resetSelectedNlp(platformData);
            });
    
            $scope.$on( 'ServiceWorkflowUpdated', function ( evt, data) {
                _load(true);
            });
    
            $scope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
                _load(true);
            });
            
            $scope.$on( 'ServiceMetaUpdated', function ( evt, data) {
                _load(true);
            });
    
            $scope.$on( 'PlatformStatusUpdated', function ( evt, data) {
                $log.log('PlatformStatusUpdated', data);
                $scope.platformStatus.set(data.platformName, data);
                if (data.errorMessage) {
                    AlertService.addDanger(data.errorMessage);
                    NotificationsService.addDanger('Platform status failure', data.errorMessage);
    
                } else {
                    if (data.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_FINISHED) {
                        AlertService.addSuccess(`${_fixPlatformId(data.platformName)} finished building.`);
                        NotificationsService.addSuccess('Build finished', `${_fixPlatformId(data.platformName)} finished building.`);
    
                        if (data.platformName === 'amazon') {
                           ConvoworksApi.enableAlexaSkillForTest($scope.owner, $scope.serviceId).then( function ( response) {
                               if (response.can_be_enabled_for_testing) {
                                   AlertService.addSuccess(`${_fixPlatformId(data.platformName)} is enabled for testing.`);
                                   NotificationsService.addInfo('Enabled for testing', `${_fixPlatformId(data.platformName)} is enabled for testing.`);
                               }
                            }, function ( reason) {
                               $log.log( 'convoworks-editor PlatformStatusUpdated enableAlexaSkillForTest', reason);
                            });
                        }
                        if (auto_propagate_timeout !== null) {
                            _autoPropagate();
                        }
                    } else if (data.status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_MISSING_INTERACTION_MODEL) {
                        AlertService.addWarning(`The interaction model for ${_fixPlatformId(data.platformName)} could not be created.`);
                        NotificationsService.addWarning('Interaction model missing', `Propagation for ${_fixPlatformId(data.platformName)} failed, the interaction model is missing.`)
                    }
                }
            });
            
            $scope.$on( '$destroy', function() {
                $log.log( 'convoworks-editor $destroy');
                PlatformStatusService.cancelAllPolls();
                _cancelAutoPropagateTimeout();
            });
            
            $scope.getExternalPlatforms       =   function() {
                return platforms;
            }
    
            $scope.isPlatformPropagateAvailable       =   function( platformId) {
                if ( !$scope.platformAvailabilities[platformId]) {
                    return false;
                }
                return $scope.platformAvailabilities[platformId]['available'];
            }
    
            $scope.getPropagationText = function()
            {
                if ($scope.enabledPlatforms.length === 0)
                {
                    return 'No platforms';
                }
    
                return $scope.propagating? 'Propagating...' : 'Propagate to all';
            }
    
            $scope.getPropagationIconClass = function()
            {
                if ($scope.enabledPlatforms.length === 0)
                {
                    return 'fa fa-minus-sign';
                }
    
                return $scope.propagating ? 'fa fa-cog spinning' : 'fa fa-play';
            }
    
            $scope.propagatePlatformChanges = function(platformId) {
                $log.log( 'propagationDropdown propagatePlatformChanges() platformId', platformId);
    
                if (platformId === 'all')
                {
                    $scope.propagating = true;
    
                    const promises = [];
                    const availablePlatforms = Object.keys($scope.platformAvailabilities).filter(availablePlatform => $scope.platformAvailabilities[availablePlatform].allowed && $scope.platformAvailabilities[availablePlatform].available);
    
                    for (const availablePlatformId of availablePlatforms)
                    {
                        promises.push(
                            ConvoworksApi.propagateServicePlatform($scope.serviceId, availablePlatformId).then(
                                function(data) {
                                    $log.log( 'propagationDropdown propagatePlatformChanges() propagating to ', data);
                                    $scope.platformAvailabilities[availablePlatformId] = data;
                                    AlertService.addSuccess(`Service propagation to ${_fixPlatformId(availablePlatformId)} was successful.`);
                                    NotificationsService.addSuccess('Propagation successful', `Service propagation to ${_fixPlatformId(availablePlatformId)} was successful.`);
                                    AlertService.addInfo(`Going to check build status of ${_fixPlatformId(availablePlatformId)}.`);
                                    PlatformStatusService.checkStatus($scope.serviceId, availablePlatformId);
                                }, function (reason) {
                                    AlertService.addDanger(`${_fixPlatformId(availablePlatformId)} propagation error: ${reason.data.message}. Error details: ${reason.data.details}`)
                                    NotificationsService.addDanger(`${_fixPlatformId(availablePlatformId)}: ${reason.data.message}`, reason.data.details);
                                }
                            )
                        );
                    }
    
                    $q.all(promises).then(function(data) {
                        $log.log('propagationDropdown propagatePlatformChanges() all done', data);
                        $scope.propagating = false;
                    }, function (reason) {
                        $log.log('propagationDropdown propagatePlatformChanges() all rejected, reason', reason);
                        $scope.propagating = false;
                    }, function() {
                        $log.log('propagationDropdown propagatePlatformChanges() all finally');
                        $scope.propagating = false;
                    })
                }
                else
                {
                    $scope.propagating = true;
    
                    ConvoworksApi.propagateServicePlatform($scope.serviceId, platformId).then(function (data) {
                        $scope.platformAvailabilities[platformId] = data;
                        
                        AlertService.addSuccess(`Service propagation to ${_fixPlatformId(platformId)} done.`);
                        NotificationsService.addSuccess('Propagation done', `Service propagation to ${_fixPlatformId(platformId)} done.`);
                        
                        $scope.propagating = false;
                        
                        AlertService.addInfo(`Going to check build status of ${_fixPlatformId(platformId)}.`);
                        PlatformStatusService.checkStatus($scope.serviceId, platformId);
                    }, function(reason) {
                        $log.log('propagationDropdown propagatePlatformChanges() reason', reason);
                       
                        AlertService.addDanger(`${_fixPlatformId(platformId)} propagation error: ${reason.data.message}. Error details: ${reason.data.details}`);
                        NotificationsService.addDanger(`${_fixPlatformId(platformId)} propagation error`, `Propagation error: ${reason.data.message}. Error details: ${reason.data.details}`);
                       
                        $scope.propagating = false;
                    }, function () {
                        $log.log('propagationDropdown propagatePlatformChanges finally');
                        $scope.propagating = false;
                    });
                }
            }
    
            $scope.getPropagationStatusText = function(platformId)
            {
                let text = '';
                if ($scope.enabledPlatforms.length === 0)
                {
                    return text;
                }
    
                // $log.log('getPropagationStatusText()', $scope.platformStatus)
    
                if ($scope.platformStatus.has(platformId)) {
                    if ($scope.platformStatus.get(platformId).status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_FINISHED) {
                        text = '';
                    } else if ($scope.platformStatus.get(platformId).status === PlatformStatusService.SERVICE_PROPAGATION_STATUS_IN_PROGRESS) {
                        text = 'Building ' + _fixPlatformId($scope.platformStatus.get(platformId).platformName) + '...';
                    }
                }
    
                return text;
            }
    
            $scope.getPropagationStatusIconClass = function()
            {
                let checkCount = 0;
                const allowedPlatforms = $scope.enabledPlatforms;
                if (allowedPlatforms.length === 0) {
                    return '';
                }
    
                for (const allowedPlatform of allowedPlatforms)
                {
                    if ( $scope.platformStatus.has( allowedPlatform.platform_id) 
                        && $scope.platformStatus.get( allowedPlatform.platform_id).checkingServiceStatus) {
                        checkCount++;
                    }
                }
    
                return checkCount > 0 ? 'fa fa-cog spinning' : '';
            }
    
            function _fixPlatformId( platform)
            {
                return platform.charAt(0).toUpperCase() + platform.slice(1);
            }
    
            function _load( doAutoPropagate=false)
            {
                $scope.enabledPlatforms = [];
                
                var all = system_platforms.concat( platforms);
                
                // load platform availability
                for ( var i=0; i < all.length; i++) 
                {
                    var platform = all[i];
                    
                    if ( !( platform.platform_id in platform_config_info)) {
                        continue;
                    }
                    $scope.enabledPlatforms.push( platform);
                }
                
                _checkPropagationStatus().then( function() {
                    $log.log( 'propagationDropdown _load() ConvoworksApi.getPropagateInfo all done', $scope.platformAvailabilities);
                    if ( doAutoPropagate) {
                        $log.log( 'propagationDropdown _load() doing auto propagate');
                        _autoPropagate();
                    }
                }, function ( reason) {
                    $log.log( 'propagationDropdown _load() ConvoworksApi.getPropagateInfo all rejected, reason', reason);
                }, function() {
                    $log.log( 'propagationDropdown _load() ConvoworksApi.getPropagateInfo all finally');
                })
            }
            
            function _loadConfigs()
            {
                let promises = [];
    
                // load platform config
                promises.push(
                    ConvoworksApi.loadPlatformConfig($scope.serviceId).then(function (config) {
                        $log.log('propagationDropdown got config', config);
                        platform_config_info = config;
                    }).catch(function (reason) {
                        NotificationsService.addDanger('Error fetching platform config', _extractErrorDetails(reason));
                    })
                );
                // load service meta
                promises.push(
                    ConvoworksApi.getServiceMeta($scope.serviceId).then( function (serviceMeta) {
                        $log.log('propagationDropdown got meta', serviceMeta);
                        $scope.owner = serviceMeta['owner'];
                    })
                );
    
                return $q.all( promises);
            }
            
            function _checkPropagationStatus()
            {
                let promises = [];
                $scope.platformAvailabilities = {};
                
                // load platform availability
                for ( var i=0; i<$scope.enabledPlatforms.length; i++) 
                {
                    var platform = $scope.enabledPlatforms[i];
                    
                    promises.push(
                        ConvoworksApi.getPropagateInfo( $scope.serviceId, platform.platform_id).then( function (data) {
                            $scope.platformAvailabilities[ platform.platform_id] = data;
                        }).catch( function ( reason) {
                            NotificationsService.addDanger( platform.name+' propagation error', _extractErrorDetails( reason));
                        })
                    );
                }
    
                return $q.all( promises);
            }
    
            function _resetSelectedNlp(data) {
                // if update data contains serivceAccount which refers to Dialogflow
                if (data.serviceAccount) {
                    $log.log('testViewNlp _resetSelectedNlp going to update dialogflow with', data);
    
                    if (data.mode === "manual") {
                        $log.log('testViewNlp _resetSelectedNlp going to reset delegate nlp on text based', data.mode);
    
                        platform_config_info.facebook_messenger.delegateNlp = null;
                        platform_config_info.viber.delegateNlp = null;
                        platform_config_info.convo_chat.delegateNlp = null;
    
                        ConvoworksApi.updateServicePlatformConfig( $scope.serviceId, 'facebook_messenger', platform_config_info.facebook_messenger).then(function (data) {
                            $log.debug('testViewNlp update() facebook_messenger data', data);
                            AlertService.addWarning("Resetting selected Intent NLP back to initial state for Facebook Messenger")
                        }, function ( response) {
                            $log.debug('testViewNlp update() response', response);
                        });
                        ConvoworksApi.updateServicePlatformConfig( $scope.serviceId, 'viber', platform_config_info.viber).then(function (data) {
                            $log.debug('testViewNlp update() viber data', data);
                            AlertService.addWarning("Resetting selected Intent NLP back to initial state for Viber")
                        }, function ( response) {
                            $log.debug('testViewNlp update() response', response);
                        });
                        ConvoworksApi.updateServicePlatformConfig( $scope.serviceId, 'convo_chat', platform_config_info.convo_chat).then(function (data) {
                            $log.debug('testViewNlp update() convo_chat data', data);
                            AlertService.addWarning("Resetting selected Intent NLP back to initial state for Convo Chat")
                        }, function ( response) {
                            $log.debug('testViewNlp update() response', response);
                        });
                    }
                }
            }
    
            function _autoPropagate() {
                if ($scope.autoPropagateEnabled) {
                    _cancelAutoPropagateTimeout();
                    auto_propagate_timeout = ($timeout(function() {
                        $scope.propagatePlatformChanges('all');
                    }, TIMEOUT_LENGTH));
                }
            }
    
            function _cancelAutoPropagateTimeout() {
                $log.debug('testViewNlp _cancelPoll() auto_propagate_polls', auto_propagate_timeout);
                $timeout.cancel(auto_propagate_timeout);
                auto_propagate_timeout = null;
            }
    
            function _extractErrorDetails(error)
            {
                if (!error) {
                    return 'An unknown error occurred';
                }
    
                if (typeof error === 'string') {
                    return error;
                }
    
                for (const prop in ['errorMessage', 'message', 'errorMsg', 'errMsg']) {
                    if (error.hasOwnProperty(prop)) {
                        return error[prop];
                    }
    
                    if (error.hasOwnProperty('data') && error.data[prop]) {
                        return error.data[prop];
                    }
                }
    
                return 'An unknown error occurred';
            }
            
            function getSystemPlatforms()
            {
                var platforms = [];
            
                platforms[platforms.length] = {
                    platform_id : 'amazon',
                    name : 'Amazon',
                };
                
                platforms[platforms.length] = {
                    platform_id : 'dialogflow_es',
                    name : 'Dialogflow Essentials',
                };
                
                platforms[platforms.length] = {
                    platform_id : 'dialogflow',
                    name : 'Dialogflow',
                };
                
                platforms[platforms.length] = {
                    platform_id : 'facebook_messenger',
                    name : 'Facebook Messenger',
                };
                
                platforms[platforms.length] = {
                    platform_id : 'viber',
                    name : 'Viber',
                };
                
                return platforms;
            }
        }
    }
}