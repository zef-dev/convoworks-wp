(function () {
    'use strict';
    angular.module('convo.editor').directive('alertIndicator', ['AlertService', '$log', function ( AlertService, $log) {
        return {
            restrict: 'E',
            templateUrl : 'app/convoworks/common/alert-indicator.tmpl.html',
            link: function ( $scope, $elem) {
                
                $log.log( 'alertIndicator link');
                
                $scope.getAlerts     =   AlertService.getAlerts;
                $scope.closeAlert    =   AlertService.closeAlert;
            }
        };

    }]);

})();