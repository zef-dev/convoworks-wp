(function () {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'systemIntentEditor', systemIntentEditor);

	/* @ngInject */
	function systemIntentEditor( $log) {
		return {
			restrict: 'E',
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/editors/system-intent-editor.tmpl.html',
			scope: {
				component: '=',
				propertyDefinition: '=',
				key: '=',
				service: '='
			},
			link: function ( $scope, $element, $attributes, propertiesContext) {
				$log.debug( 'systemIntentEditor link');
				$scope.value	=	_deserialize( $scope.component.properties[$scope.key]);
				$scope.error	=	false;
				
				$scope.$watch( 'value', function ( value) {
					try {
						$scope.component.properties[$scope.key]	=	_serialize( value);
						$log.debug( 'systemIntentEditor changed value for key', $scope.key);
						$scope.error	=	false;
					} catch ( err) {
						$scope.error	=	true;
					}
				});
				
				$scope.$watch( function () {
					$log.debug( 'systemIntentEditor component value changed for key', $scope.key);
					return $scope.component.properties[$scope.key];
				}, function ( value) {
					$scope.value	=	_deserialize( value);
					$scope.error	=	false;
				});
				
				function _serialize( val)
				{
					if ( val) {
						return val.split(',').map( function(item) {
							  return item.trim();
						});
					}
					return [];
				}
				
				function _deserialize( val)
				{
					if ( angular.isArray( val)) {
//						val = val.filter(function (el) {
//							  return el.trim() != '';
//						});
						return val.join( ',');
					}
					return '';
				}
				
			}
		}
	}
})();