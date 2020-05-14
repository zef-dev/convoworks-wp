(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'subroutineComponent', subroutineComponent);

	/* @ngInject */
	function subroutineComponent( $log, $timeout, ConvoworksApi)
	{
		return {
			restrict: 'E',
			scope: { 'block' : '='},
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/subroutine-component.tmpl.html',
			link: function( $scope, $element, $attributes, propertiesContext) {
				
				// API
				$scope.over					=	false;
				$scope.ready				=	false;
				$scope.componentTitle		=	"";
				$scope.componentName        =   "";

				$scope.isReadBlock			=	false;
				
				$scope.getComponentTitle	=	function() {
					if ( !$scope.definition) {
						return 'Generating title ...';
					}
					
					if ( $scope.block.properties.name) {
						return $scope.block.properties.name;
					}
					
					return 'Fragment - ' + $scope.block.properties.fragment_id + '';
				};
				
				$scope.isSelected	=	function() {
					return propertiesContext.getSelection().component === $scope.block;
				};

				$scope.toggleOpen	=	function( type) {
					open[type]	=	!open[type];
				};
				
				$scope.isOpen	=	function( type) {
					return open[type];
				};
				
				$scope.$on( '$destroy', function() {
					$log.log( 'subroutineComponent $destroy');
				});
				
				// INIT
				var open	=	{
						elements : false,
						processors : false,
				}
				_init();
				
				function _init()
				{
//					$log.log( 'subroutineComponent _init() got ', '$scope.block.properties.subroutine_id ['+$scope.block.properties.subroutine_id+']', '$scope.block', $scope.block);
					
					if ( $scope.block.properties._workflow == 'read') {
						ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment').then( function( definition) {
	//						$log.log( 'subroutineComponent got definition', definition);
							
							$scope.componentTitle		=	'Fragment - ' + $scope.block.properties.fragment_id + '';
							$scope.componentName    	=   $scope.block.properties.name;
							$scope.definition			=	definition;
							$scope.propertyName			=	'elements';
							$scope.propertyDefinition	=	definition.component_properties.elements;
							
						}, function( reason) {
							$log.error( 'subroutineComponent got reason', reason);
						}).finally( function() {
	//						$log.log( 'subroutineComponent definitions finally');
							$scope.$applyAsync( function() {
								$scope.ready			=	true;
							});
						});
					} else if ( $scope.block.properties._workflow == 'process') {
						ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment').then( function( definition) {
	//						$log.log( 'subroutineComponent got definition', definition);
							
							$scope.componentTitle		=	'Fragment - ' + $scope.block.properties.fragment_id + '';
							$scope.componentName    	=   $scope.block.properties.name;
							$scope.definition			=	definition;
							$scope.propertyName			=	'processors';
							$scope.propertyDefinition	=	definition.component_properties.processors;
							
						}, function( reason) {
							$log.error( 'subroutineComponent got reason', reason);
						}).finally( function() {
	//						$log.log( 'subroutineComponent definitions finally');
							$scope.$applyAsync( function() {
								$scope.ready			=	true;
							});
						});
					} else {
						throw new Error( 'Unexpected subroutine type ['+$scope.block.properties._workflow+']');
					}


					
					$timeout( function() {
						_initClick();
					}, 10)
				}
				
				function _initClick()
				{
					var $div	=	$element.first( 'div.selectable-component');

					var containerController =   {
						removeSelection: function() { propertiesContext.removeSubroutine( $scope.block.properties.fragment_id); }
					};

					$div.bind( 'click', function( event) {
						if ( $scope.isSelected()) {
							propertiesContext.setSelectedComponent( null);
						} else {
							propertiesContext.setSelectedComponent( $scope.block, containerController);
						}
						event.stopPropagation();
					});
				}
			}
		}
	}
})();