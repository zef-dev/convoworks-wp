(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'convoworksTrash', convoworksTrash);

	/* @ngInject */
	function convoworksTrash( $log, ConvoworksApi, ConvoworksAddBlockService) {
		return {
			restrict: 'A',
			require: '^propertiesContext',
//			scope: {
//				serviceId : '='
//			},
			scope: true,
			link : function( $scope, $element, $attributes, propertiesContext) {
				
				$log.log( 'convoworksTrash link $element', $element);
				
				_init();
				
				function _init()
				{
					$log.log( 'convoworksTrash _init() service');
					_initDroppable();
				}
				
				function _initDroppable()
				{
					var $droppable	=	$element.find( 'div.trash-container');
					$log.log( 'convoworksTrash _initDroppable() $droppable', $droppable);
					$element.droppable({
						greedy: true,
					    drop: function( event, ui ) {
					    	  if ( ui.draggable.data('convoDragged')) {
						          $scope.$apply( function() {
						        	  var data	=	ui.draggable.data('convoDragged');
							          if ( data.type == 'definition') {
							        	  $log.log( 'convoworksTrash remove definition not acceptable', data.componentDefinition);
							          } else if ( data.type == 'component') {
							        	  $log.log( 'convoworksTrash remove component', data.component);
							        	  data.containerController.removeComponent( data.component);
							          } else {
							        	  throw new Error( 'Expected to have type [definition] or [component]');
							          }
								});
					    	  } else {
					    		  throw new Error( 'Expected to have [convoDragged] data');
					    	  }
					      },
					      over: function( event, ui) {
					      }, 
					      out: function( event, ui) {
					      }, 
					    });
				}
			}
		}
	}
	
	
	
})();