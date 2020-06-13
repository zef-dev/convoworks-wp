
(function () {
	'use strict';
	
	angular.module('adomee.admin').controller('AdmAlertCtrl', ['$scope', '$rootScope', '$log', 'AdmAlertService',
         function($scope, $rootScope, $log, AdmAlertService) {
       	
	$log.log('AdmAlertCtrl init');

	var _this			=	this;
	_this.alerts		=	AdmAlertService.getAlerts();
	_this.closeAlert	=	AdmAlertService.closeAlert;
}]);

})();