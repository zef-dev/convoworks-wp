(function () {
	"use strict";

	angular
		.module( 'convo.editor')
		.controller( 'ConvoworksMainController', ConvoworksMainController);

	/* @ngInject */
	function ConvoworksMainController( $log, $scope, $uibModal, ConvoworksApi)
	{
		// API
		$scope.ready				=	false;
		$scope.availableServices	=	[];

		$scope.createService        =   function()
		{
			$uibModal.open({
				templateUrl: 'app/convoworks/convoworks-add-service.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: { ConvoworksApi: function() { return ConvoworksApi; }}
			})
		};
		
		$scope.saveChanges			=	function()
		{
			
		};
		
		$scope.saveDisabled			=	function()
		{
			
		};
		
		$scope.revertClicked		=	function()
		{
			
		};
		
		$scope.revertDisabled		=	function()
		{
			
		};
		
		$scope.publishedOn = function(service) {
			var published = [];

			angular.forEach(service.versions, function (value, key) {
				if (!published.includes(key)) {
					published.push(_cleanKey(key));
				}
			});

			return published;
		}
		
		_init();

		// INIT
		function _init()
		{
			ConvoworksApi.getAllServices().then( function( services) {
				$scope.availableServices	=	services;
			}, function( reason) {
				$log.warn( 'ConvoworksMainController fetching all services failed because of', reason);

				throw new Error( reason.data.message);
			}).finally( function() {
				$scope.ready	=	true;
			})
		}

		function _cleanKey(key) {
			return key.split('_').map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }).join(' ');
		}
	}

	/* @ngInject */
	function ModalInstanceCtrl( $scope, $uibModalInstance, $location, ConvoworksApi)
	{
		$scope.new_service	=	{
			"name" : "",
			"template_id" : "convo-core.blank"
		};

		$scope.templates	=	[];
		
		ConvoworksApi.getTemplates().then( function ( all) {
			$scope.templates	=	all;
		});
		
		$scope.create       =   function()
		{
			ConvoworksApi.createService( $scope.new_service.name, $scope.new_service.template_id).then( function( data) {
				var id  =   data['service_id'];

				$uibModalInstance.dismiss( 'cancel');
				$location.path( 'convoworks-editor/' + id);
			})
		};

		$scope.cancel   =   function() { $uibModalInstance.dismiss( 'cancel'); }
	}
})();