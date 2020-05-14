(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'selectableComponent', selectableComponent);

	/* @ngInject */
	function selectableComponent( $log, ConvoworksApi, $timeout, $compile)
	{
		return {
			restrict: 'E',
			scope: { 'component' : '=' },
			require: [ '^propertiesContext' , '^convoworksComponentsContainer'],
			templateUrl: 'app/convoworks/selectable-component.tmpl.html',
			link: function( $scope, $element, $attributes, $ctrls) {
				
				var propertiesContext				=	$ctrls[0];
				var convoworksComponentsContainer	=	$ctrls[1];
				var $draggable;
				var service					=	propertiesContext.getSelectedService();
//				$log.log( 'selectableComponent link() $scope.component', $scope.component);
				
				$scope.showTitle			=	true;
				$scope.hideTitle			=	true;
				$scope.over					=	false;
				$scope.ready				=	false;
				$scope.componentTitle		=	"";
				
				$scope.isElement			=	false;
				$scope.isProcessor			=	false;
				$scope.isFilter				=	false;

				_init();

				$scope.isSelected	=	function() {
					return propertiesContext.getSelection().component === $scope.component;
				};
				
				$scope.getBlockName	=	function( blockId) {
					try {
						var block	=	propertiesContext.findBlock( blockId);
					} catch ( err) {
						return 'ID: ' + blockId;
					}
					if ( block.properties.name) {
						return block.properties.name;
					}
					return 'ID: ' + blockId;
				}
				
				$scope.getSubroutineName	=	function( fragmentId) {
					try {
						var fragment	=	propertiesContext.findSubroutine( fragmentId);
					} catch ( err) {
						return 'ID: ' + fragmentId;
					}
					if ( fragment.properties.name) {
						return fragment.properties.name;
					}
					return 'ID: ' + fragmentId;
				}
				
				$scope.$on( '$destroy', function() {
					$log.log( 'selectableComponent $destroy');
					if ($draggable) {
						$draggable.draggable({disabled: true}).draggable( 'destroy');
					}
				});

				function _init()
				{
//					$log.log( 'selectableComponent _init() $scope.component', $scope.component);
					
					if ( !$scope.component) {
						throw new Error( 'No component defined');
					}
//					$log.log( 'selectableComponent _init() got class ['+$scope.component['class']+']', '$scope.component', $scope.component);
					
					var class_name	=		$scope.component['class'];
					if ( !class_name) {
						$log.log( 'selectableComponent _init() $scope.component', $scope.component);
						throw new Error( 'No class in component');
					}
					ConvoworksApi.getComponentDefinition( class_name).then( function( definition) {
//						$log.log( 'selectableComponent got definition', definition);
						
						$scope.definition		=	definition;
						$scope.componentTitle	=	definition.name;
						$scope.isElement		=	false;
						
						if ( !definition.component_properties._interface) {
							if ( definition.component_properties._preview_angular) {
								$scope.showTitle	=	false;
							}
							return;
						}
						
						if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationProcessor') {
							$scope.isProcessor		=	true;
							$scope.componentTitle	=	definition.name;
						} else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IRequestFilter') {
							$scope.isFilter			=	true;
						} else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationElement') {
							$scope.isElement		=	true;
						}
						
						if ( !$scope.isProcessor && definition.component_properties._preview_angular) {
							$scope.showTitle	=	false;
						}

						if (definition.type === '\\Convo\\Pckg\\Core\\Elements\\ElseIfElement' ||
							definition.type === '\\Convo\\Pckg\\Core\\Elements\\IfElement') {
							$scope.hideTitle = false;
						} else {
							$scope.hideTitle = true;
						}
					}, function( reason) {
						$log.error( 'selectableComponent definitions got reason', reason);
					}).finally( function() {
//						$log.log( 'selectableComponent definitions finally');
						$scope.$applyAsync( function() {
							$scope.ready			=	true;
						});
						
						// good old timeout
						$timeout( function() {
							_initPreview();
							_initDraggable();
							_initDroppable();
							_initClick();
						}, 10)
					});
				}
				
				function _initDraggable()
				{
					$draggable	=	$element.find( 'div.selectable-component');
//					$log.log( 'selectableComponent link() $draggable', $draggable);
					$draggable.draggable( { 	
						revert: true, 
						revertDuration : 50, 
						zIndex: 100, 
						delay : 200,
						tolerance : 'pointer',
						start: function( event, ui) {
//				            $(this).data( 'component', $scope.component);
				            $(this).data( 'convoDragged', {
				            	type : 'component',
				            	component : $scope.component,
				            	containerController : convoworksComponentsContainer
				            });
				            
				            ui.helper.bind( "click.prevent",
				                    function(event) { event.preventDefault(); });
				        },
				        stop: function( event, ui) {
				        	setTimeout(function(){ui.helper.unbind("click.prevent");}, 300);
				        },
					});
				}
				
				function _initDroppable()
				{
					var $droppable	=	$element.find( 'div.selectable-component');
					
					$( $droppable ).droppable({
						greedy: true,
					    drop: function( event, ui ) {
					    	  if ( ui.draggable.data('convoDragged')) {
						          $scope.$apply( function() {
						        	  
						        	  var data		=	ui.draggable.data('convoDragged');
						        	  var index		=	convoworksComponentsContainer.indexOf( $scope.component) + 1;
						        	  
							          if ( data.type == 'definition') {
							        	  $log.log( 'convoworksComponentsContainer new component', data.componentDefinition, 'to container', $scope.container, 'in component', $scope.component);
							        	  
							        	  propertiesContext.addNewComponent( 
							        			  convoworksComponentsContainer, 
							        			  data.componentDefinition, 
							        			  index);
							        	  
							          } else if ( data.type == 'component') {
							        	  $log.log( 'convoworksComponentsContainer move component', data.component);
							        	  
							        	  propertiesContext.moveComponent( 
							        			  data.containerController,
							        			  convoworksComponentsContainer, 
							        			  data.component, 
							        			  index);
							        	  
							          } else {
							        	  throw new Error( 'Expected to have type [definition] or [component]');
							          }
								});
					    	  } else {
					    		  throw new Error( 'Expected to have [convoDragged] data');
					    	  }
					      }
					    });
				}
				
				function _initClick()
				{
					var $div	=	$element.find( 'div.selectable-component');
					$div.bind( 'click', function( event) {
						$log.log( 'selectableComponent click $scope.isSelected()', $scope.isSelected());
						if ( $scope.isSelected()) {
							propertiesContext.setSelectedComponent( null);
						} else {
							propertiesContext.setSelectedComponent( $scope.component, { removeSelection: convoworksComponentsContainer.removeComponent });
						}
						
						event.stopPropagation();
					});
				}
				
				function _initPreview() {
					var container	=	$element.find( '.preview');
					if ( $scope.definition.component_properties._preview_angular) {
//						$log.log( 'selectableComponent _initPreview() $scope.definition.component_properties._preview_angular', $scope.definition.component_properties._preview_angular);
						var html		=	$scope.definition.component_properties._preview_angular.template;
						container.html( html);
						$compile( container.contents())( $scope);
					} else {
						container.html( '');
					}
				};
			}
		}
	}
})();