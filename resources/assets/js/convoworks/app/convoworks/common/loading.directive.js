(function () {
    'use strict';
    angular.module('convo.editor').directive('loadingIndicator', ['$http', '$log', function ( $http, $log) {
        return {
            restrict: 'E',
            templateUrl : 'app/convoworks/common/loading.tmpl.html',
            link: function (scope, elm, attrs) {
                
                $log.log( 'loadingIndicator link');
                

                scope.$watch( function () {
                    return $http.pendingRequests.length > 0;
                }, function (v) {
                    if (v) {
                        elm.find('div.sk-cube-grid').show();
                    } else {
                        elm.find('div.sk-cube-grid').hide();
                    }
                });
            }
        };

    }]);

})();