(function () {
    'use strict';

    angular.module('convo.wp').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
            otherwise({
                redirectTo: '/convoworks-editor'
            });
        }]);
})();