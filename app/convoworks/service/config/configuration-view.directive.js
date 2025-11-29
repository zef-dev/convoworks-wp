import template from './configuration-view.tmpl.html';

/* @ngInject */
export default function configurationView($log, $state, ConvoworksApi, SystemPlatformsService)
{
    return {
        restrict: 'E',
        template,
        scope: { service: '=' },
        require: '^serviceContext',
        link: function ($scope, $element, $attributes, serviceContext) {
            $scope.enabledPlatformsCount = 0;
            
            $scope.isConfigTabActive = function(tabName) {
                if (tabName === 'meta') {
                    return $state.includes('convoworks-editor-service.configuration.meta') || 
                           $state.is('convoworks-editor-service.configuration');
                }
                if (tabName === 'platforms') {
                    return $state.includes('convoworks-editor-service.configuration.platforms');
                }
                return false;
            };

            function updateEnabledPlatformsCount() {
                if (!$scope.service || !$scope.service.service_id) {
                    $scope.enabledPlatformsCount = 0;
                    return;
                }

                ConvoworksApi.loadPlatformConfig($scope.service.service_id).then(function (config) {
                    var count = 0;
                    if (config) {
                        // Count enabled platforms (platform_ids in config)
                        count = Object.keys(config).length;
                    }
                    $scope.enabledPlatformsCount = count;
                }).catch(function(error) {
                    $log.warn('configurationView: Error loading platform config for count', error);
                    $scope.enabledPlatformsCount = 0;
                });
            }

            // Watch for service to be available
            $scope.$watch('service', function(newVal) {
                if (newVal && newVal.service_id) {
                    updateEnabledPlatformsCount();
                }
            }, true);

            // Watch for service context to load
            $scope.$watch(serviceContext.isLoaded, function(isLoaded) {
                if (isLoaded) {
                    if (!$scope.service) {
                        $scope.service = serviceContext.getSelectedService();
                    }
                    if ($scope.service && $scope.service.service_id) {
                        updateEnabledPlatformsCount();
                    }
                }
            });

            // Listen for platform config updates
            $scope.$on('ServiceConfigUpdated', function() {
                updateEnabledPlatformsCount();
            });

            // Initial check
            if (serviceContext.isLoaded()) {
                if (!$scope.service) {
                    $scope.service = serviceContext.getSelectedService();
                }
                if ($scope.service && $scope.service.service_id) {
                    updateEnabledPlatformsCount();
                }
            }

            // Redirect to meta if directly on abstract state
            $scope.$watch(function() {
                return $state.current.name;
            }, function(stateName) {
                if (stateName === 'convoworks-editor-service.configuration') {
                    $state.go('convoworks-editor-service.configuration.meta', {}, {location: 'replace'});
                }
            });
            
            // Initial check
            if ($state.current.name === 'convoworks-editor-service.configuration') {
                $state.go('convoworks-editor-service.configuration.meta', {}, {location: 'replace'});
            }
        }
    }
}
