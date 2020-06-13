(function () {
	"use strict";

	angular
		.module( 'adomee.admin')
		.directive( 'propertiesEditor', propertiesEditor);

	/* @ngInject */
	function propertiesEditor( $log, ConvoworksApi) {
		return {
			restrict: 'E',
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/properties-editor.tmpl.html',
			scope: {
				component: '=',
				definition: '=',
				service: '=',
				help: '=?'
			},
			link: function ( $scope, $element, $attributes, propertiesContext) {
				var watchers    =   [];
				$scope.help = null;
				$scope.tabIndex = { active: "b" };

				_setupBlockIds();
				
				$scope.getBlockId	=	function() {
					var block_id	=	null;
					if ( $scope.component.properties.block_id) {
						block_id	=	$scope.component.properties.block_id;
					}
					if ( $scope.component.properties.fragment_id) {
						block_id	=	$scope.component.properties.fragment_id;
					}
					
					return block_id;
				};
				
				$scope.getComponentName	=	function() {
					
					if ( $scope.component.properties.name) {
						return $scope.component.properties.name + ' ('+$scope.definition.name+')';
					}
					
					if ( $scope.component.properties.block_id) {
						return $scope.component.properties.block_id + ' ('+$scope.definition.name+')';
					}
					
					if ( $scope.component.properties.fragment_id) {
						return $scope.component.properties.fragment_id + ' ('+$scope.definition.name+')';
					}
					
					return $scope.definition.name;
				};
				
				$scope.getComponentDescription	=	function() {
					
					var block_id	=	$scope.getBlockId();
					
					if ( block_id === '__serviceProcessors') {
						return 'System block which contains only processors. This processors will be considered on any active step process phase.';
					} 
					
					if ( block_id === '__sessionStart') {
						return 'System block that executes only when the new session has started. If you leave it empty, the first regular step will be used.';
					}
					
					if ( block_id === '__sessionEnd') {
						return 'This step is called when session ends. You can not output anything here, but you might do cleanup or statistics here.';
					}
					
					if ( block_id === '__mediaControls') {
						return 'Serves for handling media playing requests (they are sessionless)';
					}
					
					return $scope.definition.description;
				};

				$scope.checkComponentHelp = function() {
					if ( $scope.component.properties._help) {
						return true;
					}
				};

				$scope.displayEditor	=	function() {
					return !!$scope.component && Object.keys( $scope.component).length > 0;
				};

				$scope.closeEditor		=	function() {
					propertiesContext.setSelectedComponent( null );
				};

				$scope.removeComponent  =   function()
				{
					propertiesContext.removeComponent();
					propertiesContext.setSelectedComponent( null, null);
				};

				$scope.isSystemBlock    =   function()
				{
					return !!$scope.component.properties.block_id && _isSystem( $scope.component.properties.block_id);
				};

				$scope.isObject         =   function( val) {
					return ( val !== null) && ( !Array.isArray( val)) && ( val instanceof Object);
				};

				$scope.removeUtterance  =   function( i)
				{
					$scope.component.properties.utterances.splice( i, 1);
				};

				$scope.addUtterance     =   function()
				{
					if ( !$scope.component.properties.utterances) {
						$scope.component.properties.utterances	=	[];
					}
					$scope.component.properties.utterances.push( "New utterance");
				};

				$scope.addOkSpecificUtterance   =   function( name)
				{
					if ( !$scope.component.properties.ok_specific[name].properties.utterances) {
						$scope.component.properties.ok_specific[name].properties.utterances =   [];
					}

					$scope.component.properties.ok_specific[name].properties.utterances.push( "New utterance");
				};

				$scope.removeOkSpecificUtterance    =   function( name, i)
				{
					$scope.component.properties.ok_specific[name].properties.utterances.splice( i, 1);
				};

				$scope.maybeInt						=	function( value)
				{
					var ret	=	value * 1;
					
					if ( isNaN( ret))
						return value;
					
					return ret;
				};
				
				$scope.$watch( 'service.blocks', _setupBlockIds, true);

				$scope.$watch( 'component.properties._component_id', function () {
					$scope.help = null;
					$scope.tabIndex = { active: "b" };
					_getComponentHelp();
				}, true);

				$scope.$watch( 'component', function (newVal) {
					if ( !newVal) {
						return;
					}

					if (!$scope.component.properties) {
						$log.warn( 'propertiesEditor block quickfix');
						return;
					}
					
					_setupParamBuffer();
					
					// TODO: this should be handled in property editors themself
					angular.forEach( $scope.definition.component_properties, function( definition, key) {
						// $log.log( 'propertiesEditor $watch.component each %o definition %o', key, definition);
						
						if ( definition.editor_type == 'service_components') {
							return;
						}

						if ( key.indexOf( '_') === 0) {
							return;
						}

						if ( !$scope.component.properties[key]) {
							return;
						}

						if ( key === 'ok_specific' || key === 'nok_specific') {
							return;
						}
						
						switch ( definition.valueType)
						{
							case 'string':
								if ( !!definition.editor_properties.multiple) {
									$scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'string');
								} else {
									$scope.component.properties[key]	=	"" + $scope.component.properties[key];
								}

								break;
							case 'boolean':
								$scope.component.properties[key]	=	_castToBool( $scope.component.properties[key]);
								break;
							case 'array':
								$scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'other');
								break;
							case 'int':
								if ( !!definition.editor_properties.multiple) {
									$scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'number');
								} else {
									$scope.component.properties[key]	=	parseInt( $scope.component.properties[key], 10);
								}
								break;
							case 'object':
								break;
							default:
								throw new Error( 'Unknown value type [' + 
										$scope.definition.component_properties[key].valueType + '] for ['+key+'] and value ['+ $scope.component.properties[key] +']');
						}
					});
				}, true);

				function _setupBlockIds()
				{
					$scope.processSubroutines	=	$scope.service.fragments.filter( function( fragment) {
						return fragment.properties._workflow === 'process';
					}).map( function( fragment) {
						return { id : fragment.properties.fragment_id, name : _fixName( fragment.properties.fragment_id, fragment.properties.name)};
					});

					$scope.readSubroutines	=	$scope.service.fragments.filter( function( fragment) {
						return fragment.properties._workflow === 'read';
					}).map( function( fragment) {
						return { id : fragment.properties.fragment_id, name : _fixName( fragment.properties.fragment_id, fragment.properties.name)};
					});

					$scope.userBlocks	=	$scope.service.blocks.filter( function( block) {
						return block.properties.block_id.indexOf('__') !== 0;
					}).map( function( block) {
						return { id : block.properties.block_id, name : _fixName( block.properties.block_id, block.properties.name)};
					});
				}
				
				function _fixName( id, name) {
					if ( name) {
						return name;
					}
					return 'ID: ' + id;
				}

				function _setupParamBuffer()
				{
					if ( watchers.length > 0) {
						angular.forEach( watchers, function( watcher) { watcher(); });
					}

					watchers    =   [];

					$scope.paramBuffer	=	{};

					for ( var key in $scope.definition.component_properties)
					{
						if ( $scope.definition.component_properties[key].editor_type !== 'params') {
							continue;
						}

						// TODO: this is a quickfix, needs to be handled properly.
						if ( $scope.definition.component_properties[key].valueType !== 'array') {
							continue;
						}

						var id  =   _keyToIdentifier( key);

						$scope.paramBuffer[id] =   [];

						for ( var prop in $scope.component.properties[key])
						{
							$scope.paramBuffer[id].push( {
								'key': prop,
								'value': $scope.component.properties[key][prop]
							});
						}
					}

					$scope.keyToIdentifier  =   _keyToIdentifier;
					$scope.identifierToKey  =   _identifierToKey;

					$scope.removeParamPair	=	function( id, i)
					{
						$scope.paramBuffer[id].splice( i, 1);
					};

					$scope.addParamPair		=	function( id)
					{
						var new_idx	=	$scope.paramBuffer[id].length;

						$scope.paramBuffer[id].push( {
							'key': 'new_value_' + new_idx,
							'value': 'temp_value'
						})
					};

					var i   =   -1;

					// TODO: this is really suboptimal, but it works. Fix later.
					for ( var key in $scope.paramBuffer)
					{
						watchers[++i]   =   $scope.$watch( 'paramBuffer.'+key, function ( newVal) {
							for ( var id in $scope.paramBuffer)
							{
								var prop_name   =   _identifierToKey( id);
								var new_props   =   {};

								for ( var i in $scope.paramBuffer[id])
								{
									var pair    =   $scope.paramBuffer[id][i];

									var new_key =   _cleanKey( pair.key);

									new_props[new_key] =   pair.value;
								}

								$scope.component.properties[prop_name]  =   new_props;
							}
						}, true);
					}
				}

				// UTIL
				function _cleanKey( key)
				{
					if ( key === '') {
						return 'temp';
					}

					// var cleaned	=	key.toLowerCase();

					return key.replace( /\s+\./g, '_');
				}

				function _isSystem( blockId) {
					return blockId.indexOf( '__') >= 0;
				}

				function _isRead( blockId) {
					return blockId.indexOf( '_read_') >= 0;
				}

				function _castToBool( value) {
					if ( value === 'false')
						return false;

					if ( value === 'true')
						return true;

					return !!value;
				}

				function _asArray( value, prevType) {
					$log.log( 'propertiesEditor _asArray value', value, 'prevType', prevType);

					if ( !prevType) {
						throw new Error( 'Expected a type to work with, got ' + prevType);
					}

					if ( !value) {
						return [];
					}

					if ( Array.isArray( value)) { // Already an array, cast values just to be sure
						switch ( prevType)
						{
							case 'other':
							case 'string':
								return value
									.map( function( val) { return val.split( ',').map( function( piece) { return ("" + piece).trim(); }); })
									.reduce( function( a, b) { return a.concat( b); }, []);
							default:
								throw new TypeError( 'Unsupported type [' + prevType + ']');
						}
					}

					switch ( prevType)
					{
						case 'string':
							$log.log( 'propertiesEditor _asArray prevType is string');
							var splitArray  =   value.split( ',').map( function( s) { return ("" + s).trim(); });

							$log.log( 'propertiesEditor _asArray returning', splitArray);

							return splitArray;
						case 'number':
							var numbers     =   value.split( /\s,/g).map( function( n) { return parseInt( n, 10) });

							$log.log( 'propertiesEditor _asArray returning', numbers);

							return numbers;
						case 'other': // TODO: temporary
							return value;
						default:
							throw new Error( 'Unsupported type [' + prevType + ']');
					}

					// return value;
				}

				function _getComponentHelp() {
					if ($scope.help === null && $scope.component.properties._help) {
						if ($scope.component.properties._help.type === 'file') {
							ConvoworksApi.getPackageComponentHelp($scope.component.namespace, $scope.component.properties._help.filename).then(function (data) {
								$scope.help = data;
							}, function (reason) {
								$log.debug('propertiesEditor getComponentHelp() reason', reason);
							});
						} else if ($scope.component.properties._help.type === 'html') {
							$scope.help = $scope.component.properties._help.template;
						}
					}
				}


				// PARAMS UTIL
				function _keyToIdentifier( key)
				{
					return '$$_'+key+'_pbuffer';
				}

				function _identifierToKey( id)
				{
					var regex   =   /\$\$_(\w+)_pbuffer/g;

					var matches =   regex.exec( id);

					return matches[1];
				}
			}
		}
	}
})();