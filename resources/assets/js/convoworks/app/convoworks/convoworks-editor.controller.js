(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.controller( 'ConvoworksEditorController', ConvoworksEditorController);

	/* @ngInject */
	function ConvoworksEditorController( $log, $scope, $rootScope, $routeParams, ConvoworksApi) {

		var random_slug			=	Math.floor( Math.random() * 100000);
		var device_id			=	'admin-chat-' + random_slug;

		var platform_config		=	{}
		
		$scope.serviceId		=	$routeParams.service_id;

		$scope.tabInfo          =   { active: 'steps' };

		$scope.delegateNlp		=	null;
		$scope.delegateOptions	=	[
			{
				label: 'Amazon',
				value: 'amazon'
			},
			{
				label: 'Dialogflow',
				value: 'dialogflow'
			}
		];

		
		_load();
		
		$scope.getDeviceId		=	function() {
			return device_id;
		}
		

		$rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
            _load();
        });
		
		
		$scope.isPlatformPropagateAvailable		=	function( platformId) {
			if ( !platform_config[platformId]) {
				return false;
			}

			if ( platform_config[platformId]['mode'] === 'auto') {
				return true;
			}
			
			return false;
		}
		
		$scope.isPlatformPropagateEnabled		=	function( platformId) {
//			if ( platformId === 'amazon')
				return true;
		}
		
		$scope.propagatePlatformChanges		=	function( platformId) {
			$log.log( 'propertiesContext propagatePlatformChanges() platformId', platformId);
			
			ConvoworksApi.propagateServicePlatform( $scope.serviceId, platformId).then(function (data) {
            });
			
		}
		
		
		function _load()
        {
        	ConvoworksApi.getServicePlatformConfig( $scope.serviceId, 'amazon').then(function (data) {
                platform_config['amazon'] = data;
            });
        	ConvoworksApi.getServicePlatformConfig( $scope.serviceId, 'dialogflow').then(function (data) {
        		platform_config['dialogflow'] = data;
        	});
        }
	}
})();