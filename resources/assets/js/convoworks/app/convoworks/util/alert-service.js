(function () {
	'use strict';
	
	angular.module('convo.editor').factory('AlertService', function ( $log, $timeout) {
	
	var 	alertsService	=	{};
	
	alertsService.alerts	=	[];
	
	alertsService.getAlerts	=	function()
	{
		return alertsService.alerts;
	};
	
	alertsService.addSucess	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'success'}, 5000);
	};
	
	alertsService.addDanger	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'danger'}, 5000);
	};
	
	alertsService.addInfo	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'info'}, 5000);
	};
	
	alertsService.addWarning	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'warning'}, 5000);
	};
	
	alertsService._addAlert	=	function( alert, timeout)
	{
		alertsService.alerts.push( alert);
		$timeout(function () {
			alertsService.closeAlertObj( alert);
		}, timeout);
	};
	
	alertsService.closeAlert	=	function( index)
	{
		alertsService.alerts.splice(index, 1);
	};
	
	alertsService.closeAlertObj	=	function( alert)
	{
		var index	=	alertsService.alerts.indexOf( alert);
		if (index > -1)
			alertsService.closeAlert( index);
	};
	
	return alertsService;
});
})();