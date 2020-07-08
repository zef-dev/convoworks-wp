(function () {
    'use strict';

    angular.module('proto.admin').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
            
                when('/home', {
                    templateUrl: 'app/proto/home/home.tmpl.html',
					controller: 'HomeController',
					controllerAs: 'homeVm'
                }).

                when('/oa/login', {
                    templateUrl: 'app/proto/oauth/oauth-login.tmpl.html',
                    controller: 'OAuthLoginController',
                    controllerAs: 'oauthVm'
                }).

                when('/platform-configuration', {
					templateUrl: 'app/proto/configuration/platform-configuration.tmpl.html',
					controller: 'PlatformConfigurationController',
					controllerAs: 'configVm'
                }).

                otherwise({
                    redirectTo: '/home'
                });

        }]);
})();