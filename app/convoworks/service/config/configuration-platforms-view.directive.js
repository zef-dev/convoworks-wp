import template from './configuration-platforms-view.tmpl.html';

/* @ngInject */
export default function configurationPlatformsView($log, $rootScope, ConvoworksApi, SystemPlatformsService)
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
            $scope.enabledPackageNamespaces = [];
            $scope.togglingPackage = null;
            $scope.systemPlatforms = SystemPlatformsService.getSystemPlatforms();

            $scope.configEnabled = function(config) {
                return Object.keys($scope.config).includes(config);
            }

            $scope.isPackageEnabled = function(packageNamespace) {
                return $scope.enabledPackageNamespaces.indexOf(packageNamespace) !== -1;
            }

            $scope.isPlatformEnabled = function(platform) {
                // System platforms are enabled if config exists
                if (platform.isSystem) {
                    return $scope.configEnabled(platform.platform_id);
                }
                // External platforms are enabled if their package is enabled AND config exists
                return $scope.isPackageEnabled(platform.package_namespace) && $scope.configEnabled(platform.platform_id);
            }

            $scope.togglePackage = function(packageNamespace, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }

                if ($scope.togglingPackage === packageNamespace) {
                    return; // Already toggling
                }

                $scope.togglingPackage = packageNamespace;
                const isEnabled = $scope.isPackageEnabled(packageNamespace);
                const promise = isEnabled ?
                    ConvoworksApi.removeServicePackage($scope.service.service_id, packageNamespace) :
                    ConvoworksApi.addServicePackage($scope.service.service_id, packageNamespace);

                promise.then(() => {
                    // Update enabled packages list
                    if (isEnabled) {
                        const index = $scope.enabledPackageNamespaces.indexOf(packageNamespace);
                        if (index !== -1) {
                            $scope.enabledPackageNamespaces.splice(index, 1);
                        }
                    } else {
                        if ($scope.enabledPackageNamespaces.indexOf(packageNamespace) === -1) {
                            $scope.enabledPackageNamespaces.push(packageNamespace);
                        }
                    }

                    // Broadcast to reload component definitions
                    $rootScope.$broadcast('PackagesUpdated');

                    // Reload platforms to get updated list
                    _loadPlatforms();

                    $scope.togglingPackage = null;
                }, (reason) => {
                    $log.error('Failed to toggle package [' + packageNamespace + ']:', reason);
                    $scope.togglingPackage = null;
                });
            }

            $scope.getPlatformConfigUrl = function(platform) {
                if (!$scope.service || !$scope.service.service_id) {
                    return '#';
                }
                var url = platform.config_url;
                url = url.replace('{serviceId}', $scope.service.service_id);
                return url;
            }

            function _loadServicePackages() {
                if (!serviceContext.isLoaded()) {
                    return Promise.resolve([]);
                }

                // Use service context's cached definitions instead of API call
                var packages = serviceContext.getComponentDefinitions();
                $log.log('configurationPlatformsView got service packages', packages);

                // Extract enabled package namespaces
                $scope.enabledPackageNamespaces = [];
                if (packages && packages.length > 0) {
                    packages.forEach(function(pkg) {
                        if (pkg.namespace) {
                            $scope.enabledPackageNamespaces.push(pkg.namespace);
                        }
                    });
                }

                $log.log('configurationPlatformsView enabled packages', $scope.enabledPackageNamespaces);
                return Promise.resolve(packages);
            }

            function _loadPlatforms() {
                return ConvoworksApi.getUserPlatforms().then(function (allPlatforms) {
                    $log.log('configurationPlatformsView got all platforms', allPlatforms);

                    // Get system platform IDs to filter them out
                    const systemPlatformIds = $scope.systemPlatforms.map(function(p) { return p.platform_id; });

                    // Filter out system platforms and process remaining platforms
                    $scope.platforms = (allPlatforms || [])
                        .filter(function(platform) {
                            // Exclude system platforms (they're shown separately)
                            return systemPlatformIds.indexOf(platform.platform_id) === -1;
                        })
                        .map(function(platform) {
                            platform.isSystem = false; // All remaining are external
                            return platform;
                        });

                    // Sort platforms: first by platform config enabled, second by package enabled, then by name
                    $scope.platforms.sort(function(a, b) {
                        const aConfigEnabled = $scope.configEnabled(a.platform_id);
                        const bConfigEnabled = $scope.configEnabled(b.platform_id);

                        // First: sort by platform config enabled
                        if (aConfigEnabled !== bConfigEnabled) {
                            return aConfigEnabled ? -1 : 1; // Config enabled first
                        }

                        // Second: sort by package enabled (only for external platforms)
                        if (!a.isSystem && !b.isSystem && a.package_namespace && b.package_namespace) {
                            const aPackageEnabled = $scope.isPackageEnabled(a.package_namespace);
                            const bPackageEnabled = $scope.isPackageEnabled(b.package_namespace);

                            if (aPackageEnabled !== bPackageEnabled) {
                                return aPackageEnabled ? -1 : 1; // Package enabled first
                            }
                        }

                        // Then sort by name
                        const aName = (a.display_name || a.name || '').toLowerCase();
                        const bName = (b.display_name || b.name || '').toLowerCase();
                        return aName.localeCompare(bName);
                    });

                    $log.log('configurationPlatformsView sorted platforms', $scope.platforms);
                });
            }

            function _init()
            {
                if (!$scope.service || !$scope.service.service_id) {
                    $log.warn('configurationPlatformsView: service or service_id not available yet');
                    return;
                }

                // Load platform config
                ConvoworksApi.loadPlatformConfig($scope.service.service_id).then(function (config) {
                    $log.log('configurationPlatformsView got config', config);
                    $scope.config = config || {};
                });

                // Load service packages first, then load all platforms
                _loadServicePackages().then(function() {
                    return _loadPlatforms();
                });
            }

            // Listen for package updates
            $scope.$on('PackagesUpdated', function() {
                if ($scope.service && $scope.service.service_id) {
                    _loadServicePackages().then(function() {
                        return _loadPlatforms();
                    });
                }
            });

            var initCalled = false;

            function tryInit() {
                if (!initCalled && serviceContext.isLoaded() && $scope.service && $scope.service.service_id) {
                    initCalled = true;
                    _init();
                }
            }

            // Wait for service context to be loaded
            $scope.$watch(serviceContext.isLoaded, function(val) {
                if (val) {
                    updateService();
                    tryInit();
                }
            });

            // Also check if already loaded
            if (serviceContext.isLoaded()) {
                updateService();
                tryInit();
            }
        }
    }
}

