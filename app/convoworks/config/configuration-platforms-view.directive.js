import template from './configuration-platforms-view.tmpl.html';

/* @ngInject */
export default function configurationPlatformsView($log, ConvoworksApi, SystemPlatformsService)
{
    return {
        restrict: 'E',
        template,
        scope: {},
        require: '^serviceContext',
        link: function ($scope, $element, $attributes, serviceContext) {
            // Set service from serviceContext
            function updateService() {
                if (serviceContext.isLoaded()) {
                    $scope.service = serviceContext.getSelectedService();
                }
            }
            
            // Initial update
            updateService();
            
            // Watch for service context to load
            $scope.$watch(serviceContext.isLoaded, function(isLoaded) {
                if (isLoaded) {
                    updateService();
                }
            });
            
            $scope.config = {};
            $scope.platforms = [];
            $scope.systemPlatforms = SystemPlatformsService.getSystemPlatforms();

            $scope.configEnabled = function(config) {
                return Object.keys($scope.config).includes(config);
            }
            
            $scope.getPlatformConfigUrl = function(platform) {
                if (!$scope.service || !$scope.service.service_id) {
                    return '#';
                }
                var url = platform.config_url;
                url = url.replace('{serviceId}', $scope.service.service_id);
                return url;
            }

            function _init()
            {
                if (!$scope.service || !$scope.service.service_id) {
                    $log.warn('configurationPlatformsView: service or service_id not available yet');
                    return;
                }

                // Reset platforms array
                $scope.platforms = [];

                ConvoworksApi.loadPlatformConfig($scope.service.service_id).then(function (config) {
                    $log.log('configurationPlatformsView got config', config);
                    $scope.config = config || {};
                });
                
                var definitions = serviceContext.getComponentDefinitions();
                $log.log('configurationPlatformsView got definitions', definitions);
                
                if (definitions && definitions.length > 0) {
                    for (var i = 0; i < definitions.length; i++) 
                    {
                        var definition = definitions[i];
                        if (definition && 'platforms' in definition) {
                            for (var platform_id in definition['platforms']) {
                                if (definition['platforms'].hasOwnProperty(platform_id)) {
                                    var platform = angular.copy(definition['platforms'][platform_id]);
                                    platform['platform_id'] = platform_id;
                                    $scope.platforms.push(platform);
                                }
                            }
                        }
                    }
                }
                
                $log.log('configurationPlatformsView got external platforms', $scope.platforms);
            }

            // Wait for service context to be loaded
            $scope.$watch(serviceContext.isLoaded, function(val) {
                if (val && $scope.service && $scope.service.service_id) {
                    _init();
                }
            });

            // Also check if already loaded
            if (serviceContext.isLoaded() && $scope.service && $scope.service.service_id) {
                _init();
            }
        }
    }
}

