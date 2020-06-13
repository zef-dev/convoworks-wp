(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'convoworksToolboxComponent', convoworksToolboxComponent);

	/* @ngInject */
	function convoworksToolboxComponent( $log, $compile)
	{
		return {
			restrict: 'E',
			scope: { 
				'componentDefinition' : '='
			},
			require : '^propertiesContext',
			templateUrl: 'app/convoworks/convoworks-toolbox-component.tmpl.html',
			link: function( $scope, $element, $attributes, propertiesContext) {
//				$log.log( 'convoworksToolboxComponent _init() $scope.componentDefinition', $scope.componentDefinition, 'propertiesContext', propertiesContext);

				_initDraggable();
				
				$scope.isDeprecated	=	function() {
					if ( $scope.componentDefinition.name.indexOf('X!') === 0 || $scope.componentDefinition.name.indexOf('x!') === 0) {
						return true;
					}
					return false;
				}
				
				function _initDraggable()
				{
					var $draggable	=	$element.find( '.toolbox-component');
					$draggable.draggable( { 
						revert: false, 
						zIndex: 100, 
						opacity: 1, 
						helper: 'clone',
						tolerance : 'pointer',
						start: function(e) {
				            $(this).data( 'convoDragged', {
				            	type : 'definition',
				            	componentDefinition : $scope.componentDefinition
				            });
				        },
					});
				}
			}
		}
	}
})();