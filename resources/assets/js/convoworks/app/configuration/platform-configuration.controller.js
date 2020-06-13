(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .controller('PlatformConfigurationController', PlatformConfigurationController);

    /* @ngInject */
    function PlatformConfigurationController($scope, $log, PlatformConfigurationApi)
    {
        $log.log("PlatformConfigurationController init");

        $scope.loading = false;

        $scope.config = {
            'amazon': {
                'client_id': null,
                'client_secret': null
            }
        };

        var configBak = null;

        _init();

        $scope.isConfigChanged = function()
        {
            return !angular.equals($scope.config, configBak);
        }

        $scope.updateConfig = function()
        {
            $scope.loading = true;

            PlatformConfigurationApi.updatePlatformConfiguration($scope.config).then(function (newConfig) {
                $log.log("PlatformConfigurationController updateConfig() got udpated", newConfig);

                $scope.config = newConfig;
                configBak = angular.copy($scope.config);
                $scope.loading = false;
            }, function (reason) {
                $log.log("PlatformConfigurationController updateConfig() failed, reason", reason);
                $scope.loading = false;
            });
        }

        $scope.revertConfig = function()
        {
            $scope.config = angular.copy(configBak);
        }

        function _init()
        {
            $scope.loading = true;

            PlatformConfigurationApi.getPlatformConfiguration().then(function (config) {
                $scope.config = config;
                configBak = angular.copy($scope.config);
                $scope.loading = false;
            }, function (reason) {
                $log.warn("PlatformConfigurationController _init() failed, reason", reason);
                $scope.loading = false;
            });
        }
    }
})();