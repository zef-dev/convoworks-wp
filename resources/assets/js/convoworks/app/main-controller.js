(function () {
	'use strict';
	
	angular.module('adomee.admin').controller( 'MainController', MainController);
	
	/* @ngInject */
	function MainController( $scope, $log, $location, UserPreferencesService, LoginService) {
		  
		$log.log('MainController init');
	  
		$scope.mainContainerClass	=	'container';
		$scope.signedIn				=	false;
		$scope.user					=	null;
		
		$scope.logout			=	function () {
			LoginService.logout().then( function () {
				$location.url('/home');
			}, function ( reason) {
				$log.log('MainController logout failed reason', reason);
            });
		};
		
		$scope.getUserObject = function()
		{
			return $scope.user;
		}

		$scope.getAuthUser			=	function () {
			if ( $scope.user) {
				return $scope.user.name;
			}
			return null;	
		};

		$scope.layoutConfig = {
				fullWidth : false
		};
		
		UserPreferencesService.getData( 'layoutConfig').then( function( layoutConfig) {
			$log.log( 'MainController getData() layoutConfig', layoutConfig);
			if (layoutConfig)
				$scope.layoutConfig	=	layoutConfig;
			display();
		});
		
		$scope.$watch( 'layoutConfig.fullWidth', function( value) {
			$log.log( 'MainController $scope.$watch layoutConfig.fullWidth value', value);
			display();
			UserPreferencesService.registerData( 'layoutConfig', $scope.layoutConfig);
		})
		
				// LOGIN STATE
		$scope.$watch( function () {
			return LoginService.isSignedIn();
		}, function( value) {
			if ( value) {
				loadUser();
			} else {
				$scope.signedIn		=	false;
				$scope.user			=	null;
			}
		});

		// INIT
		loadUser();

		
		function display()
		{
			if ($scope.layoutConfig && $scope.layoutConfig.fullWidth)
				$scope.mainContainerClass	=	'container-fluid';
			else
				$scope.mainContainerClass	=	'container';
		}

		function loadUser()
		{
			LoginService.getUser().then( function ( user) {
				$scope.user			=	user;
				$scope.signedIn		=	true;
			});
		}

	}
})();