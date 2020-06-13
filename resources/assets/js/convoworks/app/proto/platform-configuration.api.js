(function() {
    "use strict";

    angular 
        .module('adomee.admin')
        .service('PlatformConfigurationApi', PlatformConfigurationApi);

    /* @ngInject */
    function PlatformConfigurationApi($log, $http, CONVO_ADMIN_API_BASE_URL)
    {
        this.getPlatformConfiguration = getPlatformConfiguration;
        this.updatePlatformConfiguration = updatePlatformConfiguration;

        function getPlatformConfiguration()
        {
            return $http({
                method: 'get',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config'
            }).then(function (res) {
                $log.log("PlatformConfigurationApi getPlatformConfiguration() res", res);

                return res.data;
            });
        }

        function updatePlatformConfiguration(config)
        {
            return $http({
                method: 'put',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config',
                headers: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                data: config
            }).then(function (res) {
                $log.log("PlatformConfigurationApi updatePlatformConfig() res", res);

                return res.data;
            });
        }
    }
})();