(function() {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'blockComponent', blockComponent);

	/* @ngInject */
	function blockComponent( $log, $timeout, ConvoworksApi, UserPreferencesService)
	{
		return {
			restrict: 'E',
			scope: { 'block' : '=' },
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/block-component.tmpl.html',
			link: function( $scope, $element, $attributes, propertiesContext) {
				var USER_PREFERENCES_KEY	=	'';
				// API
				$scope.over					=	false;
				$scope.ready				=	false;
				$scope.componentTitle		=	"";
				$scope.componentName        =   "";

				$scope.isSysBlock			=	false;
				$scope.isReadBlock			=	false;
				$scope.isSysProcessors		=	false;
				$scope.isSessionEnd			=	false;

				$scope.isSysBlockOpen		=	{ value: false };

				$scope.getComponentTitle	=	function() {
					if ( !$scope.definition) {
						return 'Generating title ...';
					}
					
					if ( $scope.block.properties.name) {
						return $scope.block.properties.name;
					}
					
					if ( $scope.block.properties.block_id.indexOf( '__') === 0) {
						return 'System - ' + $scope.block.properties.block_id + '';
					}
					
					if ( $scope.block.properties.block_id.indexOf( '_read_') === 0) {
						return 'Fragment - ' + $scope.block.properties.block_id + '';
					}
					
					return $scope.block.properties.block_id;
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
					$log.log( 'blockComponent $destroy');
				});
				
				// INIT
				var open	=	{
						elements : false,
						processors : false,
						default: false
				}
				_init();
				
				function _init()
				{
//					$log.log( 'blockComponent _init() got ', '$scope.block.properties.block_id ['+$scope.block.properties.block_id+']', '$scope.block', $scope.block);
					
					ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Elements\\ConversationBlock').then( function( definition) {
//						$log.log( 'blockComponent got definition', definition);
						
						if ( $scope.block.properties.block_id.indexOf( '__') === 0) {
							
							$scope.componentTitle	=	'System - ' + $scope.block.properties.block_id + '';
							$scope.isSysBlock		=	true;
							if ( $scope.block.properties.block_id === '__serviceProcessors') {
								$scope.isSysProcessors		=	true;
							} else if ( $scope.block.properties.block_id === '__sessionEnd') {
								$scope.isSessionEnd		=	true;
							}
						} else if ( $scope.block.properties.block_id.indexOf( '_read_') === 0) {
							// $scope.isReadBlock		=	true;
							$scope.componentTitle	=	'Fragment - ' + $scope.block.properties.block_id + '';
						} else {
							$scope.componentTitle	=	$scope.block.properties.block_id;
						}

						$scope.componentName    =   $scope.block.properties.name;

						$scope.definition		=	definition;

						propertiesContext.getUser().then(function (user) {
							$log.log('blockComponent got user', user);
							USER_PREFERENCES_KEY	=	user.user_id + '_' + propertiesContext.getSelectedService()['service_id'] + '_' + $scope.block.properties['_component_id'];

							$log.log('blockComponent final user preferences key', USER_PREFERENCES_KEY);

							UserPreferencesService.getData(USER_PREFERENCES_KEY).then(function (value) {
								if (value !== null && value !== undefined) {
									$scope.isSysBlockOpen.value = value;
								} else {
									$scope.isSysBlockOpen.value = false;
								}
							});
						})

						$scope.$watch('isSysBlockOpen.value', function(value) {
							UserPreferencesService.registerData(USER_PREFERENCES_KEY, value);
						});
					}, function( reason) {
						$log.error( 'blockComponent got reason', reason);
					}).finally( function() {
//						$log.log( 'blockComponent definitions finally');
						$scope.$applyAsync( function() {
							$scope.ready			=	true;
						});
					});
					
					$timeout( function() {
						_initClick();
					}, 10)
				}
				
				function _initClick()
				{
					var $div	=	$element.first( 'div.selectable-component');

					var containerController =   {
						removeSelection: function() { propertiesContext.removeBlock( $scope.block.properties.block_id); }
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