(function () {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'intentUtteranceEditor', intentUtteranceEditor);

	/* @ngInject */
	function intentUtteranceEditor( $log) {
		return {
			restrict: 'E',
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/editors/intent-utterance-editor.tmpl.html',
			scope: {
				component: '=',
				propertyDefinition: '=',
				key: '=',
				service: '='
			},
			link: function ( $scope, $element, $attributes, propertiesContext) {
				$log.debug( 'intentUtteranceEditor link');
				$scope.value	=	JSON.stringify( $scope.component.properties[$scope.key], null, 2);
				$scope.error	=	false;
				
				$scope.$watch( 'value', function ( value) {
					try {
						$scope.component.properties[$scope.key]	=	JSON.parse( value);
						// $log.debug( 'intentUtteranceEditor changed value for key', $scope.key);
						$scope.error	=	false;
					} catch ( err) {
						$scope.error	=	true;
					}
				});
				
				$scope.$watch( function () {
					// $log.debug( 'intentUtteranceEditor component value changed for key', $scope.key);
					return $scope.component.properties[$scope.key];
				}, function ( value) {
					$scope.value	=	JSON.stringify( value, null, 2);
					$scope.error	=	false;
				});
			}
		}
	}
})();