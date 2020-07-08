(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'convoworksToolbox', convoworksToolbox);

	/* @ngInject */
	function convoworksToolbox( $log, UserPreferencesService)
	{
		return {
			restrict: 'E',
			scope: { 
				'definitions' : '=',
				'service' : '='
			},
			templateUrl: 'app/convoworks/convoworks-toolbox.tmpl.html',
			link: function( $scope, $element, $attributes) {
				$log.log( 'convoworksToolbox _init() $scope.definitions', $scope.definitions);
				
				var core			=	['convo-core', 'amazon', 'google-nlp'];
				$scope.open			=	{};

				$scope.groupedDefinitions = {};

				if ( !$scope.service.packages) {
					$scope.service.packages	=	[];
				}

				for (var i in $scope.definitions) {
					$log.log($scope.definitions[i]);
					var namespace = $scope.definitions[i].namespace;

					if (!$scope.groupedDefinitions[namespace]) {
						$scope.groupedDefinitions[namespace] = {};
					}

					for (var j in $scope.definitions[i].components) {
						var cmpt = $scope.definitions[i].components[j];
						var grp = _uppercaseWord(cmpt['component_properties']['_workflow']);
						
						if (!$scope.groupedDefinitions[namespace][grp]) {
							$scope.groupedDefinitions[namespace][grp] = [];
						}

						if (!cmpt.name.toLowerCase().includes('x!')) {
							$scope.groupedDefinitions[namespace][grp].push(cmpt);
						}
					}
				}
				
				UserPreferencesService.getData( 'openToolboxes').then( function( openToolboxes) {
					if ( openToolboxes) {
						$scope.open    =   openToolboxes;
					}
				});

				$scope.$watch( 'open', function( value) {
					UserPreferencesService.registerData( 'openToolboxes', value);
				}, true);

				$scope.isOpen		=	function( namespace)
				{
					if ( namespace in $scope.open) {
						return $scope.open[namespace];
					}
					return (core.indexOf( namespace) > -1) ? true : false;
				};
				
				$scope.toggleOpen	=	function( namespace)
				{
					$scope.open[namespace]	=	!$scope.isOpen( namespace);
				}
				
				$scope.isEnabled	=	function( namespace)
				{
					for ( var i=0; i<$scope.service.packages.length; i++) {
						if ( $scope.service.packages[i] == namespace) {
							return true;
						}
					}
					return false;
				}

				$scope.toggleEnabled	=	function( namespace)
				{
					if ( $scope.isEnabled( namespace)) {
						$scope.service.packages =   $scope.service.packages.filter( function(e) { return e !== namespace })
						$scope.open[namespace]	=	false;
					} else {
						$scope.service.packages.push( namespace);
					}
				}
				
				function _uppercaseWord(word) {
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
				}
			}
		}
	}
})();