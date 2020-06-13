(function () {
	"use strict";

	angular
		.module( 'adomee.admin')
		.controller( 'HomeController', HomeController);

	/* @ngInject */
	function HomeController( $log, $scope, LoginService)
	{
		$log.log('HomeController');

		// API
		$scope.ready				=	false;
		$scope.credentials			=	{};
		$scope.errorMessage			=	null;
		
		$scope.login			=	function () {
			LoginService.login( $scope.credentials.username, $scope.credentials.password).then( function () {
				$scope.errorMessage			=	null;
			}, function ( reason) {
				$log.log('HomeController Login failed reason', reason);
				$scope.errorMessage			=	reason;
            });
		};
		
		
		_init();

		// INIT
		function _init()
		{
		}
	}

})();