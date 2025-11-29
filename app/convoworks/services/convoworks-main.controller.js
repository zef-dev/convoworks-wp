
import createServiceTemplate from './convoworks-add-service.tmpl.html';
import deleteServiceTemplate from './convoworks-delete-service.tmpl.html';
import copyServiceTemplate from './convoworks-copy-service.tmpl.html';
import ModalInstanceCtrl from './convoworks-add-service.controller';
import ServiceDeleteModalCtrl from './convoworks-delete-service.controller';
import ServiceCopyModalCtrl from './convoworks-copy-service.controller';

ConvoworksMainController.$inject = ['$log', '$document', '$scope', '$uibModal', '$state', 'UserPreferencesService', 'ConvoworksApi', 'LoginService', 'CONVO_ADMIN_API_BASE_URL'];

export default function ConvoworksMainController($log, $document, $scope, $uibModal, $state, UserPreferencesService, ConvoworksApi, LoginService, CONVO_ADMIN_API_BASE_URL) {
    $log.debug('ConvoworksMainController init');

    // API
    $scope.ready = false;
    $scope.availableServices = [];
    $scope.filtered = [];

    $scope.filter = '';

    $scope.user = null;

    $scope.sortingOptions = [{ label: "Service name", value: "name"}, { label: "Last updated", value: "date" }];

    // LOGIN STATE
    $scope.$watch(function () {
        return LoginService.isSignedIn();
    }, function (value) {
        if (value) {
            LoginService.getUser().then(function (user) {
                $scope.user = user;
            }, function (reason) {
                $log.log('ConvoworksMainController getUser() failed reason', reason);
            });
        } else {
            $scope.user = null;
        }
    });

    $scope.getAuthUserEmail = function () {
        if ($scope.user) {
            return $scope.user.email;
        }
        return null;
    };

    $scope.getAuthUser = function () {
        if ($scope.user) {
            return $scope.user.name;
        }
        return null;
    };

    $scope.createService = function () {
        $uibModal.open({
            template: createServiceTemplate,
            controller: ModalInstanceCtrl,
            appendTo: $document.find('.convoworks').eq(0),
            size: 'md',
            resolve: { ConvoworksApi: function () { return ConvoworksApi; } }
        })
    };

    $scope.downloadService = function(serviceId) {
        $log.debug('ConvoworksMainController downloadService()', serviceId);
        if (!serviceId) {
            $log.warn('ConvoworksMainController downloadService() - serviceId not available');
            return;
        }
        const url = CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/export/' + serviceId + '?include_configurations=false';
        $log.debug('ConvoworksMainController redirecting to [' + url + ']');
        document.location.href = url;
    }

    $scope.copyService = function(serviceId) {
        $log.debug('ConvoworksMainController copyService()', serviceId);

        // Find the service to get its name
        const service = $scope.availableServices.find(s => s.service_id === serviceId);
        const serviceName = service ? service.name : '';

        var instance = $uibModal.open({
            template: copyServiceTemplate,
            controller: ServiceCopyModalCtrl,
            size: 'md',
            appendTo: $document.find('.convoworks').eq(0),
            resolve: {
                ConvoworksApi: function () { return ConvoworksApi; },
                serviceId: function () { return serviceId; },
                serviceName: function () { return serviceName; }
            }
        });

        instance.result.then(function (newService) {
            $log.log('ConvoworksMainController copyService modal then res', newService);
            $scope.ready = false;
            _init();
        }, (reason) => {
            $log.log('ConvoworksMainController copyService modal dismissed, reason', reason);
        });
    }

    $scope.deleteService = function ($event, serviceId, serviceReleases) {
        var instance = $uibModal.open({
            template: deleteServiceTemplate,
            controller: ServiceDeleteModalCtrl,
            size: 'md',
            appendTo: $document.find('.convoworks').eq(0),
            resolve: {
                ConvoworksApi: function () { return ConvoworksApi; },
                serviceId: function () { return serviceId; },
                serviceReleases: function () { return serviceReleases; }
            }
        });

        instance.result.then(function (res) {
            $log.log('ConvoworksMainController deleteService modal then res', res);
            UserPreferencesService.removeData('delegateNlp-' + serviceId);
            $scope.ready = false;
            _init();
        }, (reason) => {
            $log.log('ConvoworksMainController deleteService modal dismissed, reason', reason);
        })
    }

    $scope.publishedOn = function (service) {
        var published = [];

        angular.forEach(service.versions, function (value, key) {
            if (!published.includes(key)) {
                published.push(_cleanKey(key));
            }
        });

        return published;
    }

    // Only initialize services list if we're on the services list route
    // When used in directive context (like config editor), we don't need the services list
    var isServicesListRoute = $state && $state.current && $state.current.name === 'convoworks-editor';

    if (isServicesListRoute) {
        _initSort();
        _init();
    } else {
        // In directive context, just mark as ready without loading services
        $scope.ready = true;
    }

    // INIT
    function _init() {
        ConvoworksApi.getAllServices().then(function (services) {
            services = services.map(s => {
                s.releases = _getReleases(s);
                return s;
            });

            $scope.availableServices = services;

            $scope.$watch('filter', function (value) {
                if (!value || value === '') {
                    $scope.filtered = angular.copy($scope.availableServices);
                }

                $scope.$applyAsync(function () {
                    $scope.filtered = $scope.availableServices.filter(function (service) {
                        const lcase_query = value.toLowerCase();
                        return service.name.toLowerCase().includes(lcase_query) ||
                            service.service_id.toLowerCase().includes(lcase_query) ||
                            JSON.stringify(service.owner).toLowerCase().includes(lcase_query);
                    });

                    _sort($scope.sorting);
                });
            });
        }, function (reason) {
            $log.warn('ConvoworksMainController fetching all services failed because of', reason);

            throw new Error(reason.data.message);
        }).finally(function () {
            $scope.ready = true;
        })
    }

    function _initSort() {
        UserPreferencesService.getData('allServicesSortingOptions').then((opts) => {
            $log.log('ConvoworksMainController _initSort getData allServicesSortingOptions', opts);

            $scope.sorting = {
                by: opts ? opts.by : 'name',
                ascending: opts ? opts.ascending : true
            };

            $scope.$watch('sorting', (val) => {
                UserPreferencesService.registerData('allServicesSortingOptions', val);

                _sort(val);
            }, true);
        });
    }

    function _sort(criteria) {
        if (!$scope.sortingOptions.map(o => o.value).includes(criteria.by)) {
            criteria.by = $scope.sortingOptions[0].value;
        }

        switch (criteria.by) {
            case 'name':
                $scope.filtered = $scope.filtered.sort((a, b) => {
                    const res = a.name.localeCompare(b.name);

                    return criteria.ascending ? res : (res * -1);
                });
                break;
            case 'date':
                $scope.filtered = $scope.filtered.sort((a, b) => {
                    return criteria.ascending ?
                        a.time_updated - b.time_updated :
                        b.time_updated - a.time_updated;
                })
                break;
            default:
                throw new Error(`Unknown sorting option [${criteria.by}]`);
        }
    }

    function _getReleases(service) {
        const all = [];

        for (const platform in service.release_mapping) {
            let release = {
                platform: _cleanKey(platform)
            };

            for (const alias in service.release_mapping[platform]) {
                release["alias"] = alias;
                release["stage"] = service.release_mapping[platform][alias].type;
            }

            all.push(release);
        }

        return all;
    }

    function _cleanKey(key) {
        return key.split('_').map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }).join(' ');
    }

    $scope.clean = (key) => _cleanKey(key);
}
