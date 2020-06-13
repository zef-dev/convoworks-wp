(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .service('UsersApi', UsersApi);

    /* @ngInject */
    function UsersApi($log, $http, PROTO_PUBLIC_API_BASE_URL) {
        this.getUsers = getUsers;

        function getUsers()
        {
            $log.log('UsersApi getUsers()');

            return $http({
                method: "GET",
                url: PROTO_PUBLIC_API_BASE_URL + '/users'
            }).then(function (res) {
                return res.data;
            });
        }
    }
})();