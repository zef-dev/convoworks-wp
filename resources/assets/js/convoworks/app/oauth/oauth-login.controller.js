(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .controller('OAuthLoginController', OAuthLoginController);
    
    /* @ngInject */
    function OAuthLoginController($scope, $log, $location, UsersApi, OAuthApi)
    {
        $log.log('OAuthLoginController');

        $scope.loading = true;
        $scope.users = [];

        $scope.query = $location.search();

        $scope.buildLoginUrl = function(user) {
            var query = $location.search();

            var url = OAuthApi.buildLoginUrl(query, user);

            $log.log('Got final login url', url);

            return url;
        }

        _init();

        function _init()
        {
            UsersApi.getUsers().then(function (users) {
                $log.log('OAuthLoginController got users', users);
                $scope.users = users;
                $scope.loading = false;
            });
        }
    }
})();