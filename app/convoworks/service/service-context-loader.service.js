/* @ngInject */
export default function ServiceContextLoader($log, ConvoworksApi) {
    this.loadInitial = function (serviceId) {
        return ConvoworksApi.getAvailablePackages().then(function (available) {
            var availablePackages = sortPackagesByStability(available);

            return ConvoworksApi.getComponentDefinitions(serviceId, true).then(function (defs) {
                return ConvoworksApi.getServiceById(serviceId).then(function (service) {
                    return ConvoworksApi.getServiceMeta(serviceId).then(function (meta) {
                        $log.log('ServiceContextLoader.loadInitial() completed', {
                            serviceId: serviceId,
                            availablePackagesCount: Array.isArray(availablePackages) ? availablePackages.length : 0,
                            definitionsCount: Array.isArray(defs) ? defs.length : 0
                        });

                        return {
                            availablePackages: availablePackages,
                            definitions: defs,
                            service: service,
                            meta: meta
                        };
                    });
                });
            });
        });
    };

    this.reloadService = function (serviceId) {
        return ConvoworksApi.getServiceById(serviceId).then(function (service) {
            $log.log('ServiceContextLoader.reloadService() completed', { serviceId: serviceId });
            return service;
        });
    };

    function sortPackagesByStability(packages) {
        if (!Array.isArray(packages)) {
            return packages;
        }

        packages.sort(function (p1, p2) {
            if (p1.stability === 'experimental' && p2.stability !== 'experimental') {
                return 1;
            }

            if (p2.stability === 'experimental' && p1.stability !== 'experimental') {
                return -1;
            }

            return 0;
        });

        return packages;
    }
}

