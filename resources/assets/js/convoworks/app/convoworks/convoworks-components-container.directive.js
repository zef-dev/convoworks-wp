(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'convoworksComponentsContainer', convoworksComponentsContainer);

	/* @ngInject */
	function convoworksComponentsContainer( $log, $timeout)
	{
		var AUTO_OPEN_TIMEOUT	=	1500;
		
		return {
			restrict: 'E',
			scope: { 
				'component' : '=',
				'propertyName' : '=',
				'propertyDefinition' : '=',
			},
			require: [ '^convoworksComponentsContainer', '^propertiesContext'],
			templateUrl: 'app/convoworks/convoworks-components-container.tmpl.html',
			controller : function ( $scope) {
				
				this.getPropertyDefinition		=	getPropertyDefinition;
				this.getContainer				=	getContainer;
				this.isMultiple					=	isMultiple;
				this.indexOf					=	indexOf;
				this.addComponent				=	addComponent;
				this.removeComponent			=	removeComponent;
				
				function getPropertyDefinition()
				{
					return $scope.propertyDefinition;
				}
				
				function getContainer()
				{
					if ( $scope.propertyName.indexOf( '.') > -1) {
						var o       =   $scope.component.properties;
						var parts   =   $scope.propertyName.split( '.');

						for ( var i = 0; i < parts.length; i++) {
							o   =   o[parts[i]];
						}

						return o;
					}

					if ( $scope.component && $scope.component.properties)
						return $scope.component.properties[$scope.propertyName];

					$log.warn( 'convoworksComponentsContainer controller getContainer() no property ['+$scope.propertyName+'] in $scope.component', $scope.component);
				}
				
				function isMultiple()
				{
					return $scope.propertyDefinition.editor_properties.multiple;
				}
				
				function indexOf( component)
				{
					if ( isMultiple()) {
						return getContainer().indexOf( component);
					}
					return 0;
				}
				
				function addComponent( component, index)
				{
					if ( !index) {
						index	=	0;
					}
					
					if ( isMultiple()) {
						$log.log( 'convoworksComponentsContainer controller addComponent() adding component', component, 'at index', index);
						getContainer().splice( index, 0, component);
						return;
					}
					
					$log.log( 'convoworksComponentsContainer controller addComponent() setting component', component);
					$scope.component.properties[$scope.propertyName]	=	component;
				}
				
				function removeComponent( component)
				{
					if ( isMultiple()) {
						var index	=	getContainer().indexOf( component);
						$log.log( 'convoworksComponentsContainer controller removeComponent() removing component', component, 'from index', index);
						getContainer().splice( index, 1);
						return;
					}
					
					$log.log( 'convoworksComponentsContainer controller removeComponent() setting container at null');
					$scope.component.properties[$scope.propertyName]	=	null;
				}
			},
			link: function( $scope, $element, $attributes, $ctrls) {
				
				var convoworksComponentsContainer	=	$ctrls[0];
				var propertiesContext				=	$ctrls[1];
//				$log.log( 'convoworksComponentsContainer link() $scope.component.properties[$scope.propertyName]', $scope.component.properties[$scope.propertyName], 'convoworksComponentsContainer', convoworksComponentsContainer);
				
				var open		=	false;
				var open_timer	=	null;
				
				if ( 'defaultOpen' in $scope.propertyDefinition) {
//					$log.log( 'convoworksComponentsContainer setting defaultOpen', $scope.propertyDefinition['defaultOpen']);
					open	=	$scope.propertyDefinition['defaultOpen'];
				}
//				_initDroppableBackground();
				
				_initDroppable();
				
				// API
				$scope.toggleOpen		=	function() {
					open	=	!open;
				};
				
				$scope.isOpen		=	function() {
					return open;
				};
				
				
				
				$scope.shouldHide	=	function() {
					if ( !convoworksComponentsContainer.getContainer()) {
						return true;
					}
					return $scope.propertyDefinition.editor_properties.hideWhenEmpty && convoworksComponentsContainer.getContainer().length == 0; 
				}
				
				$scope.getContainer	=	convoworksComponentsContainer.getContainer;
				
                $scope.getContextOptions    =   function() {
                    
                    var options =   [];
                    
                    if ( propertiesContext.hasClipboard()) {
                        options.push(
                            {
                                text: 'Paste',
                                click: function ($itemScope, $event, modelValue, text, $li) {
                                    $log.log( 'convoworksComponentsContainer context paste');
                                    propertiesContext.paste( convoworksComponentsContainer, convoworksComponentsContainer.getContainer().length);
                                }
                            }
                        );    
                    }
                    
                    return options;
                }
				
                $scope.$on(
                        "$destroy",
                        function( event ) {
					    	  if ( open_timer) {
					    		  $timeout.cancel( open_timer );
					    		  open_timer	=	null;
					    	  }
                        }
                    );
                
				
				// PRIVATE
				function _initDroppable()
				{
					var $droppable	=	$($element.find( '.prop-container')[0]);
					$droppable.droppable({
						greedy: true,
					    drop: function( event, ui ) {
					    	var data	=	ui.draggable.data('convoDragged');
					    	$log.log( 'convoworksComponentsContainer drop event', event, 'ui', ui, 'data', data);
					    	
					    	if ( data) {
					    		
					    	      if ( data.handled) {
					    			  $log.log( 'convoworksComponentsContainer already handled');
					    			  return;
					    		  }
					    		
						          $scope.$apply( function() {
						        	  
							          if ( data.type == 'definition') {
							        	  $log.log( 'convoworksComponentsContainer new component', data.componentDefinition, 'to container', $scope.component.properties[$scope.propertyName], 'in component', $scope.component);
							        	  
							        	  propertiesContext.addNewComponent( 
							        			  convoworksComponentsContainer, 
							        			  data.componentDefinition);
							          } else if ( data.type == 'component') {
							        	  $log.log( 'convoworksComponentsContainer move component', data.component);
							        	  
							        	  propertiesContext.moveComponent( 
							        			  data.containerController,
							        			  convoworksComponentsContainer, 
							        			  data.component);
//							        	  }
							          } else {
							        	  throw new Error( 'Expected to have type [definition] or [component]');
							          }
							          data.handled	=	true;
							          open = true;
								});
					    	  } else {
					    		  $log.error( 'convoworksComponentsContainer Expected to have [convoDragged] data ['+event.target.className+']');
					    	  }
					    	return false;
					      },
					      over: function( event, ui) {
					    	  if ( !open) {
					    		  open_timer	=	$timeout( function() {
					    			  open = true;
					    		  }, AUTO_OPEN_TIMEOUT);
					    	  }
					      }, 
					      out: function( event, ui) {
					    	  if ( open_timer) {
					    		  $timeout.cancel( open_timer );
					    		  open_timer	=	null;
					    	  }
					      }, 
					    });
				}
				function _initDroppableBackground()
				{
					var $droppable	=	$($element.find( '.real-container')[0]);
//					$log.log( 'convoworksComponentsContainer _initDroppableBackground() $droppable', $droppable);
//					$droppable.on( 'dragover', function( event) {
//						$log.log( 'convoworksComponentsContainer _initDroppableBackground()');
//						event.stopImmediatePropagation();
//					})
					$droppable.droppable({
						greedy: true,
//						accept : '#pattern',
						over: function( event, ui ) {
					//		event.stopImmediatePropagation();
						},
						activate: function( event, ui ) {
						//	event.stopImmediatePropagation();
						},
//						out: function( event, ui ) {
//							event.stopImmediatePropagation();
//						},
					});
				}
			}
		}
	}
})();