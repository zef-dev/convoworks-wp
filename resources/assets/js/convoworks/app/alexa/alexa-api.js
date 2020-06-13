(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .service('AlexaApi', AlexaApi);

    /* @ngInject */
    function AlexaApi($log, $http, $q, CONVO_PUBLIC_API_BASE_URL) {

        this.requestAuthUrl = requestAuthUrl;

        function requestAuthUrl(user)
        {
            return $http({
                method: 'GET',
                url: CONVO_PUBLIC_API_BASE_URL + '/admin-auth/amazon?username=' + user.email
            }).then(function (res) {
                $log.log('Got res', res);
                return res.data;
            });
        }
    }

})();