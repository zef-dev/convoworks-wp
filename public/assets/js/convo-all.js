(function () {
    'use strict';

    angular.module('convo.wp', [ 'convo.editor', 'ngRoute']);
            
    angular.module('convo.wp').factory('$exceptionHandler', function ($injector, $log) {


        return function (exception, cause) {
            var AlertService = $injector.get('AlertService');
            AlertService.addDanger(exception.message);
            $log.error(exception);
//      exception.message += ' (caused by "' + cause + '")';
//        throw exception;
        };
    });

    angular.module('convo.wp').run(

        function( $log, $rootScope, $location, LoginService) {
            
            LoginService.getUser().finally( function () {
                // register listener to watch route changes
                $rootScope.$on( "$routeChangeStart", function( event, next, current) {
                    
                    $log.debug('$routeChangeStart current', current);
                    $log.debug('$routeChangeStart next', next);
                    $log.debug('$routeChangeStart next.originalPath', next.originalPath);
                    $log.debug('$routeChangeStart', LoginService);
                    if (!LoginService.isSignedIn()) {
                        $log.debug( '$routeChangeStart run() DENY');

                        if ( next.originalPath && (next.originalPath != '/')) {
                            event.preventDefault();
                            $location.url('/');
                        }
                    }
                    else {
                        $log.debug( '$routeChangeStart run() ALLOW');
                    }
                });
            });
            }
    );

    angular.module('convo.wp').factory( 'authInterceptor', function ( $rootScope, $q, $log, $location, WP_NONCE) {
        return {
            'request': function(config) {
                if (WP_NONCE !== undefined && WP_NONCE !== null && WP_NONCE !== '') {
                    $log.log('authInterceptor set X-WP-Nonce header', WP_NONCE);
                    config.headers['X-WP-Nonce'] = WP_NONCE;
                }

                return config;
            },
            responseError: function ( response) {
                $log.debug('authInterceptor response', response);
                if ( response.status === 401) {
                    $log.debug('authInterceptor clear user $location.url()', $location.url());
                    $rootScope.clearUser();
                    $location.url('/');
                    return $q.reject( response);
                }
                
                if ( response.status >= 400) {
                    $log.debug('authInterceptor rejecting response.status', response.status);
                    return $q.reject( response);
                }
                
                return response || $q.when( response);
            }
        };
    });

    angular.module('convo.wp').config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    });
    
})();
(function () {
    'use strict';

    angular.module('convo.wp').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
                otherwise({
                    redirectTo: '/convoworks-editor'
                });
        }]);
})();
(function() {
    angular
        .module('convo.wp')
        .service('LoginService', LoginService);

    /* @ngInject */
    function LoginService( $log, $q, WP_USER) {

		this.isSignedIn    	=   isSignedIn;
		this.getUser   		=   getUser;

		function getUser()
		{
			var deferred	=	$q.defer();
            deferred.resolve( WP_USER);
			return deferred.promise;
		}

		function isSignedIn()
		{
			return true;
		}

    }
})();
(function () {
    'use strict';

    angular.module('convo.editor', [ 'ngRoute', 'ngAnimate', 'ngCookies', 'ngSanitize',
            'ui.bootstrap', 'ui.select', 'ui.bootstrap.contextMenu', 'LocalStorageModule', 'ngFileUpload', 'jsonFormatter']);
    
    angular.module('convo.editor').config(function (localStorageServiceProvider) {
          localStorageServiceProvider
            .setPrefix('convoAdmin')
//          .setStorageType('sessionStorage')
            .setNotify(true, true)
        });

})();
(function() {

	var module = angular.module('convo.editor');

	module.service('UserPreferencesService', UserPreferencesService);

	/* @ngInject */
	function UserPreferencesService( $log, $http, $q, localStorageService) {

		this.registerData		=	registerData;
		this.getData			=	getData;
			
		
		
		function getData( key)
		{
			var deferred	=	$q.defer();
			deferred.resolve( localStorageService.get( key));
			return deferred.promise;
		}
		
		function registerData( key, data)
		{
			localStorageService.set( key, data)
		}
	};
})();
(function() {

	'use strict';
	
	angular
		.module('convo.editor')
		.service('DeferredsStackService', DeferredsStackService);
	
	/* @ngInject */
	function DeferredsStackService( $log)
	{
		
		this.getNew		=	getNew;
    	
        function getNew()
        {
        	return new DeferredsStack();
        }
	}
	

	function DeferredsStack()
	{
		this.groups			=	{};
		this.resoulutions	=	{};
	}
	
	
	DeferredsStack.prototype.registered = function( key)
	{
		var deferreds	=	this._getGroup( key);
		if (deferreds.length) {
			return true;
		}
		return false;
	}
	
	DeferredsStack.prototype.register = function( key, deferred)
	{
		if (key in this.resoulutions)
		{
			deferred.resolve( this.resoulutions[key]);
			delete this.resoulutions[key];
			return;
		}
		
		var deferreds	=	this._getGroup( key);
		deferreds.push( deferred);
	}
	
	DeferredsStack.prototype.resolve = function( key, result)
	{
		var deferreds	=	this._getGroup( key);
		
		if (deferreds.length == 0)
		{
			this.resoulutions[key]	=	result;
			return;
		}
		
		var deferred;
		while (deferred = deferreds.shift()) {
			deferred.resolve( result);
		}
	}
	
	DeferredsStack.prototype.reject = function( key, reason)
	{
		var deferreds	=	this._getGroup( key);
		var deferred;
		while (deferred = deferreds.shift()) {
			deferred.reject( reason);
		}
	}
	
	DeferredsStack.prototype.rejectAll = function()
	{
		for (var key in this.groups)
			this.reject( key, null);
	}
	
	DeferredsStack.prototype._getGroup = function( key)
	{
		if (angular.isUndefined( this.groups[key]))
			this.groups[key] = [];
		return this.groups[key];
	}

})();
(function () {
	'use strict';
	
	angular.module('convo.editor').factory('AlertService', function ( $log, $timeout) {
	
	var 	alertsService	=	{};
	
	alertsService.alerts	=	[];
	
	alertsService.getAlerts	=	function()
	{
		return alertsService.alerts;
	};
	
	alertsService.addSucess	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'success'}, 5000);
	};
	
	alertsService.addDanger	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'danger'}, 5000);
	};
	
	alertsService.addInfo	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'info'}, 5000);
	};
	
	alertsService.addWarning	=	function( msg)
	{
		alertsService._addAlert( { msg : msg, type : 'warning'}, 5000);
	};
	
	alertsService._addAlert	=	function( alert, timeout)
	{
		alertsService.alerts.push( alert);
		$timeout(function () {
			alertsService.closeAlertObj( alert);
		}, timeout);
	};
	
	alertsService.closeAlert	=	function( index)
	{
		alertsService.alerts.splice(index, 1);
	};
	
	alertsService.closeAlertObj	=	function( alert)
	{
		var index	=	alertsService.alerts.indexOf( alert);
		if (index > -1)
			alertsService.closeAlert( index);
	};
	
	return alertsService;
});
})();
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
(function () {
	"use strict";

	angular
		.module( 'convo.editor')
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
(function () {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'convoIntentEditor', convoIntentEditor);

	/* @ngInject */
	function convoIntentEditor( $log) {
		return {
			restrict: 'E',
			require: '^propertiesContext',
			templateUrl: 'app/convoworks/editors/convo-intent-editor.tmpl.html',
			scope: {
				component: '=',
				propertyDefinition: '=',
				key: '=',
				service: '='
			},
			link: function ( $scope, $element, $attributes, propertiesContext) {
				$log.debug( 'convoIntentEditor link');
				$scope.error		=	false;
				$scope.intents		=	propertiesContext.getConvoIntents();
				$scope.slotPreviews	=	{};
				
				$log.debug( 'convoIntentEditor $scope.intents', $scope.intents, $scope.service);

				$scope.$watch(function() {
					return $scope.component.properties[$scope.key];
				}, function (val) {
					$log.log('convoIntentEditor selected intent changed', val);
					$scope.slotPreviews = {};

					if (val)
					{
						var intent = $scope.intents.filter(function(i) {
							return i.name === val;
						})[0];

						$log.log('convoIntentEditor $watch got matched intent', intent);

						if (intent.utterances)
						{
							intent.utterances
								.map(function (utterance) {
									// $log.log('convoIntentEditor mapping utterance models', utterance.model);
									return utterance.model;
								})
								.flat()
								.filter(function(model) {
									// $log.log('convoIntentEditor filtering models with types', model);
									return model.hasOwnProperty('type');
								})
								.map(function(model) {
									// $log.log('convoIntentEditor mapping model types and values', model);
									var slotValue = model['slot_value'] || model.type.replace('@', '');
									var slotType = model.type;

									if (!$scope.slotPreviews[slotValue]) {
										$scope.slotPreviews[slotValue] = slotType;
									}
								});
						}
					}
				});
			}
		}
	}
})();
(function () {
    'use strict';
    angular.module('convo.editor').directive('textArray', ['$log', function($log) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, $element, $attributes, ngModel) {
                function into(input) {
                    return input.split(',').map(function (s) { return s.trim() });
                }

                function out(data) {
                    return data.join(', ');
                }

                ngModel.$parsers.push(into);
                ngModel.$formatters.push(out);
            }
        }
    }])

})();
(function () {
    'use strict';
    angular.module('convo.editor').directive('loadingIndicator', ['$http', '$log', function ( $http, $log) {
        return {
            restrict: 'E',
            templateUrl : 'app/convoworks/common/loading.tmpl.html',
            link: function (scope, elm, attrs) {
                
                $log.log( 'loadingIndicator link');
                

                scope.$watch( function () {
                    return $http.pendingRequests.length > 0;
                }, function (v) {
                    if (v) {
                        elm.find('div.sk-cube-grid').show();
                    } else {
                        elm.find('div.sk-cube-grid').hide();
                    }
                });
            }
        };

    }]);

})();
(function () {
    'use strict';
    angular.module('convo.editor').directive('jsonText', ['$log', function($log) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                function into(input) {
                    try {
                        scope.$emit('JsonError', false);
                        return JSON.parse(input);
                    } catch (e) {
                        $log.warn('Error parsing JSON:', e.message);
                        scope.$emit('JsonError', true);
                        return {};
                    }
                }
                
                function out(data) {
                    return JSON.stringify(data, null, 2);
                }

                ngModel.$parsers.push(into);
                ngModel.$formatters.push(out);
            }
        };
    }]);

})();
(function () {
    'use strict';
    angular.module('convo.editor').directive('alertIndicator', ['AlertService', '$log', function ( AlertService, $log) {
        return {
            restrict: 'E',
            templateUrl : 'app/convoworks/common/alert-indicator.tmpl.html',
            link: function ( $scope, $elem) {
                
                $log.log( 'alertIndicator link');
                
                $scope.getAlerts     =   AlertService.getAlerts;
                $scope.closeAlert    =   AlertService.closeAlert;
            }
        };

    }]);

})();
(function() {
    angular
        .module('convo.editor')
        .service('ConvoChatApi', ConvoChatApi);

    /* @ngInject */
    function ConvoChatApi( $log, $http, $q, CONVO_PUBLIC_API_BASE_URL) {

		this.sendMessage = sendMessage;

		function sendMessage( serviceId, deviceId, text, isLaunch, variant)
		{
			if ( !variant) {
                variant =   'develop';
            }

			return $http({
				method: "post",
				url: CONVO_PUBLIC_API_BASE_URL + '/service-run/webchat/' + variant + '/' + serviceId,
				data : { device_id : deviceId, text : text, lunch : isLaunch}
			}).then( function ( response) {
				$log.log('ConvoChatApi sendMessage response.data', response.data);
				return response.data;
			});
		}
    }
})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'convoChatbox', convoChatbox);

	/* @ngInject */
	function convoChatbox( $log, $q, $timeout, ConvoworksApi, ConvoChatApi, UserPreferencesService)
	{
		return {
			restrict: 'E',
			templateUrl: 'app/convoworks/chatbox/chatbox.tmpl.html',
			scope: {
				deviceId : '=',
				serviceId : '=',
				collapsed : '=',
				mode : '=',
				name : '=?',
				variant : '=?',
				delegateNlp : '=?',
				toggleDebug : '=?',
				exception : '=?',
				variables : '=?'
			},
			link: function( $scope, $elem, $attrs)
			{
				$log.log( 'convoChatbox link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);

				// $scope.collapsed    =   true;

				$scope.toggleDebug  = 	false;
				$scope.message		=	'';
				$scope.messages		=	[];

				var sending			=	false;
				
				var REPROMPT_TIMEOUT	=	20 * 1000;
				var SEQUENCE_TIMEOUT	=	2 * 1000;
				var reprompt_timeout	=	null;
				var sequence_timeout	=	null;

				$scope.$watch('delegateNlp', function(newVal, oldVal) {
					$log.log('convoChatbox $watch delegateNlp old value', oldVal, 'new value', newVal);
					
					if (!newVal) {
						return;
					}
					
					$scope.resetChat();
				});

				$scope.$watch('toggleDebug', function(newVal) {

					UserPreferencesService.registerData( 'toggleDebug', newVal);
					$log.log('convoChatbox $watch toggleDebug new value', newVal);
					$scope.toggleDebug = newVal;
				});

				_init();

				var input			=	$elem.find( 'input[type=text]')[0];
				$log.log( 'convoChatbox link input', input);


				$scope.formSubmited	=	function()
				{
					$log.log( 'convoChatbox formSubmited()', $scope.message);
					var msg				=	$scope.message;

					sending				=	true;
					if ( msg) {
						_appendBreak();
						_appendUserMessage( msg);
					}

					_cancelMsgs();

					_getApi().sendMessage( $scope.serviceId, $scope.deviceId, msg, false, $scope.variant, $scope.delegateNlp).then( function( response) {
						$log.log( 'convoChatbox formSubmited() sendMessage() response', response);
						$scope.message		=	'';
						_readResponse( response);
					}, function( reason) {
						$log.log( 'convoChatbox formSubmited() sendMessage() reason', reason);
					}).finally( function() {
						$log.log( 'convoChatbox formSubmited() sendMessage() finally');
						sending				=	false;
					});

				};

				$scope.resetChat    =   function()
				{
					$log.log( 'convoChatbox resetChat()');

					$scope.messages     =   [];
					$scope.message      =   '';

					_cancelMsgs();
					sending             =   true;

					_getApi().sendMessage( $scope.serviceId, $scope.deviceId, '', true, $scope.variant, $scope.delegateNlp).then( function( response) {
						$log.log( 'convoChatbox resetChat() sendMessage() response', response);
						_readResponse( response);
					}, function( reason) {
						$log.log( 'convoChatbox resetChat() sendMessage() reason', reason);
					}).finally( function() {
						$log.log( 'convoChatbox resetChat() sendMessage() finally');
						sending     =   false;
					});
				};
				
				$scope.formDisabled	=	function()
				{
					return sending || $scope.message.trim() == '';
				};

				$scope.isSending	=	function()
				{
					return sending;
				};

				function _init()
				{
					$log.log( 'convoChatbox _init()');
					sending				=	true;

					_getApi().sendMessage( $scope.serviceId, $scope.deviceId, '', true, $scope.variant, $scope.delegateNlp).then( function( response) {
						$log.log( 'convoChatbox _init() response', response);
						_readResponse( response);
					}, function( reason) {
						$log.log( 'convoChatbox _init() reason', reason);
					}).finally( function() {
						$log.log( 'convoChatbox _init() finally');
						sending				=	false;
					});

					UserPreferencesService.getData( 'toggleDebug').then( function( toggleDebug) {
						$log.log( 'convoChatbox getData() toggleDebug', toggleDebug);
						if (toggleDebug) {
							$scope.toggleDebug = toggleDebug;
						}
					});
				}

				function _readResponse( data)
				{
					_appendBreak();
					_appendSequence( data.text_responses, true);
					$scope.exception = data.exception;
					$scope.variables = data.variables;
					if ( data.text_reprompts.length) {
						reprompt_timeout	=	$timeout( function() {
							_appendBreak();
							_appendSequence( data.text_reprompts, true);
						}, REPROMPT_TIMEOUT);
					}
				}

				function _appendSequence( msgs, immediate)
				{
					if ( immediate) {
						var msg	=	msgs.shift();
						_appendConvoResponse( [msg]);
					}

					if ( msgs.length) {
						sequence_timeout	=	$timeout( function() {
							var msg	=	msgs.shift();
							_appendConvoResponse( [msg]);
							if ( msgs.length) {
								_appendSequence( msgs, false);
							}
						}, SEQUENCE_TIMEOUT);
					}

				}

				function _cancelMsgs()
				{
					$timeout.cancel( reprompt_timeout );
                    reprompt_timeout	=	null;
					$timeout.cancel( sequence_timeout );
                    sequence_timeout	=	null;
				}

				function _appendBreak()
				{
					$scope.messages.push( {
						type : 'break',
					});
				}

				function _appendConvoResponse( msgs) {
					$log.log( 'convoChatbox _appendConvoResponse()', msgs);

					for (var i=0;i<msgs.length; i++) {
						$scope.messages.push( {
							text : msgs[i],
							source : 'convo',
							avatar: 'img/pbtour-avatar-pb.png'
						});
					}
				}

				function _appendUserMessage( msg) {
					$log.log( 'convoChatbox _appendUserMessage()', msg);
					$scope.messages.push( {
						text : msg,
						source : 'user',
						avatar: 'img/pbtour-avatar-me.png'
					});
				}

				function _getApi()
				{
					if ( $scope.mode == 'public') {
						return ConvoChatApi;
					} else if ( $scope.mode == 'admin') {
						return ConvoworksApi;
					} else {
						throw new Error( 'Unknown mode ['+$scope.mode+']');
					}
				}

				// ANIMATE SCROLL
				$scope.$watchCollection( 'messages', function() {
					$log.log( 'convoChatbox $watchCollection()');
					setTimeout( function() {
						$log.log( 'convoChatbox queue()');
						var $list 			=	$elem.find( '#chat-panel-body');
						var scrollHeight 	=	$list.prop( 'scrollHeight');
						$list.animate( { scrollTop : scrollHeight}, 500);
					},10);
				});

				// FOCUS
				$scope.$watch( function() {
					return $scope.isSending();
				}, function( sending) {
					$log.log( 'convoChatbox $watch() sending', sending);
					setTimeout( function() {
						$log.log( 'convoChatbox input.focus()');
						input.focus();
					},10);
				});
			}
		}
	}
})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'versionsEditor', versionsEditor);

        /* @ngInject */
    function versionsEditor( $log, $rootScope, ConvoworksApi, CONVO_ADMIN_API_BASE_URL)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/versions-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes, propertiesContext) {

            	$log.log( 'versionsEditor link');
            	
            	$scope.versions	=	[];
            	
            	$rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
                    _load();
                });
            	
            	_load();
            	
            	function _load()
            	{
            		ConvoworksApi.getServiceVersions( $scope.service.service_id).then( function ( versions) {
                		$scope.versions	=	versions;
                	}, function ( reason) {
                		$log.log( 'versionsEditor getServiceVersions reason', reason);
                	});            		
            	}
            	
            	
            }
        }
    }

})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'variablesEditor', variablesEditor);

    function variablesEditor( $log)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/variables-editor.tmpl.html',
            controller: function( $scope) {
                // QUICKFIX
                if ( !$scope.service.variables) {
                    $scope.service.variables    =   {};
                }

                _init();

                $scope.addVariablesPair     =   function()
                {
                    var current_greatest_index  =   $scope.variables_buffer.length - 1 < 0? 0 : $scope.variables_buffer.length - 1;

                    var new_pair    =   { 'key': 'tmp_key_' + current_greatest_index, 'value': 'tmp_value' };

                    $scope.variables_buffer.push( new_pair);
                };

                $scope.removeVariablesPair  =   function( i)
                {
                    $scope.variables_buffer.splice( i, 1);
                };

                // INIT
                function _init()
                {
                    _setupVariablesBuffer();
                    _setupServiceWatch();
                    _setupBufferWatch();
                }

                // PRIVATE
                function _setupVariablesBuffer()
                {
                    $scope.variables_buffer =   [];

                    for ( var key in $scope.service.variables) {
                        $scope.variables_buffer.push( { 'key': key, 'value': $scope.service.variables[key] });
                    }

                    $log.log( 'variablesEditor _setupVariablesBuffer() done, buffer', $scope.variables_buffer);
                }

                function _setupServiceWatch()
                {
                    $scope.$watch('service.variables', function() {
                        _setupVariablesBuffer();
                    }, true);
                }

                function _setupBufferWatch()
                {
                    $scope.$watch( 'variables_buffer', function () {
                        // QUICKFIX
                        if ( !Object.keys( $scope.service.variables).length) {
                            $scope.service.variables    =   [];
                        } else {
                            $scope.service.variables    =   {};
                        }

                        for ( var i in $scope.variables_buffer) {
                            var pair        =   $scope.variables_buffer[i];
                            var safe_key    =   _sanitizeKey( pair.key);

                            $scope.service.variables[safe_key]  =   pair.value;
                        }
                    }, true);
                }
            },
            link: function( $scope, $element, $attributes) {}
        }
    }

    function _sanitizeKey( key)
    {
        return key.replace( /\s{2,}\.-/, '_');
    }
})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'subroutineComponent', subroutineComponent);

	/* @ngInject */
	function subroutineComponent( $log, $timeout, ConvoworksApi)
	{
		return {
			restrict: 'E',
			scope: { 'block' : '=', 'canMoveUp': '=', 'canMoveDown': '=' },
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

				$scope.moveUp = function()
				{
					$scope.$emit('moveFragment', {
						fragmentId: $scope.block.properties.fragment_id + '',
						dir: -1
					});
				}

				$scope.moveDown = function()
				{
					$scope.$emit('moveFragment', {
						fragmentId: $scope.block.properties.fragment_id + '',
						dir: 1
					});
				}
				
				// INIT
				var open	=	{
						elements : false,
						processors : false,
				}
				_init();
				
				function _init()
				{
//					$log.log( 'subroutineComponent _init() got ', '$scope.block.properties.subroutine_id ['+$scope.block.properties.subroutine_id+']', '$scope.block', $scope.block);
					
					if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment') {
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
					} else if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment') {
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
					var $div	=	$element.find( 'div.selectable-component')[0];

					var containerController =   {
						removeSelection: function() { propertiesContext.removeSubroutine( $scope.block.properties.fragment_id); }
					};

					
					jQuery($div).bind( 'click', function( event) {
						$scope.$apply( function () {
							if ( $scope.isSelected()) {
								propertiesContext.setSelectedComponent( null);
							} else {
								propertiesContext.setSelectedComponent( $scope.block, containerController);
							}
							event.stopPropagation();
						});						
					});
				}
			}
		}
	}
})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
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
				
				$scope.isCut	=	function() {
					return propertiesContext.isCut( $scope.component);
				}
				
				$scope.getContextOptions	=	function() {
                    
                    var options =   [];
                    
                    options.push(
                        {
                            text: 'Cut',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context cut');
                                propertiesContext.cut( convoworksComponentsContainer, $scope.component);
                            }
                        }
                    );
                    
                    options.push(
                        {
                            text: 'Copy',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context copy');
                                propertiesContext.copy( $scope.component);
                            }
                        }
                    );
                    
                    if ( propertiesContext.hasClipboard()) {
                        options.push(
                            {
                                text: 'Paste',
                                click: function ($itemScope, $event, modelValue, text, $li) {
                                    $log.log( 'selectableComponent context paste');
                                    var index       =   convoworksComponentsContainer.indexOf( $scope.component) + 1;
                                    propertiesContext.paste( convoworksComponentsContainer, index);
                                }
                            }
                        );    
                    }
                    
                    options.push( null);
                    options.push(
                        {
                            text: 'Delete',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context delete');
                                if ( propertiesContext.getSelection().component === $scope.component) {
                                    propertiesContext.setSelectedComponent( null);
                                }
                                convoworksComponentsContainer.removeComponent( $scope.component);
                            }
                        }
                    );
                    
                    return options;
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
						
						if ( definition.component_properties._interface) {
							if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationProcessor') {
								$scope.isProcessor		=	true;
								$scope.componentTitle	=	definition.name;
							} else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IRequestFilter') {
								$scope.isFilter			=	true;
							} else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationElement') {
								$scope.isElement		=	true;
							}
						}
						
						if ( definition.component_properties._preview_angular && definition.component_properties._workflow != 'process') {
							$scope.showTitle	=	false;
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
					$draggable	=	jQuery($element.find( 'div.selectable-component')[0]);
//					$log.log( 'selectableComponent link() $draggable', $draggable);
					$draggable.draggable( { 	
						revert: true, 
						revertDuration : 50, 
						zIndex: 100, 
						delay : 200,
						tolerance : 'pointer',
						appendTo: 'body',
				        helper: 'clone',
				        refreshPositions: true,
						start: function( event, ui) {
//				            jQuery(this).data( 'component', $scope.component);
				            jQuery(this).data( 'convoDragged', {
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
					var $droppable	=	jQuery($element.find( 'div.selectable-component')[0]);
					
					$droppable.droppable({
						greedy: true,
					    drop: function( event, ui ) {
					    	var data		=	ui.draggable.data('convoDragged');
					    	$log.log( 'selectableComponent drop event', event, 'ui', ui, 'data', data);
					    	  if ( data) {	
					    		  
					    		  if ( data.handled) {
					    			  $log.log( 'selectableComponent already handled');
					    			  return;
					    		  }
					    		  
						          $scope.$apply( function() {
						        	  
						        	  var index		=	convoworksComponentsContainer.indexOf( $scope.component) + 1;
							          if ( data.type == 'definition') {
							        	  $log.log( 'selectableComponent new component', data.componentDefinition, 'to container', $scope.container, 'in component', $scope.component);
							        	  
							        	  propertiesContext.addNewComponent( 
							        			  convoworksComponentsContainer, 
							        			  data.componentDefinition, 
							        			  index);
							        	  
							          } else if ( data.type == 'component') {
							        	  $log.log( 'selectableComponent move component', data.component);
							        	  
							        	  propertiesContext.moveComponent( 
							        			  data.containerController,
							        			  convoworksComponentsContainer, 
							        			  data.component, 
							        			  index);
							        	  
							          } else {
							        	  throw new Error( 'Expected to have type [definition] or [component]');
							          }
							          data.handled	=	true;
								});
					    	  } else {
					    		  $log.error( 'selectableComponent Expected to have [convoDragged] data  ['+event.target.className+']');
					    	  }
					    	  jQuery(event.target).removeClass('ui-droppable-hover');
					    	  return false;
					      }
					    });
				}
				
				function _initClick()
				{
					var $div	=	$element.find( 'div.selectable-component')[0];
					jQuery($div).bind( 'click', function( event) {
						$log.log( 'selectableComponent click $scope.isSelected()', $scope.isSelected());
						
						$scope.$apply( function () {
							if ( $scope.isSelected()) {
								propertiesContext.setSelectedComponent( null);
							} else {
								propertiesContext.setSelectedComponent( $scope.component, { removeSelection: convoworksComponentsContainer.removeComponent });
							}
						});
						
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
(function () {
    'use strict';

    angular.module('convo.editor').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
            
                when('/convoworks-editor', {
                    templateUrl: 'app/convoworks/convoworks-menu.tmpl.html',
					controller: 'ConvoworksMainController',
					controllerAs: 'mainCworksVm'
                }).

				when('/convoworks-editor/:service_id', {
					templateUrl: 'app/convoworks/convoworks-editor.tmpl.html',
					controller: 'ConvoworksEditorController',
					controllerAs: 'editorVm',
                    reloadOnSearch: false
                });
        }]);
})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'releasesEditor', releasesEditor);

        /* @ngInject */
    function releasesEditor( $log, $q, $rootScope, ConvoworksApi, CONVO_PUBLIC_API_BASE_URL)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/releases-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes, propertiesContext) {
            	$log.log( 'releasesEditor link');
            	
            	$scope.releases		=	[];
            	var PROMOTE_OPTIONS	=	{};
            	var IMPORT_WORKFLOW_OPTIONS	=	{};
            	var SUBMIT_OPTIONS	=	{};
            	
            	$scope.getReleaseUrl	=	function ( release) {
            		
            	//	http://convo-proto.lokal.com/rest_public/convo/v1/service-run/webchat/a/tribes-ascend
            			
            		return CONVO_PUBLIC_API_BASE_URL + '/service-run/' + release['platform_id'] + '/' 
            		+ release['alias'] + '/' + release['service_id'];
            	};
            	
            	
            	$scope.getPromoteOptions	=	function ( release) {
            		return PROMOTE_OPTIONS[ _getReleaseKey( release)];
            	};
            	

            	$scope.promoteRelease	=	function ( row, type, stage) {
            		$log.log( 'releasesEditor promoteRelease type', type, 'row', row);
                	ConvoworksApi.promoteRelease( 
                			$scope.service.service_id,
                			row['release_id'],
                			type,
                			stage).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor promoteRelease reason', reason);
                	});
            	};
            	
            	$scope.getSubmitOptions	=	function ( release) {
            		return SUBMIT_OPTIONS[ _getReleaseKey( release)];
            	};
            	
            	$scope.submitRelease	=	function ( row, type, stage) {
            		$log.log( 'releasesEditor submitRelease type', type, 'row', row);
                	ConvoworksApi.createRelease( 
                			$scope.service.service_id,
                			row['platform_id'],
                			type,
                			stage).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor submitRelease reason', reason);
                	});
            	};
            	
            	
            	$scope.getImportWorkflow	=	function ( release) {
            		return IMPORT_WORKFLOW_OPTIONS[ _getReleaseKey( release)];
            	};  
            	
            	$scope.importWorkflowRelease	=	function ( row, releaseId) {
            		$log.log( 'releasesEditor importWorkflowRelease releaseId', releaseId);
                	ConvoworksApi.importWorkflowIntoRelease( 
                			$scope.service.service_id,
                			releaseId,
                			row['version_id']).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor importWorkflowRelease reason', reason);
                	});
            	};
            	
            	function get_release( platformId, type, stage)
            	{
					for ( var i=0; i<$scope.releases.length; i++) {
						var release	=	$scope.releases[i];
//						$log.log( 'releasesEditor get_release check release', release);
						if ( release['type'] === type && release['stage'] === stage && release['platform_id'] === platformId) {
							$log.log( 'releasesEditor get_release found platformId', platformId, 'type', type, 'stage', stage, release['release_id']);
							return release['release_id'];
						}
					}
					
					$log.log( 'releasesEditor get_release not found platformId', platformId, 'type', type, 'stage', stage);
            		return null;
            	}
            	
            	$rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
                    _load();
                });
            	
            	_load();
            	
            	function _load() {
            		ConvoworksApi.getServiceReleases( $scope.service.service_id).then( function ( releases) {
            			$log.log( 'releasesEditor releases loaded');
            			$scope.releases	=	releases;
            			_initOptions();
                	}, function ( reason) {
                		$log.log( 'releasesEditor getServiceReleases reason', reason);
                	})
            	}
            	
            	function _initOptions()
            	{
            		$log.log( 'releasesEditor _initOptions');
            		
            		PROMOTE_OPTIONS	=	{};
                	IMPORT_WORKFLOW_OPTIONS	=	{};
                	SUBMIT_OPTIONS	=	{};
                	
                	var releases	=	$scope.getDevelopment();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);
                		
                		var options	=	_getSubmitOptions( release);
                		SUBMIT_OPTIONS[key]	=	options;
                		
                		var options	=	_getWorkflowOptions( release);
                		IMPORT_WORKFLOW_OPTIONS[key]	=	options;
                	}
                	
                	var releases	=	$scope.getTest();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);
                		
                		var options	=	_getPromoteOptions( release);
                		PROMOTE_OPTIONS[key]	=	options;
                		
                		var options	=	_getWorkflowOptions( release);
                		IMPORT_WORKFLOW_OPTIONS[key]	=	options;
                	}
                	
                	var releases	=	$scope.getProduction();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);

                		var options	=	_getPromoteOptions( release);
                		PROMOTE_OPTIONS[key]	=	options;
                	}
            	}
            	
            	function _getReleaseKey( release) {
            		return release['release_id'] ? release['release_id'] : release['platform_id'] + '_' + release['type'];
            	}
            	
            	function _getSubmitOptions( release) {
            		var options	=	[];
            		
            		if ( release['platform_id'] === 'amazon') {
            			options.push( {
        					title : 'Submit to review',
        					type : 'production',
        					stage : 'review',
            			});
            		} else if ( release['platform_id'] === 'dialogflow') {
            			options.push( {
        					title : 'Submit to review',
        					type : 'production',
        					stage : 'review',
            			});
            			options.push( {
            				title : 'Submit to alpha test',
            				type : 'test',
            				stage : 'alpha',
            			});
            		} else if ( release['platform_id'] === 'convo_chat') {
            			var release_id	=	get_release( 'convo_chat', 'production', 'release');
            			if ( !release_id) {
            				options.push( {
            					title : 'Submit as release',
            					type : 'production',
            					stage : 'release',
                			});            				
            			}
            		}
            		
            		return options;
            	}
            	
            	function _getPromoteOptions( release) {
            		var options	=	[];
            		if ( release['platform_id'] === 'amazon') {
            			if ( release['stage'] === 'review') {
                			options.push( {
            					title : 'Promote to release',
            					type : 'production',
            					stage : 'release'
                			});
//                			options.push( {
//                				title : 'Withdraw',
//                			});
            			}
            		} else if ( release['platform_id'] === 'dialogflow') {
            			if ( release['type'] === 'production' && release['stage'] === 'review') {
                			options.push( {
            					title : 'Promote to release',
            					type : 'production',
            					stage : 'release'
                			});
//                			options.push( {
//                				title : 'Withdraw',
//                			});
            			} else if ( release['type'] === 'test') {
                			options.push( {
            					title : 'Promote to review',
            					type : 'production',
            					stage : 'review'
                			});
            			}	
            		}
            		return options;
            	}
            	
            	function _getWorkflowOptions( release) {
            		var options	=	[];
            		
            		if ( release['platform_id'] === 'amazon') {
            			var release_id	=	get_release( 'amazon', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			
            			var release_id	=	get_release( 'amazon', 'production', 'review');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to review',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		} else if ( release['platform_id'] === 'dialogflow') {
            			var release_id	=	get_release( 'dialogflow', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			
            			var release_id	=	get_release( 'dialogflow', 'production', 'review');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to review',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			var release_id	=	get_release( 'dialogflow', 'test', 'alpha');
            			if ( release_id && release['type'] !== 'test') {
            				options.push( {
            					title : 'Import to alpha',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		} else if ( release['platform_id'] === 'convo_chat') {
            			var release_id	=	get_release( 'convo_chat', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		}
            		return options;
            	};
            	
            	
            	
            	// GRID DATA
            	$scope.getProduction	=	function () {
            		var releases = $scope.releases.filter( function( release) {
            			return release.type	=== 'production';
            		});
            		return releases;
            	};
            	
            	$scope.getTest			=	function () {
            		var releases = $scope.releases.filter( function( release) {
          			  return release.type	=== 'test';
          			});
            		return releases;
            	};
            	
            	$scope.getDevelopment	=	function () {
            		var releases = $scope.releases.filter( function( release) {
          			  return release.type	=== 'develop';
          			});
            		return releases;
            	};
            	
            	

            }
        }
    }

})();
(function () {
	"use strict";

	angular
		.module( 'convo.editor')
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
					if ( $scope.help !== null) {
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
					_getComponentHelp($scope.component.class);
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
						return fragment.class === '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment';
					}).map( function( fragment) {
						return { id : fragment.properties.fragment_id, name : _fixName( fragment.properties.fragment_id, fragment.properties.name)};
					});

					$scope.readSubroutines	=	$scope.service.fragments.filter( function( fragment) {
						return fragment.class === '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment';
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

				function _getComponentHelp(componentClass) {
					ConvoworksApi.getComponentDefinition(componentClass).then(function (definition) {
						if ($scope.help === null && definition.component_properties._help) {
							if (definition.component_properties._help.type === 'file') {
								ConvoworksApi.getPackageComponentHelp($scope.component.namespace, definition.component_properties._help.filename).then(function (data) {
									$scope.help = data;
								}, function (reason) {
									$log.debug('propertiesEditor getComponentHelp() reason', reason);
								});
							} else if (definition.component_properties._help.type === 'html') {
								$scope.help = definition.component_properties._help.template;
							}
						}
					}, function(reason) {
						$log.error('component got reason', reason)
					});
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
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'propertiesContext', propertiesContext);

	/* @ngInject */
	function propertiesContext( $log, $rootScope, ConvoworksApi, ConvoworksAddBlockService, ConvoComponentFactoryService, LoginService, AlertService) {
		return {
			restrict: 'A',
			require: '^propertiesContext',
//			scope: {
//				serviceId : '='
//			},
			scope: true,
			controller: function( $scope) {

				// PUBLIC API
				this.getComponentDefinitions	=	getComponentDefinitions;
				this.getComponentDefinition		=	getComponentDefinition;
				this.isLoaded					=	isLoaded;
				this.getConvoIntents			=	getConvoIntents;
				
				this.setSelectedComponent		=	setSelectedComponent;
				this.getSelection				=	getSelection;
				this.getSelectedService			=	getSelectedService;
				
				this.isServiceChanged			=	isServiceChanged;
				this.revertChanges				=	revertChanges;
				this.saveChanges				=	saveChanges;
				
				
				this.findBlock	 				=	findBlock;
				this.findSubroutine				=	findSubroutine;
				
				this.addBlock	 				=	addBlock;
				this.addProcessSubroutine		=	addProcessSubroutine;
				this.addReadSubroutine			=	addReadSubroutine;
				this.removeBlock				=	removeBlock;
				this.removeSubroutine			=	removeSubroutine;
				
				this.removeComponent			=	removeComponent;
				
				this.addNewComponent			=	addNewComponent;
				this.moveComponent				=	moveComponent;
				
				this.reloadService				=	reloadService;
				
				
				// DEFINITION
				if ( !$scope.serviceId) {
					throw new Error( 'No serviceId in scope');
				}
				
				var service_id			=	$scope.serviceId;
				var ready				=	 false;
				var definitions			=	 [];
				var original_service	=	 null;
				var selection			=	{
						component : null,
						definition : null,
						service : null,
						containerController : null
				};
				
				
				_init();

				function _init()
				{
					ConvoworksApi.getComponentDefinitions().then( function( defs) {
						$log.log( 'propertiesContext controller definitions pre-loaded. Now will start.');
						definitions		=	defs;

						ConvoworksApi.getServiceById( service_id).then( function( service) {
							$log.log( 'propertiesContext controller got service', service);
							selection.service	=	service;
							original_service	=	angular.copy( selection.service);
							ready				=	true;
						}, function( reason) {
							$log.error( 'propertiesContext controller service got reason', reason);
							throw new Error(reason.data.message);
						});
					}, function( reason) {
						$log.error( 'propertiesContext controller definitions got reason', reason);
					});
				}
				
				this.hasClipboard		=	hasClipboard;
				this.cut		=	cut;
				this.copy		=	copy;
				this.paste		=	paste;
				this.isCut		=	isCut;
				
				var clipboard	=	null;
				
				function hasClipboard()
				{
					return !!clipboard;
				}
				
				function cut( container, component)
				{
					clipboard	=	{
							is_cut : true,
							component : component,
							container : container,
					};
				}
				
				function copy( component)
				{
					clipboard	=	{
							is_cut : false,
							component : component,
					};
				}
				
				function paste( containerController, index)
				{
					if ( !clipboard) {
						return;
					}
					
					if ( clipboard.is_cut) {
						$log.log( 'propertiesContext paste cut');
						// function moveComponent( oldContainerController, containerController, component, index)
						moveComponent( clipboard.container, containerController, clipboard.component, index);
                        clipboard.is_cut    =   false;
                        clipboard.container =   null;
					} else {
						$log.log( 'propertiesContext paste copy');
						
						containerController.addComponent( 
								ConvoComponentFactoryService.copyComponent( getSelectedService(), clipboard.component), 
								index);
					}
				}
				
				function isCut( component)
				{
					return clipboard && clipboard.is_cut && clipboard.component === component;
				}
				
				function getConvoIntents()
				{
					var intents	=	[];
					
					// SERVICE
					for ( var i=0; i < selection.service.intents.length; i++) {
						intents.push( selection.service.intents[i]);
					}
					
					// SYSTEM
					for ( var i=0; i<definitions.length; i++) {
						var pckg	=	definitions[i];
						if ( !pckg.intents) {
							continue;
						}
						for ( var j=0; j<pckg.intents.length; j++) {
							intents.push( pckg.intents[j]);
						}
					}
					
					return intents;
				}
				
				
				function getComponentDefinitions() {
					return definitions;
				}
				
				function getComponentDefinition( className) {
					for ( var i=0; i<definitions.length; i++) {
						var pckg	=	definitions[i];
						for ( var j=0; j<pckg.components.length; j++) {
							var comp = pckg.components[j];
							if ( comp['type'] === className) {
								return comp;
							}
						}
					}
					throw new Error( 'Definition ['+className+'] not found');
				}
				
				function isLoaded() {
					return ready;
				}
				
				// SELECTION
				function setSelectedComponent( component, containerController) {
					if ( !component) {
						selection.component	    =	null;
						selection.definition	=	null;
						return;
					}

					if ( !containerController) {
						selection.containerController   =   null;
					}

					selection.containerController   =   containerController;
					selection.definition	        =	getComponentDefinition( component['class']);
					selection.component		        =	component;
				}
				
				function getSelection() {
					return selection;
				}
				
				// SERVICE
				function getSelectedService() {
					if ( !selection.service) {
						throw new Error( 'No selected service');
					}
					return selection.service;
				}
				
				function isServiceChanged() {
					return !angular.equals( original_service, selection.service);
				}
				
				function revertChanges() {
					angular.copy( original_service, selection.service);
				}
				
				function saveChanges() {
					$log.log( 'propertiesContext controller saveChanges()');

					ConvoworksApi.updateService( service_id, selection.service).then( function( res) {
						$log.log( 'propertiesContext controller saveChanges() done');

//						selection.service	=	res.data;
//						angular.copy( res.data, selection.service);
						angular.merge( selection.service, res.data);
						original_service	=	angular.copy( selection.service);
						$rootScope.$broadcast('ServiceWorkflowUpdated', selection.service);
						AlertService.addSucess( 'Service workflow saved');
					}, function( reason) {
						$log.log( 'propertiesContext controller saveChanges() reason', reason);
						throw new Error(reason.data.message);
					})
				}
				
				// BLOCKS
				function addBlock( name) {
                    ConvoComponentFactoryService.createBlock( getSelectedService(), name).then( function ( block) {
                        getSelectedService().blocks.push( block);
                    });
				}
				
				function addReadSubroutine( name) 
				{
                    ConvoComponentFactoryService.createReadSubroutine( getSelectedService(), name).then( function ( block) {
                        getSelectedService().fragments.push( block);
                    });
				}
								
				function addProcessSubroutine( name) {
                    ConvoComponentFactoryService.createProcessSubroutine( getSelectedService(), name).then( function ( block) {
                        getSelectedService().fragments.push( block);
                    });
				}
				
				function removeBlock( blockId) {
					
					for ( var i=0; i<selection.service.blocks.length; i++) {
						var block	=	selection.service.blocks[i];
						if ( block.properties.block_id == blockId) {
							selection.service.blocks.splice( i, 1);
							return ;
						}
					}
					
					throw new Error( 'Could not find block ['+blockId+']');
				}

				function removeSubroutine( fragmentId) {
					
					for ( var i=0; i<selection.service.fragments.length; i++) {
						var fragment	=	selection.service.fragments[i];
						if ( fragment.properties.fragment_id == fragmentId) {
							selection.service.fragments.splice( i, 1);
							return ;
						}
					}
					
					throw new Error( 'Could not find fragment ['+fragmentId+']');
				}

				function removeComponent()
				{
					if ( !selection.containerController) {
						$log.warn( 'propertiesContext directive removeComponent() no containerController');
						return ;
					}

					selection.containerController.removeSelection( selection.component);
				}
				
				function findBlock( blockId) {
					for ( var i=0; i<selection.service.blocks.length; i++) {
						var block	=	selection.service.blocks[i];
						if ( block.properties.block_id == blockId) {
							return block;
						}
					}
					throw new Error( 'Block ['+blockId+'] not found');
				}
				
				function findSubroutine( fragmentId) {
					for ( var i=0; i<selection.service.fragments.length; i++) {
						var fragment	=	selection.service.fragments[i];
						if ( fragment.properties.fragment_id == fragmentId) {
							return fragment;
						}
					}
					throw new Error( 'Fragment ['+fragmentId+'] not found');
				}

				// OTHER COMPONENTS
                function addNewComponent( containerController, componentDefinition, index) 
                {
					if ( !index) {
						index	=	0;
					}
					
					var component	=	ConvoComponentFactoryService.createComponent( getSelectedService(), componentDefinition);
					containerController.addComponent( component, index);
				};
				
				function moveComponent( oldContainerController, containerController, component, index) {
					
					if ( !index) {
						index	=	0;
					}
					
					oldContainerController.removeComponent( component);
					containerController.addComponent( component, index);
				};
				
				function reloadService() {
					ConvoworksApi.getServiceById( service_id).then( function( service) {
						$log.log( 'propertiesContext controller got service', service);
						selection.service	=	service;
						original_service	=	angular.copy( selection.service);
						ready				=	true;
					}, function( reason) {
						$log.error( 'propertiesContext controller service got reason', reason);
						throw new Error(reason.data.message);
					});
				};

			},
			link : function( $scope, $element, $attributes, propertiesContext) {
				
				$log.log( 'propertiesContext link');
				
				function _init()
				{
					$log.log( 'propertiesContext _init() service', propertiesContext.getSelectedService());
				}
				
				function _destroy()
				{
				}
				
				
				$scope.isServiceChanged		=	propertiesContext.isServiceChanged;
				$scope.saveChanges			=	propertiesContext.saveChanges;
				$scope.getSelection			=	propertiesContext.getSelection;

				$scope.revertClicked		=	function()
				{
					$log.log( 'propertiesContext revertClicked()');
					propertiesContext.revertChanges();
					_destroy();
					_init();
				};
				

				$scope.addNewBlock		=	function()
				{
					$log.log( 'propertiesContext addNewBlock()');
					ConvoworksAddBlockService.showModal( propertiesContext.getSelectedService(), 'user', propertiesContext)
				};
				
				$scope.showNewReadSubroutine		=	function()
				{
					$log.warn( 'propertiesContext showNewReadSubroutine()');
					ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'read')
				};
				
				$scope.showNewProcessSubroutine		=	function()
				{
					$log.warn( 'propertiesContext showNewProcessSubroutine()');
					ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'process')
				};

				// $scope.removeBlock		=	function( blockId)
				// {
				// 	$log.log( 'propertiesContext removeBlock() blockId', blockId);
				// };
				
				$scope.isReady			=	propertiesContext.isLoaded;
//				$scope.isReady			=	function() { 
//					$log.log( 'propertiesContext isReady()');
//					return true 
//				};
				
				// 
				$scope.getSubroutines	=	function() { return _filterSubroutines( propertiesContext.getSelectedService()); };
				$scope.getBlocks		=	function() { return _filterBlocks( propertiesContext.getSelectedService()); };
				$scope.getDefinitions	=	propertiesContext.getComponentDefinitions;

				$scope.canBlockMoveUp = function(blockId)
				{
					var index = $scope.getBlocks().findIndex(function (b) {
						return b.properties.block_id === blockId;
					});

					return index > 1;
				}

				$scope.canBlockMoveDown = function(blockId)
				{
					var blocks = $scope.getBlocks();
					var index = blocks.findIndex(function (b) {
						return b.properties.block_id === blockId;
					});

					return index < blocks.length - 4;
				}

				$scope.canFragmentMoveUp = function(fragmentId)
				{
					var index = $scope.getSubroutines().findIndex(function (s) {
						return s.properties.fragment_id === fragmentId;
					});

					return index > 0;
				}

				$scope.canFragmentMoveDown = function(fragmentId)
				{
					var blocks = $scope.getSubroutines();
					var index = blocks.findIndex(function (s) {
						return s.properties.fragment_id === fragmentId;
					});

					return index < blocks.length - 1;
				}
				

				$scope.$on('moveBlock', function (event, data) {
					$log.log('Block', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
					var service = propertiesContext.getSelectedService();

					var currentIndex = service.blocks.findIndex(function (b) { return b.properties.block_id === data.blockId; });
					var targetIndex = currentIndex + data.dir;
					$log.log('Block', data.blockId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

					[service.blocks[currentIndex], service.blocks[targetIndex]] = [service.blocks[targetIndex], service.blocks[currentIndex]];
				});

				$scope.$on('moveFragment', function (event, data) {
					$log.log('Fragment', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
					var service = propertiesContext.getSelectedService();

					var currentIndex = service.fragments.findIndex(function (f) { return f.properties.fragment_id === data.fragmentId; });
					var targetIndex = currentIndex + data.dir;
					$log.log('Block', data.fragmentId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

					[service.fragments[currentIndex], service.fragments[targetIndex]] = [service.fragments[targetIndex], service.fragments[currentIndex]];
				});

				$scope.$watch( propertiesContext.isLoaded, function( val) {
					if ( val) {
						_init();
					} else {
						_destroy();
					}
				});
			}
		}
	}
	
	function _filterBlocks( service)
	{
        var user_blocks		=	service.blocks.filter( function( block) { return !_isSystem( block.properties.block_id);	});
        var system_blocks	=	service.blocks.filter( function( block) { return _isSystem( block.properties.block_id);	});

        var session_start_block			=	system_blocks.find( function( b) { return b.properties.block_id === '__sessionStart'; });
        var service_processors_block	=	system_blocks.find( function( b) { return b.properties.block_id === '__serviceProcessors'; });
        var session_end_block			=	system_blocks.find( function( b) { return b.properties.block_id === '__sessionEnd'; });
        var media_controls_block		=	system_blocks.find( function( b) { return b.properties.block_id === '__mediaControls'; });

        var sorted	=	user_blocks;

        sorted.unshift( session_start_block);
        sorted.push( media_controls_block);
        sorted.push( service_processors_block);
        sorted.push( session_end_block);

        return sorted;
    }

	function _filterSubroutines( service)
	{
		return service.fragments;
	}
	
	function _isSystem( blockId) {
		if ( blockId) {
			return blockId.indexOf( '__') >= 0;
		}
		return false;
	}
	
})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'previewVariablesEditor', previewVariablesEditor);

    function previewVariablesEditor( $log)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/preview-variables-editor.tmpl.html',
            controller: function( $scope) {
                // QUICKFIX
                if ( !$scope.service.preview_variables) {
                    $scope.service.preview_variables    =   {};
                }

                _init();

                $scope.addPreviewVariablesPair     =   function()
                {
                    var current_greatest_index  =   $scope.preview_variables_buffer.length - 1 < 0? 0 : $scope.preview_variables_buffer.length - 1;

                    var new_pair    =   { 'key': 'tmp_key_' + current_greatest_index, 'value': 'tmp_value' };

                    $scope.preview_variables_buffer.push( new_pair);
                };

                $scope.removePreviewVariablesPair  =   function( i)
                {
                    $scope.preview_variables_buffer.splice( i, 1);
                };

                // INIT
                function _init()
                {
                    _setupVariablesBuffer();
                    _setupServiceWatch();
                    _setupBufferWatch();
                }

                // PRIVATE
                function _setupVariablesBuffer()
                {
                    $scope.preview_variables_buffer =   [];

                    for ( var key in $scope.service.preview_variables) {
                        $scope.preview_variables_buffer.push( { 'key': key, 'value': $scope.service.preview_variables[key] });
                    }

                    $log.log( 'previewVariablesEditor _setupVariablesBuffer() done, buffer', $scope.preview_variables_buffer);
                }

                function _setupServiceWatch()
                {
                    $scope.$watch('service.preview_variables', function() {
                        _setupVariablesBuffer();
                    }, true);
                }

                function _setupBufferWatch()
                {
                    $scope.$watch( 'preview_variables_buffer', function () {
                        // QUICKFIX
                        if ( !Object.keys( $scope.service.preview_variables).length) {
                            $scope.service.preview_variables    =   [];
                        } else {
                            $scope.service.preview_variables    =   {};
                        }

                        for ( var i in $scope.preview_variables_buffer) {
                            var pair        =   $scope.preview_variables_buffer[i];
                            var safe_key    =   _sanitizeKey( pair.key);

                            $scope.service.preview_variables[safe_key]  =   pair.value;
                        }
                    }, true);
                }
            },
            link: function( $scope, $element, $attributes) {}
        }
    }

    function _sanitizeKey( key)
    {
        return key.replace( /\s{2,}\.-/, '_');
    }
})();
(function() {
    "use strict";

    angular
        .module('convo.editor')
        .directive('previewPanel', previewPanel);

    /* @ngInject */
    function previewPanel($log, ConvoworksApi, AlertService) {
        return {
            restrict: 'E',
            scope: {
                service: '='
            },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/preview-panel.tmpl.html',
            link: function ($scope, $element, $attributes) {
                $log.log('previewPanel link');

                $scope.ready = false;
                $scope.preview = {};

                $scope.generateText = function ( text) {
                    text = "<speak><p>" + text + "</p></speak>";

                    _copyToClipboard(text);
                    AlertService.addInfo("Copied [" + text + "]" + " to clipboard.");
                };

                _init();

                $scope.getUserMessageGroups = function(messages)
                {
                    var found = [];
                    var groups = [];

                    for (var i in messages)
                    {
                        if (!found.includes(messages[i].intent))
                        {
                            found.push(messages[i].intent);
                            groups.push({
                                intent: messages[i].intent,
                                text: messages.filter(function (msg) {
                                    return msg.intent === messages[i].intent;
                                }).map(function (msg) { return msg.text })
                            });
                        }
                    }

                    return groups;
                }

                function _init() {
                    ConvoworksApi.getServicePreview($scope.service.service_id).then(function (preview) {
                        $scope.preview = preview;
                        $scope.ready = true;
                    }, function (reason) {
                        $log.error('previewPanel could not get service preview, reason', reason);
                    });
                }

                function _copyToClipboard(text) {
                    // Create new element
                    var el = document.createElement('textarea');
                    // Set value (string to be copied)
                    el.value = text;
                    // Set non-editable to avoid focus and move outside of view
                    el.setAttribute('readonly', '');
                    el.style = {position: 'absolute', left: '-9999px'};
                    document.body.appendChild(el);
                    // Select text inside element
                    el.select();
                    // Copy text to clipboard
                    document.execCommand('copy');
                    // Remove temporary element
                    document.body.removeChild(el);
                }
            }
        }
    }
})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'miscPanel', miscPanel);

        /* @ngInject */
    function miscPanel( $log, ConvoworksApi, CONVO_ADMIN_API_BASE_URL)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/misc-panel.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes, propertiesContext) {

                $scope.uploadOptions    =   {
                    keep_vars : true,
                    keep_configs : true,
                };

                $scope.uploadSubmitted  =   function( file)
                {
                    $log.debug( 'miscPanel uploadSubmitted() file', file, '$scope.uploadOptions', $scope.uploadOptions);
                    ConvoworksApi.uploadServiceData( 
                                    $scope.service.service_id, 
                                    file, 
                                    $scope.uploadOptions.keep_vars, 
                                    $scope.uploadOptions.keep_configs).then( function () {
                        $log.debug( 'miscPanel uploadSubmitted() OK');
                        propertiesContext.reloadService();
                    }, function ( reason) {
                        $log.debug( 'miscPanel uploadSubmitted() reason', reason);
                    });
                }
                
                $scope.download  =   function()
                {
                    $log.debug( 'miscPanel download()');
                    var url =   CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/export/' + $scope.service.service_id;
                    $log.debug( 'miscPanel redirecting to ['+url+']');
                    document.location.href  =   url;
                }
                
                $scope.downloadPlatform  =   function( platformId)
                {
                	$log.debug( 'miscPanel downloadPlatform()', platformId);
                	var url =   CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/export/' + $scope.service.service_id + '/' + platformId;
                	$log.debug( 'miscPanel redirecting to ['+url+']');
                	document.location.href  =   url;
                }
                
            }
        }
    }

})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'intentEditor', intentEditor);

    function intentEditor( $log, $rootScope, $window)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/intent-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes) {
            	$log.debug( 'intentEditor link');
				$scope.value	=	JSON.stringify( $scope.service.intents, null, 2);
				$scope.error	=	false;
				
				var open = [];

				$scope.selectIntent = function(index) {
					if (!open[index]) {
						open[index] = true;
						return;
					}
					
					open[index] = !open[index];
				}

				$scope.isIntentSelected = function(index) {
					return open[index];
				}
				
				$scope.deleteIntent = function(index) {
					var intentName = $scope.service.intents[index].name;
					
					if ($window.confirm("Are you sure you want to delete " + intentName + "?")) {
						selected = null;
						$scope.service.intents.splice(index, 1);
					}
				}

				$scope.addIntent = function() {
					var retindex = $scope.service.intents.length;
					$scope.service.intents.push({
						"name": "NewIntent",
						"type": "custom",
						"utterances": [
							{
								"raw": "",
								"model": [
									{
										"text": ""
									}
								]
							}
						]
					});

					return retindex;
				}

				$scope.$on('JsonError', function(event, args) {
					$scope.error = args;
				});

				$scope.$watch( 'value', function ( value) {
					try {
						$scope.service.intents	=	JSON.parse( value);

						for (var i in $scope.service.intents) {
							if (!$scope.service.intents[i].name ||
								$scope.service.intents[i].name == "") {
								$scope.service.intents[i].name = "NamelessIntent";
							}
						}

						$scope.error	=	false;
					} catch ( err) {
						$scope.error	=	true;
					}
				});
				
				$scope.$watch( function () {
					// $log.debug( 'intentEditor component value changed');
					return $scope.service.intents;
				}, function ( value) {
					$scope.value	=	JSON.stringify( $scope.service.intents, null, 2);
					$scope.error	=	false;
				});
            }
        }
    }

})();
(function () {
    'use strict';

    angular.module('convo.editor').filter('propsFilter', function() {
          return function(items, props) {
            var out = [];

            if (angular.isArray(items)) {
                var hastext =   false;
                  items.forEach(function(item) {
                    var itemMatches = false;
    
                    var keys = Object.keys(props);
                    if (keys.length == 0)
                        return items;
                    for (var i = 0; i < keys.length; i++) {
                      var prop = keys[i];
                      var text = props[prop].toLowerCase();
                      
                      if (text)
                          hastext   =   true;
                      if (item[prop] && (item[prop].toString().toLowerCase().indexOf(text) !== -1)) {
                        itemMatches = true;
                        break;
                      }
                    }
                    if (itemMatches) {
                      out.push(item);
                    }
                  });
              
                if (!hastext)
                    return items;
            
            
            } else {
              // Let the output be the input untouched
              out = items;
            }

            return out;
          };
        });
    
    angular.module('convo.editor').filter('percent', [ function () {
        return function (value) {
            return value + ' %';
        };     
    }]);
    
    angular.module('convo.editor').filter('prettyJson', [ function() {
        return function (value) {
            return JSON.stringify( value, null, 2);
        }
    }]);

    
    angular.module('convo.editor').filter('admDate', function ( $filter) {
        
        return function ( strDate, format) {
            
            if (angular.isNumber( strDate))
                return $filter('date')( new Date( strDate * 1000), format);
            
            return $filter('date')( Date.parse( strDate), format);
        };     
    });
    
    angular.module('convo.editor').filter('unsafe', function($sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    });

    angular.module('convo.editor').filter('keys', function() {
        return function (value) {
            return Object.keys(value);
        }
    })

})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'entityEditor', entityEditor);

    function entityEditor( $log, $window)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/entity-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes) {
            	$log.debug( 'entityEditor link');
				$scope.value	=	JSON.stringify( $scope.service.entities, null, 2);
				$scope.error	=	false;
				
				var open = [];

				$scope.selectEntity = function(index) {
					if (!open[index]) {
						open[index] = true;
						return;
					}
					
					open[index] = !open[index];
				}

				$scope.isEntitySelected = function(index) {
					return open[index];
				}
				
				$scope.deleteEntity = function(index) {
					var entityName = $scope.service.entities[index].name;
					
					if ($window.confirm("Are you sure you want to delete " + entityName + "?")) {
						selected = null;
						$scope.service.entities.splice(index, 1);
					}
				}

				$scope.addEntity = function() {
					var retindex = $scope.service.entities.length;
					$scope.service.entities.push({
						"name": "NewEntity",
						"values": [
							{
								"value": "",
								"synonyms" : [""]
							}
						]
					});

					return retindex;
				}

				$scope.$on('JsonError', function(event, args) {
					$scope.error = args;
				})

				$scope.$watch( 'value', function ( value) {
					try {
						$scope.service.entities	=	JSON.parse( value);
						for (var i in $scope.service.entities ||
							$scope.service.entities[i].name == "") {
							if (!$scope.service.entities[i].name) {
								$scope.service.entities[i].name = "NamelessEntity";
							}
						}
						$scope.error	=	false;
					} catch ( err) {
						$scope.error	=	true;
					}
				});
				
				$scope.$watch( function () {
					// $log.debug( 'entityEditor component value changed');
					return $scope.service.entities;
				}, function ( value) {
					$scope.value	=	JSON.stringify( $scope.service.entities, null, 2);
					$scope.error	=	false;
				});
            }
        }
    }

})();
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
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
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
						refreshPositions: true,
						start: function(e) {
				            jQuery(this).data( 'convoDragged', {
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
(function () {
	"use strict";

	angular
		.module( 'convo.editor')
		.controller( 'ConvoworksMainController', ConvoworksMainController);

	/* @ngInject */
	function ConvoworksMainController( $log, $scope, $uibModal, ConvoworksApi)
	{
		// API
		$scope.ready				=	false;
		$scope.availableServices	=	[];

		$scope.createService        =   function()
		{
			$uibModal.open({
				templateUrl: 'app/convoworks/convoworks-add-service.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: { ConvoworksApi: function() { return ConvoworksApi; }}
			})
		};
		
		$scope.saveChanges			=	function()
		{
			
		};
		
		$scope.saveDisabled			=	function()
		{
			
		};
		
		$scope.revertClicked		=	function()
		{
			
		};
		
		$scope.revertDisabled		=	function()
		{
			
		};
		
		$scope.publishedOn = function(service) {
			var published = [];

			angular.forEach(service.versions, function (value, key) {
				if (!published.includes(key)) {
					published.push(_cleanKey(key));
				}
			});

			return published;
		}
		
		_init();

		// INIT
		function _init()
		{
			ConvoworksApi.getAllServices().then( function( services) {
				$scope.availableServices	=	services;
			}, function( reason) {
				$log.warn( 'ConvoworksMainController fetching all services failed because of', reason);

				throw new Error( reason.data.message);
			}).finally( function() {
				$scope.ready	=	true;
			})
		}

		function _cleanKey(key) {
			return key.split('_').map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }).join(' ');
		}
	}

	/* @ngInject */
	function ModalInstanceCtrl( $scope, $uibModalInstance, $location, ConvoworksApi)
	{
		$scope.new_service	=	{
			"name" : "",
			"template_id" : "convo-core.blank"
		};

		$scope.templates	=	[];
		
		ConvoworksApi.getTemplates().then( function ( all) {
			$scope.templates	=	all;
		});
		
		$scope.create       =   function()
		{
			ConvoworksApi.createService( $scope.new_service.name, $scope.new_service.template_id).then( function( data) {
				var id  =   data['service_id'];

				$uibModalInstance.dismiss( 'cancel');
				$location.path( 'convoworks-editor/' + id);
			})
		};

		$scope.cancel   =   function() { $uibModalInstance.dismiss( 'cancel'); }
	}
})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.controller( 'ConvoworksEditorController', ConvoworksEditorController);

	/* @ngInject */
	function ConvoworksEditorController( $log, $scope, $rootScope, $routeParams, $location, ConvoworksApi, AlertService, UserPreferencesService) {

		var random_slug			=	Math.floor( Math.random() * 100000);
		var device_id			=	'admin-chat-' + random_slug;

		var platform_info		=	{}
		
		$scope.serviceId		=	$routeParams.service_id;
        var search              =   $location.search();
		var tab_selected_1		 =	search.tab1 ? search.tab1 : 'workflow';
		var tab_selected_2		 =	search.tab2 ? search.tab2 :'steps';

		$scope.tabInfo1          =   { active: tab_selected_1};
		$scope.tabInfo2          =   { active: tab_selected_2};

		$scope.delegateNlp		=	null;
		$scope.delegateOptions	=	[
			{
				label: 'Amazon',
				value: 'amazon'
			},
			{
				label: 'Dialogflow',
				value: 'dialogflow'
			}
		];

		
		_load();
		
        $scope.tab1Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab1Select $tab', $tab);
            _updateUrl( $tab, 'steps');
        }
		
        $scope.tab2Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab2Select $tab', $tab);
            if ( $scope.tabInfo1.active == 'workflow') {
                _updateUrl( 'workflow', $tab);  
            }
        }
        
        function _updateUrl( tab1, tab2)
        {
            $log.log( 'ConvoworksEditorController _updateUrl tab1Select tabs', tab1, tab2);
            if ( tab1 == 'workflow') {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', tab2);
            } else {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', null);
            }
            
            $location.replace();
        }
        
		$scope.getDeviceId		=	function() {
			return device_id;
		}
		

		$rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
            _load();
        });
		
		$rootScope.$on( 'ServiceWorkflowUpdated', function ( evt, data) {
			_load();
		});
		
		$rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
			_load();
		});
		
		
		$scope.isPlatformPropagateAllowed		=	function( platformId) {
			if ( !platform_info[platformId]) {
				return false;
			}
			return platform_info[platformId]['allowed'];
		}
		
		$scope.isPlatformPropagateAvailable		=	function( platformId) {
			return true;
			if ( !platform_info[platformId]) {
				return false;
			}
			return platform_info[platformId]['available'];
		}
		
		$scope.propagatePlatformChanges		=	function( platformId) {
			$log.log( 'ConvoworksEditorController propagatePlatformChanges() platformId', platformId);

			if (platformId === 'all') {
				const availablePlatforms = Object.keys(platform_info);
				availablePlatforms.forEach(function(availablePlatformId) {
					ConvoworksApi.propagateServicePlatform( $scope.serviceId, availablePlatformId).then(function (data) {
						platform_info[availablePlatformId] = data;
						AlertService.addSucess( 'Service propagation to '+availablePlatformId+' done');
					}, function( reason) {
						$log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
						throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
					});
				})
			} else {
				ConvoworksApi.propagateServicePlatform( $scope.serviceId, platformId).then(function (data) {
					platform_info[platformId] = data;
					AlertService.addSucess( 'Service propagation to '+platformId+' done');
				}, function( reason) {
					$log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
					throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
				});
			}

		}
		
		
		function _load()
        {
        	ConvoworksApi.getPropagateInfo( $scope.serviceId, 'amazon').then(function (data) {
        		platform_info['amazon'] = data;
        	}).catch(function (reason) {
        		throw new Error(reason.data.message +  " In order to be able to propagate changes for amazon")
			});
        	ConvoworksApi.getPropagateInfo( $scope.serviceId, 'dialogflow').then(function (data) {
        		platform_info['dialogflow'] = data;
        	}).catch(function (reason) {
				throw new Error(reason.data.message +  " In order to be able to propagate changes for dialogflow")
			});
        }
		
//		setTimeout( function () {
//			_initTabs();
//		}, 2 * 1000);
		
		function _initTabs()
		{
			jQuery( '#tab_steps').droppable({
				greedy: true,
				over: function( event, ui) {
					$log.log( 'ConvoworksEditorController tab_steps over');
					$scope.$apply( function () {
						$scope.tabInfo.active	=	'steps';
					});
				}, 
		    });
			jQuery( '#tab_subroutines').droppable({
				greedy: true,
				over: function( event, ui) {
					$log.log( 'ConvoworksEditorController tab_subroutines over');
					$scope.$apply( function () {
						$scope.tabInfo.active	=	'subroutines';
					});
				}, 
			});
		}
	}
})();
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
					var $droppable	=	jQuery($element.find( '.prop-container')[0]);
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
					var $droppable	=	jQuery($element.find( '.real-container')[0]);
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
(function() {
    angular
        .module('convo.editor')
        .service('ConvoworksApi', ConvoworksApi);

    /* @ngInject */
    function ConvoworksApi( $log, $http, $q, CONVO_ADMIN_API_BASE_URL, CONVO_PUBLIC_API_BASE_URL) {

		var definitions		=	null;

		// INTERFACE
		
		// /convo-definitions
        this.getComponentDefinitions    =   getComponentDefinitions;
		this.getComponentDefinition     =   getComponentDefinition;
		this.getTemplates			    =   getTemplates;
		
		// /services
		this.getAllServices             =	getAllServices;
		
		// /services/{serviceId}
        this.getServiceById             =   getServiceById;
        this.getServiceMeta             =   getServiceMeta;
        this.createService              =   createService;
		this.updateService            	=	updateService;

		// /services/{serviceId}/meta
		this.updateServiceMeta			=	updateServiceMeta;

		// /services/{serviceId}/preview
		this.getServicePreview			=	getServicePreview;

		// /service-run/{serviceId}
		this.sendMessage                =   sendMessage;

		// /service-imp-exp/import/{serviceId}
		this.uploadServiceData    		=   uploadServiceData;

		// /service-platfform-config/{serviceId}
        this.loadPlatformConfig			=   loadPlatformConfig;
        this.getServicePlatformConfig   =   getServicePlatformConfig;
        this.createServicePlatformConfig   =   createServicePlatformConfig;
        this.updateServicePlatformConfig   =   updateServicePlatformConfig;
        this.propagateServicePlatform	=   propagateServicePlatform;
        this.getPropagateInfo			=   getPropagateInfo;
        
        // publish-service/{platformId}/{serviceId}
        this.getPublishInformation     	=   getPublishInformation;
		
		this.getServiceVersions     	=   getServiceVersions;
		this.getServiceReleases     	=   getServiceReleases;
		this.createRelease     			=   createRelease;
		this.promoteRelease				=   promoteRelease;
		this.importWorkflowIntoRelease	=   importWorkflowIntoRelease;
		
		// media/{serviceId}
		this.uploadMedia = uploadMedia;
		this.downloadMedia = downloadMedia;

		// package-help/{packageId}/{filename}
		this.getPackageComponentHelp = getPackageComponentHelp;

        this.requestAuthUrl = requestAuthUrl;

 this.getPlatformConfiguration = getPlatformConfiguration;
        this.updatePlatformConfiguration = updatePlatformConfiguration;

        function getPlatformConfiguration()
        {
            return $http({
                method: 'get',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config'
            }).then(function (res) {
                $log.log("ConvoworksApi getPlatformConfiguration() res", res);

                return res.data;
            });
        }

        function updatePlatformConfiguration(config)
        {
            return $http({
                method: 'put',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config',
                headers: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                data: config
            }).then(function (res) {
                $log.log("ConvoworksApi updatePlatformConfig() res", res);

                return res.data;
            });
        }


        function requestAuthUrl(user)
        {
            return $http({
                method: 'GET',
                url: CONVO_PUBLIC_API_BASE_URL + '/admin-auth/amazon?username=' + user.email
            }).then(function (res) {
                $log.log('Got res', res);
                return res.data;
            });
        }


		// TEMPLATES
		function getTemplates() {
			var d	=	$q.defer();
    		
    		getComponentDefinitions().then( function( definitions) {
    			var templates	=	[];
				for ( var i=0; i<definitions.length; i++) {
					var pckg	=	definitions[i];
					for ( var j=0; j<pckg.templates.length; j++) {
						templates.push( pckg.templates[j]);
					}
				}
				
				d.resolve( templates);
				
//				d.reject( 'Component ['+className+'] not found');
			});
    		
    		return d.promise;
		}

		// DEFINITIONS
        function getComponentDefinitions() {
        	if ( !!definitions)
        	{
				var d	=	$q.defer();

				d.resolve( definitions);

				return d.promise;
			}
			else
			{
            	return $http({
					method: 'GET',
					url: CONVO_ADMIN_API_BASE_URL + '/user-packages'
				}).then( function ( res) {
					definitions	=	res.data;
					return definitions;
				});
			}
        }
        
        function getComponentDefinition( className) {
//        	$log.log( 'ConvoworksApi getComponentDefinition(%s)', className);
    		var d	=	$q.defer();
    		
    		getComponentDefinitions().then( function( definitions) {
				for ( var i=0; i<definitions.length; i++) {
					var pckg	=	definitions[i];
					for ( var j=0; j<pckg.components.length; j++) {
						var comp = pckg.components[j];
						if ( comp['type'] === className) {
							d.resolve( comp);
							return comp;
						}
						if (comp['component_properties']['_class_aliases']) {
							var aliases = comp['component_properties']['_class_aliases'];
							for ( var n = 0; n < aliases.length; n++) {
								if (aliases[n] === className) {
									d.resolve( comp);
									return comp;
								}
							}
						}
					}
				}
				d.reject( 'Component ['+className+'] not found');
			});
    		
    		return d.promise;
        }

        function getAllServices() {
        	$log.log( 'ConvoworksApi getAllServices()');

        	return $http({
				method: 'GET',
				url: CONVO_ADMIN_API_BASE_URL + '/services'
			}).then( function ( res) {
				return res.data;
			})
		}

        function getServiceById( serviceId) {
        	$log.log( 'ConvoworksApi getServiceById(%s)', serviceId);
        	return $http({
				method: 'GET',
				url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId
			}).then( function ( res) {
				return res.data;
			});
        }

        function getServiceMeta( serviceId) {
        	$log.log( 'ConvoworksApi getServiceMeta(%s)', serviceId);
        	return $http({
        		method: 'GET',
        		url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/meta'
        	}).then( function ( res) {
        		return res.data;
        	});
        }

        function createService( serviceName, templateId)
        {
        	return $http({
		        method: 'post',
		        url: CONVO_ADMIN_API_BASE_URL + '/services',
		        data: { 'service_name' : serviceName, 'template_id' : templateId }
	        }).then( function ( res) {
	        	return res.data;
	        });
        }

        function updateService( serviceId, service) {
        	$log.log( 'ConvoworksApi postService() serviceId', serviceId);

        	return $http.put( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId, service);
		}

		function updateServiceMeta( serviceId, meta) {
			$log.log( 'ConvoworksApi updateServiceMeta() serviceId', serviceId, 'meta', meta);

			return $http.put( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/meta', meta);
		}

		function getServicePreview(serviceId) {
			$log.log('ConvoworksApi getServicePrevies() serviceId', serviceId);

			return $http
				.get( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/preview')
				.then(function (res) {
					return res.data
				});
		}

		function sendMessage( serviceId, deviceId, text, isLaunch, variant, delegateNlp)
		{
            if ( !variant) {
                variant =   'develop';
            }

			return $http({
				method: "post",
				url: CONVO_ADMIN_API_BASE_URL + '/service-test/' + serviceId,
				data : { device_id : deviceId, text : text, lunch : isLaunch, platform_id: delegateNlp }
			}).then( function ( response) {
				$log.log('ConvoworksApi sendMessage response.data', response.data);
				return response.data;
			});
		}

		function uploadServiceData( serviceId, file, keepVars, keepConfigs) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi uploadServiceData() serviceId', serviceId, 'file', file);
            var fd = new FormData();
            fd.append("service_definition", file);
            fd.append("keep_vars", keepVars);
            fd.append("keep_configs", keepConfigs);
            
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/import/' + serviceId, fd, { headers: {'Content-Type': undefined }})
			.then(function (res) {
				$log.log('ConvoworksApi uploadServiceData() res', res);
				return res.data;
			});	
		}

		function loadPlatformConfig( serviceId) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi loadPlatformConfig() serviceId', serviceId);
            
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi loadPlatformConfig() res', res);
				return res.data;
			});	
		}

		function getServicePlatformConfig( serviceId, platformId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId)
			.then(function (res) {
				$log.log('ConvoworksApi getServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function createServicePlatformConfig( serviceId, platformId, data) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi createServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
			.then(function (res) {
				$log.log('ConvoworksApi createServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function updateServicePlatformConfig( serviceId, platformId, data) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi updateServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.put( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
			.then(function (res) {
				$log.log('ConvoworksApi updateServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function propagateServicePlatform( serviceId, platformId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi propagateServicePlatform() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-platform-propagate/' + serviceId +'/'+platformId)
			.then(function (res) {
				$log.log('ConvoworksApi propagateServicePlatform() res', res);
				return res.data;
			});	
		}
		
		function getPropagateInfo( serviceId, platformId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getPropagateInfo() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-platform-propagate/' + serviceId +'/'+platformId)
			.then(function (res) {
				$log.log('ConvoworksApi getPropagateInfo() res', res);
				return res.data;
			});	
		}
		
		function getPublishInformation( serviceId) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi getPublishInformation() serviceId', serviceId);
            
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-publish/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getPublishInformation() res', res);
				return res.data;
			});	
        }
        
				
		function getServiceVersions( serviceId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServiceVersions() serviceId', serviceId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-versions/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getServiceVersions() res', res);
				return res.data;
			});	
		}
		
		function createRelease( serviceId, platformId, type, stage) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi createRelease() serviceId', serviceId);
			
			var data	=	{
					platform_id : platformId,
					type : type,
					stage : stage
			};
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
			.then(function (res) {
				$log.log('ConvoworksApi createRelease() res', res);
				return res.data;
			});	
		}
		
		function promoteRelease( serviceId, releaseId, type, stage) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi promoteRelease() serviceId', serviceId);
			
			var data	=	{
					release_id : releaseId,
					type : type,
					stage : stage
			};
			
			return $http
			.put( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
			.then(function (res) {
				$log.log('ConvoworksApi promoteRelease() res', res);
				return res.data;
			});	
		}
		
		function importWorkflowIntoRelease( serviceId, releaseId, versionId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi importWorkflowIntoRelease() serviceId', serviceId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId + '/' + releaseId + '/import-workflow/' + versionId)
			.then(function (res) {
				$log.log('ConvoworksApi importWorkflowIntoRelease() res', res);
				return res.data;
			});	
		}
		
		function getServiceReleases( serviceId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServiceReleases() serviceId', serviceId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getServiceReleases() res', res);
				return res.data;
			});	
		}
		

		function uploadMedia(serviceId, kind, file) {
			if (!serviceId) {
				throw new Error("Missing service ID");
			}
			
			$log.log('ConvoworksApi uploadMedia serviceId', serviceId, 'kind', kind, 'file', file);

			var fd = new FormData();
			fd.append(kind, file);

			return $http
			.post(
				CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId,
				fd,
				{
					headers: { 'Content-Type': undefined }
				}
			)
			.then(function(res) {
				$log.log('ConvoworksApi uploadMedia res', res);
				return res.data;
			});
		}

		function downloadMedia(serviceId, mediaItemId) {
			return CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId + '/' + mediaItemId + '/download';
		}

		function getPackageComponentHelp(packageId, filename) {
			return $http
				.get( CONVO_ADMIN_API_BASE_URL + '/package-help/' + packageId + '/' + filename)
				.then(function (res) {
					$log.log('ConvoworksApi getPackageComponentHelp() res', res);
					return res.data;
				});
		}
    }
})();
(function() {

	var module = angular.module('convo.editor');

	module.service( 'ConvoworksAddBlockService', ConvoworksAddBlockService);

	/* @ngInject */
	function ConvoworksAddBlockService( $log, $uibModal) {

		this.showModal				=	showModal;
		this.showSubroutineModal	=	showSubroutineModal;
		
		function showModal( service, type, propertiesContext)
		{
			var modalInstance = $uibModal.open({
				templateUrl: 'app/convoworks/convoworks-add-block.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: {
					service: function () {
						return service;
					},
					type: function () {
						return type;
					},
					subroutineType: function () {
						return null;
					},
					propertiesContext: function () {
						return propertiesContext;
					},
				}
			});
		}


		function showSubroutineModal( service, propertiesContext, subroutineType)
		{
			var modalInstance = $uibModal.open({
				templateUrl: 'app/convoworks/convoworks-add-block.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: {
					service: function () {
						return service;
					},
					type: function () {
						return 'reader';
					},
					subroutineType: function () {
						return subroutineType;
					},
					propertiesContext: function () {
						return propertiesContext;
					},
				}
			});
		}

		
		/* @ngInject */
		var ModalInstanceCtrl = function ( $scope, $timeout, $uibModalInstance, service, type, subroutineType, propertiesContext) {

			$scope.service			=	service;

			$scope.block			=	{
					name : '',
			};
			
			if ( type == 'user') 
			{
				$scope.title			=	'Add new step';
				$scope.description		=	'Create a new step in rhe conversation workflow.';
				$scope.block.name		=	'My new conversation step';
				
				$scope.createBlock 			= 	function () {
					$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
					propertiesContext.addBlock( $scope.block.name);
					$uibModalInstance.dismiss('cancel');
				};
			} 
			else if ( type == 'reader') 
			{
				if ( subroutineType == 'read') 
				{
					$scope.title			=	'Add new read fragment';
					$scope.description		=	'Create new fragment which can be invoked from conversation elemets';
					$scope.block.name		=	'My new read fragment';
				
					$scope.createBlock 			= 	function () {
						$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
						propertiesContext.addReadSubroutine( $scope.block.name);
						$uibModalInstance.dismiss('cancel');
					};
				}
				else if ( subroutineType == 'process')
				{
					$scope.title			=	'Add new process fragment';
					$scope.description		=	'Create new fragment which can be invoked from conversation processors';
					$scope.block.name		=	'My new process fragment';

									
					$scope.createBlock 			= 	function () {
						$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
						propertiesContext.addProcessSubroutine( $scope.block.name);
						$uibModalInstance.dismiss('cancel');
					};
				}
				else
				{
					throw new Error( 'Unexpected subroutineType ['+subroutineType+']');
				}


				
			} 
			else 
			{
				throw new Error( 'Unexpected type ['+type+']');
			}
			

			$scope.cancel 			= 	function () {
				$uibModalInstance.dismiss('cancel');
			};
			
		};
	};
})();
(function() {

	var module = angular.module('convo.editor');

	module.service( 'ConvoComponentFactoryService', ConvoComponentFactoryService);

	/* @ngInject */
	function ConvoComponentFactoryService( $log, $q, ConvoworksApi) {

        this.generateUniqueId			=	generateUniqueId;
        this.createComponent			=	createComponent;
        this.copyComponent				=	copyComponent;
        
		this.createBlock				=	createBlock;
		this.createReadSubroutine		=	createReadSubroutine;
		this.createProcessSubroutine	=	createProcessSubroutine;


        function generateUniqueId() { 
            var result = ''; 
            result += makeid( 8);
            result += '-';
            result += makeid( 4);
            result += '-';
            result += makeid( 4);
            result += '-';
            result += makeid( 4);
            result += '-';
            result += makeid( 12);
            
            return result.toLowerCase(); 
        }
        
        function makeid( length) {
        	   var result           = '';
        	   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        	   var charactersLength = characters.length;
        	   for ( var i = 0; i < length; i++ ) {
        	      result += characters.charAt(Math.floor(Math.random() * charactersLength));
        	   }
        	   return result;
        }
        
        function copyComponent( service, componentToCopy) 
        {
        	$log.log( 'ConvoComponentFactoryService copyComponent componentToCopy', componentToCopy);
        	
        	var component	=	angular.copy( componentToCopy);
        	_regenerateComponentIds( component);
            return component;
        }
        
        function _regenerateComponentIds( component)
        {
        	component.properties._component_id  =   generateUniqueId();
        	
        	for ( var key in component.properties) {
        		if ( angular.isArray( component.properties[key])) {
        			for ( var i=0; i<component.properties[key].length; i++) {
            			if ( component.properties[key][i]['class']) {
            				_regenerateComponentIds( component.properties[key][i]);
            			}
        			}
        		} else {
        			if ( component.properties[key] && component.properties[key]['class']) {
        				_regenerateComponentIds( component.properties[key]);
        			}
        		}
        	}
        }

        function createComponent( service, definition, name) 
        {
        	$log.log( 'ConvoComponentFactoryService createComponent() creating definition.type', definition.type, 'name', name);
            var component		=	{
                    class : definition.type,
                    namespace :	definition.namespace,
                    properties : {
                    }
            };
            
            for ( var key in definition.component_properties) 
            {
                $log.log( 'ConvoComponentFactoryService createComponent() checking property', key);

                if ( definition.component_properties[key].editor_type === 'block_id' ||
                    definition.component_properties[key].editor_type === 'process_fragment' ||
                    definition.component_properties[key].editor_type === 'read_fragment') {
                    // block_id - predefined behaviour
                    component.properties[key] = _generateBlockId( service, name);
                } else if ( definition.component_properties[key].editor_type === 'service_components') {

                    $log.log( 'ConvoComponentFactoryService createComponent() service_components editor');

                    if ( typeof definition.component_properties[key].defaultValue === 'undefined') {
                        $log.log( 'ConvoComponentFactoryService createComponent() no default value');
                        continue;
                    }

                    if ( !definition.component_properties[key].defaultValue) {
                        $log.log( 'ConvoComponentFactoryService createComponent() empty default value', definition.component_properties[key].defaultValue);
                        component.properties[key]       =   definition.component_properties[key].defaultValue;
                        continue;
                    }

                    if ( definition.component_properties[key].editor_properties.multiple) {
                        $log.log( 'ConvoComponentFactoryService createComponent() multiple components');
                        component.properties[key]   =   [];
                        for ( var i=0; i<definition.component_properties[key].defaultValue.length; i++) {
                            var child                       =   angular.copy( definition.component_properties[key].defaultValue[i]);
                            child.properties._component_id  =   generateUniqueId();
                            component.properties[key][component.properties[key].length]       =   child;
                        }
                    } else {
                        $log.log( 'ConvoComponentFactoryService createComponent() single component');
                        var child                       =   angular.copy( definition.component_properties[key].defaultValue);
                        child.properties._component_id  =   generateUniqueId();
                        component.properties[key]       =   child;
                    }
                } else if ( key.indexOf( '_') === 0) {
                    // system props - just copy the component id - predefined behaviour
                    if (key === '_component_id') {
                        component.properties[key] = definition.component_properties[key];
                    } else {
                        delete component.properties[key];
                    }
                } else if ( typeof definition.component_properties[key].defaultValue !== 'undefined') {
                    // use default value
                    $log.log( 'ConvoComponentFactoryService createComponent() default value', definition.component_properties[key].defaultValue);
                    component.properties[key] = definition.component_properties[key].defaultValue;
                }
            }
            
            if ( name) {
            	component.properties.name	=	name;
            }

            component.properties['_component_id'] = generateUniqueId();

            $log.log( 'ConvoComponentFactoryService createComponent() created component', component);

            return component;
        }

        function createBlock( service, name) 
        {
            var deferred	=	$q.defer();

            ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Elements\\ConversationBlock').then( function( definition) {
				$log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
                deferred.resolve( createComponent( service, definition, name));
            }, function( reason) {
                deferred.reject( reason);
            })

            return deferred.promise;
        }

        function createReadSubroutine( service, name) 
        {
            var deferred    =	$q.defer();

            ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment').then( function( definition) {
				$log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
                deferred.resolve( createComponent( service, definition, name));
            }, function( reason) {
                deferred.reject( reason);
            })

            return deferred.promise;
        }

        function createProcessSubroutine( service, name) 
        {
            var deferred    =	$q.defer();

            ConvoworksApi.getComponentDefinition( '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment').then( function( definition) {
				$log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
                deferred.resolve( createComponent( service, definition, name));
            }, function( reason) {
                deferred.reject( reason);
            })

            return deferred.promise;
        }



        // PRIVATE UTIL

        function _findBlock( service, blockId) {
            for ( var i=0; i<service.blocks.length; i++) {
                var block	=	service.blocks[i];
                if ( block.properties.block_id === blockId) {
                    return block;
                }
            }
            for ( var i=0; i<service.fragments.length; i++) {
                var block	=	service.fragments[i];
                if ( block.properties.fragment_id === blockId) {
                    return block;
                }
            }
            
            return null;
        }

        function _generateBlockId( service, name) {
        	
        	if ( !name) {
        		return null;
        	}
        	
            var block_id	=	name.replace(/[^A-Z0-9]+/ig, "_");
            var block		=	_findBlock( service, block_id);
            
            if ( block) {
                var parse_info	=	_parseNumericSuffix( block_id);
                
                if ( parse_info.num) {
                    block_id	=	parse_info.base + '_' + (parse_info.num + 1);
                } else {
                    block_id	+=	'_1';
                }
                
                return _generateBlockId( service, block_id);
            }
            
            return block_id;
        }

        function _parseNumericSuffix( str) {
            var index	=	str.lastIndexOf( '_');
            $log.log( 'ConvoComponentFactoryService _parseNumericSuffix str', str, 'index', index);
            if ( index <= 0) {
                return {
                    num : 0,
                    base : str
                };
            }
            $log.log( 'ConvoComponentFactoryService _parseNumericSuffix str.substr( 0, index)', str.substr( 0, index), 
                    'parseInt( str.substr( index + 1))', parseInt( str.substr( index + 1)), 'str.substr( index + 1)', str.substr( index + 1));
            return {
                num : parseInt( str.substr( index + 1)) || 0,
                base : str.substr( 0, index)
            };
        }
	};
})();
(function() {
    angular
        .module( 'convo.editor')
        .directive( 'contextElementsContainer', contextElementsContainer);

    /* @ngInject */
    function contextElementsContainer( $log)
    {
        var AUTO_OPEN_TIMEOUT	=	1500;

        return {
            restrict: 'E',
            templateUrl: 'app/convoworks/context-elements-container.tmpl.html',
            require: [ '^contextElementsContainer', '^propertiesContext'],
            scope: { 'service': '=' },
            controller: function( $scope) {

                this.getContainer       =   getContainer;
                this.indexOf            =   indexOf;
                this.isMultiple         =   isMultiple;
                this.addComponent       =   addComponent;
                this.removeComponent    =   removeComponent;

                function getContainer()
                {
                    return $scope.service.contexts;
                }

                function indexOf( component)
                {
                    return getContainer().findIndex( function( context) {
                        return context.properties._component_id === component.properties._component_id ;
                    });
                }

                function isMultiple()
                {
                    return true;
                }

                function addComponent( component, index)
                {
                    if ( !index) {
                        index	=	0;
                    }

                    getContainer().splice( index, 0, component);
                }

                function removeComponent( component)
                {
                    $scope.service.contexts =   getContainer().filter( function( context) {
                        return context.properties.id    !==     component.properties.id;
                    });
                }
            },
            link: function( $scope, $element, $attributes, $ctrls)
            {
                var contextElementsContainer    =   $ctrls[0];
                var propertiesContext           =   $ctrls[1];

                var open        =   true;
                var open_timer	=	null;

                _initDroppable();

                $scope.isOpen           =   function()
                {
                    return open;
                };

                $scope.toggleOpen       =   function()
                {
                    open    =   !open;
                };

                $scope.$on(
                    "$destroy",
                    function( event ) {
                        if ( open_timer) {
                            $timeout.cancel( open_timer );
                            open_timer	=	null;
                        }
                    }
                );

                function _initDroppable()
                {
                    var $droppable	=	jQuery($element.find( '.context-container')[0]);
                    $droppable.droppable({
                        greedy: true,
                        drop: function( event, ui ) {
                            if ( ui.draggable.data( 'convoDragged')) {
                                $scope.$apply( function() {
                                    var data	=	ui.draggable.data( 'convoDragged');

                                    $log.log( 'contextElementsContainer droppable data', data);

                                    if ( data.type == 'definition') {
                                        propertiesContext.addNewComponent(
                                            contextElementsContainer,
                                            data.componentDefinition);
                                    } else if ( data.type == 'component') {
                                        propertiesContext.moveComponent(
                                            data.containerController,
                                            contextElementsContainer,
                                            data.component);
                                    } else {
                                        throw new Error( 'Expected to have type [definition] or [component]');
                                    }
                                });
                            } else {
                                throw new Error( 'Expected to have [convoDragged] data');
                            }
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
            }
        }

    }
})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'contextElement', contextElement);

	/* @ngInject */
	function contextElement( $log, ConvoworksApi, $timeout, $compile)
	{
		return {
			restrict: 'E',
			scope: { 'contextElement' : '=' },
			require: [ '^propertiesContext', '^contextElementsContainer'],
			templateUrl: 'app/convoworks/selectable-component.tmpl.html',
			link: function( $scope, $element, $attributes, $ctrls) {
				var $draggable;

				var propertiesContext			=	$ctrls[0];
				var contextElementsContainer	=	$ctrls[1];

				$scope.showTitle			=	true;
				$scope.over					=	false;
				$scope.ready				=	false;
				$scope.componentTitle		=	"";

				_init();

				$scope.isSelected	=	function() {
					return propertiesContext.getSelection().component === $scope.contextElement;
				};

				$scope.$on( '$destroy', function() {
					$log.log( 'contextElement $destroy');
					$draggable.draggable({ disabled: true }).draggable( 'destroy');
				});

				function _init()
				{
					if ( !$scope.contextElement) {
						throw new Error( 'No element provided!');
					}

					var class_name	=		$scope.contextElement['class'];

					if ( !class_name) {
						$log.log( 'contextElement _init() $scope.contextElement', $scope.contextElement);
						throw new Error( 'No class in component');
					}

					ConvoworksApi.getComponentDefinition( class_name).then( function( definition) {

						$log.log( 'contextElement directive getComponentDefinition() then definition', definition);

						$scope.definition		=	definition;
						$scope.componentTitle	=	definition.name;

						if ( !definition.component_properties._interface) {
							if ( definition.component_properties._preview_angular) {
								$scope.showTitle	=	false;
							}
							return;
						}

					}, function( reason) {
						$log.error( 'contextElement definitions got reason', reason);
					}).finally( function() {
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
					$draggable	=	jQuery($element.find( 'div.selectable-component')[0]);

					$draggable.draggable( {
						revert: true,
						revertDuration : 50,
						zIndex: 100,
						delay : 200,
						tolerance : 'pointer',
						start: function( event, ui) {
							jQuery(this).data( 'convoDragged', {
								type : 'component',
								component : $scope.contextElement,
								containerController: contextElementsContainer
							});

							ui.helper.bind( "click.prevent",
								function(event) { event.preventDefault(); });
						},
						stop: function( event, ui) {
							setTimeout(function(){ui.helper.unbind("click.prevent");}, 300);
						}
					});
				}

				function _initDroppable()
				{
					var $droppable	=	jQuery($element.find( 'div.selectable-component')[0]);

					$droppable.droppable({
						greedy: true,
						drop: function( event, ui ) {
							if ( ui.draggable.data('convoDragged')) {
								$scope.$apply( function() {

									var data		=	ui.draggable.data('convoDragged');
									var index		=	contextElementsContainer.indexOf( $scope.contextElement) + 1;

									if ( data.type == 'definition') {
										$log.log( 'convoworksComponentsContainer new component', data.componentDefinition, 'to container', contextElementsContainer.getContainer(), 'in component', $scope.contextElement);

										propertiesContext.addNewComponent(
											contextElementsContainer,
											data.componentDefinition,
											index);

									} else if ( data.type == 'component') {
										$log.log( 'convoworksComponentsContainer move component', data.component);

										propertiesContext.moveComponent(
											data.containerController,
											contextElementsContainer,
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
					var $div	=	jQuery($element.find( 'div.selectable-component')[0]);
					$div.bind( 'click', function( event) {

						$scope.$apply( function () {
							if ( $scope.isSelected()) {
								propertiesContext.setSelectedComponent( null);
							} else {
								propertiesContext.setSelectedComponent( $scope.contextElement, {
									removeSelection: function() {
										var contexts    =   propertiesContext.getSelection().service.contexts;

										propertiesContext.getSelection().service.contexts   =
												contexts.filter( function( contextElement) {
													return contextElement	!==	$scope.contextElement;
												});
								}});
							}
						});

						event.stopPropagation();
					});
				}

				function _initPreview()
				{
					var container	=	$element.find( '.preview');

					if ( $scope.definition.component_properties._preview_angular) {
						var html		=	$scope.definition.component_properties._preview_angular.template;
						container.html( html);
						$compile( container.contents())( $scope);
					} else {
						container.html( '');
					}
				}
			}
		}
	}
})();
(function () {
	"use strict";

	angular
		.module('convo.editor')
		.directive('configServiceMetaEditor', configServiceMetaEditor);

	function configServiceMetaEditor($log, LoginService, ConvoworksApi)
	{
		return {
			restrict: 'E',
			scope: { service: '=' },
			templateUrl: 'app/convoworks/config-service-meta-editor.tmpl.html',
			link: function($scope, $element, $attributes) {
				$log.log('configServiceMetaEditor linked');

				var user = null;

				LoginService.getUser().then(function (u) {
					user = u;
				});

				$scope.config = {
					name: '',
					description: '',
					owner: '',
					admins: ['']
				};

				_load();

				var configBak = angular.copy($scope.config);
				var is_error =	false;

				$scope.revertConfig = function () {
					$scope.config = angular.copy(configBak);
				}

				$scope.isConfigChanged = function () {
					return !angular.equals(configBak, $scope.config);
				}

				$scope.updateConfig = function() {
					ConvoworksApi.updateServiceMeta($scope.service.service_id, $scope.config).then(function (res) {
						var meta = res.data;
						$log.log('configServiceMetaEditor updateConfig() got new meta', meta);

						$scope.config = {
							name: meta['name'] || '',
							description: meta['description'] || '',
							owner: meta['owner'] || '',
							admins: meta['admins'] || ['']
						}

						configBak = angular.copy($scope.config);
						is_error = false;
					}, function (reason) {
						$log.warn('configServiceMetaEditor updateConfig failed for reason', reason);
						is_error = true;
						throw new Error(reason.data.message)
					});
				}

				function _load() {
					ConvoworksApi.getServiceMeta($scope.service.service_id).then(function (meta) {
						$log.log('configServiceMetaEditor got service meta', meta);
						$scope.config = {
							name: meta['name'] || '',
							description: meta['description'] || '',
							owner: meta['owner'] || '',
							admins: meta['admins'] || ['']
						}

						configBak = angular.copy($scope.config);
						is_error = false;
					}, function (reason) {
						$log.warn('configServiceMetaEditor getServiceMeta failed for reason', reason);
						is_error = true;
					});
				}
			}
		}
	}
})();
(function () {
    angular
        .module('convo.editor')
        .directive('configDialogflowEditor', configDialogflowEditor);

    function configDialogflowEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/config-dialogflow-editor.tmpl.html',
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

            	var user	=	null;
            	
            	LoginService.getUser().then( function ( u) {
            		user = u;
            	});
            	
                $scope.config = {
            		mode: 'manual',
					projectId: null,
                    serviceAccount: null,
                    name: null,
                    description: null,
                    avatar: null
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;
				var logline		=	'';

                
                _load();

				var preparedUpload = null;
				var previousMediaItemId = null;
                
                $scope.isNew	= function () {
                	return is_new;
                }
                
                $scope.hideAll	= function () {
                	return !has_started && is_new;
                }
                
                $scope.start	= function () {
                	has_started = true;
                }

                $scope.cancel = function () {
                	has_started = false;
                }

                $scope.getConfigUrl = function() {
                	return 'https://console.actions.google.com/project/' + $scope.config.projectId + '/directoryinformation/'
				}

                $scope.updateConfig = function () {
					$log.debug('configDialogflowEditor update() $scope.config', $scope.config);

					var maybeUpload = preparedUpload ?
						ConvoworksApi.uploadMedia(
							$scope.service.service_id,
							'dialogflow.avatar',
							preparedUpload.file) :
						null;

					$q.when(maybeUpload).then(function (res) {
						if (res && res.mediaItemId) {
							$scope.config.avatar = res.mediaItemId;
							preparedUpload = null;
						}

						if (is_new) {
							return ConvoworksApi.createServicePlatformConfig(
								$scope.service.service_id,
								'dialogflow',
								$scope.config
							).then(function (data) {
								configBak = angular.copy( $scope.config);
								logline = 'configDialogflowEditor create() response';
								is_new = false;
								$rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
							}, function (response) {
								$log.debug('configDialogflowEditor create() response', response);
								is_error	=	true;
								throw new Error("Can't create config for Dialogflow. " + response.data.message)
							});
						}

						logline = 'configDialogflowEditor update() response';
						return ConvoworksApi.updateServicePlatformConfig(
							$scope.service.service_id,
							'dialogflow',
							$scope.config
						);
					}).then(function (data) {
						configBak = angular.copy($scope.config);
						is_error = false;
						$rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
					}, function (response) {
						$log.debug(logline, response);
						is_error = true;
					});
				}

                $scope.revertConfig = function () {
					if (preparedUpload) {
						preparedUpload = null;
					}

					if (previousMediaItemId) {
						previousMediaItemId = null;
					}

                    $scope.config = angular.copy(configBak);
                }

				$scope.onFileUpload = function (file) {
					$log.log('ConfigurationsEditor onFileUpload file', file);

					preparedUpload = {
						file: file
					};

					previousMediaItemId = $scope.config.avatar;
					$scope.config.avatar = 'tmp_upload_ready';
				}

				$scope.getMedia = function(type) {
					var mediaItemId = $scope.config[type];

					if (!mediaItemId) {
						return '';
					}

					if (mediaItemId === 'tmp_upload_ready') {
						mediaItemId = previousMediaItemId;
					}

//					$log.log('ConfigurationsEditor getMedia(', type, ') mediaItemId', mediaItemId);

					return ConvoworksApi.downloadMedia($scope.service.service_id, mediaItemId);
				}

                $scope.isConfigChanged = function () {
                    return !angular.equals( configBak, $scope.config);
                }
                
                function _load()
                {
                	ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'dialogflow').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new	=	false;
                        is_error	=	false;
                    }, function ( response) {
                        $log.debug('configDialogflowEditor loadPlatformConfig() response', response);
                        
                        if ( response.status === 404) {
                        	is_new		=	true
                        	is_error	=	false;
                        	return;
                        }
                        is_error	=	true;
                    });
                }
            }
        }
    }

})();
(function () {
    angular
        .module('convo.editor')
        .directive('configConvoChatEditor', configConvoChatEditor);

    function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/config-convo-chat-editor.tmpl.html',
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

            	var user	=	null;
            	
            	LoginService.getUser().then( function ( u) {
            		user = u;
            	});
            	
                $scope.config = {
                    delegateNlp: null
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;

                
                _load();

                $scope.getIntentNlps	= function () {
                	return ['dialogflow'];
                }
                
                $scope.isNew	= function () {
                	return is_new;
                }
                
                $scope.hideAll	= function () {
                	return !has_started && is_new;
                }
                
                $scope.start	= function () {
                	has_started = true;
                }

                $scope.cancel = function () {
                	has_started = false;
                }
                
                $scope.updateConfig = function () {
                	
                	if ( is_new) {
                		ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                			$log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                            configBak = angular.copy( $scope.config);
                            is_new		=	false;
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configConvoChatEditor create() response', response);
                            is_error	=	true;
                            throw new Error("Can't create config for Convo. " + response.data.message)
                        });                		
                	} else {
                		ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                			$log.debug('configConvoChatEditor update() $scope.config', $scope.config);
                            configBak = angular.copy( $scope.config);
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configConvoChatEditor update() response', response);
                            is_error	=	true;
                        });                		
                	}
                }
                
                

                $scope.revertConfig = function () {
                    $scope.config = angular.copy(configBak);
                }
                

                $scope.isConfigChanged = function () {
                    return !angular.equals( configBak, $scope.config);
                }
                
                function _load()
                {
                	ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo_chat').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new	=	false;
                        is_error	=	false;
                    }, function ( response) {
                        $log.debug('configConvoChatEditor loadPlatformConfig() response', response);
                        
                        if ( response.status === 404) {
                        	is_new		=	true
                        	is_error	=	false;
                        	return;;	
                        }
                        is_error	=	true;
                    });
                }
                
                
            }
        }
    }

})();
(function () {
    angular
        .module('convo.editor')
        .directive('configAmazonEditor', configAmazonEditor);

    function configAmazonEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/config-amazon-editor.tmpl.html',
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

            	var user	=	null;
            	
            	LoginService.getUser().then( function ( u) {
            		user = u;
            	});
            	
                $scope.config = {
                    mode: 'manual',
                    invocation: $scope.service.name,
                    app_id: null,
                    auto_display: false
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;

                
                _load();

                $scope.$watch('config.auto_display', function(newVal) {
                    if (newVal !== undefined) {
                        $log.log('configAmazonEditor $watch config.auto_display new value', $scope.config);
                        $scope.config.auto_display = newVal;
                    }
                });

				$scope.getConfigUrl = function() {
					return 'https://developer.amazon.com/alexa/console/ask/publish/alexapublishing/' + $scope.config.app_id + '/development/en_US/skill-info'
				}

                $scope.isModeValid	= function () {
                	return !( $scope.config.mode === 'auto' && !user.amazon_account_linked);
                }
                
                $scope.isNew	= function () {
                	return is_new;
                }
                
                $scope.hideAll	= function () {
                	return !has_started && is_new;
                }
                
                $scope.start	= function () {
                	has_started = true;
                }

                $scope.cancel = function () {
                	has_started = false;
                }
                
                $scope.updateConfig = function () {
                	$log.debug('configAmazonEditor update() $scope.config', $scope.config);
                	
                	if ( is_new) {
                		ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_new		=	false;
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configAmazonEditor create() response', response);
                            is_error	=	true;
                            throw new Error("Can't create config for Amazon. " + response.data.message)
                        });                		
                	} else {
                		ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configAmazonEditor update() response', response);
                            is_error	=	true;
                        });                		
                	}
                }
                
                

                $scope.revertConfig = function () {
                    $scope.config = angular.copy(configBak);
                }
                

                $scope.isConfigChanged = function () {
                    return !angular.equals( configBak, $scope.config);
                }
                
                function _load()
                {
                	ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'amazon').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new	=	false;
                        is_error	=	false;
                    }, function ( response) {
                        $log.debug('configAmazonEditor loadPlatformConfig() response', response);
                        
                        if ( response.status === 404) {
                        	is_new		=	true
                        	is_error	=	false;
                        	return;;	
                        }
                        is_error	=	true;
                    });
                }
                
                
            }
        }
    }

})();
(function() {
	"use strict";

	angular
		.module( 'convo.editor')
		.directive( 'blockComponent', blockComponent);

	/* @ngInject */
	function blockComponent( $log, $timeout, ConvoworksApi, UserPreferencesService, LoginService)
	{
		return {
			restrict: 'E',
			scope: { 'block' : '=', 'canMoveUp': '=', 'canMoveDown': '=' },
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

				$scope.moveUp = function()
				{
					$scope.$emit('moveBlock', {
						blockId: $scope.block.properties.block_id + '',
						dir: -1
					});
				}

				$scope.moveDown = function()
				{
					$scope.$emit('moveBlock', {
						blockId: $scope.block.properties.block_id + '',
						dir: 1
					});
				}

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

                        LoginService.getUser().then(function (user) {
                            $log.log('blockComponent got user', user);
                            USER_PREFERENCES_KEY    =   user.user_id + '_' + propertiesContext.getSelectedService()['service_id'] + '_' + $scope.block.properties['_component_id'];

                            $log.log('blockComponent final user preferences key', USER_PREFERENCES_KEY);

                            UserPreferencesService.getData(USER_PREFERENCES_KEY).then(function (value) {
                                if (value !== null && value !== undefined) {
                                    $scope.isSysBlockOpen.value = value;
                                } else {
                                    $scope.isSysBlockOpen.value = false;
                                }
                            });
                        }, function (reason) {
                            $log.warn('blockComponent getUser() rejected with reason', reason);
                        });

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
					var $div	=	jQuery($element.find( 'div.selectable-component')[0]);

					var containerController =   {
						removeSelection: function() { propertiesContext.removeBlock( $scope.block.properties.block_id); }
					};
					
					$div.bind( 'click', function( event) {
						$scope.$apply( function () {
							if ( $scope.isSelected()) {
								propertiesContext.setSelectedComponent( null);
							} else {
								propertiesContext.setSelectedComponent( $scope.block, containerController);
							}
							event.stopPropagation();
						});						
					});
				}
			}
		}
	}
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInJvdXRpbmcuanMiLCJsb2dpbi1zZXJ2aWNlLmpzIiwibW9kdWxlLmpzIiwidXRpbC91c2VyLXByZWZlcmVuY2VzLnNlcnZpY2UuanMiLCJ1dGlsL2RlZmVycmVkcy1zdGFjay5zZXJ2aWNlLmpzIiwidXRpbC9hbGVydC1zZXJ2aWNlLmpzIiwiZWRpdG9ycy9zeXN0ZW0taW50ZW50LWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3JzL2ludGVudC11dHRlcmFuY2UtZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvcnMvY29udm8taW50ZW50LWVkaXRvci5kaXJlY3RpdmUuanMiLCJjb21tb24vdGV4dC1hcnJheS5kaXJlY3RpdmUuanMiLCJjb21tb24vbG9hZGluZy5kaXJlY3RpdmUuanMiLCJjb21tb24vanNvbi10ZXh0LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9hbGVydC1pbmRpY2F0b3IuZGlyZWN0aXZlLmpzIiwiY2hhdGJveC9jb252by1jaGF0LWFwaS5qcyIsImNoYXRib3gvY2hhdGJveC5kaXJlY3RpdmUuanMiLCJ2ZXJzaW9ucy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwidmFyaWFibGVzLWVkaXRvci5kaXJlY3RpdmUuanMiLCJzdWJyb3V0aW5lLWNvbXBvbmVudC5kaXJlY3RpdmUuanMiLCJzZWxlY3RhYmxlLWNvbXBvbmVudC5kaXJlY3RpdmUuanMiLCJyZWxlYXNlcy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwicHJvcGVydGllcy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwicHJvcGVydGllcy1jb250ZXh0LmRpcmVjdGl2ZS5qcyIsInByZXZpZXctdmFyaWFibGVzLWVkaXRvci5kaXJlY3RpdmUuanMiLCJwcmV2aWV3LXBhbmVsLmRpcmVjdGl2ZS5qcyIsIm1pc2MtcGFuZWwuZGlyZWN0aXZlLmpzIiwiaW50ZW50LWVkaXRvci5kaXJlY3RpdmUuanMiLCJmaWx0ZXJzLmpzIiwiZW50aXR5LWVkaXRvci5kaXJlY3RpdmUuanMiLCJjb252b3dvcmtzLXRvb2xib3guZGlyZWN0aXZlLmpzIiwiY29udm93b3Jrcy10b29sYm94LWNvbXBvbmVudC5kaXJlY3RpdmUuanMiLCJjb252b3dvcmtzLW1haW4uY29udHJvbGxlci5qcyIsImNvbnZvd29ya3MtZWRpdG9yLmNvbnRyb2xsZXIuanMiLCJjb252b3dvcmtzLWNvbXBvbmVudHMtY29udGFpbmVyLmRpcmVjdGl2ZS5qcyIsImNvbnZvd29ya3MtYXBpLmpzIiwiY29udm93b3Jrcy1hZGQtYmxvY2suc2VydmljZS5qcyIsImNvbnZvLWNvbXBvbmVudC1mYWN0b3J5LnNlcnZpY2UuanMiLCJjb250ZXh0LWVsZW1lbnRzLWNvbnRhaW5lci5kaXJlY3RpdmUuanMiLCJjb250ZXh0LWVsZW1lbnQuZGlyZWN0aXZlLmpzIiwiY29uZmlnLXNlcnZpY2UtbWV0YS1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiY29uZmlnLWRpYWxvZ2Zsb3ctZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImNvbmZpZy1jb252by1jaGF0LWVkaXRvci5kaXJlY3RpdmUuanMiLCJjb25maWctYW1hem9uLWVkaXRvci5kaXJlY3RpdmUuanMiLCJibG9jay1jb21wb25lbnQuZGlyZWN0aXZlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBbEJ0U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QW1CckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25VQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcGJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY29udm8tYWxsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8ud3AnLCBbICdjb252by5lZGl0b3InLCAnbmdSb3V0ZSddKTtcbiAgICAgICAgICAgIFxuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by53cCcpLmZhY3RvcnkoJyRleGNlcHRpb25IYW5kbGVyJywgZnVuY3Rpb24gKCRpbmplY3RvciwgJGxvZykge1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleGNlcHRpb24sIGNhdXNlKSB7XG4gICAgICAgICAgICB2YXIgQWxlcnRTZXJ2aWNlID0gJGluamVjdG9yLmdldCgnQWxlcnRTZXJ2aWNlJyk7XG4gICAgICAgICAgICBBbGVydFNlcnZpY2UuYWRkRGFuZ2VyKGV4Y2VwdGlvbi5tZXNzYWdlKTtcbiAgICAgICAgICAgICRsb2cuZXJyb3IoZXhjZXB0aW9uKTtcbi8vICAgICAgZXhjZXB0aW9uLm1lc3NhZ2UgKz0gJyAoY2F1c2VkIGJ5IFwiJyArIGNhdXNlICsgJ1wiKSc7XG4vLyAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLndwJykucnVuKFxuXG4gICAgICAgIGZ1bmN0aW9uKCAkbG9nLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sIExvZ2luU2VydmljZSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBMb2dpblNlcnZpY2UuZ2V0VXNlcigpLmZpbmFsbHkoIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyByZWdpc3RlciBsaXN0ZW5lciB0byB3YXRjaCByb3V0ZSBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oIFwiJHJvdXRlQ2hhbmdlU3RhcnRcIiwgZnVuY3Rpb24oIGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCckcm91dGVDaGFuZ2VTdGFydCBjdXJyZW50JywgY3VycmVudCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJyRyb3V0ZUNoYW5nZVN0YXJ0IG5leHQnLCBuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnJHJvdXRlQ2hhbmdlU3RhcnQgbmV4dC5vcmlnaW5hbFBhdGgnLCBuZXh0Lm9yaWdpbmFsUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJyRyb3V0ZUNoYW5nZVN0YXJ0JywgTG9naW5TZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFMb2dpblNlcnZpY2UuaXNTaWduZWRJbigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnJHJvdXRlQ2hhbmdlU3RhcnQgcnVuKCkgREVOWScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIG5leHQub3JpZ2luYWxQYXRoICYmIChuZXh0Lm9yaWdpbmFsUGF0aCAhPSAnLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24udXJsKCcvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnJHJvdXRlQ2hhbmdlU3RhcnQgcnVuKCkgQUxMT1cnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgKTtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by53cCcpLmZhY3RvcnkoICdhdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoICRyb290U2NvcGUsICRxLCAkbG9nLCAkbG9jYXRpb24sIFdQX05PTkNFKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAncmVxdWVzdCc6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChXUF9OT05DRSAhPT0gdW5kZWZpbmVkICYmIFdQX05PTkNFICE9PSBudWxsICYmIFdQX05PTkNFICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnYXV0aEludGVyY2VwdG9yIHNldCBYLVdQLU5vbmNlIGhlYWRlcicsIFdQX05PTkNFKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnNbJ1gtV1AtTm9uY2UnXSA9IFdQX05PTkNFO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2F1dGhJbnRlcmNlcHRvciByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAoIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2F1dGhJbnRlcmNlcHRvciBjbGVhciB1c2VyICRsb2NhdGlvbi51cmwoKScsICRsb2NhdGlvbi51cmwoKSk7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuY2xlYXJVc2VyKCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi51cmwoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCggcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIHJlc3BvbnNlLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnYXV0aEludGVyY2VwdG9yIHJlamVjdGluZyByZXNwb25zZS5zdGF0dXMnLCByZXNwb25zZS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCAkcS53aGVuKCByZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8ud3AnKS5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnYXV0aEludGVyY2VwdG9yJyk7XG4gICAgfSk7XG4gICAgXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24gKCRyb3V0ZVByb3ZpZGVyKSB7XG5cbiAgICAgICAgICAgICRyb3V0ZVByb3ZpZGVyLlxuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgd2hlbignL2NvbnZvd29ya3MtZWRpdG9yJywge1xuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL2NvbnZvd29ya3MtbWVudS50bXBsLmh0bWwnLFxuXHRcdFx0XHRcdGNvbnRyb2xsZXI6ICdDb252b3dvcmtzTWFpbkNvbnRyb2xsZXInLFxuXHRcdFx0XHRcdGNvbnRyb2xsZXJBczogJ21haW5Dd29ya3NWbSdcbiAgICAgICAgICAgICAgICB9KS5cblxuXHRcdFx0XHR3aGVuKCcvY29udm93b3Jrcy1lZGl0b3IvOnNlcnZpY2VfaWQnLCB7XG5cdFx0XHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9jb252b3dvcmtzLWVkaXRvci50bXBsLmh0bWwnLFxuXHRcdFx0XHRcdGNvbnRyb2xsZXI6ICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlcicsXG5cdFx0XHRcdFx0Y29udHJvbGxlckFzOiAnZWRpdG9yVm0nLFxuICAgICAgICAgICAgICAgICAgICByZWxvYWRPblNlYXJjaDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfV0pO1xufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by53cCcpXG4gICAgICAgIC5zZXJ2aWNlKCdMb2dpblNlcnZpY2UnLCBMb2dpblNlcnZpY2UpO1xuXG4gICAgLyogQG5nSW5qZWN0ICovXG4gICAgZnVuY3Rpb24gTG9naW5TZXJ2aWNlKCAkbG9nLCAkcSwgV1BfVVNFUikge1xuXG5cdFx0dGhpcy5pc1NpZ25lZEluICAgIFx0PSAgIGlzU2lnbmVkSW47XG5cdFx0dGhpcy5nZXRVc2VyICAgXHRcdD0gICBnZXRVc2VyO1xuXG5cdFx0ZnVuY3Rpb24gZ2V0VXNlcigpXG5cdFx0e1xuXHRcdFx0dmFyIGRlZmVycmVkXHQ9XHQkcS5kZWZlcigpO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggV1BfVVNFUik7XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1NpZ25lZEluKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicsIFsgJ25nUm91dGUnLCAnbmdBbmltYXRlJywgJ25nQ29va2llcycsICduZ1Nhbml0aXplJyxcbiAgICAgICAgICAgICd1aS5ib290c3RyYXAnLCAndWkuc2VsZWN0JywgJ3VpLmJvb3RzdHJhcC5jb250ZXh0TWVudScsICdMb2NhbFN0b3JhZ2VNb2R1bGUnLCAnbmdGaWxlVXBsb2FkJywgJ2pzb25Gb3JtYXR0ZXInXSk7XG4gICAgXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmNvbmZpZyhmdW5jdGlvbiAobG9jYWxTdG9yYWdlU2VydmljZVByb3ZpZGVyKSB7XG4gICAgICAgICAgbG9jYWxTdG9yYWdlU2VydmljZVByb3ZpZGVyXG4gICAgICAgICAgICAuc2V0UHJlZml4KCdjb252b0FkbWluJylcbi8vICAgICAgICAgIC5zZXRTdG9yYWdlVHlwZSgnc2Vzc2lvblN0b3JhZ2UnKVxuICAgICAgICAgICAgLnNldE5vdGlmeSh0cnVlLCB0cnVlKVxuICAgICAgICB9KTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cblx0dmFyIG1vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCdjb252by5lZGl0b3InKTtcblxuXHRtb2R1bGUuc2VydmljZSgnVXNlclByZWZlcmVuY2VzU2VydmljZScsIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlKCAkbG9nLCAkaHR0cCwgJHEsIGxvY2FsU3RvcmFnZVNlcnZpY2UpIHtcblxuXHRcdHRoaXMucmVnaXN0ZXJEYXRhXHRcdD1cdHJlZ2lzdGVyRGF0YTtcblx0XHR0aGlzLmdldERhdGFcdFx0XHQ9XHRnZXREYXRhO1xuXHRcdFx0XG5cdFx0XG5cdFx0XG5cdFx0ZnVuY3Rpb24gZ2V0RGF0YSgga2V5KVxuXHRcdHtcblx0XHRcdHZhciBkZWZlcnJlZFx0PVx0JHEuZGVmZXIoKTtcblx0XHRcdGRlZmVycmVkLnJlc29sdmUoIGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCBrZXkpKTtcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiByZWdpc3RlckRhdGEoIGtleSwgZGF0YSlcblx0XHR7XG5cdFx0XHRsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldCgga2V5LCBkYXRhKVxuXHRcdH1cblx0fTtcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXG5cdCd1c2Ugc3RyaWN0Jztcblx0XG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdjb252by5lZGl0b3InKVxuXHRcdC5zZXJ2aWNlKCdEZWZlcnJlZHNTdGFja1NlcnZpY2UnLCBEZWZlcnJlZHNTdGFja1NlcnZpY2UpO1xuXHRcblx0LyogQG5nSW5qZWN0ICovXG5cdGZ1bmN0aW9uIERlZmVycmVkc1N0YWNrU2VydmljZSggJGxvZylcblx0e1xuXHRcdFxuXHRcdHRoaXMuZ2V0TmV3XHRcdD1cdGdldE5ldztcbiAgICBcdFxuICAgICAgICBmdW5jdGlvbiBnZXROZXcoKVxuICAgICAgICB7XG4gICAgICAgIFx0cmV0dXJuIG5ldyBEZWZlcnJlZHNTdGFjaygpO1xuICAgICAgICB9XG5cdH1cblx0XG5cblx0ZnVuY3Rpb24gRGVmZXJyZWRzU3RhY2soKVxuXHR7XG5cdFx0dGhpcy5ncm91cHNcdFx0XHQ9XHR7fTtcblx0XHR0aGlzLnJlc291bHV0aW9uc1x0PVx0e307XG5cdH1cblx0XG5cdFxuXHREZWZlcnJlZHNTdGFjay5wcm90b3R5cGUucmVnaXN0ZXJlZCA9IGZ1bmN0aW9uKCBrZXkpXG5cdHtcblx0XHR2YXIgZGVmZXJyZWRzXHQ9XHR0aGlzLl9nZXRHcm91cCgga2V5KTtcblx0XHRpZiAoZGVmZXJyZWRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRcblx0RGVmZXJyZWRzU3RhY2sucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24oIGtleSwgZGVmZXJyZWQpXG5cdHtcblx0XHRpZiAoa2V5IGluIHRoaXMucmVzb3VsdXRpb25zKVxuXHRcdHtcblx0XHRcdGRlZmVycmVkLnJlc29sdmUoIHRoaXMucmVzb3VsdXRpb25zW2tleV0pO1xuXHRcdFx0ZGVsZXRlIHRoaXMucmVzb3VsdXRpb25zW2tleV07XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBkZWZlcnJlZHNcdD1cdHRoaXMuX2dldEdyb3VwKCBrZXkpO1xuXHRcdGRlZmVycmVkcy5wdXNoKCBkZWZlcnJlZCk7XG5cdH1cblx0XG5cdERlZmVycmVkc1N0YWNrLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24oIGtleSwgcmVzdWx0KVxuXHR7XG5cdFx0dmFyIGRlZmVycmVkc1x0PVx0dGhpcy5fZ2V0R3JvdXAoIGtleSk7XG5cdFx0XG5cdFx0aWYgKGRlZmVycmVkcy5sZW5ndGggPT0gMClcblx0XHR7XG5cdFx0XHR0aGlzLnJlc291bHV0aW9uc1trZXldXHQ9XHRyZXN1bHQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBkZWZlcnJlZDtcblx0XHR3aGlsZSAoZGVmZXJyZWQgPSBkZWZlcnJlZHMuc2hpZnQoKSkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSggcmVzdWx0KTtcblx0XHR9XG5cdH1cblx0XG5cdERlZmVycmVkc1N0YWNrLnByb3RvdHlwZS5yZWplY3QgPSBmdW5jdGlvbigga2V5LCByZWFzb24pXG5cdHtcblx0XHR2YXIgZGVmZXJyZWRzXHQ9XHR0aGlzLl9nZXRHcm91cCgga2V5KTtcblx0XHR2YXIgZGVmZXJyZWQ7XG5cdFx0d2hpbGUgKGRlZmVycmVkID0gZGVmZXJyZWRzLnNoaWZ0KCkpIHtcblx0XHRcdGRlZmVycmVkLnJlamVjdCggcmVhc29uKTtcblx0XHR9XG5cdH1cblx0XG5cdERlZmVycmVkc1N0YWNrLnByb3RvdHlwZS5yZWplY3RBbGwgPSBmdW5jdGlvbigpXG5cdHtcblx0XHRmb3IgKHZhciBrZXkgaW4gdGhpcy5ncm91cHMpXG5cdFx0XHR0aGlzLnJlamVjdCgga2V5LCBudWxsKTtcblx0fVxuXHRcblx0RGVmZXJyZWRzU3RhY2sucHJvdG90eXBlLl9nZXRHcm91cCA9IGZ1bmN0aW9uKCBrZXkpXG5cdHtcblx0XHRpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCggdGhpcy5ncm91cHNba2V5XSkpXG5cdFx0XHR0aGlzLmdyb3Vwc1trZXldID0gW107XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBzW2tleV07XG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdFxuXHRhbmd1bGFyLm1vZHVsZSgnY29udm8uZWRpdG9yJykuZmFjdG9yeSgnQWxlcnRTZXJ2aWNlJywgZnVuY3Rpb24gKCAkbG9nLCAkdGltZW91dCkge1xuXHRcblx0dmFyIFx0YWxlcnRzU2VydmljZVx0PVx0e307XG5cdFxuXHRhbGVydHNTZXJ2aWNlLmFsZXJ0c1x0PVx0W107XG5cdFxuXHRhbGVydHNTZXJ2aWNlLmdldEFsZXJ0c1x0PVx0ZnVuY3Rpb24oKVxuXHR7XG5cdFx0cmV0dXJuIGFsZXJ0c1NlcnZpY2UuYWxlcnRzO1xuXHR9O1xuXHRcblx0YWxlcnRzU2VydmljZS5hZGRTdWNlc3NcdD1cdGZ1bmN0aW9uKCBtc2cpXG5cdHtcblx0XHRhbGVydHNTZXJ2aWNlLl9hZGRBbGVydCggeyBtc2cgOiBtc2csIHR5cGUgOiAnc3VjY2Vzcyd9LCA1MDAwKTtcblx0fTtcblx0XG5cdGFsZXJ0c1NlcnZpY2UuYWRkRGFuZ2VyXHQ9XHRmdW5jdGlvbiggbXNnKVxuXHR7XG5cdFx0YWxlcnRzU2VydmljZS5fYWRkQWxlcnQoIHsgbXNnIDogbXNnLCB0eXBlIDogJ2Rhbmdlcid9LCA1MDAwKTtcblx0fTtcblx0XG5cdGFsZXJ0c1NlcnZpY2UuYWRkSW5mb1x0PVx0ZnVuY3Rpb24oIG1zZylcblx0e1xuXHRcdGFsZXJ0c1NlcnZpY2UuX2FkZEFsZXJ0KCB7IG1zZyA6IG1zZywgdHlwZSA6ICdpbmZvJ30sIDUwMDApO1xuXHR9O1xuXHRcblx0YWxlcnRzU2VydmljZS5hZGRXYXJuaW5nXHQ9XHRmdW5jdGlvbiggbXNnKVxuXHR7XG5cdFx0YWxlcnRzU2VydmljZS5fYWRkQWxlcnQoIHsgbXNnIDogbXNnLCB0eXBlIDogJ3dhcm5pbmcnfSwgNTAwMCk7XG5cdH07XG5cdFxuXHRhbGVydHNTZXJ2aWNlLl9hZGRBbGVydFx0PVx0ZnVuY3Rpb24oIGFsZXJ0LCB0aW1lb3V0KVxuXHR7XG5cdFx0YWxlcnRzU2VydmljZS5hbGVydHMucHVzaCggYWxlcnQpO1xuXHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdGFsZXJ0c1NlcnZpY2UuY2xvc2VBbGVydE9iaiggYWxlcnQpO1xuXHRcdH0sIHRpbWVvdXQpO1xuXHR9O1xuXHRcblx0YWxlcnRzU2VydmljZS5jbG9zZUFsZXJ0XHQ9XHRmdW5jdGlvbiggaW5kZXgpXG5cdHtcblx0XHRhbGVydHNTZXJ2aWNlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHR9O1xuXHRcblx0YWxlcnRzU2VydmljZS5jbG9zZUFsZXJ0T2JqXHQ9XHRmdW5jdGlvbiggYWxlcnQpXG5cdHtcblx0XHR2YXIgaW5kZXhcdD1cdGFsZXJ0c1NlcnZpY2UuYWxlcnRzLmluZGV4T2YoIGFsZXJ0KTtcblx0XHRpZiAoaW5kZXggPiAtMSlcblx0XHRcdGFsZXJ0c1NlcnZpY2UuY2xvc2VBbGVydCggaW5kZXgpO1xuXHR9O1xuXHRcblx0cmV0dXJuIGFsZXJ0c1NlcnZpY2U7XG59KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuXHRcdC5kaXJlY3RpdmUoICdzeXN0ZW1JbnRlbnRFZGl0b3InLCBzeXN0ZW1JbnRlbnRFZGl0b3IpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBzeXN0ZW1JbnRlbnRFZGl0b3IoICRsb2cpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRcdHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9lZGl0b3JzL3N5c3RlbS1pbnRlbnQtZWRpdG9yLnRtcGwuaHRtbCcsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRjb21wb25lbnQ6ICc9Jyxcblx0XHRcdFx0cHJvcGVydHlEZWZpbml0aW9uOiAnPScsXG5cdFx0XHRcdGtleTogJz0nLFxuXHRcdFx0XHRzZXJ2aWNlOiAnPSdcblx0XHRcdH0sXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXHRcdFx0XHQkbG9nLmRlYnVnKCAnc3lzdGVtSW50ZW50RWRpdG9yIGxpbmsnKTtcblx0XHRcdFx0JHNjb3BlLnZhbHVlXHQ9XHRfZGVzZXJpYWxpemUoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XSk7XG5cdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCAndmFsdWUnLCBmdW5jdGlvbiAoIHZhbHVlKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XVx0PVx0X3NlcmlhbGl6ZSggdmFsdWUpO1xuXHRcdFx0XHRcdFx0JGxvZy5kZWJ1ZyggJ3N5c3RlbUludGVudEVkaXRvciBjaGFuZ2VkIHZhbHVlIGZvciBrZXknLCAkc2NvcGUua2V5KTtcblx0XHRcdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFx0fSBjYXRjaCAoIGVycikge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmVycm9yXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JGxvZy5kZWJ1ZyggJ3N5c3RlbUludGVudEVkaXRvciBjb21wb25lbnQgdmFsdWUgY2hhbmdlZCBmb3Iga2V5JywgJHNjb3BlLmtleSk7XG5cdFx0XHRcdFx0cmV0dXJuICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XTtcblx0XHRcdFx0fSwgZnVuY3Rpb24gKCB2YWx1ZSkge1xuXHRcdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0X2Rlc2VyaWFsaXplKCB2YWx1ZSk7XG5cdFx0XHRcdFx0JHNjb3BlLmVycm9yXHQ9XHRmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBfc2VyaWFsaXplKCB2YWwpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIHZhbCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbC5zcGxpdCgnLCcpLm1hcCggZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRcdFx0XHQgIHJldHVybiBpdGVtLnRyaW0oKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9kZXNlcmlhbGl6ZSggdmFsKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBhbmd1bGFyLmlzQXJyYXkoIHZhbCkpIHtcbi8vXHRcdFx0XHRcdFx0dmFsID0gdmFsLmZpbHRlcihmdW5jdGlvbiAoZWwpIHtcbi8vXHRcdFx0XHRcdFx0XHQgIHJldHVybiBlbC50cmltKCkgIT0gJyc7XG4vL1x0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbC5qb2luKCAnLCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCAnY29udm8uZWRpdG9yJylcblx0XHQuZGlyZWN0aXZlKCAnaW50ZW50VXR0ZXJhbmNlRWRpdG9yJywgaW50ZW50VXR0ZXJhbmNlRWRpdG9yKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gaW50ZW50VXR0ZXJhbmNlRWRpdG9yKCAkbG9nKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0XHRyZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0Jyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvZWRpdG9ycy9pbnRlbnQtdXR0ZXJhbmNlLWVkaXRvci50bXBsLmh0bWwnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0Y29tcG9uZW50OiAnPScsXG5cdFx0XHRcdHByb3BlcnR5RGVmaW5pdGlvbjogJz0nLFxuXHRcdFx0XHRrZXk6ICc9Jyxcblx0XHRcdFx0c2VydmljZTogJz0nXG5cdFx0XHR9LFxuXHRcdFx0bGluazogZnVuY3Rpb24gKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcblx0XHRcdFx0JGxvZy5kZWJ1ZyggJ2ludGVudFV0dGVyYW5jZUVkaXRvciBsaW5rJyk7XG5cdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0SlNPTi5zdHJpbmdpZnkoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XSwgbnVsbCwgMik7XG5cdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCAndmFsdWUnLCBmdW5jdGlvbiAoIHZhbHVlKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XVx0PVx0SlNPTi5wYXJzZSggdmFsdWUpO1xuXHRcdFx0XHRcdFx0Ly8gJGxvZy5kZWJ1ZyggJ2ludGVudFV0dGVyYW5jZUVkaXRvciBjaGFuZ2VkIHZhbHVlIGZvciBrZXknLCAkc2NvcGUua2V5KTtcblx0XHRcdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFx0fSBjYXRjaCAoIGVycikge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmVycm9yXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly8gJGxvZy5kZWJ1ZyggJ2ludGVudFV0dGVyYW5jZUVkaXRvciBjb21wb25lbnQgdmFsdWUgY2hhbmdlZCBmb3Iga2V5JywgJHNjb3BlLmtleSk7XG5cdFx0XHRcdFx0cmV0dXJuICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XTtcblx0XHRcdFx0fSwgZnVuY3Rpb24gKCB2YWx1ZSkge1xuXHRcdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0SlNPTi5zdHJpbmdpZnkoIHZhbHVlLCBudWxsLCAyKTtcblx0XHRcdFx0XHQkc2NvcGUuZXJyb3JcdD1cdGZhbHNlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuXHRcdC5kaXJlY3RpdmUoICdjb252b0ludGVudEVkaXRvcicsIGNvbnZvSW50ZW50RWRpdG9yKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gY29udm9JbnRlbnRFZGl0b3IoICRsb2cpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRcdHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9lZGl0b3JzL2NvbnZvLWludGVudC1lZGl0b3IudG1wbC5odG1sJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGNvbXBvbmVudDogJz0nLFxuXHRcdFx0XHRwcm9wZXJ0eURlZmluaXRpb246ICc9Jyxcblx0XHRcdFx0a2V5OiAnPScsXG5cdFx0XHRcdHNlcnZpY2U6ICc9J1xuXHRcdFx0fSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uICggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG5cdFx0XHRcdCRsb2cuZGVidWcoICdjb252b0ludGVudEVkaXRvciBsaW5rJyk7XG5cdFx0XHRcdCRzY29wZS5lcnJvclx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmludGVudHNcdFx0PVx0cHJvcGVydGllc0NvbnRleHQuZ2V0Q29udm9JbnRlbnRzKCk7XG5cdFx0XHRcdCRzY29wZS5zbG90UHJldmlld3NcdD1cdHt9O1xuXHRcdFx0XHRcblx0XHRcdFx0JGxvZy5kZWJ1ZyggJ2NvbnZvSW50ZW50RWRpdG9yICRzY29wZS5pbnRlbnRzJywgJHNjb3BlLmludGVudHMsICRzY29wZS5zZXJ2aWNlKTtcblxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLmtleV07XG5cdFx0XHRcdH0sIGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0XHQkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3Igc2VsZWN0ZWQgaW50ZW50IGNoYW5nZWQnLCB2YWwpO1xuXHRcdFx0XHRcdCRzY29wZS5zbG90UHJldmlld3MgPSB7fTtcblxuXHRcdFx0XHRcdGlmICh2YWwpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIGludGVudCA9ICRzY29wZS5pbnRlbnRzLmZpbHRlcihmdW5jdGlvbihpKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBpLm5hbWUgPT09IHZhbDtcblx0XHRcdFx0XHRcdH0pWzBdO1xuXG5cdFx0XHRcdFx0XHQkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3IgJHdhdGNoIGdvdCBtYXRjaGVkIGludGVudCcsIGludGVudCk7XG5cblx0XHRcdFx0XHRcdGlmIChpbnRlbnQudXR0ZXJhbmNlcylcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0aW50ZW50LnV0dGVyYW5jZXNcblx0XHRcdFx0XHRcdFx0XHQubWFwKGZ1bmN0aW9uICh1dHRlcmFuY2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vICRsb2cubG9nKCdjb252b0ludGVudEVkaXRvciBtYXBwaW5nIHV0dGVyYW5jZSBtb2RlbHMnLCB1dHRlcmFuY2UubW9kZWwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHV0dGVyYW5jZS5tb2RlbDtcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdC5mbGF0KClcblx0XHRcdFx0XHRcdFx0XHQuZmlsdGVyKGZ1bmN0aW9uKG1vZGVsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyAkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3IgZmlsdGVyaW5nIG1vZGVscyB3aXRoIHR5cGVzJywgbW9kZWwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIG1vZGVsLmhhc093blByb3BlcnR5KCd0eXBlJyk7XG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHQubWFwKGZ1bmN0aW9uKG1vZGVsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyAkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3IgbWFwcGluZyBtb2RlbCB0eXBlcyBhbmQgdmFsdWVzJywgbW9kZWwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHNsb3RWYWx1ZSA9IG1vZGVsWydzbG90X3ZhbHVlJ10gfHwgbW9kZWwudHlwZS5yZXBsYWNlKCdAJywgJycpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHNsb3RUeXBlID0gbW9kZWwudHlwZTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEkc2NvcGUuc2xvdFByZXZpZXdzW3Nsb3RWYWx1ZV0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnNsb3RQcmV2aWV3c1tzbG90VmFsdWVdID0gc2xvdFR5cGU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmRpcmVjdGl2ZSgndGV4dEFycmF5JywgWyckbG9nJywgZnVuY3Rpb24oJGxvZykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgbmdNb2RlbCkge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGludG8oaW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0LnNwbGl0KCcsJykubWFwKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnRyaW0oKSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvdXQoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5qb2luKCcsICcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG5nTW9kZWwuJHBhcnNlcnMucHVzaChpbnRvKTtcbiAgICAgICAgICAgICAgICBuZ01vZGVsLiRmb3JtYXR0ZXJzLnB1c2gob3V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1dKVxuXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by5lZGl0b3InKS5kaXJlY3RpdmUoJ2xvYWRpbmdJbmRpY2F0b3InLCBbJyRodHRwJywgJyRsb2cnLCBmdW5jdGlvbiAoICRodHRwLCAkbG9nKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmwgOiAnYXBwL2NvbnZvd29ya3MvY29tbW9uL2xvYWRpbmcudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxtLCBhdHRycykge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnbG9hZGluZ0luZGljYXRvciBsaW5rJyk7XG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnBlbmRpbmdSZXF1ZXN0cy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbG0uZmluZCgnZGl2LnNrLWN1YmUtZ3JpZCcpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsbS5maW5kKCdkaXYuc2stY3ViZS1ncmlkJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICB9XSk7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmRpcmVjdGl2ZSgnanNvblRleHQnLCBbJyRsb2cnLCBmdW5jdGlvbigkbG9nKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBuZ01vZGVsKSB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW50byhpbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGVtaXQoJ0pzb25FcnJvcicsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCdFcnJvciBwYXJzaW5nIEpTT046JywgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRlbWl0KCdKc29uRXJyb3InLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvdXQoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbmdNb2RlbC4kcGFyc2Vycy5wdXNoKGludG8pO1xuICAgICAgICAgICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMucHVzaChvdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1dKTtcblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8uZWRpdG9yJykuZGlyZWN0aXZlKCdhbGVydEluZGljYXRvcicsIFsnQWxlcnRTZXJ2aWNlJywgJyRsb2cnLCBmdW5jdGlvbiAoIEFsZXJ0U2VydmljZSwgJGxvZykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsIDogJ2FwcC9jb252b3dvcmtzL2NvbW1vbi9hbGVydC1pbmRpY2F0b3IudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICggJHNjb3BlLCAkZWxlbSkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnYWxlcnRJbmRpY2F0b3IgbGluaycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRBbGVydHMgICAgID0gICBBbGVydFNlcnZpY2UuZ2V0QWxlcnRzO1xuICAgICAgICAgICAgICAgICRzY29wZS5jbG9zZUFsZXJ0ICAgID0gICBBbGVydFNlcnZpY2UuY2xvc2VBbGVydDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgIH1dKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by5lZGl0b3InKVxuICAgICAgICAuc2VydmljZSgnQ29udm9DaGF0QXBpJywgQ29udm9DaGF0QXBpKTtcblxuICAgIC8qIEBuZ0luamVjdCAqL1xuICAgIGZ1bmN0aW9uIENvbnZvQ2hhdEFwaSggJGxvZywgJGh0dHAsICRxLCBDT05WT19QVUJMSUNfQVBJX0JBU0VfVVJMKSB7XG5cblx0XHR0aGlzLnNlbmRNZXNzYWdlID0gc2VuZE1lc3NhZ2U7XG5cblx0XHRmdW5jdGlvbiBzZW5kTWVzc2FnZSggc2VydmljZUlkLCBkZXZpY2VJZCwgdGV4dCwgaXNMYXVuY2gsIHZhcmlhbnQpXG5cdFx0e1xuXHRcdFx0aWYgKCAhdmFyaWFudCkge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQgPSAgICdkZXZlbG9wJztcbiAgICAgICAgICAgIH1cblxuXHRcdFx0cmV0dXJuICRodHRwKHtcblx0XHRcdFx0bWV0aG9kOiBcInBvc3RcIixcblx0XHRcdFx0dXJsOiBDT05WT19QVUJMSUNfQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXJ1bi93ZWJjaGF0LycgKyB2YXJpYW50ICsgJy8nICsgc2VydmljZUlkLFxuXHRcdFx0XHRkYXRhIDogeyBkZXZpY2VfaWQgOiBkZXZpY2VJZCwgdGV4dCA6IHRleHQsIGx1bmNoIDogaXNMYXVuY2h9XG5cdFx0XHR9KS50aGVuKCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG5cdFx0XHRcdCRsb2cubG9nKCdDb252b0NoYXRBcGkgc2VuZE1lc3NhZ2UgcmVzcG9uc2UuZGF0YScsIHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH1cbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuXHRcdC5kaXJlY3RpdmUoICdjb252b0NoYXRib3gnLCBjb252b0NoYXRib3gpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBjb252b0NoYXRib3goICRsb2csICRxLCAkdGltZW91dCwgQ29udm93b3Jrc0FwaSwgQ29udm9DaGF0QXBpLCBVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlKVxuXHR7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL2NoYXRib3gvY2hhdGJveC50bXBsLmh0bWwnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZGV2aWNlSWQgOiAnPScsXG5cdFx0XHRcdHNlcnZpY2VJZCA6ICc9Jyxcblx0XHRcdFx0Y29sbGFwc2VkIDogJz0nLFxuXHRcdFx0XHRtb2RlIDogJz0nLFxuXHRcdFx0XHRuYW1lIDogJz0/Jyxcblx0XHRcdFx0dmFyaWFudCA6ICc9PycsXG5cdFx0XHRcdGRlbGVnYXRlTmxwIDogJz0/Jyxcblx0XHRcdFx0dG9nZ2xlRGVidWcgOiAnPT8nLFxuXHRcdFx0XHRleGNlcHRpb24gOiAnPT8nLFxuXHRcdFx0XHR2YXJpYWJsZXMgOiAnPT8nXG5cdFx0XHR9LFxuXHRcdFx0bGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW0sICRhdHRycylcblx0XHRcdHtcblx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggbGluayAkc2NvcGUuZGV2aWNlSWQnLCAkc2NvcGUuZGV2aWNlSWQsICckc2NvcGUuc2VydmljZUlkJywgJHNjb3BlLnNlcnZpY2VJZCk7XG5cblx0XHRcdFx0Ly8gJHNjb3BlLmNvbGxhcHNlZCAgICA9ICAgdHJ1ZTtcblxuXHRcdFx0XHQkc2NvcGUudG9nZ2xlRGVidWcgID0gXHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLm1lc3NhZ2VcdFx0PVx0Jyc7XG5cdFx0XHRcdCRzY29wZS5tZXNzYWdlc1x0XHQ9XHRbXTtcblxuXHRcdFx0XHR2YXIgc2VuZGluZ1x0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIFJFUFJPTVBUX1RJTUVPVVRcdD1cdDIwICogMTAwMDtcblx0XHRcdFx0dmFyIFNFUVVFTkNFX1RJTUVPVVRcdD1cdDIgKiAxMDAwO1xuXHRcdFx0XHR2YXIgcmVwcm9tcHRfdGltZW91dFx0PVx0bnVsbDtcblx0XHRcdFx0dmFyIHNlcXVlbmNlX3RpbWVvdXRcdD1cdG51bGw7XG5cblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgnZGVsZWdhdGVObHAnLCBmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCdjb252b0NoYXRib3ggJHdhdGNoIGRlbGVnYXRlTmxwIG9sZCB2YWx1ZScsIG9sZFZhbCwgJ25ldyB2YWx1ZScsIG5ld1ZhbCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCFuZXdWYWwpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0JHNjb3BlLnJlc2V0Q2hhdCgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCd0b2dnbGVEZWJ1ZycsIGZ1bmN0aW9uKG5ld1ZhbCkge1xuXG5cdFx0XHRcdFx0VXNlclByZWZlcmVuY2VzU2VydmljZS5yZWdpc3RlckRhdGEoICd0b2dnbGVEZWJ1ZycsIG5ld1ZhbCk7XG5cdFx0XHRcdFx0JGxvZy5sb2coJ2NvbnZvQ2hhdGJveCAkd2F0Y2ggdG9nZ2xlRGVidWcgbmV3IHZhbHVlJywgbmV3VmFsKTtcblx0XHRcdFx0XHQkc2NvcGUudG9nZ2xlRGVidWcgPSBuZXdWYWw7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdF9pbml0KCk7XG5cblx0XHRcdFx0dmFyIGlucHV0XHRcdFx0PVx0JGVsZW0uZmluZCggJ2lucHV0W3R5cGU9dGV4dF0nKVswXTtcblx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggbGluayBpbnB1dCcsIGlucHV0KTtcblxuXG5cdFx0XHRcdCRzY29wZS5mb3JtU3VibWl0ZWRcdD1cdGZ1bmN0aW9uKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IGZvcm1TdWJtaXRlZCgpJywgJHNjb3BlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdHZhciBtc2dcdFx0XHRcdD1cdCRzY29wZS5tZXNzYWdlO1xuXG5cdFx0XHRcdFx0c2VuZGluZ1x0XHRcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRpZiAoIG1zZykge1xuXHRcdFx0XHRcdFx0X2FwcGVuZEJyZWFrKCk7XG5cdFx0XHRcdFx0XHRfYXBwZW5kVXNlck1lc3NhZ2UoIG1zZyk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0X2NhbmNlbE1zZ3MoKTtcblxuXHRcdFx0XHRcdF9nZXRBcGkoKS5zZW5kTWVzc2FnZSggJHNjb3BlLnNlcnZpY2VJZCwgJHNjb3BlLmRldmljZUlkLCBtc2csIGZhbHNlLCAkc2NvcGUudmFyaWFudCwgJHNjb3BlLmRlbGVnYXRlTmxwKS50aGVuKCBmdW5jdGlvbiggcmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IGZvcm1TdWJtaXRlZCgpIHNlbmRNZXNzYWdlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkc2NvcGUubWVzc2FnZVx0XHQ9XHQnJztcblx0XHRcdFx0XHRcdF9yZWFkUmVzcG9uc2UoIHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9LCBmdW5jdGlvbiggcmVhc29uKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBmb3JtU3VibWl0ZWQoKSBzZW5kTWVzc2FnZSgpIHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0fSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBmb3JtU3VibWl0ZWQoKSBzZW5kTWVzc2FnZSgpIGZpbmFsbHknKTtcblx0XHRcdFx0XHRcdHNlbmRpbmdcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLnJlc2V0Q2hhdCAgICA9ICAgZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggcmVzZXRDaGF0KCknKTtcblxuXHRcdFx0XHRcdCRzY29wZS5tZXNzYWdlcyAgICAgPSAgIFtdO1xuXHRcdFx0XHRcdCRzY29wZS5tZXNzYWdlICAgICAgPSAgICcnO1xuXG5cdFx0XHRcdFx0X2NhbmNlbE1zZ3MoKTtcblx0XHRcdFx0XHRzZW5kaW5nICAgICAgICAgICAgID0gICB0cnVlO1xuXG5cdFx0XHRcdFx0X2dldEFwaSgpLnNlbmRNZXNzYWdlKCAkc2NvcGUuc2VydmljZUlkLCAkc2NvcGUuZGV2aWNlSWQsICcnLCB0cnVlLCAkc2NvcGUudmFyaWFudCwgJHNjb3BlLmRlbGVnYXRlTmxwKS50aGVuKCBmdW5jdGlvbiggcmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IHJlc2V0Q2hhdCgpIHNlbmRNZXNzYWdlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRfcmVhZFJlc3BvbnNlKCByZXNwb25zZSk7XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggcmVzZXRDaGF0KCkgc2VuZE1lc3NhZ2UoKSByZWFzb24nLCByZWFzb24pO1xuXHRcdFx0XHRcdH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggcmVzZXRDaGF0KCkgc2VuZE1lc3NhZ2UoKSBmaW5hbGx5Jyk7XG5cdFx0XHRcdFx0XHRzZW5kaW5nICAgICA9ICAgZmFsc2U7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuZm9ybURpc2FibGVkXHQ9XHRmdW5jdGlvbigpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gc2VuZGluZyB8fCAkc2NvcGUubWVzc2FnZS50cmltKCkgPT0gJyc7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLmlzU2VuZGluZ1x0PVx0ZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuIHNlbmRpbmc7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2luaXQoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggX2luaXQoKScpO1xuXHRcdFx0XHRcdHNlbmRpbmdcdFx0XHRcdD1cdHRydWU7XG5cblx0XHRcdFx0XHRfZ2V0QXBpKCkuc2VuZE1lc3NhZ2UoICRzY29wZS5zZXJ2aWNlSWQsICRzY29wZS5kZXZpY2VJZCwgJycsIHRydWUsICRzY29wZS52YXJpYW50LCAkc2NvcGUuZGVsZWdhdGVObHApLnRoZW4oIGZ1bmN0aW9uKCByZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggX2luaXQoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdF9yZWFkUmVzcG9uc2UoIHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9LCBmdW5jdGlvbiggcmVhc29uKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfaW5pdCgpIHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0fSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfaW5pdCgpIGZpbmFsbHknKTtcblx0XHRcdFx0XHRcdHNlbmRpbmdcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0VXNlclByZWZlcmVuY2VzU2VydmljZS5nZXREYXRhKCAndG9nZ2xlRGVidWcnKS50aGVuKCBmdW5jdGlvbiggdG9nZ2xlRGVidWcpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IGdldERhdGEoKSB0b2dnbGVEZWJ1ZycsIHRvZ2dsZURlYnVnKTtcblx0XHRcdFx0XHRcdGlmICh0b2dnbGVEZWJ1Zykge1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUudG9nZ2xlRGVidWcgPSB0b2dnbGVEZWJ1Zztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9yZWFkUmVzcG9uc2UoIGRhdGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRfYXBwZW5kQnJlYWsoKTtcblx0XHRcdFx0XHRfYXBwZW5kU2VxdWVuY2UoIGRhdGEudGV4dF9yZXNwb25zZXMsIHRydWUpO1xuXHRcdFx0XHRcdCRzY29wZS5leGNlcHRpb24gPSBkYXRhLmV4Y2VwdGlvbjtcblx0XHRcdFx0XHQkc2NvcGUudmFyaWFibGVzID0gZGF0YS52YXJpYWJsZXM7XG5cdFx0XHRcdFx0aWYgKCBkYXRhLnRleHRfcmVwcm9tcHRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0cmVwcm9tcHRfdGltZW91dFx0PVx0JHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRfYXBwZW5kQnJlYWsoKTtcblx0XHRcdFx0XHRcdFx0X2FwcGVuZFNlcXVlbmNlKCBkYXRhLnRleHRfcmVwcm9tcHRzLCB0cnVlKTtcblx0XHRcdFx0XHRcdH0sIFJFUFJPTVBUX1RJTUVPVVQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9hcHBlbmRTZXF1ZW5jZSggbXNncywgaW1tZWRpYXRlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBpbW1lZGlhdGUpIHtcblx0XHRcdFx0XHRcdHZhciBtc2dcdD1cdG1zZ3Muc2hpZnQoKTtcblx0XHRcdFx0XHRcdF9hcHBlbmRDb252b1Jlc3BvbnNlKCBbbXNnXSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBtc2dzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0c2VxdWVuY2VfdGltZW91dFx0PVx0JHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgbXNnXHQ9XHRtc2dzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0XHRcdF9hcHBlbmRDb252b1Jlc3BvbnNlKCBbbXNnXSk7XG5cdFx0XHRcdFx0XHRcdGlmICggbXNncy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0XHRfYXBwZW5kU2VxdWVuY2UoIG1zZ3MsIGZhbHNlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSwgU0VRVUVOQ0VfVElNRU9VVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfY2FuY2VsTXNncygpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQkdGltZW91dC5jYW5jZWwoIHJlcHJvbXB0X3RpbWVvdXQgKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwcm9tcHRfdGltZW91dFx0PVx0bnVsbDtcblx0XHRcdFx0XHQkdGltZW91dC5jYW5jZWwoIHNlcXVlbmNlX3RpbWVvdXQgKTtcbiAgICAgICAgICAgICAgICAgICAgc2VxdWVuY2VfdGltZW91dFx0PVx0bnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9hcHBlbmRCcmVhaygpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQkc2NvcGUubWVzc2FnZXMucHVzaCgge1xuXHRcdFx0XHRcdFx0dHlwZSA6ICdicmVhaycsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfYXBwZW5kQ29udm9SZXNwb25zZSggbXNncykge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IF9hcHBlbmRDb252b1Jlc3BvbnNlKCknLCBtc2dzKTtcblxuXHRcdFx0XHRcdGZvciAodmFyIGk9MDtpPG1zZ3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdCRzY29wZS5tZXNzYWdlcy5wdXNoKCB7XG5cdFx0XHRcdFx0XHRcdHRleHQgOiBtc2dzW2ldLFxuXHRcdFx0XHRcdFx0XHRzb3VyY2UgOiAnY29udm8nLFxuXHRcdFx0XHRcdFx0XHRhdmF0YXI6ICdpbWcvcGJ0b3VyLWF2YXRhci1wYi5wbmcnXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfYXBwZW5kVXNlck1lc3NhZ2UoIG1zZykge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IF9hcHBlbmRVc2VyTWVzc2FnZSgpJywgbXNnKTtcblx0XHRcdFx0XHQkc2NvcGUubWVzc2FnZXMucHVzaCgge1xuXHRcdFx0XHRcdFx0dGV4dCA6IG1zZyxcblx0XHRcdFx0XHRcdHNvdXJjZSA6ICd1c2VyJyxcblx0XHRcdFx0XHRcdGF2YXRhcjogJ2ltZy9wYnRvdXItYXZhdGFyLW1lLnBuZydcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9nZXRBcGkoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCAkc2NvcGUubW9kZSA9PSAncHVibGljJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIENvbnZvQ2hhdEFwaTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkc2NvcGUubW9kZSA9PSAnYWRtaW4nKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gQ29udm93b3Jrc0FwaTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnVW5rbm93biBtb2RlIFsnKyRzY29wZS5tb2RlKyddJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQU5JTUFURSBTQ1JPTExcblx0XHRcdFx0JHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oICdtZXNzYWdlcycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94ICR3YXRjaENvbGxlY3Rpb24oKScpO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b0NoYXRib3ggcXVldWUoKScpO1xuXHRcdFx0XHRcdFx0dmFyICRsaXN0IFx0XHRcdD1cdCRlbGVtLmZpbmQoICcjY2hhdC1wYW5lbC1ib2R5Jyk7XG5cdFx0XHRcdFx0XHR2YXIgc2Nyb2xsSGVpZ2h0IFx0PVx0JGxpc3QucHJvcCggJ3Njcm9sbEhlaWdodCcpO1xuXHRcdFx0XHRcdFx0JGxpc3QuYW5pbWF0ZSggeyBzY3JvbGxUb3AgOiBzY3JvbGxIZWlnaHR9LCA1MDApO1xuXHRcdFx0XHRcdH0sMTApO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBGT0NVU1xuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmlzU2VuZGluZygpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbiggc2VuZGluZykge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94ICR3YXRjaCgpIHNlbmRpbmcnLCBzZW5kaW5nKTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm9DaGF0Ym94IGlucHV0LmZvY3VzKCknKTtcblx0XHRcdFx0XHRcdGlucHV0LmZvY3VzKCk7XG5cdFx0XHRcdFx0fSwxMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCAnY29udm8uZWRpdG9yJylcbiAgICAgICAgLmRpcmVjdGl2ZSggJ3ZlcnNpb25zRWRpdG9yJywgdmVyc2lvbnNFZGl0b3IpO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgIGZ1bmN0aW9uIHZlcnNpb25zRWRpdG9yKCAkbG9nLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7IHNlcnZpY2U6ICc9JyB9LFxuICAgICAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3ZlcnNpb25zLWVkaXRvci50bXBsLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXG4gICAgICAgICAgICBcdCRsb2cubG9nKCAndmVyc2lvbnNFZGl0b3IgbGluaycpO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0JHNjb3BlLnZlcnNpb25zXHQ9XHRbXTtcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdCRyb290U2NvcGUuJG9uKCAnU2VydmljZVJlbGVhc2VzVXBkYXRlZCcsIGZ1bmN0aW9uICggZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIF9sb2FkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHRfbG9hZCgpO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0ZnVuY3Rpb24gX2xvYWQoKVxuICAgICAgICAgICAgXHR7XG4gICAgICAgICAgICBcdFx0Q29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlVmVyc2lvbnMoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQpLnRoZW4oIGZ1bmN0aW9uICggdmVyc2lvbnMpIHtcbiAgICAgICAgICAgICAgICBcdFx0JHNjb3BlLnZlcnNpb25zXHQ9XHR2ZXJzaW9ucztcbiAgICAgICAgICAgICAgICBcdH0sIGZ1bmN0aW9uICggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgXHRcdCRsb2cubG9nKCAndmVyc2lvbnNFZGl0b3IgZ2V0U2VydmljZVZlcnNpb25zIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgXHR9KTsgICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCAndmFyaWFibGVzRWRpdG9yJywgdmFyaWFibGVzRWRpdG9yKTtcblxuICAgIGZ1bmN0aW9uIHZhcmlhYmxlc0VkaXRvciggJGxvZylcbiAgICB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3ZhcmlhYmxlcy1lZGl0b3IudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCAkc2NvcGUpIHtcbiAgICAgICAgICAgICAgICAvLyBRVUlDS0ZJWFxuICAgICAgICAgICAgICAgIGlmICggISRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS52YXJpYWJsZXMgICAgPSAgIHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkVmFyaWFibGVzUGFpciAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50X2dyZWF0ZXN0X2luZGV4ICA9ICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIubGVuZ3RoIC0gMSA8IDA/IDAgOiAkc2NvcGUudmFyaWFibGVzX2J1ZmZlci5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdfcGFpciAgICA9ICAgeyAna2V5JzogJ3RtcF9rZXlfJyArIGN1cnJlbnRfZ3JlYXRlc3RfaW5kZXgsICd2YWx1ZSc6ICd0bXBfdmFsdWUnIH07XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIucHVzaCggbmV3X3BhaXIpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucmVtb3ZlVmFyaWFibGVzUGFpciAgPSAgIGZ1bmN0aW9uKCBpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIuc3BsaWNlKCBpLCAxKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gSU5JVFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0KClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpO1xuICAgICAgICAgICAgICAgICAgICBfc2V0dXBTZXJ2aWNlV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgX3NldHVwQnVmZmVyV2F0Y2goKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBQUklWQVRFXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX3NldHVwVmFyaWFibGVzQnVmZmVyKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS52YXJpYWJsZXNfYnVmZmVyID0gICBbXTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluICRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIucHVzaCggeyAna2V5Jzoga2V5LCAndmFsdWUnOiAkc2NvcGUuc2VydmljZS52YXJpYWJsZXNba2V5XSB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAndmFyaWFibGVzRWRpdG9yIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpIGRvbmUsIGJ1ZmZlcicsICRzY29wZS52YXJpYWJsZXNfYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBTZXJ2aWNlV2F0Y2goKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnc2VydmljZS52YXJpYWJsZXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpO1xuICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBCdWZmZXJXYXRjaCgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAndmFyaWFibGVzX2J1ZmZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFFVSUNLRklYXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoICFPYmplY3Qua2V5cyggJHNjb3BlLnNlcnZpY2UudmFyaWFibGVzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS52YXJpYWJsZXMgICAgPSAgIFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS52YXJpYWJsZXMgICAgPSAgIHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaSBpbiAkc2NvcGUudmFyaWFibGVzX2J1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWlyICAgICAgICA9ICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNhZmVfa2V5ICAgID0gICBfc2FuaXRpemVLZXkoIHBhaXIua2V5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlc1tzYWZlX2tleV0gID0gICBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7fVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3Nhbml0aXplS2V5KCBrZXkpXG4gICAge1xuICAgICAgICByZXR1cm4ga2V5LnJlcGxhY2UoIC9cXHN7Mix9XFwuLS8sICdfJyk7XG4gICAgfVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCAnY29udm8uZWRpdG9yJylcblx0XHQuZGlyZWN0aXZlKCAnc3Vicm91dGluZUNvbXBvbmVudCcsIHN1YnJvdXRpbmVDb21wb25lbnQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBzdWJyb3V0aW5lQ29tcG9uZW50KCAkbG9nLCAkdGltZW91dCwgQ29udm93b3Jrc0FwaSlcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdFx0c2NvcGU6IHsgJ2Jsb2NrJyA6ICc9JywgJ2Nhbk1vdmVVcCc6ICc9JywgJ2Nhbk1vdmVEb3duJzogJz0nIH0sXG5cdFx0XHRyZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0Jyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3Mvc3Vicm91dGluZS1jb21wb25lbnQudG1wbC5odG1sJyxcblx0XHRcdGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEFQSVxuXHRcdFx0XHQkc2NvcGUub3Zlclx0XHRcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLnJlYWR5XHRcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudFRpdGxlXHRcdD1cdFwiXCI7XG5cdFx0XHRcdCRzY29wZS5jb21wb25lbnROYW1lICAgICAgICA9ICAgXCJcIjtcblxuXHRcdFx0XHQkc2NvcGUuaXNSZWFkQmxvY2tcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5nZXRDb21wb25lbnRUaXRsZVx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCAhJHNjb3BlLmRlZmluaXRpb24pIHtcblx0XHRcdFx0XHRcdHJldHVybiAnR2VuZXJhdGluZyB0aXRsZSAuLi4nO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLm5hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyZXR1cm4gJ0ZyYWdtZW50IC0gJyArICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkICsgJyc7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuaXNTZWxlY3RlZFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLmNvbXBvbmVudCA9PT0gJHNjb3BlLmJsb2NrO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS50b2dnbGVPcGVuXHQ9XHRmdW5jdGlvbiggdHlwZSkge1xuXHRcdFx0XHRcdG9wZW5bdHlwZV1cdD1cdCFvcGVuW3R5cGVdO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLmlzT3Blblx0PVx0ZnVuY3Rpb24oIHR5cGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gb3Blblt0eXBlXTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS4kb24oICckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnc3Vicm91dGluZUNvbXBvbmVudCAkZGVzdHJveScpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUubW92ZVVwID0gZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLiRlbWl0KCdtb3ZlRnJhZ21lbnQnLCB7XG5cdFx0XHRcdFx0XHRmcmFnbWVudElkOiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCArICcnLFxuXHRcdFx0XHRcdFx0ZGlyOiAtMVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLm1vdmVEb3duID0gZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLiRlbWl0KCdtb3ZlRnJhZ21lbnQnLCB7XG5cdFx0XHRcdFx0XHRmcmFnbWVudElkOiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCArICcnLFxuXHRcdFx0XHRcdFx0ZGlyOiAxXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIElOSVRcblx0XHRcdFx0dmFyIG9wZW5cdD1cdHtcblx0XHRcdFx0XHRcdGVsZW1lbnRzIDogZmFsc2UsXG5cdFx0XHRcdFx0XHRwcm9jZXNzb3JzIDogZmFsc2UsXG5cdFx0XHRcdH1cblx0XHRcdFx0X2luaXQoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0KClcblx0XHRcdFx0e1xuLy9cdFx0XHRcdFx0JGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IF9pbml0KCkgZ290ICcsICckc2NvcGUuYmxvY2sucHJvcGVydGllcy5zdWJyb3V0aW5lX2lkIFsnKyRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLnN1YnJvdXRpbmVfaWQrJ10nLCAnJHNjb3BlLmJsb2NrJywgJHNjb3BlLmJsb2NrKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5jbGFzcyA9PSAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxFbGVtZW50c1xcXFxFbGVtZW50c0ZyYWdtZW50Jykge1xuXHRcdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxFbGVtZW50c1xcXFxFbGVtZW50c0ZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcblx0Ly9cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3N1YnJvdXRpbmVDb21wb25lbnQgZ290IGRlZmluaXRpb24nLCBkZWZpbml0aW9uKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnRUaXRsZVx0XHQ9XHQnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuZnJhZ21lbnRfaWQgKyAnJztcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudE5hbWUgICAgXHQ9ICAgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMubmFtZTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmRlZmluaXRpb25cdFx0XHQ9XHRkZWZpbml0aW9uO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUucHJvcGVydHlOYW1lXHRcdFx0PVx0J2VsZW1lbnRzJztcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvblx0PVx0ZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5lbGVtZW50cztcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9LCBmdW5jdGlvbiggcmVhc29uKSB7XG5cdFx0XHRcdFx0XHRcdCRsb2cuZXJyb3IoICdzdWJyb3V0aW5lQ29tcG9uZW50IGdvdCByZWFzb24nLCByZWFzb24pO1xuXHRcdFx0XHRcdFx0fSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG5cdC8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IGRlZmluaXRpb25zIGZpbmFsbHknKTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseUFzeW5jKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUucmVhZHlcdFx0XHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICRzY29wZS5ibG9jay5jbGFzcyA9PSAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50Jykge1xuXHRcdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcblx0Ly9cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3N1YnJvdXRpbmVDb21wb25lbnQgZ290IGRlZmluaXRpb24nLCBkZWZpbml0aW9uKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnRUaXRsZVx0XHQ9XHQnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuZnJhZ21lbnRfaWQgKyAnJztcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudE5hbWUgICAgXHQ9ICAgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMubmFtZTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmRlZmluaXRpb25cdFx0XHQ9XHRkZWZpbml0aW9uO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUucHJvcGVydHlOYW1lXHRcdFx0PVx0J3Byb2Nlc3NvcnMnO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uXHQ9XHRkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLnByb2Nlc3NvcnM7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHRcdFx0XHQkbG9nLmVycm9yKCAnc3Vicm91dGluZUNvbXBvbmVudCBnb3QgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHRcdH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuXHQvL1x0XHRcdFx0XHRcdCRsb2cubG9nKCAnc3Vicm91dGluZUNvbXBvbmVudCBkZWZpbml0aW9ucyBmaW5hbGx5Jyk7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHlBc3luYyggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnJlYWR5XHRcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnVW5leHBlY3RlZCBzdWJyb3V0aW5lIHR5cGUgWycrJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuX3dvcmtmbG93KyddJyk7XG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0XHRcblx0XHRcdFx0XHQkdGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRfaW5pdENsaWNrKCk7XG5cdFx0XHRcdFx0fSwgMTApXG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0Q2xpY2soKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyICRkaXZcdD1cdCRlbGVtZW50LmZpbmQoICdkaXYuc2VsZWN0YWJsZS1jb21wb25lbnQnKVswXTtcblxuXHRcdFx0XHRcdHZhciBjb250YWluZXJDb250cm9sbGVyID0gICB7XG5cdFx0XHRcdFx0XHRyZW1vdmVTZWxlY3Rpb246IGZ1bmN0aW9uKCkgeyBwcm9wZXJ0aWVzQ29udGV4dC5yZW1vdmVTdWJyb3V0aW5lKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCk7IH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0alF1ZXJ5KCRkaXYpLmJpbmQoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICRzY29wZS5pc1NlbGVjdGVkKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5zZXRTZWxlY3RlZENvbXBvbmVudCggbnVsbCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoICRzY29wZS5ibG9jaywgY29udGFpbmVyQ29udHJvbGxlcik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHR9KTtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCAnY29udm8uZWRpdG9yJylcblx0XHQuZGlyZWN0aXZlKCAnc2VsZWN0YWJsZUNvbXBvbmVudCcsIHNlbGVjdGFibGVDb21wb25lbnQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBzZWxlY3RhYmxlQ29tcG9uZW50KCAkbG9nLCBDb252b3dvcmtzQXBpLCAkdGltZW91dCwgJGNvbXBpbGUpXG5cdHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRcdHNjb3BlOiB7ICdjb21wb25lbnQnIDogJz0nIH0sXG5cdFx0XHRyZXF1aXJlOiBbICdecHJvcGVydGllc0NvbnRleHQnICwgJ15jb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciddLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9zZWxlY3RhYmxlLWNvbXBvbmVudC50bXBsLmh0bWwnLFxuXHRcdFx0bGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCAkY3RybHMpIHtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBwcm9wZXJ0aWVzQ29udGV4dFx0XHRcdFx0PVx0JGN0cmxzWzBdO1xuXHRcdFx0XHR2YXIgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXJcdD1cdCRjdHJsc1sxXTtcblx0XHRcdFx0dmFyICRkcmFnZ2FibGU7XG5cdFx0XHRcdHZhciBzZXJ2aWNlXHRcdFx0XHRcdD1cdHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpO1xuLy9cdFx0XHRcdCRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBsaW5rKCkgJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLnNob3dUaXRsZVx0XHRcdD1cdHRydWU7XG5cdFx0XHRcdCRzY29wZS5vdmVyXHRcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHQkc2NvcGUucmVhZHlcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHQkc2NvcGUuY29tcG9uZW50VGl0bGVcdFx0PVx0XCJcIjtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5pc0VsZW1lbnRcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmlzUHJvY2Vzc29yXHRcdFx0PVx0ZmFsc2U7XG5cdFx0XHRcdCRzY29wZS5pc0ZpbHRlclx0XHRcdFx0PVx0ZmFsc2U7XG5cblx0XHRcdFx0X2luaXQoKTtcblxuXHRcdFx0XHQkc2NvcGUuaXNTZWxlY3RlZFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLmNvbXBvbmVudCA9PT0gJHNjb3BlLmNvbXBvbmVudDtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5nZXRCbG9ja05hbWVcdD1cdGZ1bmN0aW9uKCBibG9ja0lkKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBibG9ja1x0PVx0cHJvcGVydGllc0NvbnRleHQuZmluZEJsb2NrKCBibG9ja0lkKTtcblx0XHRcdFx0XHR9IGNhdGNoICggZXJyKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0lEOiAnICsgYmxvY2tJZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCBibG9jay5wcm9wZXJ0aWVzLm5hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBibG9jay5wcm9wZXJ0aWVzLm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiAnSUQ6ICcgKyBibG9ja0lkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuZ2V0U3Vicm91dGluZU5hbWVcdD1cdGZ1bmN0aW9uKCBmcmFnbWVudElkKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBmcmFnbWVudFx0PVx0cHJvcGVydGllc0NvbnRleHQuZmluZFN1YnJvdXRpbmUoIGZyYWdtZW50SWQpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKCBlcnIpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnSUQ6ICcgKyBmcmFnbWVudElkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIGZyYWdtZW50LnByb3BlcnRpZXMubmFtZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZyYWdtZW50LnByb3BlcnRpZXMubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuICdJRDogJyArIGZyYWdtZW50SWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5pc0N1dFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmlzQ3V0KCAkc2NvcGUuY29tcG9uZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLmdldENvbnRleHRPcHRpb25zXHQ9XHRmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gICBbXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnQ3V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKCRpdGVtU2NvcGUsICRldmVudCwgbW9kZWxWYWx1ZSwgdGV4dCwgJGxpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBjb250ZXh0IGN1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5jdXQoIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ0NvcHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAoJGl0ZW1TY29wZSwgJGV2ZW50LCBtb2RlbFZhbHVlLCB0ZXh0LCAkbGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IGNvbnRleHQgY29weScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5jb3B5KCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIHByb3BlcnRpZXNDb250ZXh0Lmhhc0NsaXBib2FyZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnUGFzdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKCRpdGVtU2NvcGUsICRldmVudCwgbW9kZWxWYWx1ZSwgdGV4dCwgJGxpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBwYXN0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ICAgICAgID0gICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5pbmRleE9mKCAkc2NvcGUuY29tcG9uZW50KSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5wYXN0ZSggY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7ICAgIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ0RlbGV0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uICgkaXRlbVNjb3BlLCAkZXZlbnQsIG1vZGVsVmFsdWUsIHRleHQsICRsaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBkZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3Rpb24oKS5jb21wb25lbnQgPT09ICRzY29wZS5jb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5yZW1vdmVDb21wb25lbnQoICRzY29wZS5jb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLiRvbiggJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50ICRkZXN0cm95Jyk7XG5cdFx0XHRcdFx0aWYgKCRkcmFnZ2FibGUpIHtcblx0XHRcdFx0XHRcdCRkcmFnZ2FibGUuZHJhZ2dhYmxlKHtkaXNhYmxlZDogdHJ1ZX0pLmRyYWdnYWJsZSggJ2Rlc3Ryb3knKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0KClcblx0XHRcdFx0e1xuLy9cdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0KCkgJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICggISRzY29wZS5jb21wb25lbnQpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ05vIGNvbXBvbmVudCBkZWZpbmVkJyk7XG5cdFx0XHRcdFx0fVxuLy9cdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0KCkgZ290IGNsYXNzIFsnKyRzY29wZS5jb21wb25lbnRbJ2NsYXNzJ10rJ10nLCAnJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBjbGFzc19uYW1lXHQ9XHRcdCRzY29wZS5jb21wb25lbnRbJ2NsYXNzJ107XG5cdFx0XHRcdFx0aWYgKCAhY2xhc3NfbmFtZSkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0KCkgJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTm8gY2xhc3MgaW4gY29tcG9uZW50Jyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggY2xhc3NfbmFtZSkudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbi8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IGdvdCBkZWZpbml0aW9uJywgZGVmaW5pdGlvbik7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCRzY29wZS5kZWZpbml0aW9uXHRcdD1cdGRlZmluaXRpb247XG5cdFx0XHRcdFx0XHQkc2NvcGUuY29tcG9uZW50VGl0bGVcdD1cdGRlZmluaXRpb24ubmFtZTtcblx0XHRcdFx0XHRcdCRzY29wZS5pc0VsZW1lbnRcdFx0PVx0ZmFsc2U7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlID09PSAnXFxcXENvbnZvXFxcXENvcmVcXFxcV29ya2Zsb3dcXFxcSUNvbnZlcnNhdGlvblByb2Nlc3NvcicpIHtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuaXNQcm9jZXNzb3JcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuY29tcG9uZW50VGl0bGVcdD1cdGRlZmluaXRpb24ubmFtZTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlID09PSAnXFxcXENvbnZvXFxcXENvcmVcXFxcV29ya2Zsb3dcXFxcSVJlcXVlc3RGaWx0ZXInKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmlzRmlsdGVyXHRcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlID09PSAnXFxcXENvbnZvXFxcXENvcmVcXFxcV29ya2Zsb3dcXFxcSUNvbnZlcnNhdGlvbkVsZW1lbnQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmlzRWxlbWVudFx0XHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fcHJldmlld19hbmd1bGFyICYmIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX3dvcmtmbG93ICE9ICdwcm9jZXNzJykge1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUuc2hvd1RpdGxlXHQ9XHRmYWxzZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cuZXJyb3IoICdzZWxlY3RhYmxlQ29tcG9uZW50IGRlZmluaXRpb25zIGdvdCByZWFzb24nLCByZWFzb24pO1xuXHRcdFx0XHRcdH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuLy9cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgZGVmaW5pdGlvbnMgZmluYWxseScpO1xuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseUFzeW5jKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnJlYWR5XHRcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQvLyBnb29kIG9sZCB0aW1lb3V0XG5cdFx0XHRcdFx0XHQkdGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdF9pbml0UHJldmlldygpO1xuXHRcdFx0XHRcdFx0XHRfaW5pdERyYWdnYWJsZSgpO1xuXHRcdFx0XHRcdFx0XHRfaW5pdERyb3BwYWJsZSgpO1xuXHRcdFx0XHRcdFx0XHRfaW5pdENsaWNrKCk7XG5cdFx0XHRcdFx0XHR9LCAxMClcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gX2luaXREcmFnZ2FibGUoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JGRyYWdnYWJsZVx0PVx0alF1ZXJ5KCRlbGVtZW50LmZpbmQoICdkaXYuc2VsZWN0YWJsZS1jb21wb25lbnQnKVswXSk7XG4vL1x0XHRcdFx0XHQkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgbGluaygpICRkcmFnZ2FibGUnLCAkZHJhZ2dhYmxlKTtcblx0XHRcdFx0XHQkZHJhZ2dhYmxlLmRyYWdnYWJsZSggeyBcdFxuXHRcdFx0XHRcdFx0cmV2ZXJ0OiB0cnVlLCBcblx0XHRcdFx0XHRcdHJldmVydER1cmF0aW9uIDogNTAsIFxuXHRcdFx0XHRcdFx0ekluZGV4OiAxMDAsIFxuXHRcdFx0XHRcdFx0ZGVsYXkgOiAyMDAsXG5cdFx0XHRcdFx0XHR0b2xlcmFuY2UgOiAncG9pbnRlcicsXG5cdFx0XHRcdFx0XHRhcHBlbmRUbzogJ2JvZHknLFxuXHRcdFx0XHQgICAgICAgIGhlbHBlcjogJ2Nsb25lJyxcblx0XHRcdFx0ICAgICAgICByZWZyZXNoUG9zaXRpb25zOiB0cnVlLFxuXHRcdFx0XHRcdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcbi8vXHRcdFx0XHQgICAgICAgICAgICBqUXVlcnkodGhpcykuZGF0YSggJ2NvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXHRcdFx0XHQgICAgICAgICAgICBqUXVlcnkodGhpcykuZGF0YSggJ2NvbnZvRHJhZ2dlZCcsIHtcblx0XHRcdFx0ICAgICAgICAgICAgXHR0eXBlIDogJ2NvbXBvbmVudCcsXG5cdFx0XHRcdCAgICAgICAgICAgIFx0Y29tcG9uZW50IDogJHNjb3BlLmNvbXBvbmVudCxcblx0XHRcdFx0ICAgICAgICAgICAgXHRjb250YWluZXJDb250cm9sbGVyIDogY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXJcblx0XHRcdFx0ICAgICAgICAgICAgfSk7XG5cdFx0XHRcdCAgICAgICAgICAgIFxuXHRcdFx0XHQgICAgICAgICAgICB1aS5oZWxwZXIuYmluZCggXCJjbGljay5wcmV2ZW50XCIsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgfSk7XG5cdFx0XHRcdCAgICAgICAgfSxcblx0XHRcdFx0ICAgICAgICBzdG9wOiBmdW5jdGlvbiggZXZlbnQsIHVpKSB7XG5cdFx0XHRcdCAgICAgICAgXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dWkuaGVscGVyLnVuYmluZChcImNsaWNrLnByZXZlbnRcIik7fSwgMzAwKTtcblx0XHRcdFx0ICAgICAgICB9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBfaW5pdERyb3BwYWJsZSgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgJGRyb3BwYWJsZVx0PVx0alF1ZXJ5KCRlbGVtZW50LmZpbmQoICdkaXYuc2VsZWN0YWJsZS1jb21wb25lbnQnKVswXSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0JGRyb3BwYWJsZS5kcm9wcGFibGUoe1xuXHRcdFx0XHRcdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdFx0XHRcdCAgICBkcm9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuXHRcdFx0XHRcdCAgICBcdHZhciBkYXRhXHRcdD1cdHVpLmRyYWdnYWJsZS5kYXRhKCdjb252b0RyYWdnZWQnKTtcblx0XHRcdFx0XHQgICAgXHQkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgZHJvcCBldmVudCcsIGV2ZW50LCAndWknLCB1aSwgJ2RhdGEnLCBkYXRhKTtcblx0XHRcdFx0XHQgICAgXHQgIGlmICggZGF0YSkge1x0XG5cdFx0XHRcdFx0ICAgIFx0XHQgIFxuXHRcdFx0XHRcdCAgICBcdFx0ICBpZiAoIGRhdGEuaGFuZGxlZCkge1xuXHRcdFx0XHRcdCAgICBcdFx0XHQgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBhbHJlYWR5IGhhbmRsZWQnKTtcblx0XHRcdFx0XHQgICAgXHRcdFx0ICByZXR1cm47XG5cdFx0XHRcdFx0ICAgIFx0XHQgIH1cblx0XHRcdFx0XHQgICAgXHRcdCAgXG5cdFx0XHRcdFx0XHQgICAgICAgICAgJHNjb3BlLiRhcHBseSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQgICAgICAgIFx0ICBcblx0XHRcdFx0XHRcdCAgICAgICAgXHQgIHZhciBpbmRleFx0XHQ9XHRjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5pbmRleE9mKCAkc2NvcGUuY29tcG9uZW50KSArIDE7XG5cdFx0XHRcdFx0XHRcdCAgICAgICAgICBpZiAoIGRhdGEudHlwZSA9PSAnZGVmaW5pdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IG5ldyBjb21wb25lbnQnLCBkYXRhLmNvbXBvbmVudERlZmluaXRpb24sICd0byBjb250YWluZXInLCAkc2NvcGUuY29udGFpbmVyLCAnaW4gY29tcG9uZW50JywgJHNjb3BlLmNvbXBvbmVudCk7XG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHQgIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0ICBwcm9wZXJ0aWVzQ29udGV4dC5hZGROZXdDb21wb25lbnQoIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0XHRcdCAgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIsIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0XHRcdCAgZGF0YS5jb21wb25lbnREZWZpbml0aW9uLCBcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdFx0XHQgIGluZGV4KTtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgICB9IGVsc2UgaWYgKCBkYXRhLnR5cGUgPT0gJ2NvbXBvbmVudCcpIHtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IG1vdmUgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnQpO1xuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0ICBcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgcHJvcGVydGllc0NvbnRleHQubW92ZUNvbXBvbmVudCggXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBkYXRhLmNvbnRhaW5lckNvbnRyb2xsZXIsXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciwgXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBkYXRhLmNvbXBvbmVudCwgXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBpbmRleCk7XG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHQgIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgfSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgdGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgdG8gaGF2ZSB0eXBlIFtkZWZpbml0aW9uXSBvciBbY29tcG9uZW50XScpO1xuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgfVxuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgZGF0YS5oYW5kbGVkXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdCAgICBcdCAgfSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCAgJGxvZy5lcnJvciggJ3NlbGVjdGFibGVDb21wb25lbnQgRXhwZWN0ZWQgdG8gaGF2ZSBbY29udm9EcmFnZ2VkXSBkYXRhICBbJytldmVudC50YXJnZXQuY2xhc3NOYW1lKyddJyk7XG5cdFx0XHRcdFx0ICAgIFx0ICB9XG5cdFx0XHRcdFx0ICAgIFx0ICBqUXVlcnkoZXZlbnQudGFyZ2V0KS5yZW1vdmVDbGFzcygndWktZHJvcHBhYmxlLWhvdmVyJyk7XG5cdFx0XHRcdFx0ICAgIFx0ICByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0ICAgICAgfVxuXHRcdFx0XHRcdCAgICB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gX2luaXRDbGljaygpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgJGRpdlx0PVx0JGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdO1xuXHRcdFx0XHRcdGpRdWVyeSgkZGl2KS5iaW5kKCAnY2xpY2snLCBmdW5jdGlvbiggZXZlbnQpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBjbGljayAkc2NvcGUuaXNTZWxlY3RlZCgpJywgJHNjb3BlLmlzU2VsZWN0ZWQoKSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAkc2NvcGUuaXNTZWxlY3RlZCgpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoIG51bGwpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCAkc2NvcGUuY29tcG9uZW50LCB7IHJlbW92ZVNlbGVjdGlvbjogY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIucmVtb3ZlQ29tcG9uZW50IH0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0UHJldmlldygpIHtcblx0XHRcdFx0XHR2YXIgY29udGFpbmVyXHQ9XHQkZWxlbWVudC5maW5kKCAnLnByZXZpZXcnKTtcblx0XHRcdFx0XHRpZiAoICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXIpIHtcbi8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0UHJldmlldygpICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXInLCAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fcHJldmlld19hbmd1bGFyKTtcblx0XHRcdFx0XHRcdHZhciBodG1sXHRcdD1cdCRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXIudGVtcGxhdGU7XG5cdFx0XHRcdFx0XHRjb250YWluZXIuaHRtbCggaHRtbCk7XG5cdFx0XHRcdFx0XHQkY29tcGlsZSggY29udGFpbmVyLmNvbnRlbnRzKCkpKCAkc2NvcGUpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjb250YWluZXIuaHRtbCggJycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG4gICAgICAgIC5kaXJlY3RpdmUoICdyZWxlYXNlc0VkaXRvcicsIHJlbGVhc2VzRWRpdG9yKTtcblxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cbiAgICBmdW5jdGlvbiByZWxlYXNlc0VkaXRvciggJGxvZywgJHEsICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7IHNlcnZpY2U6ICc9JyB9LFxuICAgICAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3JlbGVhc2VzLWVkaXRvci50bXBsLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuICAgICAgICAgICAgXHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGxpbmsnKTtcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdCRzY29wZS5yZWxlYXNlc1x0XHQ9XHRbXTtcbiAgICAgICAgICAgIFx0dmFyIFBST01PVEVfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICBcdHZhciBJTVBPUlRfV09SS0ZMT1dfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICBcdHZhciBTVUJNSVRfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHQkc2NvcGUuZ2V0UmVsZWFzZVVybFx0PVx0ZnVuY3Rpb24gKCByZWxlYXNlKSB7XG4gICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICBcdC8vXHRodHRwOi8vY29udm8tcHJvdG8ubG9rYWwuY29tL3Jlc3RfcHVibGljL2NvbnZvL3YxL3NlcnZpY2UtcnVuL3dlYmNoYXQvYS90cmliZXMtYXNjZW5kXG4gICAgICAgICAgICBcdFx0XHRcbiAgICAgICAgICAgIFx0XHRyZXR1cm4gQ09OVk9fUFVCTElDX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1ydW4vJyArIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gKyAnLycgXG4gICAgICAgICAgICBcdFx0KyByZWxlYXNlWydhbGlhcyddICsgJy8nICsgcmVsZWFzZVsnc2VydmljZV9pZCddO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdCRzY29wZS5nZXRQcm9tb3RlT3B0aW9uc1x0PVx0ZnVuY3Rpb24gKCByZWxlYXNlKSB7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIFBST01PVEVfT1BUSU9OU1sgX2dldFJlbGVhc2VLZXkoIHJlbGVhc2UpXTtcbiAgICAgICAgICAgIFx0fTtcbiAgICAgICAgICAgIFx0XG5cbiAgICAgICAgICAgIFx0JHNjb3BlLnByb21vdGVSZWxlYXNlXHQ9XHRmdW5jdGlvbiAoIHJvdywgdHlwZSwgc3RhZ2UpIHtcbiAgICAgICAgICAgIFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIHByb21vdGVSZWxlYXNlIHR5cGUnLCB0eXBlLCAncm93Jywgcm93KTtcbiAgICAgICAgICAgICAgICBcdENvbnZvd29ya3NBcGkucHJvbW90ZVJlbGVhc2UoIFxuICAgICAgICAgICAgICAgIFx0XHRcdCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsXG4gICAgICAgICAgICAgICAgXHRcdFx0cm93WydyZWxlYXNlX2lkJ10sXG4gICAgICAgICAgICAgICAgXHRcdFx0dHlwZSxcbiAgICAgICAgICAgICAgICBcdFx0XHRzdGFnZSkudGhlbiggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0XHRcdFx0X2xvYWQoKTtcbiAgICAgICAgICAgICAgICBcdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZVJlbGVhc2VzVXBkYXRlZCcpO1xuICAgICAgICAgICAgICAgIFx0fSwgZnVuY3Rpb24gKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICBcdFx0JGxvZy5sb2coICdyZWxlYXNlc0VkaXRvciBwcm9tb3RlUmVsZWFzZSByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIFx0fSk7XG4gICAgICAgICAgICBcdH07XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHQkc2NvcGUuZ2V0U3VibWl0T3B0aW9uc1x0PVx0ZnVuY3Rpb24gKCByZWxlYXNlKSB7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIFNVQk1JVF9PUFRJT05TWyBfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSldO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0JHNjb3BlLnN1Ym1pdFJlbGVhc2VcdD1cdGZ1bmN0aW9uICggcm93LCB0eXBlLCBzdGFnZSkge1xuICAgICAgICAgICAgXHRcdCRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3Igc3VibWl0UmVsZWFzZSB0eXBlJywgdHlwZSwgJ3JvdycsIHJvdyk7XG4gICAgICAgICAgICAgICAgXHRDb252b3dvcmtzQXBpLmNyZWF0ZVJlbGVhc2UoIFxuICAgICAgICAgICAgICAgIFx0XHRcdCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsXG4gICAgICAgICAgICAgICAgXHRcdFx0cm93WydwbGF0Zm9ybV9pZCddLFxuICAgICAgICAgICAgICAgIFx0XHRcdHR5cGUsXG4gICAgICAgICAgICAgICAgXHRcdFx0c3RhZ2UpLnRoZW4oIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdFx0XHRcdF9sb2FkKCk7XG4gICAgICAgICAgICAgICAgXHRcdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VSZWxlYXNlc1VwZGF0ZWQnKTtcbiAgICAgICAgICAgICAgICBcdH0sIGZ1bmN0aW9uICggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgXHRcdCRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3Igc3VibWl0UmVsZWFzZSByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIFx0fSk7XG4gICAgICAgICAgICBcdH07XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0JHNjb3BlLmdldEltcG9ydFdvcmtmbG93XHQ9XHRmdW5jdGlvbiAoIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIFx0XHRyZXR1cm4gSU1QT1JUX1dPUktGTE9XX09QVElPTlNbIF9nZXRSZWxlYXNlS2V5KCByZWxlYXNlKV07XG4gICAgICAgICAgICBcdH07ICBcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdCRzY29wZS5pbXBvcnRXb3JrZmxvd1JlbGVhc2VcdD1cdGZ1bmN0aW9uICggcm93LCByZWxlYXNlSWQpIHtcbiAgICAgICAgICAgIFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGltcG9ydFdvcmtmbG93UmVsZWFzZSByZWxlYXNlSWQnLCByZWxlYXNlSWQpO1xuICAgICAgICAgICAgICAgIFx0Q29udm93b3Jrc0FwaS5pbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKCBcbiAgICAgICAgICAgICAgICBcdFx0XHQkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLFxuICAgICAgICAgICAgICAgIFx0XHRcdHJlbGVhc2VJZCxcbiAgICAgICAgICAgICAgICBcdFx0XHRyb3dbJ3ZlcnNpb25faWQnXSkudGhlbiggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0XHRcdFx0X2xvYWQoKTtcbiAgICAgICAgICAgICAgICBcdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZVJlbGVhc2VzVXBkYXRlZCcpO1xuICAgICAgICAgICAgICAgIFx0fSwgZnVuY3Rpb24gKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICBcdFx0JGxvZy5sb2coICdyZWxlYXNlc0VkaXRvciBpbXBvcnRXb3JrZmxvd1JlbGVhc2UgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICBcdH0pO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0ZnVuY3Rpb24gZ2V0X3JlbGVhc2UoIHBsYXRmb3JtSWQsIHR5cGUsIHN0YWdlKVxuICAgICAgICAgICAgXHR7XG5cdFx0XHRcdFx0Zm9yICggdmFyIGk9MDsgaTwkc2NvcGUucmVsZWFzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciByZWxlYXNlXHQ9XHQkc2NvcGUucmVsZWFzZXNbaV07XG4vL1x0XHRcdFx0XHRcdCRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3IgZ2V0X3JlbGVhc2UgY2hlY2sgcmVsZWFzZScsIHJlbGVhc2UpO1xuXHRcdFx0XHRcdFx0aWYgKCByZWxlYXNlWyd0eXBlJ10gPT09IHR5cGUgJiYgcmVsZWFzZVsnc3RhZ2UnXSA9PT0gc3RhZ2UgJiYgcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gcGxhdGZvcm1JZCkge1xuXHRcdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGdldF9yZWxlYXNlIGZvdW5kIHBsYXRmb3JtSWQnLCBwbGF0Zm9ybUlkLCAndHlwZScsIHR5cGUsICdzdGFnZScsIHN0YWdlLCByZWxlYXNlWydyZWxlYXNlX2lkJ10pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVsZWFzZVsncmVsZWFzZV9pZCddO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGdldF9yZWxlYXNlIG5vdCBmb3VuZCBwbGF0Zm9ybUlkJywgcGxhdGZvcm1JZCwgJ3R5cGUnLCB0eXBlLCAnc3RhZ2UnLCBzdGFnZSk7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIG51bGw7XG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdCRyb290U2NvcGUuJG9uKCAnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCBmdW5jdGlvbiAoIGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBfbG9hZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0X2xvYWQoKTtcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdGZ1bmN0aW9uIF9sb2FkKCkge1xuICAgICAgICAgICAgXHRcdENvbnZvd29ya3NBcGkuZ2V0U2VydmljZVJlbGVhc2VzKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkKS50aGVuKCBmdW5jdGlvbiAoIHJlbGVhc2VzKSB7XG4gICAgICAgICAgICBcdFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIHJlbGVhc2VzIGxvYWRlZCcpO1xuICAgICAgICAgICAgXHRcdFx0JHNjb3BlLnJlbGVhc2VzXHQ9XHRyZWxlYXNlcztcbiAgICAgICAgICAgIFx0XHRcdF9pbml0T3B0aW9ucygpO1xuICAgICAgICAgICAgICAgIFx0fSwgZnVuY3Rpb24gKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICBcdFx0JGxvZy5sb2coICdyZWxlYXNlc0VkaXRvciBnZXRTZXJ2aWNlUmVsZWFzZXMgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICBcdH0pXG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdGZ1bmN0aW9uIF9pbml0T3B0aW9ucygpXG4gICAgICAgICAgICBcdHtcbiAgICAgICAgICAgIFx0XHQkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIF9pbml0T3B0aW9ucycpO1xuICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgXHRcdFBST01PVEVfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICAgICAgXHRJTVBPUlRfV09SS0ZMT1dfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICAgICAgXHRTVUJNSVRfT1BUSU9OU1x0PVx0e307XG4gICAgICAgICAgICAgICAgXHRcbiAgICAgICAgICAgICAgICBcdHZhciByZWxlYXNlc1x0PVx0JHNjb3BlLmdldERldmVsb3BtZW50KCk7XG4gICAgICAgICAgICAgICAgXHRmb3IgKCB2YXIgaT0wOyBpPHJlbGVhc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgXHRcdHZhciByZWxlYXNlXHQ9XHRyZWxlYXNlc1tpXTtcbiAgICAgICAgICAgICAgICBcdFx0dmFyIGtleVx0XHQ9XHRfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSk7XG4gICAgICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0X2dldFN1Ym1pdE9wdGlvbnMoIHJlbGVhc2UpO1xuICAgICAgICAgICAgICAgIFx0XHRTVUJNSVRfT1BUSU9OU1trZXldXHQ9XHRvcHRpb25zO1xuICAgICAgICAgICAgICAgIFx0XHRcbiAgICAgICAgICAgICAgICBcdFx0dmFyIG9wdGlvbnNcdD1cdF9nZXRXb3JrZmxvd09wdGlvbnMoIHJlbGVhc2UpO1xuICAgICAgICAgICAgICAgIFx0XHRJTVBPUlRfV09SS0ZMT1dfT1BUSU9OU1trZXldXHQ9XHRvcHRpb25zO1xuICAgICAgICAgICAgICAgIFx0fVxuICAgICAgICAgICAgICAgIFx0XG4gICAgICAgICAgICAgICAgXHR2YXIgcmVsZWFzZXNcdD1cdCRzY29wZS5nZXRUZXN0KCk7XG4gICAgICAgICAgICAgICAgXHRmb3IgKCB2YXIgaT0wOyBpPHJlbGVhc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgXHRcdHZhciByZWxlYXNlXHQ9XHRyZWxlYXNlc1tpXTtcbiAgICAgICAgICAgICAgICBcdFx0dmFyIGtleVx0XHQ9XHRfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSk7XG4gICAgICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0X2dldFByb21vdGVPcHRpb25zKCByZWxlYXNlKTtcbiAgICAgICAgICAgICAgICBcdFx0UFJPTU9URV9PUFRJT05TW2tleV1cdD1cdG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0X2dldFdvcmtmbG93T3B0aW9ucyggcmVsZWFzZSk7XG4gICAgICAgICAgICAgICAgXHRcdElNUE9SVF9XT1JLRkxPV19PUFRJT05TW2tleV1cdD1cdG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgXHR9XG4gICAgICAgICAgICAgICAgXHRcbiAgICAgICAgICAgICAgICBcdHZhciByZWxlYXNlc1x0PVx0JHNjb3BlLmdldFByb2R1Y3Rpb24oKTtcbiAgICAgICAgICAgICAgICBcdGZvciAoIHZhciBpPTA7IGk8cmVsZWFzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBcdFx0dmFyIHJlbGVhc2VcdD1cdHJlbGVhc2VzW2ldO1xuICAgICAgICAgICAgICAgIFx0XHR2YXIga2V5XHRcdD1cdF9nZXRSZWxlYXNlS2V5KCByZWxlYXNlKTtcblxuICAgICAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0X2dldFByb21vdGVPcHRpb25zKCByZWxlYXNlKTtcbiAgICAgICAgICAgICAgICBcdFx0UFJPTU9URV9PUFRJT05TW2tleV1cdD1cdG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgXHR9XG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdGZ1bmN0aW9uIF9nZXRSZWxlYXNlS2V5KCByZWxlYXNlKSB7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIHJlbGVhc2VbJ3JlbGVhc2VfaWQnXSA/IHJlbGVhc2VbJ3JlbGVhc2VfaWQnXSA6IHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gKyAnXycgKyByZWxlYXNlWyd0eXBlJ107XG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdGZ1bmN0aW9uIF9nZXRTdWJtaXRPcHRpb25zKCByZWxlYXNlKSB7XG4gICAgICAgICAgICBcdFx0dmFyIG9wdGlvbnNcdD1cdFtdO1xuICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgXHRcdGlmICggcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2FtYXpvbicpIHtcbiAgICAgICAgICAgIFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICBcdFx0XHRcdFx0dGl0bGUgOiAnU3VibWl0IHRvIHJldmlldycsXG4gICAgICAgIFx0XHRcdFx0XHR0eXBlIDogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBcdFx0XHRcdFx0c3RhZ2UgOiAncmV2aWV3JyxcbiAgICAgICAgICAgIFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdkaWFsb2dmbG93Jykge1xuICAgICAgICAgICAgXHRcdFx0b3B0aW9ucy5wdXNoKCB7XG4gICAgICAgIFx0XHRcdFx0XHR0aXRsZSA6ICdTdWJtaXQgdG8gcmV2aWV3JyxcbiAgICAgICAgXHRcdFx0XHRcdHR5cGUgOiAncHJvZHVjdGlvbicsXG4gICAgICAgIFx0XHRcdFx0XHRzdGFnZSA6ICdyZXZpZXcnLFxuICAgICAgICAgICAgXHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0XHRvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgIFx0XHRcdFx0dGl0bGUgOiAnU3VibWl0IHRvIGFscGhhIHRlc3QnLFxuICAgICAgICAgICAgXHRcdFx0XHR0eXBlIDogJ3Rlc3QnLFxuICAgICAgICAgICAgXHRcdFx0XHRzdGFnZSA6ICdhbHBoYScsXG4gICAgICAgICAgICBcdFx0XHR9KTtcbiAgICAgICAgICAgIFx0XHR9IGVsc2UgaWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAnY29udm9fY2hhdCcpIHtcbiAgICAgICAgICAgIFx0XHRcdHZhciByZWxlYXNlX2lkXHQ9XHRnZXRfcmVsZWFzZSggJ2NvbnZvX2NoYXQnLCAncHJvZHVjdGlvbicsICdyZWxlYXNlJyk7XG4gICAgICAgICAgICBcdFx0XHRpZiAoICFyZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICBcdFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ1N1Ym1pdCBhcyByZWxlYXNlJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHR0eXBlIDogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHN0YWdlIDogJ3JlbGVhc2UnLFxuICAgICAgICAgICAgICAgIFx0XHRcdH0pOyAgICAgICAgICAgIFx0XHRcdFx0XG4gICAgICAgICAgICBcdFx0XHR9XG4gICAgICAgICAgICBcdFx0fVxuICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgXHRcdHJldHVybiBvcHRpb25zO1xuICAgICAgICAgICAgXHR9XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHRmdW5jdGlvbiBfZ2V0UHJvbW90ZU9wdGlvbnMoIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0W107XG4gICAgICAgICAgICBcdFx0aWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAnYW1hem9uJykge1xuICAgICAgICAgICAgXHRcdFx0aWYgKCByZWxlYXNlWydzdGFnZSddID09PSAncmV2aWV3Jykge1xuICAgICAgICAgICAgICAgIFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ1Byb21vdGUgdG8gcmVsZWFzZScsXG4gICAgICAgICAgICBcdFx0XHRcdFx0dHlwZSA6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHRzdGFnZSA6ICdyZWxlYXNlJ1xuICAgICAgICAgICAgICAgIFx0XHRcdH0pO1xuLy8gICAgICAgICAgICAgICAgXHRcdFx0b3B0aW9ucy5wdXNoKCB7XG4vLyAgICAgICAgICAgICAgICBcdFx0XHRcdHRpdGxlIDogJ1dpdGhkcmF3Jyxcbi8vICAgICAgICAgICAgICAgIFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdFx0fVxuICAgICAgICAgICAgXHRcdH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdkaWFsb2dmbG93Jykge1xuICAgICAgICAgICAgXHRcdFx0aWYgKCByZWxlYXNlWyd0eXBlJ10gPT09ICdwcm9kdWN0aW9uJyAmJiByZWxlYXNlWydzdGFnZSddID09PSAncmV2aWV3Jykge1xuICAgICAgICAgICAgICAgIFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ1Byb21vdGUgdG8gcmVsZWFzZScsXG4gICAgICAgICAgICBcdFx0XHRcdFx0dHlwZSA6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHRzdGFnZSA6ICdyZWxlYXNlJ1xuICAgICAgICAgICAgICAgIFx0XHRcdH0pO1xuLy8gICAgICAgICAgICAgICAgXHRcdFx0b3B0aW9ucy5wdXNoKCB7XG4vLyAgICAgICAgICAgICAgICBcdFx0XHRcdHRpdGxlIDogJ1dpdGhkcmF3Jyxcbi8vICAgICAgICAgICAgICAgIFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdFx0fSBlbHNlIGlmICggcmVsZWFzZVsndHlwZSddID09PSAndGVzdCcpIHtcbiAgICAgICAgICAgICAgICBcdFx0XHRvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgIFx0XHRcdFx0XHR0aXRsZSA6ICdQcm9tb3RlIHRvIHJldmlldycsXG4gICAgICAgICAgICBcdFx0XHRcdFx0dHlwZSA6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHRzdGFnZSA6ICdyZXZpZXcnXG4gICAgICAgICAgICAgICAgXHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0XHR9XHRcbiAgICAgICAgICAgIFx0XHR9XG4gICAgICAgICAgICBcdFx0cmV0dXJuIG9wdGlvbnM7XG4gICAgICAgICAgICBcdH1cbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdGZ1bmN0aW9uIF9nZXRXb3JrZmxvd09wdGlvbnMoIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIFx0XHR2YXIgb3B0aW9uc1x0PVx0W107XG4gICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICBcdFx0aWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAnYW1hem9uJykge1xuICAgICAgICAgICAgXHRcdFx0dmFyIHJlbGVhc2VfaWRcdD1cdGdldF9yZWxlYXNlKCAnYW1hem9uJywgJ3Byb2R1Y3Rpb24nLCAncmVsZWFzZScpO1xuICAgICAgICAgICAgXHRcdFx0aWYgKCByZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICBcdFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ0ltcG9ydCB0byByZWxlYXNlJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHR2ZXJzaW9uX2lkIDogcmVsZWFzZVsndmVyc2lvbl9pZCddLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHJlbGVhc2VfaWQgOiByZWxlYXNlX2lkXG4gICAgICAgICAgICBcdFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdFx0fVxuICAgICAgICAgICAgXHRcdFx0XG4gICAgICAgICAgICBcdFx0XHR2YXIgcmVsZWFzZV9pZFx0PVx0Z2V0X3JlbGVhc2UoICdhbWF6b24nLCAncHJvZHVjdGlvbicsICdyZXZpZXcnKTtcbiAgICAgICAgICAgIFx0XHRcdGlmICggcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgXHRcdFx0XHRvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgIFx0XHRcdFx0XHR0aXRsZSA6ICdJbXBvcnQgdG8gcmV2aWV3JyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHR2ZXJzaW9uX2lkIDogcmVsZWFzZVsndmVyc2lvbl9pZCddLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHJlbGVhc2VfaWQgOiByZWxlYXNlX2lkXG4gICAgICAgICAgICBcdFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdFx0fVxuICAgICAgICAgICAgXHRcdH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdkaWFsb2dmbG93Jykge1xuICAgICAgICAgICAgXHRcdFx0dmFyIHJlbGVhc2VfaWRcdD1cdGdldF9yZWxlYXNlKCAnZGlhbG9nZmxvdycsICdwcm9kdWN0aW9uJywgJ3JlbGVhc2UnKTtcbiAgICAgICAgICAgIFx0XHRcdGlmICggcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgXHRcdFx0XHRvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgIFx0XHRcdFx0XHR0aXRsZSA6ICdJbXBvcnQgdG8gcmVsZWFzZScsXG4gICAgICAgICAgICBcdFx0XHRcdFx0dmVyc2lvbl9pZCA6IHJlbGVhc2VbJ3ZlcnNpb25faWQnXSxcbiAgICAgICAgICAgIFx0XHRcdFx0XHRyZWxlYXNlX2lkIDogcmVsZWFzZV9pZFxuICAgICAgICAgICAgXHRcdFx0XHR9KTtcbiAgICAgICAgICAgIFx0XHRcdH1cbiAgICAgICAgICAgIFx0XHRcdFxuICAgICAgICAgICAgXHRcdFx0dmFyIHJlbGVhc2VfaWRcdD1cdGdldF9yZWxlYXNlKCAnZGlhbG9nZmxvdycsICdwcm9kdWN0aW9uJywgJ3JldmlldycpO1xuICAgICAgICAgICAgXHRcdFx0aWYgKCByZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICBcdFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ0ltcG9ydCB0byByZXZpZXcnLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHZlcnNpb25faWQgOiByZWxlYXNlWyd2ZXJzaW9uX2lkJ10sXG4gICAgICAgICAgICBcdFx0XHRcdFx0cmVsZWFzZV9pZCA6IHJlbGVhc2VfaWRcbiAgICAgICAgICAgIFx0XHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0XHR9XG4gICAgICAgICAgICBcdFx0XHR2YXIgcmVsZWFzZV9pZFx0PVx0Z2V0X3JlbGVhc2UoICdkaWFsb2dmbG93JywgJ3Rlc3QnLCAnYWxwaGEnKTtcbiAgICAgICAgICAgIFx0XHRcdGlmICggcmVsZWFzZV9pZCAmJiByZWxlYXNlWyd0eXBlJ10gIT09ICd0ZXN0Jykge1xuICAgICAgICAgICAgXHRcdFx0XHRvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgIFx0XHRcdFx0XHR0aXRsZSA6ICdJbXBvcnQgdG8gYWxwaGEnLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHZlcnNpb25faWQgOiByZWxlYXNlWyd2ZXJzaW9uX2lkJ10sXG4gICAgICAgICAgICBcdFx0XHRcdFx0cmVsZWFzZV9pZCA6IHJlbGVhc2VfaWRcbiAgICAgICAgICAgIFx0XHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0XHR9XG4gICAgICAgICAgICBcdFx0fSBlbHNlIGlmICggcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2NvbnZvX2NoYXQnKSB7XG4gICAgICAgICAgICBcdFx0XHR2YXIgcmVsZWFzZV9pZFx0PVx0Z2V0X3JlbGVhc2UoICdjb252b19jaGF0JywgJ3Byb2R1Y3Rpb24nLCAncmVsZWFzZScpO1xuICAgICAgICAgICAgXHRcdFx0aWYgKCByZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICBcdFx0XHRcdG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgXHRcdFx0XHRcdHRpdGxlIDogJ0ltcG9ydCB0byByZWxlYXNlJyxcbiAgICAgICAgICAgIFx0XHRcdFx0XHR2ZXJzaW9uX2lkIDogcmVsZWFzZVsndmVyc2lvbl9pZCddLFxuICAgICAgICAgICAgXHRcdFx0XHRcdHJlbGVhc2VfaWQgOiByZWxlYXNlX2lkXG4gICAgICAgICAgICBcdFx0XHRcdH0pO1xuICAgICAgICAgICAgXHRcdFx0fVxuICAgICAgICAgICAgXHRcdH1cbiAgICAgICAgICAgIFx0XHRyZXR1cm4gb3B0aW9ucztcbiAgICAgICAgICAgIFx0fTtcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0Ly8gR1JJRCBEQVRBXG4gICAgICAgICAgICBcdCRzY29wZS5nZXRQcm9kdWN0aW9uXHQ9XHRmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBcdFx0dmFyIHJlbGVhc2VzID0gJHNjb3BlLnJlbGVhc2VzLmZpbHRlciggZnVuY3Rpb24oIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIFx0XHRcdHJldHVybiByZWxlYXNlLnR5cGVcdD09PSAncHJvZHVjdGlvbic7XG4gICAgICAgICAgICBcdFx0fSk7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIHJlbGVhc2VzO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0JHNjb3BlLmdldFRlc3RcdFx0XHQ9XHRmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBcdFx0dmFyIHJlbGVhc2VzID0gJHNjb3BlLnJlbGVhc2VzLmZpbHRlciggZnVuY3Rpb24oIHJlbGVhc2UpIHtcbiAgICAgICAgICBcdFx0XHQgIHJldHVybiByZWxlYXNlLnR5cGVcdD09PSAndGVzdCc7XG4gICAgICAgICAgXHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIHJlbGVhc2VzO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0JHNjb3BlLmdldERldmVsb3BtZW50XHQ9XHRmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBcdFx0dmFyIHJlbGVhc2VzID0gJHNjb3BlLnJlbGVhc2VzLmZpbHRlciggZnVuY3Rpb24oIHJlbGVhc2UpIHtcbiAgICAgICAgICBcdFx0XHQgIHJldHVybiByZWxlYXNlLnR5cGVcdD09PSAnZGV2ZWxvcCc7XG4gICAgICAgICAgXHRcdFx0fSk7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIHJlbGVhc2VzO1xuICAgICAgICAgICAgXHR9O1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmRpcmVjdGl2ZSggJ3Byb3BlcnRpZXNFZGl0b3InLCBwcm9wZXJ0aWVzRWRpdG9yKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gcHJvcGVydGllc0VkaXRvciggJGxvZywgQ29udm93b3Jrc0FwaSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdFx0cmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3Byb3BlcnRpZXMtZWRpdG9yLnRtcGwuaHRtbCcsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRjb21wb25lbnQ6ICc9Jyxcblx0XHRcdFx0ZGVmaW5pdGlvbjogJz0nLFxuXHRcdFx0XHRzZXJ2aWNlOiAnPScsXG5cdFx0XHRcdGhlbHA6ICc9Pydcblx0XHRcdH0sXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXHRcdFx0XHR2YXIgd2F0Y2hlcnMgICAgPSAgIFtdO1xuXHRcdFx0XHQkc2NvcGUuaGVscCA9IG51bGw7XG5cdFx0XHRcdCRzY29wZS50YWJJbmRleCA9IHsgYWN0aXZlOiBcImJcIiB9O1xuXG5cdFx0XHRcdF9zZXR1cEJsb2NrSWRzKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuZ2V0QmxvY2tJZFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIGJsb2NrX2lkXHQ9XHRudWxsO1xuXHRcdFx0XHRcdGlmICggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkKSB7XG5cdFx0XHRcdFx0XHRibG9ja19pZFx0PVx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCkge1xuXHRcdFx0XHRcdFx0YmxvY2tfaWRcdD1cdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cmV0dXJuIGJsb2NrX2lkO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLmdldENvbXBvbmVudE5hbWVcdD1cdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm5hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMubmFtZSArICcgKCcrJHNjb3BlLmRlZmluaXRpb24ubmFtZSsnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkICsgJyAoJyskc2NvcGUuZGVmaW5pdGlvbi5uYW1lKycpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQgKyAnICgnKyRzY29wZS5kZWZpbml0aW9uLm5hbWUrJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmRlZmluaXRpb24ubmFtZTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5nZXRDb21wb25lbnREZXNjcmlwdGlvblx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGJsb2NrX2lkXHQ9XHQkc2NvcGUuZ2V0QmxvY2tJZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICggYmxvY2tfaWQgPT09ICdfX3NlcnZpY2VQcm9jZXNzb3JzJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuICdTeXN0ZW0gYmxvY2sgd2hpY2ggY29udGFpbnMgb25seSBwcm9jZXNzb3JzLiBUaGlzIHByb2Nlc3NvcnMgd2lsbCBiZSBjb25zaWRlcmVkIG9uIGFueSBhY3RpdmUgc3RlcCBwcm9jZXNzIHBoYXNlLic7XG5cdFx0XHRcdFx0fSBcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIGJsb2NrX2lkID09PSAnX19zZXNzaW9uU3RhcnQnKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ1N5c3RlbSBibG9jayB0aGF0IGV4ZWN1dGVzIG9ubHkgd2hlbiB0aGUgbmV3IHNlc3Npb24gaGFzIHN0YXJ0ZWQuIElmIHlvdSBsZWF2ZSBpdCBlbXB0eSwgdGhlIGZpcnN0IHJlZ3VsYXIgc3RlcCB3aWxsIGJlIHVzZWQuJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCBibG9ja19pZCA9PT0gJ19fc2Vzc2lvbkVuZCcpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnVGhpcyBzdGVwIGlzIGNhbGxlZCB3aGVuIHNlc3Npb24gZW5kcy4gWW91IGNhbiBub3Qgb3V0cHV0IGFueXRoaW5nIGhlcmUsIGJ1dCB5b3UgbWlnaHQgZG8gY2xlYW51cCBvciBzdGF0aXN0aWNzIGhlcmUuJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCBibG9ja19pZCA9PT0gJ19fbWVkaWFDb250cm9scycpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnU2VydmVzIGZvciBoYW5kbGluZyBtZWRpYSBwbGF5aW5nIHJlcXVlc3RzICh0aGV5IGFyZSBzZXNzaW9ubGVzcyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmRlZmluaXRpb24uZGVzY3JpcHRpb247XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLmNoZWNrQ29tcG9uZW50SGVscCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICggJHNjb3BlLmhlbHAgIT09IG51bGwpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuZGlzcGxheUVkaXRvclx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICEhJHNjb3BlLmNvbXBvbmVudCAmJiBPYmplY3Qua2V5cyggJHNjb3BlLmNvbXBvbmVudCkubGVuZ3RoID4gMDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuY2xvc2VFZGl0b3JcdFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoIG51bGwgKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUucmVtb3ZlQ29tcG9uZW50ICA9ICAgZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQucmVtb3ZlQ29tcG9uZW50KCk7XG5cdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoIG51bGwsIG51bGwpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5pc1N5c3RlbUJsb2NrICAgID0gICBmdW5jdGlvbigpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gISEkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMuYmxvY2tfaWQgJiYgX2lzU3lzdGVtKCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMuYmxvY2tfaWQpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5pc09iamVjdCAgICAgICAgID0gICBmdW5jdGlvbiggdmFsKSB7XG5cdFx0XHRcdFx0cmV0dXJuICggdmFsICE9PSBudWxsKSAmJiAoICFBcnJheS5pc0FycmF5KCB2YWwpKSAmJiAoIHZhbCBpbnN0YW5jZW9mIE9iamVjdCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLnJlbW92ZVV0dGVyYW5jZSAgPSAgIGZ1bmN0aW9uKCBpKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMuc3BsaWNlKCBpLCAxKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuYWRkVXR0ZXJhbmNlICAgICA9ICAgZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCAhJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMpIHtcblx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy51dHRlcmFuY2VzXHQ9XHRbXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMucHVzaCggXCJOZXcgdXR0ZXJhbmNlXCIpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5hZGRPa1NwZWNpZmljVXR0ZXJhbmNlICAgPSAgIGZ1bmN0aW9uKCBuYW1lKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCAhJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm9rX3NwZWNpZmljW25hbWVdLnByb3BlcnRpZXMudXR0ZXJhbmNlcykge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm9rX3NwZWNpZmljW25hbWVdLnByb3BlcnRpZXMudXR0ZXJhbmNlcyA9ICAgW107XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm9rX3NwZWNpZmljW25hbWVdLnByb3BlcnRpZXMudXR0ZXJhbmNlcy5wdXNoKCBcIk5ldyB1dHRlcmFuY2VcIik7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLnJlbW92ZU9rU3BlY2lmaWNVdHRlcmFuY2UgICAgPSAgIGZ1bmN0aW9uKCBuYW1lLCBpKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm9rX3NwZWNpZmljW25hbWVdLnByb3BlcnRpZXMudXR0ZXJhbmNlcy5zcGxpY2UoIGksIDEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5tYXliZUludFx0XHRcdFx0XHRcdD1cdGZ1bmN0aW9uKCB2YWx1ZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciByZXRcdD1cdHZhbHVlICogMTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIGlzTmFOKCByZXQpKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCAnc2VydmljZS5ibG9ja3MnLCBfc2V0dXBCbG9ja0lkcywgdHJ1ZSk7XG5cblx0XHRcdFx0JHNjb3BlLiR3YXRjaCggJ2NvbXBvbmVudC5wcm9wZXJ0aWVzLl9jb21wb25lbnRfaWQnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLmhlbHAgPSBudWxsO1xuXHRcdFx0XHRcdCRzY29wZS50YWJJbmRleCA9IHsgYWN0aXZlOiBcImJcIiB9O1xuXHRcdFx0XHRcdF9nZXRDb21wb25lbnRIZWxwKCRzY29wZS5jb21wb25lbnQuY2xhc3MpO1xuXHRcdFx0XHR9LCB0cnVlKTtcblxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCAnY29tcG9uZW50JywgZnVuY3Rpb24gKG5ld1ZhbCkge1xuXHRcdFx0XHRcdGlmICggIW5ld1ZhbCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzKSB7XG5cdFx0XHRcdFx0XHQkbG9nLndhcm4oICdwcm9wZXJ0aWVzRWRpdG9yIGJsb2NrIHF1aWNrZml4Jyk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdF9zZXR1cFBhcmFtQnVmZmVyKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gVE9ETzogdGhpcyBzaG91bGQgYmUgaGFuZGxlZCBpbiBwcm9wZXJ0eSBlZGl0b3JzIHRoZW1zZWxmXG5cdFx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKCAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcywgZnVuY3Rpb24oIGRlZmluaXRpb24sIGtleSkge1xuXHRcdFx0XHRcdFx0Ly8gJGxvZy5sb2coICdwcm9wZXJ0aWVzRWRpdG9yICR3YXRjaC5jb21wb25lbnQgZWFjaCAlbyBkZWZpbml0aW9uICVvJywga2V5LCBkZWZpbml0aW9uKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKCBkZWZpbml0aW9uLmVkaXRvcl90eXBlID09ICdzZXJ2aWNlX2NvbXBvbmVudHMnKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKCBrZXkuaW5kZXhPZiggJ18nKSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmICggISRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKCBrZXkgPT09ICdva19zcGVjaWZpYycgfHwga2V5ID09PSAnbm9rX3NwZWNpZmljJykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHN3aXRjaCAoIGRlZmluaXRpb24udmFsdWVUeXBlKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjYXNlICdzdHJpbmcnOlxuXHRcdFx0XHRcdFx0XHRcdGlmICggISFkZWZpbml0aW9uLmVkaXRvcl9wcm9wZXJ0aWVzLm11bHRpcGxlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSAgICA9ICAgX2FzQXJyYXkoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldLCAnc3RyaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldXHQ9XHRcIlwiICsgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgJ2Jvb2xlYW4nOlxuXHRcdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldXHQ9XHRfY2FzdFRvQm9vbCggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0pO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlICdhcnJheSc6XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gICAgPSAgIF9hc0FycmF5KCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSwgJ290aGVyJyk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgJ2ludCc6XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhIWRlZmluaXRpb24uZWRpdG9yX3Byb3BlcnRpZXMubXVsdGlwbGUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldICAgID0gICBfYXNBcnJheSggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0sICdudW1iZXInKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1cdD1cdHBhcnNlSW50KCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSwgMTApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAnb2JqZWN0Jzpcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdVbmtub3duIHZhbHVlIHR5cGUgWycgKyBcblx0XHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS52YWx1ZVR5cGUgKyAnXSBmb3IgWycra2V5KyddIGFuZCB2YWx1ZSBbJysgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gKyddJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sIHRydWUpO1xuXG5cdFx0XHRcdGZ1bmN0aW9uIF9zZXR1cEJsb2NrSWRzKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRzY29wZS5wcm9jZXNzU3Vicm91dGluZXNcdD1cdCRzY29wZS5zZXJ2aWNlLmZyYWdtZW50cy5maWx0ZXIoIGZ1bmN0aW9uKCBmcmFnbWVudCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZyYWdtZW50LmNsYXNzID09PSAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50Jztcblx0XHRcdFx0XHR9KS5tYXAoIGZ1bmN0aW9uKCBmcmFnbWVudCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgaWQgOiBmcmFnbWVudC5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkLCBuYW1lIDogX2ZpeE5hbWUoIGZyYWdtZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQsIGZyYWdtZW50LnByb3BlcnRpZXMubmFtZSl9O1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0JHNjb3BlLnJlYWRTdWJyb3V0aW5lc1x0PVx0JHNjb3BlLnNlcnZpY2UuZnJhZ21lbnRzLmZpbHRlciggZnVuY3Rpb24oIGZyYWdtZW50KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZnJhZ21lbnQuY2xhc3MgPT09ICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXEVsZW1lbnRzXFxcXEVsZW1lbnRzRnJhZ21lbnQnO1xuXHRcdFx0XHRcdH0pLm1hcCggZnVuY3Rpb24oIGZyYWdtZW50KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4geyBpZCA6IGZyYWdtZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQsIG5hbWUgOiBfZml4TmFtZSggZnJhZ21lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCwgZnJhZ21lbnQucHJvcGVydGllcy5uYW1lKX07XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQkc2NvcGUudXNlckJsb2Nrc1x0PVx0JHNjb3BlLnNlcnZpY2UuYmxvY2tzLmZpbHRlciggZnVuY3Rpb24oIGJsb2NrKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYmxvY2sucHJvcGVydGllcy5ibG9ja19pZC5pbmRleE9mKCdfXycpICE9PSAwO1xuXHRcdFx0XHRcdH0pLm1hcCggZnVuY3Rpb24oIGJsb2NrKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4geyBpZCA6IGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQsIG5hbWUgOiBfZml4TmFtZSggYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCwgYmxvY2sucHJvcGVydGllcy5uYW1lKX07XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9maXhOYW1lKCBpZCwgbmFtZSkge1xuXHRcdFx0XHRcdGlmICggbmFtZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiAnSUQ6ICcgKyBpZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9zZXR1cFBhcmFtQnVmZmVyKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggd2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKCB3YXRjaGVycywgZnVuY3Rpb24oIHdhdGNoZXIpIHsgd2F0Y2hlcigpOyB9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3YXRjaGVycyAgICA9ICAgW107XG5cblx0XHRcdFx0XHQkc2NvcGUucGFyYW1CdWZmZXJcdD1cdHt9O1xuXG5cdFx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgIT09ICdwYXJhbXMnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGEgcXVpY2tmaXgsIG5lZWRzIHRvIGJlIGhhbmRsZWQgcHJvcGVybHkuXG5cdFx0XHRcdFx0XHRpZiAoICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0udmFsdWVUeXBlICE9PSAnYXJyYXknKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgaWQgID0gICBfa2V5VG9JZGVudGlmaWVyKCBrZXkpO1xuXG5cdFx0XHRcdFx0XHQkc2NvcGUucGFyYW1CdWZmZXJbaWRdID0gICBbXTtcblxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIHByb3AgaW4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0pXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5wYXJhbUJ1ZmZlcltpZF0ucHVzaCgge1xuXHRcdFx0XHRcdFx0XHRcdCdrZXknOiBwcm9wLFxuXHRcdFx0XHRcdFx0XHRcdCd2YWx1ZSc6ICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldW3Byb3BdXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCRzY29wZS5rZXlUb0lkZW50aWZpZXIgID0gICBfa2V5VG9JZGVudGlmaWVyO1xuXHRcdFx0XHRcdCRzY29wZS5pZGVudGlmaWVyVG9LZXkgID0gICBfaWRlbnRpZmllclRvS2V5O1xuXG5cdFx0XHRcdFx0JHNjb3BlLnJlbW92ZVBhcmFtUGFpclx0PVx0ZnVuY3Rpb24oIGlkLCBpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdCRzY29wZS5wYXJhbUJ1ZmZlcltpZF0uc3BsaWNlKCBpLCAxKTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0JHNjb3BlLmFkZFBhcmFtUGFpclx0XHQ9XHRmdW5jdGlvbiggaWQpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIG5ld19pZHhcdD1cdCRzY29wZS5wYXJhbUJ1ZmZlcltpZF0ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0XHQkc2NvcGUucGFyYW1CdWZmZXJbaWRdLnB1c2goIHtcblx0XHRcdFx0XHRcdFx0J2tleSc6ICduZXdfdmFsdWVfJyArIG5ld19pZHgsXG5cdFx0XHRcdFx0XHRcdCd2YWx1ZSc6ICd0ZW1wX3ZhbHVlJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dmFyIGkgICA9ICAgLTE7XG5cblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIHJlYWxseSBzdWJvcHRpbWFsLCBidXQgaXQgd29ya3MuIEZpeCBsYXRlci5cblx0XHRcdFx0XHRmb3IgKCB2YXIga2V5IGluICRzY29wZS5wYXJhbUJ1ZmZlcilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR3YXRjaGVyc1srK2ldICAgPSAgICRzY29wZS4kd2F0Y2goICdwYXJhbUJ1ZmZlci4nK2tleSwgZnVuY3Rpb24gKCBuZXdWYWwpIHtcblx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIGlkIGluICRzY29wZS5wYXJhbUJ1ZmZlcilcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcm9wX25hbWUgICA9ICAgX2lkZW50aWZpZXJUb0tleSggaWQpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBuZXdfcHJvcHMgICA9ICAge307XG5cblx0XHRcdFx0XHRcdFx0XHRmb3IgKCB2YXIgaSBpbiAkc2NvcGUucGFyYW1CdWZmZXJbaWRdKVxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBwYWlyICAgID0gICAkc2NvcGUucGFyYW1CdWZmZXJbaWRdW2ldO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgbmV3X2tleSA9ICAgX2NsZWFuS2V5KCBwYWlyLmtleSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdG5ld19wcm9wc1tuZXdfa2V5XSA9ICAgcGFpci52YWx1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbcHJvcF9uYW1lXSAgPSAgIG5ld19wcm9wcztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSwgdHJ1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gVVRJTFxuXHRcdFx0XHRmdW5jdGlvbiBfY2xlYW5LZXkoIGtleSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICgga2V5ID09PSAnJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0ZW1wJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyB2YXIgY2xlYW5lZFx0PVx0a2V5LnRvTG93ZXJDYXNlKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4ga2V5LnJlcGxhY2UoIC9cXHMrXFwuL2csICdfJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfaXNTeXN0ZW0oIGJsb2NrSWQpIHtcblx0XHRcdFx0XHRyZXR1cm4gYmxvY2tJZC5pbmRleE9mKCAnX18nKSA+PSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2lzUmVhZCggYmxvY2tJZCkge1xuXHRcdFx0XHRcdHJldHVybiBibG9ja0lkLmluZGV4T2YoICdfcmVhZF8nKSA+PSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2Nhc3RUb0Jvb2woIHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKCB2YWx1ZSA9PT0gJ2ZhbHNlJylcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFx0XHRcdGlmICggdmFsdWUgPT09ICd0cnVlJylcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHRcdFx0cmV0dXJuICEhdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfYXNBcnJheSggdmFsdWUsIHByZXZUeXBlKSB7XG5cdFx0XHRcdFx0JGxvZy5sb2coICdwcm9wZXJ0aWVzRWRpdG9yIF9hc0FycmF5IHZhbHVlJywgdmFsdWUsICdwcmV2VHlwZScsIHByZXZUeXBlKTtcblxuXHRcdFx0XHRcdGlmICggIXByZXZUeXBlKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdFeHBlY3RlZCBhIHR5cGUgdG8gd29yayB3aXRoLCBnb3QgJyArIHByZXZUeXBlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICF2YWx1ZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFtdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggQXJyYXkuaXNBcnJheSggdmFsdWUpKSB7IC8vIEFscmVhZHkgYW4gYXJyYXksIGNhc3QgdmFsdWVzIGp1c3QgdG8gYmUgc3VyZVxuXHRcdFx0XHRcdFx0c3dpdGNoICggcHJldlR5cGUpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNhc2UgJ290aGVyJzpcblx0XHRcdFx0XHRcdFx0Y2FzZSAnc3RyaW5nJzpcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWVcblx0XHRcdFx0XHRcdFx0XHRcdC5tYXAoIGZ1bmN0aW9uKCB2YWwpIHsgcmV0dXJuIHZhbC5zcGxpdCggJywnKS5tYXAoIGZ1bmN0aW9uKCBwaWVjZSkgeyByZXR1cm4gKFwiXCIgKyBwaWVjZSkudHJpbSgpOyB9KTsgfSlcblx0XHRcdFx0XHRcdFx0XHRcdC5yZWR1Y2UoIGZ1bmN0aW9uKCBhLCBiKSB7IHJldHVybiBhLmNvbmNhdCggYik7IH0sIFtdKTtcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCAnVW5zdXBwb3J0ZWQgdHlwZSBbJyArIHByZXZUeXBlICsgJ10nKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzd2l0Y2ggKCBwcmV2VHlwZSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjYXNlICdzdHJpbmcnOlxuXHRcdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNFZGl0b3IgX2FzQXJyYXkgcHJldlR5cGUgaXMgc3RyaW5nJyk7XG5cdFx0XHRcdFx0XHRcdHZhciBzcGxpdEFycmF5ICA9ICAgdmFsdWUuc3BsaXQoICcsJykubWFwKCBmdW5jdGlvbiggcykgeyByZXR1cm4gKFwiXCIgKyBzKS50cmltKCk7IH0pO1xuXG5cdFx0XHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0VkaXRvciBfYXNBcnJheSByZXR1cm5pbmcnLCBzcGxpdEFycmF5KTtcblxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gc3BsaXRBcnJheTtcblx0XHRcdFx0XHRcdGNhc2UgJ251bWJlcic6XG5cdFx0XHRcdFx0XHRcdHZhciBudW1iZXJzICAgICA9ICAgdmFsdWUuc3BsaXQoIC9cXHMsL2cpLm1hcCggZnVuY3Rpb24oIG4pIHsgcmV0dXJuIHBhcnNlSW50KCBuLCAxMCkgfSk7XG5cblx0XHRcdFx0XHRcdFx0JGxvZy5sb2coICdwcm9wZXJ0aWVzRWRpdG9yIF9hc0FycmF5IHJldHVybmluZycsIG51bWJlcnMpO1xuXG5cdFx0XHRcdFx0XHRcdHJldHVybiBudW1iZXJzO1xuXHRcdFx0XHRcdFx0Y2FzZSAnb3RoZXInOiAvLyBUT0RPOiB0ZW1wb3Jhcnlcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnVW5zdXBwb3J0ZWQgdHlwZSBbJyArIHByZXZUeXBlICsgJ10nKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyByZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfZ2V0Q29tcG9uZW50SGVscChjb21wb25lbnRDbGFzcykge1xuXHRcdFx0XHRcdENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbihjb21wb25lbnRDbGFzcykudGhlbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuXHRcdFx0XHRcdFx0aWYgKCRzY29wZS5oZWxwID09PSBudWxsICYmIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX2hlbHApIHtcblx0XHRcdFx0XHRcdFx0aWYgKGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX2hlbHAudHlwZSA9PT0gJ2ZpbGUnKSB7XG5cdFx0XHRcdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5nZXRQYWNrYWdlQ29tcG9uZW50SGVscCgkc2NvcGUuY29tcG9uZW50Lm5hbWVzcGFjZSwgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faGVscC5maWxlbmFtZSkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmhlbHAgPSBkYXRhO1xuXHRcdFx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdFx0XHRcdFx0XHRcdCRsb2cuZGVidWcoJ3Byb3BlcnRpZXNFZGl0b3IgZ2V0Q29tcG9uZW50SGVscCgpIHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faGVscC50eXBlID09PSAnaHRtbCcpIHtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuaGVscCA9IGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX2hlbHAudGVtcGxhdGU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cuZXJyb3IoJ2NvbXBvbmVudCBnb3QgcmVhc29uJywgcmVhc29uKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHQvLyBQQVJBTVMgVVRJTFxuXHRcdFx0XHRmdW5jdGlvbiBfa2V5VG9JZGVudGlmaWVyKCBrZXkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gJyQkXycra2V5KydfcGJ1ZmZlcic7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfaWRlbnRpZmllclRvS2V5KCBpZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciByZWdleCAgID0gICAvXFwkXFwkXyhcXHcrKV9wYnVmZmVyL2c7XG5cblx0XHRcdFx0XHR2YXIgbWF0Y2hlcyA9ICAgcmVnZXguZXhlYyggaWQpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoZXNbMV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmRpcmVjdGl2ZSggJ3Byb3BlcnRpZXNDb250ZXh0JywgcHJvcGVydGllc0NvbnRleHQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBwcm9wZXJ0aWVzQ29udGV4dCggJGxvZywgJHJvb3RTY29wZSwgQ29udm93b3Jrc0FwaSwgQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZSwgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSwgTG9naW5TZXJ2aWNlLCBBbGVydFNlcnZpY2UpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRcdHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuLy9cdFx0XHRzY29wZToge1xuLy9cdFx0XHRcdHNlcnZpY2VJZCA6ICc9J1xuLy9cdFx0XHR9LFxuXHRcdFx0c2NvcGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiggJHNjb3BlKSB7XG5cblx0XHRcdFx0Ly8gUFVCTElDIEFQSVxuXHRcdFx0XHR0aGlzLmdldENvbXBvbmVudERlZmluaXRpb25zXHQ9XHRnZXRDb21wb25lbnREZWZpbml0aW9ucztcblx0XHRcdFx0dGhpcy5nZXRDb21wb25lbnREZWZpbml0aW9uXHRcdD1cdGdldENvbXBvbmVudERlZmluaXRpb247XG5cdFx0XHRcdHRoaXMuaXNMb2FkZWRcdFx0XHRcdFx0PVx0aXNMb2FkZWQ7XG5cdFx0XHRcdHRoaXMuZ2V0Q29udm9JbnRlbnRzXHRcdFx0PVx0Z2V0Q29udm9JbnRlbnRzO1xuXHRcdFx0XHRcblx0XHRcdFx0dGhpcy5zZXRTZWxlY3RlZENvbXBvbmVudFx0XHQ9XHRzZXRTZWxlY3RlZENvbXBvbmVudDtcblx0XHRcdFx0dGhpcy5nZXRTZWxlY3Rpb25cdFx0XHRcdD1cdGdldFNlbGVjdGlvbjtcblx0XHRcdFx0dGhpcy5nZXRTZWxlY3RlZFNlcnZpY2VcdFx0XHQ9XHRnZXRTZWxlY3RlZFNlcnZpY2U7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLmlzU2VydmljZUNoYW5nZWRcdFx0XHQ9XHRpc1NlcnZpY2VDaGFuZ2VkO1xuXHRcdFx0XHR0aGlzLnJldmVydENoYW5nZXNcdFx0XHRcdD1cdHJldmVydENoYW5nZXM7XG5cdFx0XHRcdHRoaXMuc2F2ZUNoYW5nZXNcdFx0XHRcdD1cdHNhdmVDaGFuZ2VzO1xuXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdHRoaXMuZmluZEJsb2NrXHQgXHRcdFx0XHQ9XHRmaW5kQmxvY2s7XG5cdFx0XHRcdHRoaXMuZmluZFN1YnJvdXRpbmVcdFx0XHRcdD1cdGZpbmRTdWJyb3V0aW5lO1xuXHRcdFx0XHRcblx0XHRcdFx0dGhpcy5hZGRCbG9ja1x0IFx0XHRcdFx0PVx0YWRkQmxvY2s7XG5cdFx0XHRcdHRoaXMuYWRkUHJvY2Vzc1N1YnJvdXRpbmVcdFx0PVx0YWRkUHJvY2Vzc1N1YnJvdXRpbmU7XG5cdFx0XHRcdHRoaXMuYWRkUmVhZFN1YnJvdXRpbmVcdFx0XHQ9XHRhZGRSZWFkU3Vicm91dGluZTtcblx0XHRcdFx0dGhpcy5yZW1vdmVCbG9ja1x0XHRcdFx0PVx0cmVtb3ZlQmxvY2s7XG5cdFx0XHRcdHRoaXMucmVtb3ZlU3Vicm91dGluZVx0XHRcdD1cdHJlbW92ZVN1YnJvdXRpbmU7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLnJlbW92ZUNvbXBvbmVudFx0XHRcdD1cdHJlbW92ZUNvbXBvbmVudDtcblx0XHRcdFx0XG5cdFx0XHRcdHRoaXMuYWRkTmV3Q29tcG9uZW50XHRcdFx0PVx0YWRkTmV3Q29tcG9uZW50O1xuXHRcdFx0XHR0aGlzLm1vdmVDb21wb25lbnRcdFx0XHRcdD1cdG1vdmVDb21wb25lbnQ7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLnJlbG9hZFNlcnZpY2VcdFx0XHRcdD1cdHJlbG9hZFNlcnZpY2U7XG5cdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gREVGSU5JVElPTlxuXHRcdFx0XHRpZiAoICEkc2NvcGUuc2VydmljZUlkKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTm8gc2VydmljZUlkIGluIHNjb3BlJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHZhciBzZXJ2aWNlX2lkXHRcdFx0PVx0JHNjb3BlLnNlcnZpY2VJZDtcblx0XHRcdFx0dmFyIHJlYWR5XHRcdFx0XHQ9XHQgZmFsc2U7XG5cdFx0XHRcdHZhciBkZWZpbml0aW9uc1x0XHRcdD1cdCBbXTtcblx0XHRcdFx0dmFyIG9yaWdpbmFsX3NlcnZpY2VcdD1cdCBudWxsO1xuXHRcdFx0XHR2YXIgc2VsZWN0aW9uXHRcdFx0PVx0e1xuXHRcdFx0XHRcdFx0Y29tcG9uZW50IDogbnVsbCxcblx0XHRcdFx0XHRcdGRlZmluaXRpb24gOiBudWxsLFxuXHRcdFx0XHRcdFx0c2VydmljZSA6IG51bGwsXG5cdFx0XHRcdFx0XHRjb250YWluZXJDb250cm9sbGVyIDogbnVsbFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdF9pbml0KCk7XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2luaXQoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9ucygpLnRoZW4oIGZ1bmN0aW9uKCBkZWZzKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgZGVmaW5pdGlvbnMgcHJlLWxvYWRlZC4gTm93IHdpbGwgc3RhcnQuJyk7XG5cdFx0XHRcdFx0XHRkZWZpbml0aW9uc1x0XHQ9XHRkZWZzO1xuXG5cdFx0XHRcdFx0XHRDb252b3dvcmtzQXBpLmdldFNlcnZpY2VCeUlkKCBzZXJ2aWNlX2lkKS50aGVuKCBmdW5jdGlvbiggc2VydmljZSkge1xuXHRcdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgZ290IHNlcnZpY2UnLCBzZXJ2aWNlKTtcblx0XHRcdFx0XHRcdFx0c2VsZWN0aW9uLnNlcnZpY2VcdD1cdHNlcnZpY2U7XG5cdFx0XHRcdFx0XHRcdG9yaWdpbmFsX3NlcnZpY2VcdD1cdGFuZ3VsYXIuY29weSggc2VsZWN0aW9uLnNlcnZpY2UpO1xuXHRcdFx0XHRcdFx0XHRyZWFkeVx0XHRcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcblx0XHRcdFx0XHRcdFx0JGxvZy5lcnJvciggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2VydmljZSBnb3QgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHRcdFx0JGxvZy5lcnJvciggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgZGVmaW5pdGlvbnMgZ290IHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHRoaXMuaGFzQ2xpcGJvYXJkXHRcdD1cdGhhc0NsaXBib2FyZDtcblx0XHRcdFx0dGhpcy5jdXRcdFx0PVx0Y3V0O1xuXHRcdFx0XHR0aGlzLmNvcHlcdFx0PVx0Y29weTtcblx0XHRcdFx0dGhpcy5wYXN0ZVx0XHQ9XHRwYXN0ZTtcblx0XHRcdFx0dGhpcy5pc0N1dFx0XHQ9XHRpc0N1dDtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBjbGlwYm9hcmRcdD1cdG51bGw7XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBoYXNDbGlwYm9hcmQoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuICEhY2xpcGJvYXJkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBjdXQoIGNvbnRhaW5lciwgY29tcG9uZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y2xpcGJvYXJkXHQ9XHR7XG5cdFx0XHRcdFx0XHRcdGlzX2N1dCA6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNvbXBvbmVudCA6IGNvbXBvbmVudCxcblx0XHRcdFx0XHRcdFx0Y29udGFpbmVyIDogY29udGFpbmVyLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIGNvcHkoIGNvbXBvbmVudClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNsaXBib2FyZFx0PVx0e1xuXHRcdFx0XHRcdFx0XHRpc19jdXQgOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0Y29tcG9uZW50IDogY29tcG9uZW50LFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIHBhc3RlKCBjb250YWluZXJDb250cm9sbGVyLCBpbmRleClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggIWNsaXBib2FyZCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIGNsaXBib2FyZC5pc19jdXQpIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgcGFzdGUgY3V0Jyk7XG5cdFx0XHRcdFx0XHQvLyBmdW5jdGlvbiBtb3ZlQ29tcG9uZW50KCBvbGRDb250YWluZXJDb250cm9sbGVyLCBjb250YWluZXJDb250cm9sbGVyLCBjb21wb25lbnQsIGluZGV4KVxuXHRcdFx0XHRcdFx0bW92ZUNvbXBvbmVudCggY2xpcGJvYXJkLmNvbnRhaW5lciwgY29udGFpbmVyQ29udHJvbGxlciwgY2xpcGJvYXJkLmNvbXBvbmVudCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkLmlzX2N1dCAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmQuY29udGFpbmVyID0gICBudWxsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IHBhc3RlIGNvcHknKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Y29udGFpbmVyQ29udHJvbGxlci5hZGRDb21wb25lbnQoIFxuXHRcdFx0XHRcdFx0XHRcdENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UuY29weUNvbXBvbmVudCggZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIGNsaXBib2FyZC5jb21wb25lbnQpLCBcblx0XHRcdFx0XHRcdFx0XHRpbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBpc0N1dCggY29tcG9uZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuIGNsaXBib2FyZCAmJiBjbGlwYm9hcmQuaXNfY3V0ICYmIGNsaXBib2FyZC5jb21wb25lbnQgPT09IGNvbXBvbmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0Q29udm9JbnRlbnRzKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBpbnRlbnRzXHQ9XHRbXTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBTRVJWSUNFXG5cdFx0XHRcdFx0Zm9yICggdmFyIGk9MDsgaSA8IHNlbGVjdGlvbi5zZXJ2aWNlLmludGVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGludGVudHMucHVzaCggc2VsZWN0aW9uLnNlcnZpY2UuaW50ZW50c1tpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFNZU1RFTVxuXHRcdFx0XHRcdGZvciAoIHZhciBpPTA7IGk8ZGVmaW5pdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBwY2tnXHQ9XHRkZWZpbml0aW9uc1tpXTtcblx0XHRcdFx0XHRcdGlmICggIXBja2cuaW50ZW50cykge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGZvciAoIHZhciBqPTA7IGo8cGNrZy5pbnRlbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0XHRcdGludGVudHMucHVzaCggcGNrZy5pbnRlbnRzW2pdKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cmV0dXJuIGludGVudHM7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBnZXRDb21wb25lbnREZWZpbml0aW9ucygpIHtcblx0XHRcdFx0XHRyZXR1cm4gZGVmaW5pdGlvbnM7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIGdldENvbXBvbmVudERlZmluaXRpb24oIGNsYXNzTmFtZSkge1xuXHRcdFx0XHRcdGZvciAoIHZhciBpPTA7IGk8ZGVmaW5pdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBwY2tnXHQ9XHRkZWZpbml0aW9uc1tpXTtcblx0XHRcdFx0XHRcdGZvciAoIHZhciBqPTA7IGo8cGNrZy5jb21wb25lbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBjb21wID0gcGNrZy5jb21wb25lbnRzW2pdO1xuXHRcdFx0XHRcdFx0XHRpZiAoIGNvbXBbJ3R5cGUnXSA9PT0gY2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbXA7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnRGVmaW5pdGlvbiBbJytjbGFzc05hbWUrJ10gbm90IGZvdW5kJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIGlzTG9hZGVkKCkge1xuXHRcdFx0XHRcdHJldHVybiByZWFkeTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gU0VMRUNUSU9OXG5cdFx0XHRcdGZ1bmN0aW9uIHNldFNlbGVjdGVkQ29tcG9uZW50KCBjb21wb25lbnQsIGNvbnRhaW5lckNvbnRyb2xsZXIpIHtcblx0XHRcdFx0XHRpZiAoICFjb21wb25lbnQpIHtcblx0XHRcdFx0XHRcdHNlbGVjdGlvbi5jb21wb25lbnRcdCAgICA9XHRudWxsO1xuXHRcdFx0XHRcdFx0c2VsZWN0aW9uLmRlZmluaXRpb25cdD1cdG51bGw7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAhY29udGFpbmVyQ29udHJvbGxlcikge1xuXHRcdFx0XHRcdFx0c2VsZWN0aW9uLmNvbnRhaW5lckNvbnRyb2xsZXIgICA9ICAgbnVsbDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZWxlY3Rpb24uY29udGFpbmVyQ29udHJvbGxlciAgID0gICBjb250YWluZXJDb250cm9sbGVyO1xuXHRcdFx0XHRcdHNlbGVjdGlvbi5kZWZpbml0aW9uXHQgICAgICAgID1cdGdldENvbXBvbmVudERlZmluaXRpb24oIGNvbXBvbmVudFsnY2xhc3MnXSk7XG5cdFx0XHRcdFx0c2VsZWN0aW9uLmNvbXBvbmVudFx0XHQgICAgICAgID1cdGNvbXBvbmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzZWxlY3Rpb247XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFNFUlZJQ0Vcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkge1xuXHRcdFx0XHRcdGlmICggIXNlbGVjdGlvbi5zZXJ2aWNlKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdObyBzZWxlY3RlZCBzZXJ2aWNlJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBzZWxlY3Rpb24uc2VydmljZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gaXNTZXJ2aWNlQ2hhbmdlZCgpIHtcblx0XHRcdFx0XHRyZXR1cm4gIWFuZ3VsYXIuZXF1YWxzKCBvcmlnaW5hbF9zZXJ2aWNlLCBzZWxlY3Rpb24uc2VydmljZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIHJldmVydENoYW5nZXMoKSB7XG5cdFx0XHRcdFx0YW5ndWxhci5jb3B5KCBvcmlnaW5hbF9zZXJ2aWNlLCBzZWxlY3Rpb24uc2VydmljZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIHNhdmVDaGFuZ2VzKCkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgY29udHJvbGxlciBzYXZlQ2hhbmdlcygpJyk7XG5cblx0XHRcdFx0XHRDb252b3dvcmtzQXBpLnVwZGF0ZVNlcnZpY2UoIHNlcnZpY2VfaWQsIHNlbGVjdGlvbi5zZXJ2aWNlKS50aGVuKCBmdW5jdGlvbiggcmVzKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2F2ZUNoYW5nZXMoKSBkb25lJyk7XG5cbi8vXHRcdFx0XHRcdFx0c2VsZWN0aW9uLnNlcnZpY2VcdD1cdHJlcy5kYXRhO1xuLy9cdFx0XHRcdFx0XHRhbmd1bGFyLmNvcHkoIHJlcy5kYXRhLCBzZWxlY3Rpb24uc2VydmljZSk7XG5cdFx0XHRcdFx0XHRhbmd1bGFyLm1lcmdlKCBzZWxlY3Rpb24uc2VydmljZSwgcmVzLmRhdGEpO1xuXHRcdFx0XHRcdFx0b3JpZ2luYWxfc2VydmljZVx0PVx0YW5ndWxhci5jb3B5KCBzZWxlY3Rpb24uc2VydmljZSk7XG5cdFx0XHRcdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VXb3JrZmxvd1VwZGF0ZWQnLCBzZWxlY3Rpb24uc2VydmljZSk7XG5cdFx0XHRcdFx0XHRBbGVydFNlcnZpY2UuYWRkU3VjZXNzKCAnU2VydmljZSB3b3JrZmxvdyBzYXZlZCcpO1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgY29udHJvbGxlciBzYXZlQ2hhbmdlcygpIHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IocmVhc29uLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQkxPQ0tTXG5cdFx0XHRcdGZ1bmN0aW9uIGFkZEJsb2NrKCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UuY3JlYXRlQmxvY2soIGdldFNlbGVjdGVkU2VydmljZSgpLCBuYW1lKS50aGVuKCBmdW5jdGlvbiAoIGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRTZWxlY3RlZFNlcnZpY2UoKS5ibG9ja3MucHVzaCggYmxvY2spO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gYWRkUmVhZFN1YnJvdXRpbmUoIG5hbWUpIFxuXHRcdFx0XHR7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UuY3JlYXRlUmVhZFN1YnJvdXRpbmUoIGdldFNlbGVjdGVkU2VydmljZSgpLCBuYW1lKS50aGVuKCBmdW5jdGlvbiAoIGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRTZWxlY3RlZFNlcnZpY2UoKS5mcmFnbWVudHMucHVzaCggYmxvY2spO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBhZGRQcm9jZXNzU3Vicm91dGluZSggbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlLmNyZWF0ZVByb2Nlc3NTdWJyb3V0aW5lKCBnZXRTZWxlY3RlZFNlcnZpY2UoKSwgbmFtZSkudGhlbiggZnVuY3Rpb24gKCBibG9jaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkuZnJhZ21lbnRzLnB1c2goIGJsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUJsb2NrKCBibG9ja0lkKSB7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yICggdmFyIGk9MDsgaTxzZWxlY3Rpb24uc2VydmljZS5ibG9ja3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBibG9ja1x0PVx0c2VsZWN0aW9uLnNlcnZpY2UuYmxvY2tzW2ldO1xuXHRcdFx0XHRcdFx0aWYgKCBibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkID09IGJsb2NrSWQpIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0aW9uLnNlcnZpY2UuYmxvY2tzLnNwbGljZSggaSwgMSk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ0NvdWxkIG5vdCBmaW5kIGJsb2NrIFsnK2Jsb2NrSWQrJ10nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZVN1YnJvdXRpbmUoIGZyYWdtZW50SWQpIHtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKCB2YXIgaT0wOyBpPHNlbGVjdGlvbi5zZXJ2aWNlLmZyYWdtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0dmFyIGZyYWdtZW50XHQ9XHRzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHNbaV07XG5cdFx0XHRcdFx0XHRpZiAoIGZyYWdtZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQgPT0gZnJhZ21lbnRJZCkge1xuXHRcdFx0XHRcdFx0XHRzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHMuc3BsaWNlKCBpLCAxKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnQ291bGQgbm90IGZpbmQgZnJhZ21lbnQgWycrZnJhZ21lbnRJZCsnXScpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlQ29tcG9uZW50KClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggIXNlbGVjdGlvbi5jb250YWluZXJDb250cm9sbGVyKSB7XG5cdFx0XHRcdFx0XHQkbG9nLndhcm4oICdwcm9wZXJ0aWVzQ29udGV4dCBkaXJlY3RpdmUgcmVtb3ZlQ29tcG9uZW50KCkgbm8gY29udGFpbmVyQ29udHJvbGxlcicpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZWxlY3Rpb24uY29udGFpbmVyQ29udHJvbGxlci5yZW1vdmVTZWxlY3Rpb24oIHNlbGVjdGlvbi5jb21wb25lbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBmaW5kQmxvY2soIGJsb2NrSWQpIHtcblx0XHRcdFx0XHRmb3IgKCB2YXIgaT0wOyBpPHNlbGVjdGlvbi5zZXJ2aWNlLmJsb2Nrcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0dmFyIGJsb2NrXHQ9XHRzZWxlY3Rpb24uc2VydmljZS5ibG9ja3NbaV07XG5cdFx0XHRcdFx0XHRpZiAoIGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgPT0gYmxvY2tJZCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gYmxvY2s7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ0Jsb2NrIFsnK2Jsb2NrSWQrJ10gbm90IGZvdW5kJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIGZpbmRTdWJyb3V0aW5lKCBmcmFnbWVudElkKSB7XG5cdFx0XHRcdFx0Zm9yICggdmFyIGk9MDsgaTxzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBmcmFnbWVudFx0PVx0c2VsZWN0aW9uLnNlcnZpY2UuZnJhZ21lbnRzW2ldO1xuXHRcdFx0XHRcdFx0aWYgKCBmcmFnbWVudC5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkID09IGZyYWdtZW50SWQpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZyYWdtZW50O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdGcmFnbWVudCBbJytmcmFnbWVudElkKyddIG5vdCBmb3VuZCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gT1RIRVIgQ09NUE9ORU5UU1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGFkZE5ld0NvbXBvbmVudCggY29udGFpbmVyQ29udHJvbGxlciwgY29tcG9uZW50RGVmaW5pdGlvbiwgaW5kZXgpIFxuICAgICAgICAgICAgICAgIHtcblx0XHRcdFx0XHRpZiAoICFpbmRleCkge1xuXHRcdFx0XHRcdFx0aW5kZXhcdD1cdDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBjb21wb25lbnRcdD1cdENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UuY3JlYXRlQ29tcG9uZW50KCBnZXRTZWxlY3RlZFNlcnZpY2UoKSwgY29tcG9uZW50RGVmaW5pdGlvbik7XG5cdFx0XHRcdFx0Y29udGFpbmVyQ29udHJvbGxlci5hZGRDb21wb25lbnQoIGNvbXBvbmVudCwgaW5kZXgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gbW92ZUNvbXBvbmVudCggb2xkQ29udGFpbmVyQ29udHJvbGxlciwgY29udGFpbmVyQ29udHJvbGxlciwgY29tcG9uZW50LCBpbmRleCkge1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICggIWluZGV4KSB7XG5cdFx0XHRcdFx0XHRpbmRleFx0PVx0MDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0b2xkQ29udGFpbmVyQ29udHJvbGxlci5yZW1vdmVDb21wb25lbnQoIGNvbXBvbmVudCk7XG5cdFx0XHRcdFx0Y29udGFpbmVyQ29udHJvbGxlci5hZGRDb21wb25lbnQoIGNvbXBvbmVudCwgaW5kZXgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gcmVsb2FkU2VydmljZSgpIHtcblx0XHRcdFx0XHRDb252b3dvcmtzQXBpLmdldFNlcnZpY2VCeUlkKCBzZXJ2aWNlX2lkKS50aGVuKCBmdW5jdGlvbiggc2VydmljZSkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdwcm9wZXJ0aWVzQ29udGV4dCBjb250cm9sbGVyIGdvdCBzZXJ2aWNlJywgc2VydmljZSk7XG5cdFx0XHRcdFx0XHRzZWxlY3Rpb24uc2VydmljZVx0PVx0c2VydmljZTtcblx0XHRcdFx0XHRcdG9yaWdpbmFsX3NlcnZpY2VcdD1cdGFuZ3VsYXIuY29weSggc2VsZWN0aW9uLnNlcnZpY2UpO1xuXHRcdFx0XHRcdFx0cmVhZHlcdFx0XHRcdD1cdHRydWU7XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHRcdFx0JGxvZy5lcnJvciggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2VydmljZSBnb3QgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fTtcblxuXHRcdFx0fSxcblx0XHRcdGxpbmsgOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG5cdFx0XHRcdFxuXHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGxpbmsnKTtcblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0KClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgX2luaXQoKSBzZXJ2aWNlJywgcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBfZGVzdHJveSgpXG5cdFx0XHRcdHtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5pc1NlcnZpY2VDaGFuZ2VkXHRcdD1cdHByb3BlcnRpZXNDb250ZXh0LmlzU2VydmljZUNoYW5nZWQ7XG5cdFx0XHRcdCRzY29wZS5zYXZlQ2hhbmdlc1x0XHRcdD1cdHByb3BlcnRpZXNDb250ZXh0LnNhdmVDaGFuZ2VzO1xuXHRcdFx0XHQkc2NvcGUuZ2V0U2VsZWN0aW9uXHRcdFx0PVx0cHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0aW9uO1xuXG5cdFx0XHRcdCRzY29wZS5yZXZlcnRDbGlja2VkXHRcdD1cdGZ1bmN0aW9uKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgcmV2ZXJ0Q2xpY2tlZCgpJyk7XG5cdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQucmV2ZXJ0Q2hhbmdlcygpO1xuXHRcdFx0XHRcdF9kZXN0cm95KCk7XG5cdFx0XHRcdFx0X2luaXQoKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cblx0XHRcdFx0JHNjb3BlLmFkZE5ld0Jsb2NrXHRcdD1cdGZ1bmN0aW9uKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgYWRkTmV3QmxvY2soKScpO1xuXHRcdFx0XHRcdENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2Uuc2hvd01vZGFsKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKSwgJ3VzZXInLCBwcm9wZXJ0aWVzQ29udGV4dClcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5zaG93TmV3UmVhZFN1YnJvdXRpbmVcdFx0PVx0ZnVuY3Rpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JGxvZy53YXJuKCAncHJvcGVydGllc0NvbnRleHQgc2hvd05ld1JlYWRTdWJyb3V0aW5lKCknKTtcblx0XHRcdFx0XHRDb252b3dvcmtzQWRkQmxvY2tTZXJ2aWNlLnNob3dTdWJyb3V0aW5lTW9kYWwoIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpLCBwcm9wZXJ0aWVzQ29udGV4dCwgJ3JlYWQnKVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLnNob3dOZXdQcm9jZXNzU3Vicm91dGluZVx0XHQ9XHRmdW5jdGlvbigpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQkbG9nLndhcm4oICdwcm9wZXJ0aWVzQ29udGV4dCBzaG93TmV3UHJvY2Vzc1N1YnJvdXRpbmUoKScpO1xuXHRcdFx0XHRcdENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2Uuc2hvd1N1YnJvdXRpbmVNb2RhbCggcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIHByb3BlcnRpZXNDb250ZXh0LCAncHJvY2VzcycpXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Ly8gJHNjb3BlLnJlbW92ZUJsb2NrXHRcdD1cdGZ1bmN0aW9uKCBibG9ja0lkKVxuXHRcdFx0XHQvLyB7XG5cdFx0XHRcdC8vIFx0JGxvZy5sb2coICdwcm9wZXJ0aWVzQ29udGV4dCByZW1vdmVCbG9jaygpIGJsb2NrSWQnLCBibG9ja0lkKTtcblx0XHRcdFx0Ly8gfTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5pc1JlYWR5XHRcdFx0PVx0cHJvcGVydGllc0NvbnRleHQuaXNMb2FkZWQ7XG4vL1x0XHRcdFx0JHNjb3BlLmlzUmVhZHlcdFx0XHQ9XHRmdW5jdGlvbigpIHsgXG4vL1x0XHRcdFx0XHQkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGlzUmVhZHkoKScpO1xuLy9cdFx0XHRcdFx0cmV0dXJuIHRydWUgXG4vL1x0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFxuXHRcdFx0XHQkc2NvcGUuZ2V0U3Vicm91dGluZXNcdD1cdGZ1bmN0aW9uKCkgeyByZXR1cm4gX2ZpbHRlclN1YnJvdXRpbmVzKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKSk7IH07XG5cdFx0XHRcdCRzY29wZS5nZXRCbG9ja3NcdFx0PVx0ZnVuY3Rpb24oKSB7IHJldHVybiBfZmlsdGVyQmxvY2tzKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKSk7IH07XG5cdFx0XHRcdCRzY29wZS5nZXREZWZpbml0aW9uc1x0PVx0cHJvcGVydGllc0NvbnRleHQuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnM7XG5cblx0XHRcdFx0JHNjb3BlLmNhbkJsb2NrTW92ZVVwID0gZnVuY3Rpb24oYmxvY2tJZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBpbmRleCA9ICRzY29wZS5nZXRCbG9ja3MoKS5maW5kSW5kZXgoZnVuY3Rpb24gKGIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBiLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09IGJsb2NrSWQ7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gaW5kZXggPiAxO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLmNhbkJsb2NrTW92ZURvd24gPSBmdW5jdGlvbihibG9ja0lkKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGJsb2NrcyA9ICRzY29wZS5nZXRCbG9ja3MoKTtcblx0XHRcdFx0XHR2YXIgaW5kZXggPSBibG9ja3MuZmluZEluZGV4KGZ1bmN0aW9uIChiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYi5wcm9wZXJ0aWVzLmJsb2NrX2lkID09PSBibG9ja0lkO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIGluZGV4IDwgYmxvY2tzLmxlbmd0aCAtIDQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkc2NvcGUuY2FuRnJhZ21lbnRNb3ZlVXAgPSBmdW5jdGlvbihmcmFnbWVudElkKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGluZGV4ID0gJHNjb3BlLmdldFN1YnJvdXRpbmVzKCkuZmluZEluZGV4KGZ1bmN0aW9uIChzKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcy5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkID09PSBmcmFnbWVudElkO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIGluZGV4ID4gMDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5jYW5GcmFnbWVudE1vdmVEb3duID0gZnVuY3Rpb24oZnJhZ21lbnRJZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBibG9ja3MgPSAkc2NvcGUuZ2V0U3Vicm91dGluZXMoKTtcblx0XHRcdFx0XHR2YXIgaW5kZXggPSBibG9ja3MuZmluZEluZGV4KGZ1bmN0aW9uIChzKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcy5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkID09PSBmcmFnbWVudElkO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIGluZGV4IDwgYmxvY2tzLmxlbmd0aCAtIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cblx0XHRcdFx0JHNjb3BlLiRvbignbW92ZUJsb2NrJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG5cdFx0XHRcdFx0JGxvZy5sb2coJ0Jsb2NrJywgZGF0YSwgJ3dhbnRzIHRvIGdvJywgKGRhdGEuZGlyID09PSAxID8gJ2Rvd24nIDogJ3VwJykpO1xuXHRcdFx0XHRcdHZhciBzZXJ2aWNlID0gcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCk7XG5cblx0XHRcdFx0XHR2YXIgY3VycmVudEluZGV4ID0gc2VydmljZS5ibG9ja3MuZmluZEluZGV4KGZ1bmN0aW9uIChiKSB7IHJldHVybiBiLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09IGRhdGEuYmxvY2tJZDsgfSk7XG5cdFx0XHRcdFx0dmFyIHRhcmdldEluZGV4ID0gY3VycmVudEluZGV4ICsgZGF0YS5kaXI7XG5cdFx0XHRcdFx0JGxvZy5sb2coJ0Jsb2NrJywgZGF0YS5ibG9ja0lkLCAnaXMgY3VycmVudGx5IGF0IGluZGV4JywgY3VycmVudEluZGV4LCAnLCB3aWxsIHRyeSBtb3ZpbmcgaXQgdG8nLCB0YXJnZXRJbmRleCk7XG5cblx0XHRcdFx0XHRbc2VydmljZS5ibG9ja3NbY3VycmVudEluZGV4XSwgc2VydmljZS5ibG9ja3NbdGFyZ2V0SW5kZXhdXSA9IFtzZXJ2aWNlLmJsb2Nrc1t0YXJnZXRJbmRleF0sIHNlcnZpY2UuYmxvY2tzW2N1cnJlbnRJbmRleF1dO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuJG9uKCdtb3ZlRnJhZ21lbnQnLCBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcblx0XHRcdFx0XHQkbG9nLmxvZygnRnJhZ21lbnQnLCBkYXRhLCAnd2FudHMgdG8gZ28nLCAoZGF0YS5kaXIgPT09IDEgPyAnZG93bicgOiAndXAnKSk7XG5cdFx0XHRcdFx0dmFyIHNlcnZpY2UgPSBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKTtcblxuXHRcdFx0XHRcdHZhciBjdXJyZW50SW5kZXggPSBzZXJ2aWNlLmZyYWdtZW50cy5maW5kSW5kZXgoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PT0gZGF0YS5mcmFnbWVudElkOyB9KTtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0SW5kZXggPSBjdXJyZW50SW5kZXggKyBkYXRhLmRpcjtcblx0XHRcdFx0XHQkbG9nLmxvZygnQmxvY2snLCBkYXRhLmZyYWdtZW50SWQsICdpcyBjdXJyZW50bHkgYXQgaW5kZXgnLCBjdXJyZW50SW5kZXgsICcsIHdpbGwgdHJ5IG1vdmluZyBpdCB0bycsIHRhcmdldEluZGV4KTtcblxuXHRcdFx0XHRcdFtzZXJ2aWNlLmZyYWdtZW50c1tjdXJyZW50SW5kZXhdLCBzZXJ2aWNlLmZyYWdtZW50c1t0YXJnZXRJbmRleF1dID0gW3NlcnZpY2UuZnJhZ21lbnRzW3RhcmdldEluZGV4XSwgc2VydmljZS5mcmFnbWVudHNbY3VycmVudEluZGV4XV07XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goIHByb3BlcnRpZXNDb250ZXh0LmlzTG9hZGVkLCBmdW5jdGlvbiggdmFsKSB7XG5cdFx0XHRcdFx0aWYgKCB2YWwpIHtcblx0XHRcdFx0XHRcdF9pbml0KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdF9kZXN0cm95KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdGZ1bmN0aW9uIF9maWx0ZXJCbG9ja3MoIHNlcnZpY2UpXG5cdHtcbiAgICAgICAgdmFyIHVzZXJfYmxvY2tzXHRcdD1cdHNlcnZpY2UuYmxvY2tzLmZpbHRlciggZnVuY3Rpb24oIGJsb2NrKSB7IHJldHVybiAhX2lzU3lzdGVtKCBibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkKTtcdH0pO1xuICAgICAgICB2YXIgc3lzdGVtX2Jsb2Nrc1x0PVx0c2VydmljZS5ibG9ja3MuZmlsdGVyKCBmdW5jdGlvbiggYmxvY2spIHsgcmV0dXJuIF9pc1N5c3RlbSggYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCk7XHR9KTtcblxuICAgICAgICB2YXIgc2Vzc2lvbl9zdGFydF9ibG9ja1x0XHRcdD1cdHN5c3RlbV9ibG9ja3MuZmluZCggZnVuY3Rpb24oIGIpIHsgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2Vzc2lvblN0YXJ0JzsgfSk7XG4gICAgICAgIHZhciBzZXJ2aWNlX3Byb2Nlc3NvcnNfYmxvY2tcdD1cdHN5c3RlbV9ibG9ja3MuZmluZCggZnVuY3Rpb24oIGIpIHsgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2VydmljZVByb2Nlc3NvcnMnOyB9KTtcbiAgICAgICAgdmFyIHNlc3Npb25fZW5kX2Jsb2NrXHRcdFx0PVx0c3lzdGVtX2Jsb2Nrcy5maW5kKCBmdW5jdGlvbiggYikgeyByZXR1cm4gYi5wcm9wZXJ0aWVzLmJsb2NrX2lkID09PSAnX19zZXNzaW9uRW5kJzsgfSk7XG4gICAgICAgIHZhciBtZWRpYV9jb250cm9sc19ibG9ja1x0XHQ9XHRzeXN0ZW1fYmxvY2tzLmZpbmQoIGZ1bmN0aW9uKCBiKSB7IHJldHVybiBiLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09ICdfX21lZGlhQ29udHJvbHMnOyB9KTtcblxuICAgICAgICB2YXIgc29ydGVkXHQ9XHR1c2VyX2Jsb2NrcztcblxuICAgICAgICBzb3J0ZWQudW5zaGlmdCggc2Vzc2lvbl9zdGFydF9ibG9jayk7XG4gICAgICAgIHNvcnRlZC5wdXNoKCBtZWRpYV9jb250cm9sc19ibG9jayk7XG4gICAgICAgIHNvcnRlZC5wdXNoKCBzZXJ2aWNlX3Byb2Nlc3NvcnNfYmxvY2spO1xuICAgICAgICBzb3J0ZWQucHVzaCggc2Vzc2lvbl9lbmRfYmxvY2spO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWQ7XG4gICAgfVxuXG5cdGZ1bmN0aW9uIF9maWx0ZXJTdWJyb3V0aW5lcyggc2VydmljZSlcblx0e1xuXHRcdHJldHVybiBzZXJ2aWNlLmZyYWdtZW50cztcblx0fVxuXHRcblx0ZnVuY3Rpb24gX2lzU3lzdGVtKCBibG9ja0lkKSB7XG5cdFx0aWYgKCBibG9ja0lkKSB7XG5cdFx0XHRyZXR1cm4gYmxvY2tJZC5pbmRleE9mKCAnX18nKSA+PSAwO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0XG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCAncHJldmlld1ZhcmlhYmxlc0VkaXRvcicsIHByZXZpZXdWYXJpYWJsZXNFZGl0b3IpO1xuXG4gICAgZnVuY3Rpb24gcHJldmlld1ZhcmlhYmxlc0VkaXRvciggJGxvZylcbiAgICB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3ByZXZpZXctdmFyaWFibGVzLWVkaXRvci50bXBsLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuICAgICAgICAgICAgICAgIC8vIFFVSUNLRklYXG4gICAgICAgICAgICAgICAgaWYgKCAhJHNjb3BlLnNlcnZpY2UucHJldmlld192YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UucHJldmlld192YXJpYWJsZXMgICAgPSAgIHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkUHJldmlld1ZhcmlhYmxlc1BhaXIgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3VycmVudF9ncmVhdGVzdF9pbmRleCAgPSAgICRzY29wZS5wcmV2aWV3X3ZhcmlhYmxlc19idWZmZXIubGVuZ3RoIC0gMSA8IDA/IDAgOiAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld19wYWlyICAgID0gICB7ICdrZXknOiAndG1wX2tleV8nICsgY3VycmVudF9ncmVhdGVzdF9pbmRleCwgJ3ZhbHVlJzogJ3RtcF92YWx1ZScgfTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyLnB1c2goIG5ld19wYWlyKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlbW92ZVByZXZpZXdWYXJpYWJsZXNQYWlyICA9ICAgZnVuY3Rpb24oIGkpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyLnNwbGljZSggaSwgMSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIElOSVRcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfaW5pdCgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBfc2V0dXBWYXJpYWJsZXNCdWZmZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgX3NldHVwU2VydmljZVdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgIF9zZXR1cEJ1ZmZlcldhdGNoKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUFJJVkFURVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyID0gICBbXTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyLnB1c2goIHsgJ2tleSc6IGtleSwgJ3ZhbHVlJzogJHNjb3BlLnNlcnZpY2UucHJldmlld192YXJpYWJsZXNba2V5XSB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJldmlld1ZhcmlhYmxlc0VkaXRvciBfc2V0dXBWYXJpYWJsZXNCdWZmZXIoKSBkb25lLCBidWZmZXInLCAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBTZXJ2aWNlV2F0Y2goKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnc2VydmljZS5wcmV2aWV3X3ZhcmlhYmxlcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NldHVwVmFyaWFibGVzQnVmZmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9zZXR1cEJ1ZmZlcldhdGNoKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goICdwcmV2aWV3X3ZhcmlhYmxlc19idWZmZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBRVUlDS0ZJWFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAhT2JqZWN0LmtleXMoICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5wcmV2aWV3X3ZhcmlhYmxlcyAgICA9ICAgW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzICAgID0gICB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIGkgaW4gJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWlyICAgICAgICA9ICAgJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlcltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZV9rZXkgICAgPSAgIF9zYW5pdGl6ZUtleSggcGFpci5rZXkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UucHJldmlld192YXJpYWJsZXNbc2FmZV9rZXldICA9ICAgcGFpci52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge31cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9zYW5pdGl6ZUtleSgga2V5KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIGtleS5yZXBsYWNlKCAvXFxzezIsfVxcLi0vLCAnXycpO1xuICAgIH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCdwcmV2aWV3UGFuZWwnLCBwcmV2aWV3UGFuZWwpO1xuXG4gICAgLyogQG5nSW5qZWN0ICovXG4gICAgZnVuY3Rpb24gcHJldmlld1BhbmVsKCRsb2csIENvbnZvd29ya3NBcGksIEFsZXJ0U2VydmljZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJz0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL3ByZXZpZXctcGFuZWwudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdwcmV2aWV3UGFuZWwgbGluaycpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnByZXZpZXcgPSB7fTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nZW5lcmF0ZVRleHQgPSBmdW5jdGlvbiAoIHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IFwiPHNwZWFrPjxwPlwiICsgdGV4dCArIFwiPC9wPjwvc3BlYWs+XCI7XG5cbiAgICAgICAgICAgICAgICAgICAgX2NvcHlUb0NsaXBib2FyZCh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgQWxlcnRTZXJ2aWNlLmFkZEluZm8oXCJDb3BpZWQgW1wiICsgdGV4dCArIFwiXVwiICsgXCIgdG8gY2xpcGJvYXJkLlwiKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgX2luaXQoKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRVc2VyTWVzc2FnZUdyb3VwcyA9IGZ1bmN0aW9uKG1lc3NhZ2VzKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBncm91cHMgPSBbXTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIG1lc3NhZ2VzKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kLmluY2x1ZGVzKG1lc3NhZ2VzW2ldLmludGVudCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQucHVzaChtZXNzYWdlc1tpXS5pbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZW50OiBtZXNzYWdlc1tpXS5pbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2VzLmZpbHRlcihmdW5jdGlvbiAobXNnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbXNnLmludGVudCA9PT0gbWVzc2FnZXNbaV0uaW50ZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKG1zZykgeyByZXR1cm4gbXNnLnRleHQgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBncm91cHM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXQoKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0U2VydmljZVByZXZpZXcoJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCkudGhlbihmdW5jdGlvbiAocHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnByZXZpZXcgPSBwcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcigncHJldmlld1BhbmVsIGNvdWxkIG5vdCBnZXQgc2VydmljZSBwcmV2aWV3LCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfY29weVRvQ2xpcGJvYXJkKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB2YWx1ZSAoc3RyaW5nIHRvIGJlIGNvcGllZClcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbm9uLWVkaXRhYmxlIHRvIGF2b2lkIGZvY3VzIGFuZCBtb3ZlIG91dHNpZGUgb2Ygdmlld1xuICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZSA9IHtwb3NpdGlvbjogJ2Fic29sdXRlJywgbGVmdDogJy05OTk5cHgnfTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlbGVjdCB0ZXh0IGluc2lkZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIGVsLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDb3B5IHRleHQgdG8gY2xpcGJvYXJkXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0ZW1wb3JhcnkgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCAnbWlzY1BhbmVsJywgbWlzY1BhbmVsKTtcblxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cbiAgICBmdW5jdGlvbiBtaXNjUGFuZWwoICRsb2csIENvbnZvd29ya3NBcGksIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTClcbiAgICB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgICAgICByZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0JyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvbWlzYy1wYW5lbC50bXBsLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwbG9hZE9wdGlvbnMgICAgPSAgIHtcbiAgICAgICAgICAgICAgICAgICAga2VlcF92YXJzIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAga2VlcF9jb25maWdzIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwbG9hZFN1Ym1pdHRlZCAgPSAgIGZ1bmN0aW9uKCBmaWxlKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJ21pc2NQYW5lbCB1cGxvYWRTdWJtaXR0ZWQoKSBmaWxlJywgZmlsZSwgJyRzY29wZS51cGxvYWRPcHRpb25zJywgJHNjb3BlLnVwbG9hZE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLnVwbG9hZFNlcnZpY2VEYXRhKCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudXBsb2FkT3B0aW9ucy5rZWVwX3ZhcnMsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnVwbG9hZE9wdGlvbnMua2VlcF9jb25maWdzKS50aGVuKCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHVwbG9hZFN1Ym1pdHRlZCgpIE9LJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5yZWxvYWRTZXJ2aWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHVwbG9hZFN1Ym1pdHRlZCgpIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuZG93bmxvYWQgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIGRvd25sb2FkKCknKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVybCA9ICAgQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLWltcC1leHAvZXhwb3J0LycgKyAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkO1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHJlZGlyZWN0aW5nIHRvIFsnK3VybCsnXScpO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5ocmVmICA9ICAgdXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuZG93bmxvYWRQbGF0Zm9ybSAgPSAgIGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcdCRsb2cuZGVidWcoICdtaXNjUGFuZWwgZG93bmxvYWRQbGF0Zm9ybSgpJywgcGxhdGZvcm1JZCk7XG4gICAgICAgICAgICAgICAgXHR2YXIgdXJsID0gICBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtaW1wLWV4cC9leHBvcnQvJyArICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQgKyAnLycgKyBwbGF0Zm9ybUlkO1xuICAgICAgICAgICAgICAgIFx0JGxvZy5kZWJ1ZyggJ21pc2NQYW5lbCByZWRpcmVjdGluZyB0byBbJyt1cmwrJ10nKTtcbiAgICAgICAgICAgICAgICBcdGRvY3VtZW50LmxvY2F0aW9uLmhyZWYgID0gICB1cmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCAnaW50ZW50RWRpdG9yJywgaW50ZW50RWRpdG9yKTtcblxuICAgIGZ1bmN0aW9uIGludGVudEVkaXRvciggJGxvZywgJHJvb3RTY29wZSwgJHdpbmRvdylcbiAgICB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL2ludGVudC1lZGl0b3IudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCAkc2NvcGUpIHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuICAgICAgICAgICAgXHQkbG9nLmRlYnVnKCAnaW50ZW50RWRpdG9yIGxpbmsnKTtcblx0XHRcdFx0JHNjb3BlLnZhbHVlXHQ9XHRKU09OLnN0cmluZ2lmeSggJHNjb3BlLnNlcnZpY2UuaW50ZW50cywgbnVsbCwgMik7XG5cdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgb3BlbiA9IFtdO1xuXG5cdFx0XHRcdCRzY29wZS5zZWxlY3RJbnRlbnQgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0XHRcdGlmICghb3BlbltpbmRleF0pIHtcblx0XHRcdFx0XHRcdG9wZW5baW5kZXhdID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0b3BlbltpbmRleF0gPSAhb3BlbltpbmRleF07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkc2NvcGUuaXNJbnRlbnRTZWxlY3RlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9wZW5baW5kZXhdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuZGVsZXRlSW50ZW50ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdFx0XHR2YXIgaW50ZW50TmFtZSA9ICRzY29wZS5zZXJ2aWNlLmludGVudHNbaW5kZXhdLm5hbWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCR3aW5kb3cuY29uZmlybShcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgXCIgKyBpbnRlbnROYW1lICsgXCI/XCIpKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZCA9IG51bGw7XG5cdFx0XHRcdFx0XHQkc2NvcGUuc2VydmljZS5pbnRlbnRzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLmFkZEludGVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciByZXRpbmRleCA9ICRzY29wZS5zZXJ2aWNlLmludGVudHMubGVuZ3RoO1xuXHRcdFx0XHRcdCRzY29wZS5zZXJ2aWNlLmludGVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcIm5hbWVcIjogXCJOZXdJbnRlbnRcIixcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcImN1c3RvbVwiLFxuXHRcdFx0XHRcdFx0XCJ1dHRlcmFuY2VzXCI6IFtcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFwicmF3XCI6IFwiXCIsXG5cdFx0XHRcdFx0XHRcdFx0XCJtb2RlbFwiOiBbXG5cdFx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwidGV4dFwiOiBcIlwiXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gcmV0aW5kZXg7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkc2NvcGUuJG9uKCdKc29uRXJyb3InLCBmdW5jdGlvbihldmVudCwgYXJncykge1xuXHRcdFx0XHRcdCRzY29wZS5lcnJvciA9IGFyZ3M7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goICd2YWx1ZScsIGZ1bmN0aW9uICggdmFsdWUpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2UuaW50ZW50c1x0PVx0SlNPTi5wYXJzZSggdmFsdWUpO1xuXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpIGluICRzY29wZS5zZXJ2aWNlLmludGVudHMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCEkc2NvcGUuc2VydmljZS5pbnRlbnRzW2ldLm5hbWUgfHxcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuc2VydmljZS5pbnRlbnRzW2ldLm5hbWUgPT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdCRzY29wZS5zZXJ2aWNlLmludGVudHNbaV0ubmFtZSA9IFwiTmFtZWxlc3NJbnRlbnRcIjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQkc2NvcGUuZXJyb3JcdD1cdGZhbHNlO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKCBlcnIpIHtcblx0XHRcdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0dHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCggZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vICRsb2cuZGVidWcoICdpbnRlbnRFZGl0b3IgY29tcG9uZW50IHZhbHVlIGNoYW5nZWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLnNlcnZpY2UuaW50ZW50cztcblx0XHRcdFx0fSwgZnVuY3Rpb24gKCB2YWx1ZSkge1xuXHRcdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0SlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmludGVudHMsIG51bGwsIDIpO1xuXHRcdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmZpbHRlcigncHJvcHNGaWx0ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbXMsIHByb3BzKSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG5cbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc3RleHQgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgaXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtTWF0Y2hlcyA9IGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID09IDApXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0ga2V5c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHByb3BzW3Byb3BdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhhc3RleHQgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbVtwcm9wXSAmJiAoaXRlbVtwcm9wXS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0ZXh0KSAhPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtTWF0Y2hlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1NYXRjaGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWhhc3RleHQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBMZXQgdGhlIG91dHB1dCBiZSB0aGUgaW5wdXQgdW50b3VjaGVkXG4gICAgICAgICAgICAgIG91dCA9IGl0ZW1zO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIFxuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by5lZGl0b3InKS5maWx0ZXIoJ3BlcmNlbnQnLCBbIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlICsgJyAlJztcbiAgICAgICAgfTsgICAgIFxuICAgIH1dKTtcbiAgICBcbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8uZWRpdG9yJykuZmlsdGVyKCdwcmV0dHlKc29uJywgWyBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KCB2YWx1ZSwgbnVsbCwgMik7XG4gICAgICAgIH1cbiAgICB9XSk7XG5cbiAgICBcbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8uZWRpdG9yJykuZmlsdGVyKCdhZG1EYXRlJywgZnVuY3Rpb24gKCAkZmlsdGVyKSB7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCBzdHJEYXRlLCBmb3JtYXQpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNOdW1iZXIoIHN0ckRhdGUpKVxuICAgICAgICAgICAgICAgIHJldHVybiAkZmlsdGVyKCdkYXRlJykoIG5ldyBEYXRlKCBzdHJEYXRlICogMTAwMCksIGZvcm1hdCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAkZmlsdGVyKCdkYXRlJykoIERhdGUucGFyc2UoIHN0ckRhdGUpLCBmb3JtYXQpO1xuICAgICAgICB9OyAgICAgXG4gICAgfSk7XG4gICAgXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmZpbHRlcigndW5zYWZlJywgZnVuY3Rpb24oJHNjZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gJHNjZS50cnVzdEFzSHRtbCh2YWwpO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpLmZpbHRlcigna2V5cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModmFsdWUpO1xuICAgICAgICB9XG4gICAgfSlcblxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCAnY29udm8uZWRpdG9yJylcbiAgICAgICAgLmRpcmVjdGl2ZSggJ2VudGl0eUVkaXRvcicsIGVudGl0eUVkaXRvcik7XG5cbiAgICBmdW5jdGlvbiBlbnRpdHlFZGl0b3IoICRsb2csICR3aW5kb3cpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7IHNlcnZpY2U6ICc9JyB9LFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9lbnRpdHktZWRpdG9yLnRtcGwuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiggJHNjb3BlKSB7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIFx0JGxvZy5kZWJ1ZyggJ2VudGl0eUVkaXRvciBsaW5rJyk7XG5cdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0SlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLCBudWxsLCAyKTtcblx0XHRcdFx0JHNjb3BlLmVycm9yXHQ9XHRmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBvcGVuID0gW107XG5cblx0XHRcdFx0JHNjb3BlLnNlbGVjdEVudGl0eSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRcdFx0aWYgKCFvcGVuW2luZGV4XSkge1xuXHRcdFx0XHRcdFx0b3BlbltpbmRleF0gPSB0cnVlO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRvcGVuW2luZGV4XSA9ICFvcGVuW2luZGV4XTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5pc0VudGl0eVNlbGVjdGVkID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdFx0XHRyZXR1cm4gb3BlbltpbmRleF07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5kZWxldGVFbnRpdHkgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0XHRcdHZhciBlbnRpdHlOYW1lID0gJHNjb3BlLnNlcnZpY2UuZW50aXRpZXNbaW5kZXhdLm5hbWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCR3aW5kb3cuY29uZmlybShcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgXCIgKyBlbnRpdHlOYW1lICsgXCI/XCIpKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZCA9IG51bGw7XG5cdFx0XHRcdFx0XHQkc2NvcGUuc2VydmljZS5lbnRpdGllcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5hZGRFbnRpdHkgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgcmV0aW5kZXggPSAkc2NvcGUuc2VydmljZS5lbnRpdGllcy5sZW5ndGg7XG5cdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2UuZW50aXRpZXMucHVzaCh7XG5cdFx0XHRcdFx0XHRcIm5hbWVcIjogXCJOZXdFbnRpdHlcIixcblx0XHRcdFx0XHRcdFwidmFsdWVzXCI6IFtcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFwidmFsdWVcIjogXCJcIixcblx0XHRcdFx0XHRcdFx0XHRcInN5bm9ueW1zXCIgOiBbXCJcIl1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHJldGluZGV4O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLiRvbignSnNvbkVycm9yJywgZnVuY3Rpb24oZXZlbnQsIGFyZ3MpIHtcblx0XHRcdFx0XHQkc2NvcGUuZXJyb3IgPSBhcmdzO1xuXHRcdFx0XHR9KVxuXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goICd2YWx1ZScsIGZ1bmN0aW9uICggdmFsdWUpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2UuZW50aXRpZXNcdD1cdEpTT04ucGFyc2UoIHZhbHVlKTtcblx0XHRcdFx0XHRcdGZvciAodmFyIGkgaW4gJHNjb3BlLnNlcnZpY2UuZW50aXRpZXMgfHxcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2UuZW50aXRpZXNbaV0ubmFtZSA9PSBcIlwiKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghJHNjb3BlLnNlcnZpY2UuZW50aXRpZXNbaV0ubmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdCRzY29wZS5zZXJ2aWNlLmVudGl0aWVzW2ldLm5hbWUgPSBcIk5hbWVsZXNzRW50aXR5XCI7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCRzY29wZS5lcnJvclx0PVx0ZmFsc2U7XG5cdFx0XHRcdFx0fSBjYXRjaCAoIGVycikge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmVycm9yXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly8gJGxvZy5kZWJ1ZyggJ2VudGl0eUVkaXRvciBjb21wb25lbnQgdmFsdWUgY2hhbmdlZCcpO1xuXHRcdFx0XHRcdHJldHVybiAkc2NvcGUuc2VydmljZS5lbnRpdGllcztcblx0XHRcdFx0fSwgZnVuY3Rpb24gKCB2YWx1ZSkge1xuXHRcdFx0XHRcdCRzY29wZS52YWx1ZVx0PVx0SlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLCBudWxsLCAyKTtcblx0XHRcdFx0XHQkc2NvcGUuZXJyb3JcdD1cdGZhbHNlO1xuXHRcdFx0XHR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCAnY29udm8uZWRpdG9yJylcblx0XHQuZGlyZWN0aXZlKCAnY29udm93b3Jrc1Rvb2xib3gnLCBjb252b3dvcmtzVG9vbGJveCk7XG5cblx0LyogQG5nSW5qZWN0ICovXG5cdGZ1bmN0aW9uIGNvbnZvd29ya3NUb29sYm94KCAkbG9nLCBVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlKVxuXHR7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0XHRzY29wZTogeyBcblx0XHRcdFx0J2RlZmluaXRpb25zJyA6ICc9Jyxcblx0XHRcdFx0J3NlcnZpY2UnIDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9jb252b3dvcmtzLXRvb2xib3gudG1wbC5odG1sJyxcblx0XHRcdGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvd29ya3NUb29sYm94IF9pbml0KCkgJHNjb3BlLmRlZmluaXRpb25zJywgJHNjb3BlLmRlZmluaXRpb25zKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBjb3JlXHRcdFx0PVx0Wydjb252by1jb3JlJywgJ2FtYXpvbicsICdnb29nbGUtbmxwJ107XG5cdFx0XHRcdCRzY29wZS5vcGVuXHRcdFx0PVx0e307XG5cblx0XHRcdFx0JHNjb3BlLmdyb3VwZWREZWZpbml0aW9ucyA9IHt9O1xuXG5cdFx0XHRcdGlmICggISRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2UucGFja2FnZXNcdD1cdFtdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSBpbiAkc2NvcGUuZGVmaW5pdGlvbnMpIHtcblx0XHRcdFx0XHQkbG9nLmxvZygkc2NvcGUuZGVmaW5pdGlvbnNbaV0pO1xuXHRcdFx0XHRcdHZhciBuYW1lc3BhY2UgPSAkc2NvcGUuZGVmaW5pdGlvbnNbaV0ubmFtZXNwYWNlO1xuXG5cdFx0XHRcdFx0aWYgKCEkc2NvcGUuZ3JvdXBlZERlZmluaXRpb25zW25hbWVzcGFjZV0pIHtcblx0XHRcdFx0XHRcdCRzY29wZS5ncm91cGVkRGVmaW5pdGlvbnNbbmFtZXNwYWNlXSA9IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGZvciAodmFyIGogaW4gJHNjb3BlLmRlZmluaXRpb25zW2ldLmNvbXBvbmVudHMpIHtcblx0XHRcdFx0XHRcdHZhciBjbXB0ID0gJHNjb3BlLmRlZmluaXRpb25zW2ldLmNvbXBvbmVudHNbal07XG5cdFx0XHRcdFx0XHR2YXIgZ3JwID0gX3VwcGVyY2FzZVdvcmQoY21wdFsnY29tcG9uZW50X3Byb3BlcnRpZXMnXVsnX3dvcmtmbG93J10pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoISRzY29wZS5ncm91cGVkRGVmaW5pdGlvbnNbbmFtZXNwYWNlXVtncnBdKSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5ncm91cGVkRGVmaW5pdGlvbnNbbmFtZXNwYWNlXVtncnBdID0gW107XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmICghY21wdC5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3ghJykpIHtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmdyb3VwZWREZWZpbml0aW9uc1tuYW1lc3BhY2VdW2dycF0ucHVzaChjbXB0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UuZ2V0RGF0YSggJ29wZW5Ub29sYm94ZXMnKS50aGVuKCBmdW5jdGlvbiggb3BlblRvb2xib3hlcykge1xuXHRcdFx0XHRcdGlmICggb3BlblRvb2xib3hlcykge1xuXHRcdFx0XHRcdFx0JHNjb3BlLm9wZW4gICAgPSAgIG9wZW5Ub29sYm94ZXM7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCAnb3BlbicsIGZ1bmN0aW9uKCB2YWx1ZSkge1xuXHRcdFx0XHRcdFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UucmVnaXN0ZXJEYXRhKCAnb3BlblRvb2xib3hlcycsIHZhbHVlKTtcblx0XHRcdFx0fSwgdHJ1ZSk7XG5cblx0XHRcdFx0JHNjb3BlLmlzT3Blblx0XHQ9XHRmdW5jdGlvbiggbmFtZXNwYWNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBuYW1lc3BhY2UgaW4gJHNjb3BlLm9wZW4pIHtcblx0XHRcdFx0XHRcdHJldHVybiAkc2NvcGUub3BlbltuYW1lc3BhY2VdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gKGNvcmUuaW5kZXhPZiggbmFtZXNwYWNlKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS50b2dnbGVPcGVuXHQ9XHRmdW5jdGlvbiggbmFtZXNwYWNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLm9wZW5bbmFtZXNwYWNlXVx0PVx0ISRzY29wZS5pc09wZW4oIG5hbWVzcGFjZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5pc0VuYWJsZWRcdD1cdGZ1bmN0aW9uKCBuYW1lc3BhY2UpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKCB2YXIgaT0wOyBpPCRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRpZiAoICRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzW2ldID09IG5hbWVzcGFjZSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLnRvZ2dsZUVuYWJsZWRcdD1cdGZ1bmN0aW9uKCBuYW1lc3BhY2UpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoICRzY29wZS5pc0VuYWJsZWQoIG5hbWVzcGFjZSkpIHtcblx0XHRcdFx0XHRcdCRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzID0gICAkc2NvcGUuc2VydmljZS5wYWNrYWdlcy5maWx0ZXIoIGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUgIT09IG5hbWVzcGFjZSB9KVxuXHRcdFx0XHRcdFx0JHNjb3BlLm9wZW5bbmFtZXNwYWNlXVx0PVx0ZmFsc2U7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzLnB1c2goIG5hbWVzcGFjZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBfdXBwZXJjYXNlV29yZCh3b3JkKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmRpcmVjdGl2ZSggJ2NvbnZvd29ya3NUb29sYm94Q29tcG9uZW50JywgY29udm93b3Jrc1Rvb2xib3hDb21wb25lbnQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBjb252b3dvcmtzVG9vbGJveENvbXBvbmVudCggJGxvZywgJGNvbXBpbGUpXG5cdHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRcdHNjb3BlOiB7IFxuXHRcdFx0XHQnY29tcG9uZW50RGVmaW5pdGlvbicgOiAnPSdcblx0XHRcdH0sXG5cdFx0XHRyZXF1aXJlIDogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL2NvbnZvd29ya3MtdG9vbGJveC1jb21wb25lbnQudG1wbC5odG1sJyxcblx0XHRcdGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcbi8vXHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvd29ya3NUb29sYm94Q29tcG9uZW50IF9pbml0KCkgJHNjb3BlLmNvbXBvbmVudERlZmluaXRpb24nLCAkc2NvcGUuY29tcG9uZW50RGVmaW5pdGlvbiwgJ3Byb3BlcnRpZXNDb250ZXh0JywgcHJvcGVydGllc0NvbnRleHQpO1xuXG5cdFx0XHRcdF9pbml0RHJhZ2dhYmxlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuaXNEZXByZWNhdGVkXHQ9XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoICRzY29wZS5jb21wb25lbnREZWZpbml0aW9uLm5hbWUuaW5kZXhPZignWCEnKSA9PT0gMCB8fCAkc2NvcGUuY29tcG9uZW50RGVmaW5pdGlvbi5uYW1lLmluZGV4T2YoJ3ghJykgPT09IDApIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0RHJhZ2dhYmxlKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciAkZHJhZ2dhYmxlXHQ9XHQkZWxlbWVudC5maW5kKCAnLnRvb2xib3gtY29tcG9uZW50Jyk7XG5cdFx0XHRcdFx0JGRyYWdnYWJsZS5kcmFnZ2FibGUoIHsgXG5cdFx0XHRcdFx0XHRyZXZlcnQ6IGZhbHNlLCBcblx0XHRcdFx0XHRcdHpJbmRleDogMTAwLCBcblx0XHRcdFx0XHRcdG9wYWNpdHk6IDEsIFxuXHRcdFx0XHRcdFx0aGVscGVyOiAnY2xvbmUnLFxuXHRcdFx0XHRcdFx0dG9sZXJhbmNlIDogJ3BvaW50ZXInLFxuXHRcdFx0XHRcdFx0cmVmcmVzaFBvc2l0aW9uczogdHJ1ZSxcblx0XHRcdFx0XHRcdHN0YXJ0OiBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdCAgICAgICAgICAgIGpRdWVyeSh0aGlzKS5kYXRhKCAnY29udm9EcmFnZ2VkJywge1xuXHRcdFx0XHQgICAgICAgICAgICBcdHR5cGUgOiAnZGVmaW5pdGlvbicsXG5cdFx0XHRcdCAgICAgICAgICAgIFx0Y29tcG9uZW50RGVmaW5pdGlvbiA6ICRzY29wZS5jb21wb25lbnREZWZpbml0aW9uXG5cdFx0XHRcdCAgICAgICAgICAgIH0pO1xuXHRcdFx0XHQgICAgICAgIH0sXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoICdjb252by5lZGl0b3InKVxuXHRcdC5jb250cm9sbGVyKCAnQ29udm93b3Jrc01haW5Db250cm9sbGVyJywgQ29udm93b3Jrc01haW5Db250cm9sbGVyKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gQ29udm93b3Jrc01haW5Db250cm9sbGVyKCAkbG9nLCAkc2NvcGUsICR1aWJNb2RhbCwgQ29udm93b3Jrc0FwaSlcblx0e1xuXHRcdC8vIEFQSVxuXHRcdCRzY29wZS5yZWFkeVx0XHRcdFx0PVx0ZmFsc2U7XG5cdFx0JHNjb3BlLmF2YWlsYWJsZVNlcnZpY2VzXHQ9XHRbXTtcblxuXHRcdCRzY29wZS5jcmVhdGVTZXJ2aWNlICAgICAgICA9ICAgZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdCR1aWJNb2RhbC5vcGVuKHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9jb252b3dvcmtzLWFkZC1zZXJ2aWNlLnRtcGwuaHRtbCcsXG5cdFx0XHRcdGNvbnRyb2xsZXI6IE1vZGFsSW5zdGFuY2VDdHJsLFxuXHRcdFx0XHRzaXplIDogJ21kJyxcblx0XHRcdFx0cmVzb2x2ZTogeyBDb252b3dvcmtzQXBpOiBmdW5jdGlvbigpIHsgcmV0dXJuIENvbnZvd29ya3NBcGk7IH19XG5cdFx0XHR9KVxuXHRcdH07XG5cdFx0XG5cdFx0JHNjb3BlLnNhdmVDaGFuZ2VzXHRcdFx0PVx0ZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdFxuXHRcdH07XG5cdFx0XG5cdFx0JHNjb3BlLnNhdmVEaXNhYmxlZFx0XHRcdD1cdGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRcblx0XHR9O1xuXHRcdFxuXHRcdCRzY29wZS5yZXZlcnRDbGlja2VkXHRcdD1cdGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRcblx0XHR9O1xuXHRcdFxuXHRcdCRzY29wZS5yZXZlcnREaXNhYmxlZFx0XHQ9XHRmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0XG5cdFx0fTtcblx0XHRcblx0XHQkc2NvcGUucHVibGlzaGVkT24gPSBmdW5jdGlvbihzZXJ2aWNlKSB7XG5cdFx0XHR2YXIgcHVibGlzaGVkID0gW107XG5cblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzZXJ2aWNlLnZlcnNpb25zLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuXHRcdFx0XHRpZiAoIXB1Ymxpc2hlZC5pbmNsdWRlcyhrZXkpKSB7XG5cdFx0XHRcdFx0cHVibGlzaGVkLnB1c2goX2NsZWFuS2V5KGtleSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHB1Ymxpc2hlZDtcblx0XHR9XG5cdFx0XG5cdFx0X2luaXQoKTtcblxuXHRcdC8vIElOSVRcblx0XHRmdW5jdGlvbiBfaW5pdCgpXG5cdFx0e1xuXHRcdFx0Q29udm93b3Jrc0FwaS5nZXRBbGxTZXJ2aWNlcygpLnRoZW4oIGZ1bmN0aW9uKCBzZXJ2aWNlcykge1xuXHRcdFx0XHQkc2NvcGUuYXZhaWxhYmxlU2VydmljZXNcdD1cdHNlcnZpY2VzO1xuXHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHQkbG9nLndhcm4oICdDb252b3dvcmtzTWFpbkNvbnRyb2xsZXIgZmV0Y2hpbmcgYWxsIHNlcnZpY2VzIGZhaWxlZCBiZWNhdXNlIG9mJywgcmVhc29uKTtcblxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIHJlYXNvbi5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRzY29wZS5yZWFkeVx0PVx0dHJ1ZTtcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gX2NsZWFuS2V5KGtleSkge1xuXHRcdFx0cmV0dXJuIGtleS5zcGxpdCgnXycpLm1hcChmdW5jdGlvbiAod29yZCkgeyByZXR1cm4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTsgfSkuam9pbignICcpO1xuXHRcdH1cblx0fVxuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBNb2RhbEluc3RhbmNlQ3RybCggJHNjb3BlLCAkdWliTW9kYWxJbnN0YW5jZSwgJGxvY2F0aW9uLCBDb252b3dvcmtzQXBpKVxuXHR7XG5cdFx0JHNjb3BlLm5ld19zZXJ2aWNlXHQ9XHR7XG5cdFx0XHRcIm5hbWVcIiA6IFwiXCIsXG5cdFx0XHRcInRlbXBsYXRlX2lkXCIgOiBcImNvbnZvLWNvcmUuYmxhbmtcIlxuXHRcdH07XG5cblx0XHQkc2NvcGUudGVtcGxhdGVzXHQ9XHRbXTtcblx0XHRcblx0XHRDb252b3dvcmtzQXBpLmdldFRlbXBsYXRlcygpLnRoZW4oIGZ1bmN0aW9uICggYWxsKSB7XG5cdFx0XHQkc2NvcGUudGVtcGxhdGVzXHQ9XHRhbGw7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JHNjb3BlLmNyZWF0ZSAgICAgICA9ICAgZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdENvbnZvd29ya3NBcGkuY3JlYXRlU2VydmljZSggJHNjb3BlLm5ld19zZXJ2aWNlLm5hbWUsICRzY29wZS5uZXdfc2VydmljZS50ZW1wbGF0ZV9pZCkudGhlbiggZnVuY3Rpb24oIGRhdGEpIHtcblx0XHRcdFx0dmFyIGlkICA9ICAgZGF0YVsnc2VydmljZV9pZCddO1xuXG5cdFx0XHRcdCR1aWJNb2RhbEluc3RhbmNlLmRpc21pc3MoICdjYW5jZWwnKTtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoICdjb252b3dvcmtzLWVkaXRvci8nICsgaWQpO1xuXHRcdFx0fSlcblx0XHR9O1xuXG5cdFx0JHNjb3BlLmNhbmNlbCAgID0gICBmdW5jdGlvbigpIHsgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcyggJ2NhbmNlbCcpOyB9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmNvbnRyb2xsZXIoICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlcicsIENvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIoICRsb2csICRzY29wZSwgJHJvb3RTY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sIENvbnZvd29ya3NBcGksIEFsZXJ0U2VydmljZSwgVXNlclByZWZlcmVuY2VzU2VydmljZSkge1xuXG5cdFx0dmFyIHJhbmRvbV9zbHVnXHRcdFx0PVx0TWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMCk7XG5cdFx0dmFyIGRldmljZV9pZFx0XHRcdD1cdCdhZG1pbi1jaGF0LScgKyByYW5kb21fc2x1ZztcblxuXHRcdHZhciBwbGF0Zm9ybV9pbmZvXHRcdD1cdHt9XG5cdFx0XG5cdFx0JHNjb3BlLnNlcnZpY2VJZFx0XHQ9XHQkcm91dGVQYXJhbXMuc2VydmljZV9pZDtcbiAgICAgICAgdmFyIHNlYXJjaCAgICAgICAgICAgICAgPSAgICRsb2NhdGlvbi5zZWFyY2goKTtcblx0XHR2YXIgdGFiX3NlbGVjdGVkXzFcdFx0ID1cdHNlYXJjaC50YWIxID8gc2VhcmNoLnRhYjEgOiAnd29ya2Zsb3cnO1xuXHRcdHZhciB0YWJfc2VsZWN0ZWRfMlx0XHQgPVx0c2VhcmNoLnRhYjIgPyBzZWFyY2gudGFiMiA6J3N0ZXBzJztcblxuXHRcdCRzY29wZS50YWJJbmZvMSAgICAgICAgICA9ICAgeyBhY3RpdmU6IHRhYl9zZWxlY3RlZF8xfTtcblx0XHQkc2NvcGUudGFiSW5mbzIgICAgICAgICAgPSAgIHsgYWN0aXZlOiB0YWJfc2VsZWN0ZWRfMn07XG5cblx0XHQkc2NvcGUuZGVsZWdhdGVObHBcdFx0PVx0bnVsbDtcblx0XHQkc2NvcGUuZGVsZWdhdGVPcHRpb25zXHQ9XHRbXG5cdFx0XHR7XG5cdFx0XHRcdGxhYmVsOiAnQW1hem9uJyxcblx0XHRcdFx0dmFsdWU6ICdhbWF6b24nXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRsYWJlbDogJ0RpYWxvZ2Zsb3cnLFxuXHRcdFx0XHR2YWx1ZTogJ2RpYWxvZ2Zsb3cnXG5cdFx0XHR9XG5cdFx0XTtcblxuXHRcdFxuXHRcdF9sb2FkKCk7XG5cdFx0XG4gICAgICAgICRzY29wZS50YWIxU2VsZWN0ICAgICAgID0gICBmdW5jdGlvbiggJHRhYikge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciB0YWIxU2VsZWN0ICR0YWInLCAkdGFiKTtcbiAgICAgICAgICAgIF91cGRhdGVVcmwoICR0YWIsICdzdGVwcycpO1xuICAgICAgICB9XG5cdFx0XG4gICAgICAgICRzY29wZS50YWIyU2VsZWN0ICAgICAgID0gICBmdW5jdGlvbiggJHRhYikge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciB0YWIyU2VsZWN0ICR0YWInLCAkdGFiKTtcbiAgICAgICAgICAgIGlmICggJHNjb3BlLnRhYkluZm8xLmFjdGl2ZSA9PSAnd29ya2Zsb3cnKSB7XG4gICAgICAgICAgICAgICAgX3VwZGF0ZVVybCggJ3dvcmtmbG93JywgJHRhYik7ICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX3VwZGF0ZVVybCggdGFiMSwgdGFiMilcbiAgICAgICAge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciBfdXBkYXRlVXJsIHRhYjFTZWxlY3QgdGFicycsIHRhYjEsIHRhYjIpO1xuICAgICAgICAgICAgaWYgKCB0YWIxID09ICd3b3JrZmxvdycpIHtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCAndGFiMScsIHRhYjEpO1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goICd0YWIyJywgdGFiMik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goICd0YWIxJywgdGFiMSk7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCggJ3RhYjInLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGxvY2F0aW9uLnJlcGxhY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBcblx0XHQkc2NvcGUuZ2V0RGV2aWNlSWRcdFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gZGV2aWNlX2lkO1xuXHRcdH1cblx0XHRcblxuXHRcdCRyb290U2NvcGUuJG9uKCAnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCBmdW5jdGlvbiAoIGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgX2xvYWQoKTtcbiAgICAgICAgfSk7XG5cdFx0XG5cdFx0JHJvb3RTY29wZS4kb24oICdTZXJ2aWNlV29ya2Zsb3dVcGRhdGVkJywgZnVuY3Rpb24gKCBldnQsIGRhdGEpIHtcblx0XHRcdF9sb2FkKCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JHJvb3RTY29wZS4kb24oICdTZXJ2aWNlUmVsZWFzZXNVcGRhdGVkJywgZnVuY3Rpb24gKCBldnQsIGRhdGEpIHtcblx0XHRcdF9sb2FkKCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0XG5cdFx0JHNjb3BlLmlzUGxhdGZvcm1Qcm9wYWdhdGVBbGxvd2VkXHRcdD1cdGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKSB7XG5cdFx0XHRpZiAoICFwbGF0Zm9ybV9pbmZvW3BsYXRmb3JtSWRdKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwbGF0Zm9ybV9pbmZvW3BsYXRmb3JtSWRdWydhbGxvd2VkJ107XG5cdFx0fVxuXHRcdFxuXHRcdCRzY29wZS5pc1BsYXRmb3JtUHJvcGFnYXRlQXZhaWxhYmxlXHRcdD1cdGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGlmICggIXBsYXRmb3JtX2luZm9bcGxhdGZvcm1JZF0pIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHBsYXRmb3JtX2luZm9bcGxhdGZvcm1JZF1bJ2F2YWlsYWJsZSddO1xuXHRcdH1cblx0XHRcblx0XHQkc2NvcGUucHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzXHRcdD1cdGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKSB7XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyIHByb3BhZ2F0ZVBsYXRmb3JtQ2hhbmdlcygpIHBsYXRmb3JtSWQnLCBwbGF0Zm9ybUlkKTtcblxuXHRcdFx0aWYgKHBsYXRmb3JtSWQgPT09ICdhbGwnKSB7XG5cdFx0XHRcdGNvbnN0IGF2YWlsYWJsZVBsYXRmb3JtcyA9IE9iamVjdC5rZXlzKHBsYXRmb3JtX2luZm8pO1xuXHRcdFx0XHRhdmFpbGFibGVQbGF0Zm9ybXMuZm9yRWFjaChmdW5jdGlvbihhdmFpbGFibGVQbGF0Zm9ybUlkKSB7XG5cdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5wcm9wYWdhdGVTZXJ2aWNlUGxhdGZvcm0oICRzY29wZS5zZXJ2aWNlSWQsIGF2YWlsYWJsZVBsYXRmb3JtSWQpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdHBsYXRmb3JtX2luZm9bYXZhaWxhYmxlUGxhdGZvcm1JZF0gPSBkYXRhO1xuXHRcdFx0XHRcdFx0QWxlcnRTZXJ2aWNlLmFkZFN1Y2VzcyggJ1NlcnZpY2UgcHJvcGFnYXRpb24gdG8gJythdmFpbGFibGVQbGF0Zm9ybUlkKycgZG9uZScpO1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgcHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzKCkgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihwbGF0Zm9ybUlkICsgXCIgcHJvcGFnYXRpb24gZXJyb3I6IFwiICsgcmVhc29uLmRhdGEubWVzc2FnZSArIFwiIEVycm9yIGRldGFpbHM6IFwiICsgcmVhc29uLmRhdGEuZGV0YWlscyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRDb252b3dvcmtzQXBpLnByb3BhZ2F0ZVNlcnZpY2VQbGF0Zm9ybSggJHNjb3BlLnNlcnZpY2VJZCwgcGxhdGZvcm1JZCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdHBsYXRmb3JtX2luZm9bcGxhdGZvcm1JZF0gPSBkYXRhO1xuXHRcdFx0XHRcdEFsZXJ0U2VydmljZS5hZGRTdWNlc3MoICdTZXJ2aWNlIHByb3BhZ2F0aW9uIHRvICcrcGxhdGZvcm1JZCsnIGRvbmUnKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24oIHJlYXNvbikge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgcHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzKCkgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IocGxhdGZvcm1JZCArIFwiIHByb3BhZ2F0aW9uIGVycm9yOiBcIiArIHJlYXNvbi5kYXRhLm1lc3NhZ2UgKyBcIiBFcnJvciBkZXRhaWxzOiBcIiArIHJlYXNvbi5kYXRhLmRldGFpbHMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdH1cblx0XHRcblx0XHRcblx0XHRmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgIHtcbiAgICAgICAgXHRDb252b3dvcmtzQXBpLmdldFByb3BhZ2F0ZUluZm8oICRzY29wZS5zZXJ2aWNlSWQsICdhbWF6b24nKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIFx0XHRwbGF0Zm9ybV9pbmZvWydhbWF6b24nXSA9IGRhdGE7XG4gICAgICAgIFx0fSkuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBcdFx0dGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UgKyAgXCIgSW4gb3JkZXIgdG8gYmUgYWJsZSB0byBwcm9wYWdhdGUgY2hhbmdlcyBmb3IgYW1hem9uXCIpXG5cdFx0XHR9KTtcbiAgICAgICAgXHRDb252b3dvcmtzQXBpLmdldFByb3BhZ2F0ZUluZm8oICRzY29wZS5zZXJ2aWNlSWQsICdkaWFsb2dmbG93JykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBcdFx0cGxhdGZvcm1faW5mb1snZGlhbG9nZmxvdyddID0gZGF0YTtcbiAgICAgICAgXHR9KS5jYXRjaChmdW5jdGlvbiAocmVhc29uKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlICsgIFwiIEluIG9yZGVyIHRvIGJlIGFibGUgdG8gcHJvcGFnYXRlIGNoYW5nZXMgZm9yIGRpYWxvZ2Zsb3dcIilcblx0XHRcdH0pO1xuICAgICAgICB9XG5cdFx0XG4vL1x0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbiAoKSB7XG4vL1x0XHRcdF9pbml0VGFicygpO1xuLy9cdFx0fSwgMiAqIDEwMDApO1xuXHRcdFxuXHRcdGZ1bmN0aW9uIF9pbml0VGFicygpXG5cdFx0e1xuXHRcdFx0alF1ZXJ5KCAnI3RhYl9zdGVwcycpLmRyb3BwYWJsZSh7XG5cdFx0XHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRcdFx0b3ZlcjogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgdGFiX3N0ZXBzIG92ZXInKTtcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQkc2NvcGUudGFiSW5mby5hY3RpdmVcdD1cdCdzdGVwcyc7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sIFxuXHRcdCAgICB9KTtcblx0XHRcdGpRdWVyeSggJyN0YWJfc3Vicm91dGluZXMnKS5kcm9wcGFibGUoe1xuXHRcdFx0XHRncmVlZHk6IHRydWUsXG5cdFx0XHRcdG92ZXI6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcblx0XHRcdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyIHRhYl9zdWJyb3V0aW5lcyBvdmVyJyk7XG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLnRhYkluZm8uYWN0aXZlXHQ9XHQnc3Vicm91dGluZXMnO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LCBcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCAnY29udm8uZWRpdG9yJylcblx0XHQuZGlyZWN0aXZlKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXInLCBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lcik7XG5cblx0LyogQG5nSW5qZWN0ICovXG5cdGZ1bmN0aW9uIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyKCAkbG9nLCAkdGltZW91dClcblx0e1xuXHRcdHZhciBBVVRPX09QRU5fVElNRU9VVFx0PVx0MTUwMDtcblx0XHRcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRcdHNjb3BlOiB7IFxuXHRcdFx0XHQnY29tcG9uZW50JyA6ICc9Jyxcblx0XHRcdFx0J3Byb3BlcnR5TmFtZScgOiAnPScsXG5cdFx0XHRcdCdwcm9wZXJ0eURlZmluaXRpb24nIDogJz0nLFxuXHRcdFx0fSxcblx0XHRcdHJlcXVpcmU6IFsgJ15jb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lcicsICdecHJvcGVydGllc0NvbnRleHQnXSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvY29udm93b3Jrcy1jb21wb25lbnRzLWNvbnRhaW5lci50bXBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlciA6IGZ1bmN0aW9uICggJHNjb3BlKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLmdldFByb3BlcnR5RGVmaW5pdGlvblx0XHQ9XHRnZXRQcm9wZXJ0eURlZmluaXRpb247XG5cdFx0XHRcdHRoaXMuZ2V0Q29udGFpbmVyXHRcdFx0XHQ9XHRnZXRDb250YWluZXI7XG5cdFx0XHRcdHRoaXMuaXNNdWx0aXBsZVx0XHRcdFx0XHQ9XHRpc011bHRpcGxlO1xuXHRcdFx0XHR0aGlzLmluZGV4T2ZcdFx0XHRcdFx0PVx0aW5kZXhPZjtcblx0XHRcdFx0dGhpcy5hZGRDb21wb25lbnRcdFx0XHRcdD1cdGFkZENvbXBvbmVudDtcblx0XHRcdFx0dGhpcy5yZW1vdmVDb21wb25lbnRcdFx0XHQ9XHRyZW1vdmVDb21wb25lbnQ7XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBnZXRQcm9wZXJ0eURlZmluaXRpb24oKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuICRzY29wZS5wcm9wZXJ0eURlZmluaXRpb247XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIGdldENvbnRhaW5lcigpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoICRzY29wZS5wcm9wZXJ0eU5hbWUuaW5kZXhPZiggJy4nKSA+IC0xKSB7XG5cdFx0XHRcdFx0XHR2YXIgbyAgICAgICA9ICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzO1xuXHRcdFx0XHRcdFx0dmFyIHBhcnRzICAgPSAgICRzY29wZS5wcm9wZXJ0eU5hbWUuc3BsaXQoICcuJyk7XG5cblx0XHRcdFx0XHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdG8gICA9ICAgb1twYXJ0c1tpXV07XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJHNjb3BlLmNvbXBvbmVudCAmJiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdO1xuXG5cdFx0XHRcdFx0JGxvZy53YXJuKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgY29udHJvbGxlciBnZXRDb250YWluZXIoKSBubyBwcm9wZXJ0eSBbJyskc2NvcGUucHJvcGVydHlOYW1lKyddIGluICRzY29wZS5jb21wb25lbnQnLCAkc2NvcGUuY29tcG9uZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gaXNNdWx0aXBsZSgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvbi5lZGl0b3JfcHJvcGVydGllcy5tdWx0aXBsZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gaW5kZXhPZiggY29tcG9uZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBpc011bHRpcGxlKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBnZXRDb250YWluZXIoKS5pbmRleE9mKCBjb21wb25lbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0ZnVuY3Rpb24gYWRkQ29tcG9uZW50KCBjb21wb25lbnQsIGluZGV4KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCAhaW5kZXgpIHtcblx0XHRcdFx0XHRcdGluZGV4XHQ9XHQwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIGlzTXVsdGlwbGUoKSkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBjb250cm9sbGVyIGFkZENvbXBvbmVudCgpIGFkZGluZyBjb21wb25lbnQnLCBjb21wb25lbnQsICdhdCBpbmRleCcsIGluZGV4KTtcblx0XHRcdFx0XHRcdGdldENvbnRhaW5lcigpLnNwbGljZSggaW5kZXgsIDAsIGNvbXBvbmVudCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgY29udHJvbGxlciBhZGRDb21wb25lbnQoKSBzZXR0aW5nIGNvbXBvbmVudCcsIGNvbXBvbmVudCk7XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdXHQ9XHRjb21wb25lbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudCggY29tcG9uZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBpc011bHRpcGxlKCkpIHtcblx0XHRcdFx0XHRcdHZhciBpbmRleFx0PVx0Z2V0Q29udGFpbmVyKCkuaW5kZXhPZiggY29tcG9uZW50KTtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgY29udHJvbGxlciByZW1vdmVDb21wb25lbnQoKSByZW1vdmluZyBjb21wb25lbnQnLCBjb21wb25lbnQsICdmcm9tIGluZGV4JywgaW5kZXgpO1xuXHRcdFx0XHRcdFx0Z2V0Q29udGFpbmVyKCkuc3BsaWNlKCBpbmRleCwgMSk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgY29udHJvbGxlciByZW1vdmVDb21wb25lbnQoKSBzZXR0aW5nIGNvbnRhaW5lciBhdCBudWxsJyk7XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdXHQ9XHRudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0bGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCAkY3RybHMpIHtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lclx0PVx0JGN0cmxzWzBdO1xuXHRcdFx0XHR2YXIgcHJvcGVydGllc0NvbnRleHRcdFx0XHRcdD1cdCRjdHJsc1sxXTtcbi8vXHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGxpbmsoKSAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLnByb3BlcnR5TmFtZV0nLCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLnByb3BlcnR5TmFtZV0sICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lcicsIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBvcGVuXHRcdD1cdGZhbHNlO1xuXHRcdFx0XHR2YXIgb3Blbl90aW1lclx0PVx0bnVsbDtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICggJ2RlZmF1bHRPcGVuJyBpbiAkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uKSB7XG4vL1x0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIHNldHRpbmcgZGVmYXVsdE9wZW4nLCAkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uWydkZWZhdWx0T3BlbiddKTtcblx0XHRcdFx0XHRvcGVuXHQ9XHQkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uWydkZWZhdWx0T3BlbiddO1xuXHRcdFx0XHR9XG4vL1x0XHRcdFx0X2luaXREcm9wcGFibGVCYWNrZ3JvdW5kKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfaW5pdERyb3BwYWJsZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQVBJXG5cdFx0XHRcdCRzY29wZS50b2dnbGVPcGVuXHRcdD1cdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdG9wZW5cdD1cdCFvcGVuO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLmlzT3Blblx0XHQ9XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gb3Blbjtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLnNob3VsZEhpZGVcdD1cdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICggIWNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLmdldENvbnRhaW5lcigpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuICRzY29wZS5wcm9wZXJ0eURlZmluaXRpb24uZWRpdG9yX3Byb3BlcnRpZXMuaGlkZVdoZW5FbXB0eSAmJiBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5nZXRDb250YWluZXIoKS5sZW5ndGggPT0gMDsgXG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5nZXRDb250YWluZXJcdD1cdGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLmdldENvbnRhaW5lcjtcblx0XHRcdFx0XG4gICAgICAgICAgICAgICAgJHNjb3BlLmdldENvbnRleHRPcHRpb25zICAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gICBbXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICggcHJvcGVydGllc0NvbnRleHQuaGFzQ2xpcGJvYXJkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICdQYXN0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAoJGl0ZW1TY29wZSwgJGV2ZW50LCBtb2RlbFZhbHVlLCB0ZXh0LCAkbGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgY29udGV4dCBwYXN0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQucGFzdGUoIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLCBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5nZXRDb250YWluZXIoKS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiJGRlc3Ryb3lcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHQgICAgXHQgIGlmICggb3Blbl90aW1lcikge1xuXHRcdFx0XHRcdCAgICBcdFx0ICAkdGltZW91dC5jYW5jZWwoIG9wZW5fdGltZXIgKTtcblx0XHRcdFx0XHQgICAgXHRcdCAgb3Blbl90aW1lclx0PVx0bnVsbDtcblx0XHRcdFx0XHQgICAgXHQgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFBSSVZBVEVcblx0XHRcdFx0ZnVuY3Rpb24gX2luaXREcm9wcGFibGUoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyICRkcm9wcGFibGVcdD1cdGpRdWVyeSgkZWxlbWVudC5maW5kKCAnLnByb3AtY29udGFpbmVyJylbMF0pO1xuXHRcdFx0XHRcdCRkcm9wcGFibGUuZHJvcHBhYmxlKHtcblx0XHRcdFx0XHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRcdFx0XHQgICAgZHJvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0XHQgICAgXHR2YXIgZGF0YVx0PVx0dWkuZHJhZ2dhYmxlLmRhdGEoJ2NvbnZvRHJhZ2dlZCcpO1xuXHRcdFx0XHRcdCAgICBcdCRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgZHJvcCBldmVudCcsIGV2ZW50LCAndWknLCB1aSwgJ2RhdGEnLCBkYXRhKTtcblx0XHRcdFx0XHQgICAgXHRcblx0XHRcdFx0XHQgICAgXHRpZiAoIGRhdGEpIHtcblx0XHRcdFx0XHQgICAgXHRcdFxuXHRcdFx0XHRcdCAgICBcdCAgICAgIGlmICggZGF0YS5oYW5kbGVkKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHRcdCAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBhbHJlYWR5IGhhbmRsZWQnKTtcblx0XHRcdFx0XHQgICAgXHRcdFx0ICByZXR1cm47XG5cdFx0XHRcdFx0ICAgIFx0XHQgIH1cblx0XHRcdFx0XHQgICAgXHRcdFxuXHRcdFx0XHRcdFx0ICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ICAgICAgICBcdCAgXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgICBpZiAoIGRhdGEudHlwZSA9PSAnZGVmaW5pdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBuZXcgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnREZWZpbml0aW9uLCAndG8gY29udGFpbmVyJywgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdLCAnaW4gY29tcG9uZW50JywgJHNjb3BlLmNvbXBvbmVudCk7XG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHQgIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0ICBwcm9wZXJ0aWVzQ29udGV4dC5hZGROZXdDb21wb25lbnQoIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0XHRcdCAgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIsIFxuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0XHRcdCAgZGF0YS5jb21wb25lbnREZWZpbml0aW9uKTtcblx0XHRcdFx0XHRcdFx0ICAgICAgICAgIH0gZWxzZSBpZiAoIGRhdGEudHlwZSA9PSAnY29tcG9uZW50Jykge1xuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0ICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIG1vdmUgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnQpO1xuXHRcdFx0XHRcdFx0XHQgICAgICAgIFx0ICBcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgcHJvcGVydGllc0NvbnRleHQubW92ZUNvbXBvbmVudCggXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBkYXRhLmNvbnRhaW5lckNvbnRyb2xsZXIsXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciwgXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgXHRcdFx0ICBkYXRhLmNvbXBvbmVudCk7XG4vL1x0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgfVxuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgfSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ICAgICAgICBcdCAgdGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgdG8gaGF2ZSB0eXBlIFtkZWZpbml0aW9uXSBvciBbY29tcG9uZW50XScpO1xuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgfVxuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgZGF0YS5oYW5kbGVkXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHQgICAgICAgICAgb3BlbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0ICAgIFx0ICB9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0ICAkbG9nLmVycm9yKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgRXhwZWN0ZWQgdG8gaGF2ZSBbY29udm9EcmFnZ2VkXSBkYXRhIFsnK2V2ZW50LnRhcmdldC5jbGFzc05hbWUrJ10nKTtcblx0XHRcdFx0XHQgICAgXHQgIH1cblx0XHRcdFx0XHQgICAgXHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0ICAgICAgfSxcblx0XHRcdFx0XHQgICAgICBvdmVyOiBmdW5jdGlvbiggZXZlbnQsIHVpKSB7XG5cdFx0XHRcdFx0ICAgIFx0ICBpZiAoICFvcGVuKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQgIG9wZW5fdGltZXJcdD1cdCR0aW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQgICAgXHRcdFx0ICBvcGVuID0gdHJ1ZTtcblx0XHRcdFx0XHQgICAgXHRcdCAgfSwgQVVUT19PUEVOX1RJTUVPVVQpO1xuXHRcdFx0XHRcdCAgICBcdCAgfVxuXHRcdFx0XHRcdCAgICAgIH0sIFxuXHRcdFx0XHRcdCAgICAgIG91dDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuXHRcdFx0XHRcdCAgICBcdCAgaWYgKCBvcGVuX3RpbWVyKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQgICR0aW1lb3V0LmNhbmNlbCggb3Blbl90aW1lciApO1xuXHRcdFx0XHRcdCAgICBcdFx0ICBvcGVuX3RpbWVyXHQ9XHRudWxsO1xuXHRcdFx0XHRcdCAgICBcdCAgfVxuXHRcdFx0XHRcdCAgICAgIH0sIFxuXHRcdFx0XHRcdCAgICB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmdW5jdGlvbiBfaW5pdERyb3BwYWJsZUJhY2tncm91bmQoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyICRkcm9wcGFibGVcdD1cdGpRdWVyeSgkZWxlbWVudC5maW5kKCAnLnJlYWwtY29udGFpbmVyJylbMF0pO1xuLy9cdFx0XHRcdFx0JGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBfaW5pdERyb3BwYWJsZUJhY2tncm91bmQoKSAkZHJvcHBhYmxlJywgJGRyb3BwYWJsZSk7XG4vL1x0XHRcdFx0XHQkZHJvcHBhYmxlLm9uKCAnZHJhZ292ZXInLCBmdW5jdGlvbiggZXZlbnQpIHtcbi8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBfaW5pdERyb3BwYWJsZUJhY2tncm91bmQoKScpO1xuLy9cdFx0XHRcdFx0XHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbi8vXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0JGRyb3BwYWJsZS5kcm9wcGFibGUoe1xuXHRcdFx0XHRcdFx0Z3JlZWR5OiB0cnVlLFxuLy9cdFx0XHRcdFx0XHRhY2NlcHQgOiAnI3BhdHRlcm4nLFxuXHRcdFx0XHRcdFx0b3ZlcjogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0XHQvL1x0XHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRhY3RpdmF0ZTogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0XHRcdC8vXHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRcdH0sXG4vL1x0XHRcdFx0XHRcdG91dDogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcbi8vXHRcdFx0XHRcdFx0XHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbi8vXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by5lZGl0b3InKVxuICAgICAgICAuc2VydmljZSgnQ29udm93b3Jrc0FwaScsIENvbnZvd29ya3NBcGkpO1xuXG4gICAgLyogQG5nSW5qZWN0ICovXG4gICAgZnVuY3Rpb24gQ29udm93b3Jrc0FwaSggJGxvZywgJGh0dHAsICRxLCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwsIENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwpIHtcblxuXHRcdHZhciBkZWZpbml0aW9uc1x0XHQ9XHRudWxsO1xuXG5cdFx0Ly8gSU5URVJGQUNFXG5cdFx0XG5cdFx0Ly8gL2NvbnZvLWRlZmluaXRpb25zXG4gICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnMgICAgPSAgIGdldENvbXBvbmVudERlZmluaXRpb25zO1xuXHRcdHRoaXMuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiAgICAgPSAgIGdldENvbXBvbmVudERlZmluaXRpb247XG5cdFx0dGhpcy5nZXRUZW1wbGF0ZXNcdFx0XHQgICAgPSAgIGdldFRlbXBsYXRlcztcblx0XHRcblx0XHQvLyAvc2VydmljZXNcblx0XHR0aGlzLmdldEFsbFNlcnZpY2VzICAgICAgICAgICAgID1cdGdldEFsbFNlcnZpY2VzO1xuXHRcdFxuXHRcdC8vIC9zZXJ2aWNlcy97c2VydmljZUlkfVxuICAgICAgICB0aGlzLmdldFNlcnZpY2VCeUlkICAgICAgICAgICAgID0gICBnZXRTZXJ2aWNlQnlJZDtcbiAgICAgICAgdGhpcy5nZXRTZXJ2aWNlTWV0YSAgICAgICAgICAgICA9ICAgZ2V0U2VydmljZU1ldGE7XG4gICAgICAgIHRoaXMuY3JlYXRlU2VydmljZSAgICAgICAgICAgICAgPSAgIGNyZWF0ZVNlcnZpY2U7XG5cdFx0dGhpcy51cGRhdGVTZXJ2aWNlICAgICAgICAgICAgXHQ9XHR1cGRhdGVTZXJ2aWNlO1xuXG5cdFx0Ly8gL3NlcnZpY2VzL3tzZXJ2aWNlSWR9L21ldGFcblx0XHR0aGlzLnVwZGF0ZVNlcnZpY2VNZXRhXHRcdFx0PVx0dXBkYXRlU2VydmljZU1ldGE7XG5cblx0XHQvLyAvc2VydmljZXMve3NlcnZpY2VJZH0vcHJldmlld1xuXHRcdHRoaXMuZ2V0U2VydmljZVByZXZpZXdcdFx0XHQ9XHRnZXRTZXJ2aWNlUHJldmlldztcblxuXHRcdC8vIC9zZXJ2aWNlLXJ1bi97c2VydmljZUlkfVxuXHRcdHRoaXMuc2VuZE1lc3NhZ2UgICAgICAgICAgICAgICAgPSAgIHNlbmRNZXNzYWdlO1xuXG5cdFx0Ly8gL3NlcnZpY2UtaW1wLWV4cC9pbXBvcnQve3NlcnZpY2VJZH1cblx0XHR0aGlzLnVwbG9hZFNlcnZpY2VEYXRhICAgIFx0XHQ9ICAgdXBsb2FkU2VydmljZURhdGE7XG5cblx0XHQvLyAvc2VydmljZS1wbGF0ZmZvcm0tY29uZmlnL3tzZXJ2aWNlSWR9XG4gICAgICAgIHRoaXMubG9hZFBsYXRmb3JtQ29uZmlnXHRcdFx0PSAgIGxvYWRQbGF0Zm9ybUNvbmZpZztcbiAgICAgICAgdGhpcy5nZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcgICA9ICAgZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnO1xuICAgICAgICB0aGlzLmNyZWF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyAgID0gICBjcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWc7XG4gICAgICAgIHRoaXMudXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnICAgPSAgIHVwZGF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZztcbiAgICAgICAgdGhpcy5wcm9wYWdhdGVTZXJ2aWNlUGxhdGZvcm1cdD0gICBwcm9wYWdhdGVTZXJ2aWNlUGxhdGZvcm07XG4gICAgICAgIHRoaXMuZ2V0UHJvcGFnYXRlSW5mb1x0XHRcdD0gICBnZXRQcm9wYWdhdGVJbmZvO1xuICAgICAgICBcbiAgICAgICAgLy8gcHVibGlzaC1zZXJ2aWNlL3twbGF0Zm9ybUlkfS97c2VydmljZUlkfVxuICAgICAgICB0aGlzLmdldFB1Ymxpc2hJbmZvcm1hdGlvbiAgICAgXHQ9ICAgZ2V0UHVibGlzaEluZm9ybWF0aW9uO1xuXHRcdFxuXHRcdHRoaXMuZ2V0U2VydmljZVZlcnNpb25zICAgICBcdD0gICBnZXRTZXJ2aWNlVmVyc2lvbnM7XG5cdFx0dGhpcy5nZXRTZXJ2aWNlUmVsZWFzZXMgICAgIFx0PSAgIGdldFNlcnZpY2VSZWxlYXNlcztcblx0XHR0aGlzLmNyZWF0ZVJlbGVhc2UgICAgIFx0XHRcdD0gICBjcmVhdGVSZWxlYXNlO1xuXHRcdHRoaXMucHJvbW90ZVJlbGVhc2VcdFx0XHRcdD0gICBwcm9tb3RlUmVsZWFzZTtcblx0XHR0aGlzLmltcG9ydFdvcmtmbG93SW50b1JlbGVhc2VcdD0gICBpbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlO1xuXHRcdFxuXHRcdC8vIG1lZGlhL3tzZXJ2aWNlSWR9XG5cdFx0dGhpcy51cGxvYWRNZWRpYSA9IHVwbG9hZE1lZGlhO1xuXHRcdHRoaXMuZG93bmxvYWRNZWRpYSA9IGRvd25sb2FkTWVkaWE7XG5cblx0XHQvLyBwYWNrYWdlLWhlbHAve3BhY2thZ2VJZH0ve2ZpbGVuYW1lfVxuXHRcdHRoaXMuZ2V0UGFja2FnZUNvbXBvbmVudEhlbHAgPSBnZXRQYWNrYWdlQ29tcG9uZW50SGVscDtcblxuICAgICAgICB0aGlzLnJlcXVlc3RBdXRoVXJsID0gcmVxdWVzdEF1dGhVcmw7XG5cbiB0aGlzLmdldFBsYXRmb3JtQ29uZmlndXJhdGlvbiA9IGdldFBsYXRmb3JtQ29uZmlndXJhdGlvbjtcbiAgICAgICAgdGhpcy51cGRhdGVQbGF0Zm9ybUNvbmZpZ3VyYXRpb24gPSB1cGRhdGVQbGF0Zm9ybUNvbmZpZ3VyYXRpb247XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0UGxhdGZvcm1Db25maWd1cmF0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy91c2VyLXBsYXRmb3JtLWNvbmZpZydcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKFwiQ29udm93b3Jrc0FwaSBnZXRQbGF0Zm9ybUNvbmZpZ3VyYXRpb24oKSByZXNcIiwgcmVzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlUGxhdGZvcm1Db25maWd1cmF0aW9uKGNvbmZpZylcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwdXQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy91c2VyLXBsYXRmb3JtLWNvbmZpZycsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhOiBjb25maWdcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKFwiQ29udm93b3Jrc0FwaSB1cGRhdGVQbGF0Zm9ybUNvbmZpZygpIHJlc1wiLCByZXMpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIHJlcXVlc3RBdXRoVXJsKHVzZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICB1cmw6IENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwgKyAnL2FkbWluLWF1dGgvYW1hem9uP3VzZXJuYW1lPScgKyB1c2VyLmVtYWlsXG4gICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnR290IHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG5cdFx0Ly8gVEVNUExBVEVTXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVzKCkge1xuXHRcdFx0dmFyIGRcdD1cdCRxLmRlZmVyKCk7XG4gICAgXHRcdFxuICAgIFx0XHRnZXRDb21wb25lbnREZWZpbml0aW9ucygpLnRoZW4oIGZ1bmN0aW9uKCBkZWZpbml0aW9ucykge1xuICAgIFx0XHRcdHZhciB0ZW1wbGF0ZXNcdD1cdFtdO1xuXHRcdFx0XHRmb3IgKCB2YXIgaT0wOyBpPGRlZmluaXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIHBja2dcdD1cdGRlZmluaXRpb25zW2ldO1xuXHRcdFx0XHRcdGZvciAoIHZhciBqPTA7IGo8cGNrZy50ZW1wbGF0ZXMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRcdHRlbXBsYXRlcy5wdXNoKCBwY2tnLnRlbXBsYXRlc1tqXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRkLnJlc29sdmUoIHRlbXBsYXRlcyk7XG5cdFx0XHRcdFxuLy9cdFx0XHRcdGQucmVqZWN0KCAnQ29tcG9uZW50IFsnK2NsYXNzTmFtZSsnXSBub3QgZm91bmQnKTtcblx0XHRcdH0pO1xuICAgIFx0XHRcbiAgICBcdFx0cmV0dXJuIGQucHJvbWlzZTtcblx0XHR9XG5cblx0XHQvLyBERUZJTklUSU9OU1xuICAgICAgICBmdW5jdGlvbiBnZXRDb21wb25lbnREZWZpbml0aW9ucygpIHtcbiAgICAgICAgXHRpZiAoICEhZGVmaW5pdGlvbnMpXG4gICAgICAgIFx0e1xuXHRcdFx0XHR2YXIgZFx0PVx0JHEuZGVmZXIoKTtcblxuXHRcdFx0XHRkLnJlc29sdmUoIGRlZmluaXRpb25zKTtcblxuXHRcdFx0XHRyZXR1cm4gZC5wcm9taXNlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuICAgICAgICAgICAgXHRyZXR1cm4gJGh0dHAoe1xuXHRcdFx0XHRcdG1ldGhvZDogJ0dFVCcsXG5cdFx0XHRcdFx0dXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3VzZXItcGFja2FnZXMnXG5cdFx0XHRcdH0pLnRoZW4oIGZ1bmN0aW9uICggcmVzKSB7XG5cdFx0XHRcdFx0ZGVmaW5pdGlvbnNcdD1cdHJlcy5kYXRhO1xuXHRcdFx0XHRcdHJldHVybiBkZWZpbml0aW9ucztcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIGdldENvbXBvbmVudERlZmluaXRpb24oIGNsYXNzTmFtZSkge1xuLy8gICAgICAgIFx0JGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldENvbXBvbmVudERlZmluaXRpb24oJXMpJywgY2xhc3NOYW1lKTtcbiAgICBcdFx0dmFyIGRcdD1cdCRxLmRlZmVyKCk7XG4gICAgXHRcdFxuICAgIFx0XHRnZXRDb21wb25lbnREZWZpbml0aW9ucygpLnRoZW4oIGZ1bmN0aW9uKCBkZWZpbml0aW9ucykge1xuXHRcdFx0XHRmb3IgKCB2YXIgaT0wOyBpPGRlZmluaXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIHBja2dcdD1cdGRlZmluaXRpb25zW2ldO1xuXHRcdFx0XHRcdGZvciAoIHZhciBqPTA7IGo8cGNrZy5jb21wb25lbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0XHR2YXIgY29tcCA9IHBja2cuY29tcG9uZW50c1tqXTtcblx0XHRcdFx0XHRcdGlmICggY29tcFsndHlwZSddID09PSBjbGFzc05hbWUpIHtcblx0XHRcdFx0XHRcdFx0ZC5yZXNvbHZlKCBjb21wKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbXA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoY29tcFsnY29tcG9uZW50X3Byb3BlcnRpZXMnXVsnX2NsYXNzX2FsaWFzZXMnXSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgYWxpYXNlcyA9IGNvbXBbJ2NvbXBvbmVudF9wcm9wZXJ0aWVzJ11bJ19jbGFzc19hbGlhc2VzJ107XG5cdFx0XHRcdFx0XHRcdGZvciAoIHZhciBuID0gMDsgbiA8IGFsaWFzZXMubGVuZ3RoOyBuKyspIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoYWxpYXNlc1tuXSA9PT0gY2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRkLnJlc29sdmUoIGNvbXApO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbXA7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGQucmVqZWN0KCAnQ29tcG9uZW50IFsnK2NsYXNzTmFtZSsnXSBub3QgZm91bmQnKTtcblx0XHRcdH0pO1xuICAgIFx0XHRcbiAgICBcdFx0cmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEFsbFNlcnZpY2VzKCkge1xuICAgICAgICBcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRBbGxTZXJ2aWNlcygpJyk7XG5cbiAgICAgICAgXHRyZXR1cm4gJGh0dHAoe1xuXHRcdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0XHR1cmw6IENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZXMnXG5cdFx0XHR9KS50aGVuKCBmdW5jdGlvbiAoIHJlcykge1xuXHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTZXJ2aWNlQnlJZCggc2VydmljZUlkKSB7XG4gICAgICAgIFx0JGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldFNlcnZpY2VCeUlkKCVzKScsIHNlcnZpY2VJZCk7XG4gICAgICAgIFx0cmV0dXJuICRodHRwKHtcblx0XHRcdFx0bWV0aG9kOiAnR0VUJyxcblx0XHRcdFx0dXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2VzLycgKyBzZXJ2aWNlSWRcblx0XHRcdH0pLnRoZW4oIGZ1bmN0aW9uICggcmVzKSB7XG5cdFx0XHRcdHJldHVybiByZXMuZGF0YTtcblx0XHRcdH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2VydmljZU1ldGEoIHNlcnZpY2VJZCkge1xuICAgICAgICBcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlTWV0YSglcyknLCBzZXJ2aWNlSWQpO1xuICAgICAgICBcdHJldHVybiAkaHR0cCh7XG4gICAgICAgIFx0XHRtZXRob2Q6ICdHRVQnLFxuICAgICAgICBcdFx0dXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2VzLycgKyBzZXJ2aWNlSWQgKyAnL21ldGEnXG4gICAgICAgIFx0fSkudGhlbiggZnVuY3Rpb24gKCByZXMpIHtcbiAgICAgICAgXHRcdHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgXHR9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVNlcnZpY2UoIHNlcnZpY2VOYW1lLCB0ZW1wbGF0ZUlkKVxuICAgICAgICB7XG4gICAgICAgIFx0cmV0dXJuICRodHRwKHtcblx0XHQgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxuXHRcdCAgICAgICAgdXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2VzJyxcblx0XHQgICAgICAgIGRhdGE6IHsgJ3NlcnZpY2VfbmFtZScgOiBzZXJ2aWNlTmFtZSwgJ3RlbXBsYXRlX2lkJyA6IHRlbXBsYXRlSWQgfVxuXHQgICAgICAgIH0pLnRoZW4oIGZ1bmN0aW9uICggcmVzKSB7XG5cdCAgICAgICAgXHRyZXR1cm4gcmVzLmRhdGE7XG5cdCAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTZXJ2aWNlKCBzZXJ2aWNlSWQsIHNlcnZpY2UpIHtcbiAgICAgICAgXHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgcG9zdFNlcnZpY2UoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQpO1xuXG4gICAgICAgIFx0cmV0dXJuICRodHRwLnB1dCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlcy8nICsgc2VydmljZUlkLCBzZXJ2aWNlKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVTZXJ2aWNlTWV0YSggc2VydmljZUlkLCBtZXRhKSB7XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgdXBkYXRlU2VydmljZU1ldGEoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdtZXRhJywgbWV0YSk7XG5cblx0XHRcdHJldHVybiAkaHR0cC5wdXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZXMvJyArIHNlcnZpY2VJZCArICcvbWV0YScsIG1ldGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlcnZpY2VQcmV2aWV3KHNlcnZpY2VJZCkge1xuXHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVByZXZpZXMoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQpO1xuXG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlcy8nICsgc2VydmljZUlkICsgJy9wcmV2aWV3Jylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YVxuXHRcdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZW5kTWVzc2FnZSggc2VydmljZUlkLCBkZXZpY2VJZCwgdGV4dCwgaXNMYXVuY2gsIHZhcmlhbnQsIGRlbGVnYXRlTmxwKVxuXHRcdHtcbiAgICAgICAgICAgIGlmICggIXZhcmlhbnQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gICAnZGV2ZWxvcCc7XG4gICAgICAgICAgICB9XG5cblx0XHRcdHJldHVybiAkaHR0cCh7XG5cdFx0XHRcdG1ldGhvZDogXCJwb3N0XCIsXG5cdFx0XHRcdHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXRlc3QvJyArIHNlcnZpY2VJZCxcblx0XHRcdFx0ZGF0YSA6IHsgZGV2aWNlX2lkIDogZGV2aWNlSWQsIHRleHQgOiB0ZXh0LCBsdW5jaCA6IGlzTGF1bmNoLCBwbGF0Zm9ybV9pZDogZGVsZWdhdGVObHAgfVxuXHRcdFx0fSkudGhlbiggZnVuY3Rpb24gKCByZXNwb25zZSkge1xuXHRcdFx0XHQkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBzZW5kTWVzc2FnZSByZXNwb25zZS5kYXRhJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBsb2FkU2VydmljZURhdGEoIHNlcnZpY2VJZCwgZmlsZSwga2VlcFZhcnMsIGtlZXBDb25maWdzKSB7XG5cblx0XHRcdGlmICggIXNlcnZpY2VJZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdNaXNzaW5nIHNlcnZpY2UgaWQnKTtcblx0XHRcdH1cblxuICAgICAgICBcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSB1cGxvYWRTZXJ2aWNlRGF0YSgpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCwgJ2ZpbGUnLCBmaWxlKTtcbiAgICAgICAgICAgIHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAgICAgZmQuYXBwZW5kKFwic2VydmljZV9kZWZpbml0aW9uXCIsIGZpbGUpO1xuICAgICAgICAgICAgZmQuYXBwZW5kKFwia2VlcF92YXJzXCIsIGtlZXBWYXJzKTtcbiAgICAgICAgICAgIGZkLmFwcGVuZChcImtlZXBfY29uZmlnc1wiLCBrZWVwQ29uZmlncyk7XG4gICAgICAgICAgICBcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0LnBvc3QoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1pbXAtZXhwL2ltcG9ydC8nICsgc2VydmljZUlkLCBmZCwgeyBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6IHVuZGVmaW5lZCB9fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgdXBsb2FkU2VydmljZURhdGEoKSByZXMnLCByZXMpO1xuXHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHR9KTtcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRQbGF0Zm9ybUNvbmZpZyggc2VydmljZUlkKSB7XG5cblx0XHRcdGlmICggIXNlcnZpY2VJZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdNaXNzaW5nIHNlcnZpY2UgaWQnKTtcblx0XHRcdH1cblxuICAgICAgICBcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBsb2FkUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQpO1xuICAgICAgICAgICAgXG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wbGF0Zm9ybS1jb25maWcvJyArIHNlcnZpY2VJZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgbG9hZFBsYXRmb3JtQ29uZmlnKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoIHNlcnZpY2VJZCwgcGxhdGZvcm1JZCkge1xuXHRcdFx0XG5cdFx0XHRpZiAoICFzZXJ2aWNlSWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdwbGF0Zm9ybUlkJywgcGxhdGZvcm1JZCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0LmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXBsYXRmb3JtLWNvbmZpZy8nICsgc2VydmljZUlkICsnLycrcGxhdGZvcm1JZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQsIGRhdGEpIHtcblx0XHRcdFxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCkgc2VydmljZUlkJywgc2VydmljZUlkLCAncGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdC5wb3N0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcGxhdGZvcm0tY29uZmlnLycgKyBzZXJ2aWNlSWQgKycvJytwbGF0Zm9ybUlkLCBkYXRhKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHQkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBjcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSByZXMnLCByZXMpO1xuXHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHR9KTtcdFxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiB1cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoIHNlcnZpY2VJZCwgcGxhdGZvcm1JZCwgZGF0YSkge1xuXHRcdFx0XG5cdFx0XHRpZiAoICFzZXJ2aWNlSWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSB1cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdwbGF0Zm9ybUlkJywgcGxhdGZvcm1JZCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0LnB1dCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXBsYXRmb3JtLWNvbmZpZy8nICsgc2VydmljZUlkICsnLycrcGxhdGZvcm1JZCwgZGF0YSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgdXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gcHJvcGFnYXRlU2VydmljZVBsYXRmb3JtKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQpIHtcblx0XHRcdFxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgcHJvcGFnYXRlU2VydmljZVBsYXRmb3JtKCkgc2VydmljZUlkJywgc2VydmljZUlkLCAncGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdC5wb3N0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcGxhdGZvcm0tcHJvcGFnYXRlLycgKyBzZXJ2aWNlSWQgKycvJytwbGF0Zm9ybUlkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHQkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBwcm9wYWdhdGVTZXJ2aWNlUGxhdGZvcm0oKSByZXMnLCByZXMpO1xuXHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHR9KTtcdFxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBnZXRQcm9wYWdhdGVJbmZvKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQpIHtcblx0XHRcdFxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgZ2V0UHJvcGFnYXRlSW5mbygpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCwgJ3BsYXRmb3JtSWQnLCBwbGF0Zm9ybUlkKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHQuZ2V0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcGxhdGZvcm0tcHJvcGFnYXRlLycgKyBzZXJ2aWNlSWQgKycvJytwbGF0Zm9ybUlkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHQkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRQcm9wYWdhdGVJbmZvKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gZ2V0UHVibGlzaEluZm9ybWF0aW9uKCBzZXJ2aWNlSWQpIHtcblxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXG4gICAgICAgIFx0JGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldFB1Ymxpc2hJbmZvcm1hdGlvbigpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG4gICAgICAgICAgICBcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0LmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXB1Ymxpc2gvJyArIHNlcnZpY2VJZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0UHVibGlzaEluZm9ybWF0aW9uKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcbiAgICAgICAgfVxuICAgICAgICBcblx0XHRcdFx0XG5cdFx0ZnVuY3Rpb24gZ2V0U2VydmljZVZlcnNpb25zKCBzZXJ2aWNlSWQpIHtcblx0XHRcdFxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVZlcnNpb25zKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHQuZ2V0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtdmVyc2lvbnMvJyArIHNlcnZpY2VJZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVZlcnNpb25zKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY3JlYXRlUmVsZWFzZSggc2VydmljZUlkLCBwbGF0Zm9ybUlkLCB0eXBlLCBzdGFnZSkge1xuXHRcdFx0XG5cdFx0XHRpZiAoICFzZXJ2aWNlSWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBjcmVhdGVSZWxlYXNlKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblx0XHRcdFxuXHRcdFx0dmFyIGRhdGFcdD1cdHtcblx0XHRcdFx0XHRwbGF0Zm9ybV9pZCA6IHBsYXRmb3JtSWQsXG5cdFx0XHRcdFx0dHlwZSA6IHR5cGUsXG5cdFx0XHRcdFx0c3RhZ2UgOiBzdGFnZVxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHQucG9zdCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXJlbGVhc2VzLycgKyBzZXJ2aWNlSWQsIGRhdGEpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cdFx0XHRcdCRsb2cubG9nKCdDb252b3dvcmtzQXBpIGNyZWF0ZVJlbGVhc2UoKSByZXMnLCByZXMpO1xuXHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHR9KTtcdFxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBwcm9tb3RlUmVsZWFzZSggc2VydmljZUlkLCByZWxlYXNlSWQsIHR5cGUsIHN0YWdlKSB7XG5cdFx0XHRcblx0XHRcdGlmICggIXNlcnZpY2VJZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdNaXNzaW5nIHNlcnZpY2UgaWQnKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0JGxvZy5sb2coICdDb252b3dvcmtzQXBpIHByb21vdGVSZWxlYXNlKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblx0XHRcdFxuXHRcdFx0dmFyIGRhdGFcdD1cdHtcblx0XHRcdFx0XHRyZWxlYXNlX2lkIDogcmVsZWFzZUlkLFxuXHRcdFx0XHRcdHR5cGUgOiB0eXBlLFxuXHRcdFx0XHRcdHN0YWdlIDogc3RhZ2Vcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0LnB1dCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXJlbGVhc2VzLycgKyBzZXJ2aWNlSWQsIGRhdGEpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cdFx0XHRcdCRsb2cubG9nKCdDb252b3dvcmtzQXBpIHByb21vdGVSZWxlYXNlKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gaW1wb3J0V29ya2Zsb3dJbnRvUmVsZWFzZSggc2VydmljZUlkLCByZWxlYXNlSWQsIHZlcnNpb25JZCkge1xuXHRcdFx0XG5cdFx0XHRpZiAoICFzZXJ2aWNlSWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdCRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBpbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHQucG9zdCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXJlbGVhc2VzLycgKyBzZXJ2aWNlSWQgKyAnLycgKyByZWxlYXNlSWQgKyAnL2ltcG9ydC13b3JrZmxvdy8nICsgdmVyc2lvbklkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHQkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBpbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gZ2V0U2VydmljZVJlbGVhc2VzKCBzZXJ2aWNlSWQpIHtcblx0XHRcdFxuXHRcdFx0aWYgKCAhc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVJlbGVhc2VzKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHQuZ2V0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcmVsZWFzZXMvJyArIHNlcnZpY2VJZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVJlbGVhc2VzKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdFx0fSk7XHRcblx0XHR9XG5cdFx0XG5cblx0XHRmdW5jdGlvbiB1cGxvYWRNZWRpYShzZXJ2aWNlSWQsIGtpbmQsIGZpbGUpIHtcblx0XHRcdGlmICghc2VydmljZUlkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk1pc3Npbmcgc2VydmljZSBJRFwiKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0JGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgdXBsb2FkTWVkaWEgc2VydmljZUlkJywgc2VydmljZUlkLCAna2luZCcsIGtpbmQsICdmaWxlJywgZmlsZSk7XG5cblx0XHRcdHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0ZmQuYXBwZW5kKGtpbmQsIGZpbGUpO1xuXG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdC5wb3N0KFxuXHRcdFx0XHRDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL21lZGlhLycgKyBzZXJ2aWNlSWQsXG5cdFx0XHRcdGZkLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogdW5kZWZpbmVkIH1cblx0XHRcdFx0fVxuXHRcdFx0KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdCRsb2cubG9nKCdDb252b3dvcmtzQXBpIHVwbG9hZE1lZGlhIHJlcycsIHJlcyk7XG5cdFx0XHRcdHJldHVybiByZXMuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRvd25sb2FkTWVkaWEoc2VydmljZUlkLCBtZWRpYUl0ZW1JZCkge1xuXHRcdFx0cmV0dXJuIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvbWVkaWEvJyArIHNlcnZpY2VJZCArICcvJyArIG1lZGlhSXRlbUlkICsgJy9kb3dubG9hZCc7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UGFja2FnZUNvbXBvbmVudEhlbHAocGFja2FnZUlkLCBmaWxlbmFtZSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvcGFja2FnZS1oZWxwLycgKyBwYWNrYWdlSWQgKyAnLycgKyBmaWxlbmFtZSlcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHRcdCRsb2cubG9nKCdDb252b3dvcmtzQXBpIGdldFBhY2thZ2VDb21wb25lbnRIZWxwKCkgcmVzJywgcmVzKTtcblx0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG5cdFx0XHRcdH0pO1xuXHRcdH1cbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblxuXHR2YXIgbW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpO1xuXG5cdG1vZHVsZS5zZXJ2aWNlKCAnQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZScsIENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBDb252b3dvcmtzQWRkQmxvY2tTZXJ2aWNlKCAkbG9nLCAkdWliTW9kYWwpIHtcblxuXHRcdHRoaXMuc2hvd01vZGFsXHRcdFx0XHQ9XHRzaG93TW9kYWw7XG5cdFx0dGhpcy5zaG93U3Vicm91dGluZU1vZGFsXHQ9XHRzaG93U3Vicm91dGluZU1vZGFsO1xuXHRcdFxuXHRcdGZ1bmN0aW9uIHNob3dNb2RhbCggc2VydmljZSwgdHlwZSwgcHJvcGVydGllc0NvbnRleHQpXG5cdFx0e1xuXHRcdFx0dmFyIG1vZGFsSW5zdGFuY2UgPSAkdWliTW9kYWwub3Blbih7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvY29udm93b3Jrcy1hZGQtYmxvY2sudG1wbC5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogTW9kYWxJbnN0YW5jZUN0cmwsXG5cdFx0XHRcdHNpemUgOiAnbWQnLFxuXHRcdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdFx0c2VydmljZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNlcnZpY2U7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0eXBlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHlwZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHN1YnJvdXRpbmVUeXBlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHByb3BlcnRpZXNDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydGllc0NvbnRleHQ7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBzaG93U3Vicm91dGluZU1vZGFsKCBzZXJ2aWNlLCBwcm9wZXJ0aWVzQ29udGV4dCwgc3Vicm91dGluZVR5cGUpXG5cdFx0e1xuXHRcdFx0dmFyIG1vZGFsSW5zdGFuY2UgPSAkdWliTW9kYWwub3Blbih7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvY29udm93b3Jrcy1hZGQtYmxvY2sudG1wbC5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogTW9kYWxJbnN0YW5jZUN0cmwsXG5cdFx0XHRcdHNpemUgOiAnbWQnLFxuXHRcdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdFx0c2VydmljZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNlcnZpY2U7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0eXBlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3JlYWRlcic7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzdWJyb3V0aW5lVHlwZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHN1YnJvdXRpbmVUeXBlO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0aWVzQ29udGV4dDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRcblx0XHQvKiBAbmdJbmplY3QgKi9cblx0XHR2YXIgTW9kYWxJbnN0YW5jZUN0cmwgPSBmdW5jdGlvbiAoICRzY29wZSwgJHRpbWVvdXQsICR1aWJNb2RhbEluc3RhbmNlLCBzZXJ2aWNlLCB0eXBlLCBzdWJyb3V0aW5lVHlwZSwgcHJvcGVydGllc0NvbnRleHQpIHtcblxuXHRcdFx0JHNjb3BlLnNlcnZpY2VcdFx0XHQ9XHRzZXJ2aWNlO1xuXG5cdFx0XHQkc2NvcGUuYmxvY2tcdFx0XHQ9XHR7XG5cdFx0XHRcdFx0bmFtZSA6ICcnLFxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0aWYgKCB0eXBlID09ICd1c2VyJykgXG5cdFx0XHR7XG5cdFx0XHRcdCRzY29wZS50aXRsZVx0XHRcdD1cdCdBZGQgbmV3IHN0ZXAnO1xuXHRcdFx0XHQkc2NvcGUuZGVzY3JpcHRpb25cdFx0PVx0J0NyZWF0ZSBhIG5ldyBzdGVwIGluIHJoZSBjb252ZXJzYXRpb24gd29ya2Zsb3cuJztcblx0XHRcdFx0JHNjb3BlLmJsb2NrLm5hbWVcdFx0PVx0J015IG5ldyBjb252ZXJzYXRpb24gc3RlcCc7XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuY3JlYXRlQmxvY2sgXHRcdFx0PSBcdGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkbG9nLndhcm4oICdDb252b3dvcmtzQWRkQmxvY2tTZXJ2aWNlIE1vZGFsSW5zdGFuY2VDdHJsIGNyZWF0ZUJsb2NrKCkgJHNjb3BlLmJsb2NrJywgJHNjb3BlLmJsb2NrKTtcblx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5hZGRCbG9jayggJHNjb3BlLmJsb2NrLm5hbWUpO1xuXHRcdFx0XHRcdCR1aWJNb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSBcblx0XHRcdGVsc2UgaWYgKCB0eXBlID09ICdyZWFkZXInKSBcblx0XHRcdHtcblx0XHRcdFx0aWYgKCBzdWJyb3V0aW5lVHlwZSA9PSAncmVhZCcpIFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLnRpdGxlXHRcdFx0PVx0J0FkZCBuZXcgcmVhZCBmcmFnbWVudCc7XG5cdFx0XHRcdFx0JHNjb3BlLmRlc2NyaXB0aW9uXHRcdD1cdCdDcmVhdGUgbmV3IGZyYWdtZW50IHdoaWNoIGNhbiBiZSBpbnZva2VkIGZyb20gY29udmVyc2F0aW9uIGVsZW1ldHMnO1xuXHRcdFx0XHRcdCRzY29wZS5ibG9jay5uYW1lXHRcdD1cdCdNeSBuZXcgcmVhZCBmcmFnbWVudCc7XG5cdFx0XHRcdFxuXHRcdFx0XHRcdCRzY29wZS5jcmVhdGVCbG9jayBcdFx0XHQ9IFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JGxvZy53YXJuKCAnQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZSBNb2RhbEluc3RhbmNlQ3RybCBjcmVhdGVCbG9jaygpICRzY29wZS5ibG9jaycsICRzY29wZS5ibG9jayk7XG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5hZGRSZWFkU3Vicm91dGluZSggJHNjb3BlLmJsb2NrLm5hbWUpO1xuXHRcdFx0XHRcdFx0JHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICggc3Vicm91dGluZVR5cGUgPT0gJ3Byb2Nlc3MnKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JHNjb3BlLnRpdGxlXHRcdFx0PVx0J0FkZCBuZXcgcHJvY2VzcyBmcmFnbWVudCc7XG5cdFx0XHRcdFx0JHNjb3BlLmRlc2NyaXB0aW9uXHRcdD1cdCdDcmVhdGUgbmV3IGZyYWdtZW50IHdoaWNoIGNhbiBiZSBpbnZva2VkIGZyb20gY29udmVyc2F0aW9uIHByb2Nlc3NvcnMnO1xuXHRcdFx0XHRcdCRzY29wZS5ibG9jay5uYW1lXHRcdD1cdCdNeSBuZXcgcHJvY2VzcyBmcmFnbWVudCc7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdCRzY29wZS5jcmVhdGVCbG9jayBcdFx0XHQ9IFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JGxvZy53YXJuKCAnQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZSBNb2RhbEluc3RhbmNlQ3RybCBjcmVhdGVCbG9jaygpICRzY29wZS5ibG9jaycsICRzY29wZS5ibG9jayk7XG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5hZGRQcm9jZXNzU3Vicm91dGluZSggJHNjb3BlLmJsb2NrLm5hbWUpO1xuXHRcdFx0XHRcdFx0JHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdVbmV4cGVjdGVkIHN1YnJvdXRpbmVUeXBlIFsnK3N1YnJvdXRpbmVUeXBlKyddJyk7XG5cdFx0XHRcdH1cblxuXG5cdFx0XHRcdFxuXHRcdFx0fSBcblx0XHRcdGVsc2UgXG5cdFx0XHR7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ1VuZXhwZWN0ZWQgdHlwZSBbJyt0eXBlKyddJyk7XG5cdFx0XHR9XG5cdFx0XHRcblxuXHRcdFx0JHNjb3BlLmNhbmNlbCBcdFx0XHQ9IFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQkdWliTW9kYWxJbnN0YW5jZS5kaXNtaXNzKCdjYW5jZWwnKTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHR9O1xuXHR9O1xufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cblx0dmFyIG1vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCdjb252by5lZGl0b3InKTtcblxuXHRtb2R1bGUuc2VydmljZSggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UnLCBDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlKTtcblxuXHQvKiBAbmdJbmplY3QgKi9cblx0ZnVuY3Rpb24gQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSggJGxvZywgJHEsIENvbnZvd29ya3NBcGkpIHtcblxuICAgICAgICB0aGlzLmdlbmVyYXRlVW5pcXVlSWRcdFx0XHQ9XHRnZW5lcmF0ZVVuaXF1ZUlkO1xuICAgICAgICB0aGlzLmNyZWF0ZUNvbXBvbmVudFx0XHRcdD1cdGNyZWF0ZUNvbXBvbmVudDtcbiAgICAgICAgdGhpcy5jb3B5Q29tcG9uZW50XHRcdFx0XHQ9XHRjb3B5Q29tcG9uZW50O1xuICAgICAgICBcblx0XHR0aGlzLmNyZWF0ZUJsb2NrXHRcdFx0XHQ9XHRjcmVhdGVCbG9jaztcblx0XHR0aGlzLmNyZWF0ZVJlYWRTdWJyb3V0aW5lXHRcdD1cdGNyZWF0ZVJlYWRTdWJyb3V0aW5lO1xuXHRcdHRoaXMuY3JlYXRlUHJvY2Vzc1N1YnJvdXRpbmVcdD1cdGNyZWF0ZVByb2Nlc3NTdWJyb3V0aW5lO1xuXG5cbiAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVVbmlxdWVJZCgpIHsgXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gJyc7IFxuICAgICAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggOCk7XG4gICAgICAgICAgICByZXN1bHQgKz0gJy0nO1xuICAgICAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggNCk7XG4gICAgICAgICAgICByZXN1bHQgKz0gJy0nO1xuICAgICAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggNCk7XG4gICAgICAgICAgICByZXN1bHQgKz0gJy0nO1xuICAgICAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggNCk7XG4gICAgICAgICAgICByZXN1bHQgKz0gJy0nO1xuICAgICAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggMTIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvTG93ZXJDYXNlKCk7IFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBtYWtlaWQoIGxlbmd0aCkge1xuICAgICAgICBcdCAgIHZhciByZXN1bHQgICAgICAgICAgID0gJyc7XG4gICAgICAgIFx0ICAgdmFyIGNoYXJhY3RlcnMgICAgICAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuICAgICAgICBcdCAgIHZhciBjaGFyYWN0ZXJzTGVuZ3RoID0gY2hhcmFjdGVycy5sZW5ndGg7XG4gICAgICAgIFx0ICAgZm9yICggdmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG4gICAgICAgIFx0ICAgICAgcmVzdWx0ICs9IGNoYXJhY3RlcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNMZW5ndGgpKTtcbiAgICAgICAgXHQgICB9XG4gICAgICAgIFx0ICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gY29weUNvbXBvbmVudCggc2VydmljZSwgY29tcG9uZW50VG9Db3B5KSBcbiAgICAgICAge1xuICAgICAgICBcdCRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjb3B5Q29tcG9uZW50IGNvbXBvbmVudFRvQ29weScsIGNvbXBvbmVudFRvQ29weSk7XG4gICAgICAgIFx0XG4gICAgICAgIFx0dmFyIGNvbXBvbmVudFx0PVx0YW5ndWxhci5jb3B5KCBjb21wb25lbnRUb0NvcHkpO1xuICAgICAgICBcdF9yZWdlbmVyYXRlQ29tcG9uZW50SWRzKCBjb21wb25lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX3JlZ2VuZXJhdGVDb21wb25lbnRJZHMoIGNvbXBvbmVudClcbiAgICAgICAge1xuICAgICAgICBcdGNvbXBvbmVudC5wcm9wZXJ0aWVzLl9jb21wb25lbnRfaWQgID0gICBnZW5lcmF0ZVVuaXF1ZUlkKCk7XG4gICAgICAgIFx0XG4gICAgICAgIFx0Zm9yICggdmFyIGtleSBpbiBjb21wb25lbnQucHJvcGVydGllcykge1xuICAgICAgICBcdFx0aWYgKCBhbmd1bGFyLmlzQXJyYXkoIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0pKSB7XG4gICAgICAgIFx0XHRcdGZvciAoIHZhciBpPTA7IGk8Y29tcG9uZW50LnByb3BlcnRpZXNba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgXHRcdFx0aWYgKCBjb21wb25lbnQucHJvcGVydGllc1trZXldW2ldWydjbGFzcyddKSB7XG4gICAgICAgICAgICBcdFx0XHRcdF9yZWdlbmVyYXRlQ29tcG9uZW50SWRzKCBjb21wb25lbnQucHJvcGVydGllc1trZXldW2ldKTtcbiAgICAgICAgICAgIFx0XHRcdH1cbiAgICAgICAgXHRcdFx0fVxuICAgICAgICBcdFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdFx0aWYgKCBjb21wb25lbnQucHJvcGVydGllc1trZXldICYmIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1bJ2NsYXNzJ10pIHtcbiAgICAgICAgXHRcdFx0XHRfcmVnZW5lcmF0ZUNvbXBvbmVudElkcyggY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSk7XG4gICAgICAgIFx0XHRcdH1cbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHR9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoIHNlcnZpY2UsIGRlZmluaXRpb24sIG5hbWUpIFxuICAgICAgICB7XG4gICAgICAgIFx0JGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIGNyZWF0aW5nIGRlZmluaXRpb24udHlwZScsIGRlZmluaXRpb24udHlwZSwgJ25hbWUnLCBuYW1lKTtcbiAgICAgICAgICAgIHZhciBjb21wb25lbnRcdFx0PVx0e1xuICAgICAgICAgICAgICAgICAgICBjbGFzcyA6IGRlZmluaXRpb24udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlIDpcdGRlZmluaXRpb24ubmFtZXNwYWNlLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzIDoge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMpIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBjaGVja2luZyBwcm9wZXJ0eScsIGtleSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5lZGl0b3JfdHlwZSA9PT0gJ2Jsb2NrX2lkJyB8fFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgPT09ICdwcm9jZXNzX2ZyYWdtZW50JyB8fFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgPT09ICdyZWFkX2ZyYWdtZW50Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBibG9ja19pZCAtIHByZWRlZmluZWQgYmVoYXZpb3VyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gPSBfZ2VuZXJhdGVCbG9ja0lkKCBzZXJ2aWNlLCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgPT09ICdzZXJ2aWNlX2NvbXBvbmVudHMnKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIHNlcnZpY2VfY29tcG9uZW50cyBlZGl0b3InKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIHR5cGVvZiBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIG5vIGRlZmF1bHQgdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIGVtcHR5IGRlZmF1bHQgdmFsdWUnLCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gICAgICAgPSAgIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmVkaXRvcl9wcm9wZXJ0aWVzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgbXVsdGlwbGUgY29tcG9uZW50cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSAgID0gICBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8ZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZCAgICAgICAgICAgICAgICAgICAgICAgPSAgIGFuZ3VsYXIuY29weSggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQucHJvcGVydGllcy5fY29tcG9uZW50X2lkICA9ICAgZ2VuZXJhdGVVbmlxdWVJZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1bY29tcG9uZW50LnByb3BlcnRpZXNba2V5XS5sZW5ndGhdICAgICAgID0gICBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBzaW5nbGUgY29tcG9uZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGQgICAgICAgICAgICAgICAgICAgICAgID0gICBhbmd1bGFyLmNvcHkoIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQucHJvcGVydGllcy5fY29tcG9uZW50X2lkICA9ICAgZ2VuZXJhdGVVbmlxdWVJZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSAgICAgICA9ICAgY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBrZXkuaW5kZXhPZiggJ18nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzeXN0ZW0gcHJvcHMgLSBqdXN0IGNvcHkgdGhlIGNvbXBvbmVudCBpZCAtIHByZWRlZmluZWQgYmVoYXZpb3VyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09ICdfY29tcG9uZW50X2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSA9IGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb25lbnQucHJvcGVydGllc1trZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBkZWZhdWx0IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBkZWZhdWx0IHZhbHVlJywgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gPSBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCBuYW1lKSB7XG4gICAgICAgICAgICBcdGNvbXBvbmVudC5wcm9wZXJ0aWVzLm5hbWVcdD1cdG5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzWydfY29tcG9uZW50X2lkJ10gPSBnZW5lcmF0ZVVuaXF1ZUlkKCk7XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBjcmVhdGVkIGNvbXBvbmVudCcsIGNvbXBvbmVudCk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVCbG9jayggc2VydmljZSwgbmFtZSkgXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZFx0PVx0JHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxFbGVtZW50c1xcXFxDb252ZXJzYXRpb25CbG9jaycpLnRoZW4oIGZ1bmN0aW9uKCBkZWZpbml0aW9uKSB7XG5cdFx0XHRcdCRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24sICduYW1lJywgbmFtZSk7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggY3JlYXRlQ29tcG9uZW50KCBzZXJ2aWNlLCBkZWZpbml0aW9uLCBuYW1lKSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCByZWFzb24pO1xuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVSZWFkU3Vicm91dGluZSggc2VydmljZSwgbmFtZSkgXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCAgICA9XHQkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldENvbXBvbmVudERlZmluaXRpb24oICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXEVsZW1lbnRzXFxcXEVsZW1lbnRzRnJhZ21lbnQnKS50aGVuKCBmdW5jdGlvbiggZGVmaW5pdGlvbikge1xuXHRcdFx0XHQkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgZ290IGRlZmluaXRpb24nLCBkZWZpbml0aW9uLCAnbmFtZScsIG5hbWUpO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoIGNyZWF0ZUNvbXBvbmVudCggc2VydmljZSwgZGVmaW5pdGlvbiwgbmFtZSkpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCggcmVhc29uKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlUHJvY2Vzc1N1YnJvdXRpbmUoIHNlcnZpY2UsIG5hbWUpIFxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgICAgPVx0JHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcblx0XHRcdFx0JGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGdvdCBkZWZpbml0aW9uJywgZGVmaW5pdGlvbiwgJ25hbWUnLCBuYW1lKTtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCBjcmVhdGVDb21wb25lbnQoIHNlcnZpY2UsIGRlZmluaXRpb24sIG5hbWUpKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoIHJlYXNvbik7XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfVxuXG5cblxuICAgICAgICAvLyBQUklWQVRFIFVUSUxcblxuICAgICAgICBmdW5jdGlvbiBfZmluZEJsb2NrKCBzZXJ2aWNlLCBibG9ja0lkKSB7XG4gICAgICAgICAgICBmb3IgKCB2YXIgaT0wOyBpPHNlcnZpY2UuYmxvY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJsb2NrXHQ9XHRzZXJ2aWNlLmJsb2Nrc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoIGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09IGJsb2NrSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8c2VydmljZS5mcmFnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYmxvY2tcdD1cdHNlcnZpY2UuZnJhZ21lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICggYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PT0gYmxvY2tJZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2s7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZUJsb2NrSWQoIHNlcnZpY2UsIG5hbWUpIHtcbiAgICAgICAgXHRcbiAgICAgICAgXHRpZiAoICFuYW1lKSB7XG4gICAgICAgIFx0XHRyZXR1cm4gbnVsbDtcbiAgICAgICAgXHR9XG4gICAgICAgIFx0XG4gICAgICAgICAgICB2YXIgYmxvY2tfaWRcdD1cdG5hbWUucmVwbGFjZSgvW15BLVowLTldKy9pZywgXCJfXCIpO1xuICAgICAgICAgICAgdmFyIGJsb2NrXHRcdD1cdF9maW5kQmxvY2soIHNlcnZpY2UsIGJsb2NrX2lkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCBibG9jaykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZV9pbmZvXHQ9XHRfcGFyc2VOdW1lcmljU3VmZml4KCBibG9ja19pZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCBwYXJzZV9pbmZvLm51bSkge1xuICAgICAgICAgICAgICAgICAgICBibG9ja19pZFx0PVx0cGFyc2VfaW5mby5iYXNlICsgJ18nICsgKHBhcnNlX2luZm8ubnVtICsgMSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tfaWRcdCs9XHQnXzEnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX2dlbmVyYXRlQmxvY2tJZCggc2VydmljZSwgYmxvY2tfaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gYmxvY2tfaWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBfcGFyc2VOdW1lcmljU3VmZml4KCBzdHIpIHtcbiAgICAgICAgICAgIHZhciBpbmRleFx0PVx0c3RyLmxhc3RJbmRleE9mKCAnXycpO1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIF9wYXJzZU51bWVyaWNTdWZmaXggc3RyJywgc3RyLCAnaW5kZXgnLCBpbmRleCk7XG4gICAgICAgICAgICBpZiAoIGluZGV4IDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBudW0gOiAwLFxuICAgICAgICAgICAgICAgICAgICBiYXNlIDogc3RyXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBfcGFyc2VOdW1lcmljU3VmZml4IHN0ci5zdWJzdHIoIDAsIGluZGV4KScsIHN0ci5zdWJzdHIoIDAsIGluZGV4KSwgXG4gICAgICAgICAgICAgICAgICAgICdwYXJzZUludCggc3RyLnN1YnN0ciggaW5kZXggKyAxKSknLCBwYXJzZUludCggc3RyLnN1YnN0ciggaW5kZXggKyAxKSksICdzdHIuc3Vic3RyKCBpbmRleCArIDEpJywgc3RyLnN1YnN0ciggaW5kZXggKyAxKSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG51bSA6IHBhcnNlSW50KCBzdHIuc3Vic3RyKCBpbmRleCArIDEpKSB8fCAwLFxuICAgICAgICAgICAgICAgIGJhc2UgOiBzdHIuc3Vic3RyKCAwLCBpbmRleClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblx0fTtcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG4gICAgICAgIC5kaXJlY3RpdmUoICdjb250ZXh0RWxlbWVudHNDb250YWluZXInLCBjb250ZXh0RWxlbWVudHNDb250YWluZXIpO1xuXG4gICAgLyogQG5nSW5qZWN0ICovXG4gICAgZnVuY3Rpb24gY29udGV4dEVsZW1lbnRzQ29udGFpbmVyKCAkbG9nKVxuICAgIHtcbiAgICAgICAgdmFyIEFVVE9fT1BFTl9USU1FT1VUXHQ9XHQxNTAwO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9jb250ZXh0LWVsZW1lbnRzLWNvbnRhaW5lci50bXBsLmh0bWwnLFxuICAgICAgICAgICAgcmVxdWlyZTogWyAnXmNvbnRleHRFbGVtZW50c0NvbnRhaW5lcicsICdecHJvcGVydGllc0NvbnRleHQnXSxcbiAgICAgICAgICAgIHNjb3BlOiB7ICdzZXJ2aWNlJzogJz0nIH0sXG4gICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiggJHNjb3BlKSB7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmdldENvbnRhaW5lciAgICAgICA9ICAgZ2V0Q29udGFpbmVyO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhPZiAgICAgICAgICAgID0gICBpbmRleE9mO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNNdWx0aXBsZSAgICAgICAgID0gICBpc011bHRpcGxlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50ICAgICAgID0gICBhZGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQgICAgPSAgIHJlbW92ZUNvbXBvbmVudDtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5lcigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNlcnZpY2UuY29udGV4dHM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5kZXhPZiggY29tcG9uZW50KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbnRhaW5lcigpLmZpbmRJbmRleCggZnVuY3Rpb24oIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LnByb3BlcnRpZXMuX2NvbXBvbmVudF9pZCA9PT0gY29tcG9uZW50LnByb3BlcnRpZXMuX2NvbXBvbmVudF9pZCA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzTXVsdGlwbGUoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWRkQ29tcG9uZW50KCBjb21wb25lbnQsIGluZGV4KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4XHQ9XHQwO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZ2V0Q29udGFpbmVyKCkuc3BsaWNlKCBpbmRleCwgMCwgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVDb21wb25lbnQoIGNvbXBvbmVudClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmNvbnRleHRzID0gICBnZXRDb250YWluZXIoKS5maWx0ZXIoIGZ1bmN0aW9uKCBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5wcm9wZXJ0aWVzLmlkICAgICE9PSAgICAgY29tcG9uZW50LnByb3BlcnRpZXMuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsICRjdHJscylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyICAgID0gICAkY3RybHNbMF07XG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXNDb250ZXh0ICAgICAgICAgICA9ICAgJGN0cmxzWzFdO1xuXG4gICAgICAgICAgICAgICAgdmFyIG9wZW4gICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBvcGVuX3RpbWVyXHQ9XHRudWxsO1xuXG4gICAgICAgICAgICAgICAgX2luaXREcm9wcGFibGUoKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5pc09wZW4gICAgICAgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3BlbjtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZU9wZW4gICAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9wZW4gICAgPSAgICFvcGVuO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKFxuICAgICAgICAgICAgICAgICAgICBcIiRkZXN0cm95XCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCBldmVudCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggb3Blbl90aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCggb3Blbl90aW1lciApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5fdGltZXJcdD1cdG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXREcm9wcGFibGUoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRkcm9wcGFibGVcdD1cdGpRdWVyeSgkZWxlbWVudC5maW5kKCAnLmNvbnRleHQtY29udGFpbmVyJylbMF0pO1xuICAgICAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLmRyb3BwYWJsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkcm9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdWkuZHJhZ2dhYmxlLmRhdGEoICdjb252b0RyYWdnZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhXHQ9XHR1aS5kcmFnZ2FibGUuZGF0YSggJ2NvbnZvRHJhZ2dlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnRleHRFbGVtZW50c0NvbnRhaW5lciBkcm9wcGFibGUgZGF0YScsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGRhdGEudHlwZSA9PSAnZGVmaW5pdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5hZGROZXdDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb21wb25lbnREZWZpbml0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIGRhdGEudHlwZSA9PSAnY29tcG9uZW50Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0Lm1vdmVDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuY29udGFpbmVyQ29udHJvbGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0V4cGVjdGVkIHRvIGhhdmUgdHlwZSBbZGVmaW5pdGlvbl0gb3IgW2NvbXBvbmVudF0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgdG8gaGF2ZSBbY29udm9EcmFnZ2VkXSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXI6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoICFvcGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5fdGltZXJcdD1cdCR0aW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBBVVRPX09QRU5fVElNRU9VVCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggb3Blbl90aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoIG9wZW5fdGltZXIgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3Blbl90aW1lclx0PVx0bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmRpcmVjdGl2ZSggJ2NvbnRleHRFbGVtZW50JywgY29udGV4dEVsZW1lbnQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBjb250ZXh0RWxlbWVudCggJGxvZywgQ29udm93b3Jrc0FwaSwgJHRpbWVvdXQsICRjb21waWxlKVxuXHR7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0XHRzY29wZTogeyAnY29udGV4dEVsZW1lbnQnIDogJz0nIH0sXG5cdFx0XHRyZXF1aXJlOiBbICdecHJvcGVydGllc0NvbnRleHQnLCAnXmNvbnRleHRFbGVtZW50c0NvbnRhaW5lciddLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9zZWxlY3RhYmxlLWNvbXBvbmVudC50bXBsLmh0bWwnLFxuXHRcdFx0bGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCAkY3RybHMpIHtcblx0XHRcdFx0dmFyICRkcmFnZ2FibGU7XG5cblx0XHRcdFx0dmFyIHByb3BlcnRpZXNDb250ZXh0XHRcdFx0PVx0JGN0cmxzWzBdO1xuXHRcdFx0XHR2YXIgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyXHQ9XHQkY3RybHNbMV07XG5cblx0XHRcdFx0JHNjb3BlLnNob3dUaXRsZVx0XHRcdD1cdHRydWU7XG5cdFx0XHRcdCRzY29wZS5vdmVyXHRcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHQkc2NvcGUucmVhZHlcdFx0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHQkc2NvcGUuY29tcG9uZW50VGl0bGVcdFx0PVx0XCJcIjtcblxuXHRcdFx0XHRfaW5pdCgpO1xuXG5cdFx0XHRcdCRzY29wZS5pc1NlbGVjdGVkXHQ9XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0aW9uKCkuY29tcG9uZW50ID09PSAkc2NvcGUuY29udGV4dEVsZW1lbnQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLiRvbiggJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JGxvZy5sb2coICdjb250ZXh0RWxlbWVudCAkZGVzdHJveScpO1xuXHRcdFx0XHRcdCRkcmFnZ2FibGUuZHJhZ2dhYmxlKHsgZGlzYWJsZWQ6IHRydWUgfSkuZHJhZ2dhYmxlKCAnZGVzdHJveScpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRmdW5jdGlvbiBfaW5pdCgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoICEkc2NvcGUuY29udGV4dEVsZW1lbnQpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ05vIGVsZW1lbnQgcHJvdmlkZWQhJyk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyIGNsYXNzX25hbWVcdD1cdFx0JHNjb3BlLmNvbnRleHRFbGVtZW50WydjbGFzcyddO1xuXG5cdFx0XHRcdFx0aWYgKCAhY2xhc3NfbmFtZSkge1xuXHRcdFx0XHRcdFx0JGxvZy5sb2coICdjb250ZXh0RWxlbWVudCBfaW5pdCgpICRzY29wZS5jb250ZXh0RWxlbWVudCcsICRzY29wZS5jb250ZXh0RWxlbWVudCk7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdObyBjbGFzcyBpbiBjb21wb25lbnQnKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRDb252b3dvcmtzQXBpLmdldENvbXBvbmVudERlZmluaXRpb24oIGNsYXNzX25hbWUpLnRoZW4oIGZ1bmN0aW9uKCBkZWZpbml0aW9uKSB7XG5cblx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udGV4dEVsZW1lbnQgZGlyZWN0aXZlIGdldENvbXBvbmVudERlZmluaXRpb24oKSB0aGVuIGRlZmluaXRpb24nLCBkZWZpbml0aW9uKTtcblxuXHRcdFx0XHRcdFx0JHNjb3BlLmRlZmluaXRpb25cdFx0PVx0ZGVmaW5pdGlvbjtcblx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnRUaXRsZVx0PVx0ZGVmaW5pdGlvbi5uYW1lO1xuXG5cdFx0XHRcdFx0XHRpZiAoICFkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9pbnRlcmZhY2UpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXIpIHtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuc2hvd1RpdGxlXHQ9XHRmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9LCBmdW5jdGlvbiggcmVhc29uKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmVycm9yKCAnY29udGV4dEVsZW1lbnQgZGVmaW5pdGlvbnMgZ290IHJlYXNvbicsIHJlYXNvbik7XG5cdFx0XHRcdFx0fSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUucmVhZHlcdFx0XHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdC8vIGdvb2Qgb2xkIHRpbWVvdXRcblx0XHRcdFx0XHRcdCR0aW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0X2luaXRQcmV2aWV3KCk7XG5cdFx0XHRcdFx0XHRcdF9pbml0RHJhZ2dhYmxlKCk7XG5cdFx0XHRcdFx0XHRcdF9pbml0RHJvcHBhYmxlKCk7XG5cdFx0XHRcdFx0XHRcdF9pbml0Q2xpY2soKTtcblx0XHRcdFx0XHRcdH0sIDEwKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2luaXREcmFnZ2FibGUoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0JGRyYWdnYWJsZVx0PVx0alF1ZXJ5KCRlbGVtZW50LmZpbmQoICdkaXYuc2VsZWN0YWJsZS1jb21wb25lbnQnKVswXSk7XG5cblx0XHRcdFx0XHQkZHJhZ2dhYmxlLmRyYWdnYWJsZSgge1xuXHRcdFx0XHRcdFx0cmV2ZXJ0OiB0cnVlLFxuXHRcdFx0XHRcdFx0cmV2ZXJ0RHVyYXRpb24gOiA1MCxcblx0XHRcdFx0XHRcdHpJbmRleDogMTAwLFxuXHRcdFx0XHRcdFx0ZGVsYXkgOiAyMDAsXG5cdFx0XHRcdFx0XHR0b2xlcmFuY2UgOiAncG9pbnRlcicsXG5cdFx0XHRcdFx0XHRzdGFydDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuXHRcdFx0XHRcdFx0XHRqUXVlcnkodGhpcykuZGF0YSggJ2NvbnZvRHJhZ2dlZCcsIHtcblx0XHRcdFx0XHRcdFx0XHR0eXBlIDogJ2NvbXBvbmVudCcsXG5cdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50IDogJHNjb3BlLmNvbnRleHRFbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdGNvbnRhaW5lckNvbnRyb2xsZXI6IGNvbnRleHRFbGVtZW50c0NvbnRhaW5lclxuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHR1aS5oZWxwZXIuYmluZCggXCJjbGljay5wcmV2ZW50XCIsXG5cdFx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgfSk7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dWkuaGVscGVyLnVuYmluZChcImNsaWNrLnByZXZlbnRcIik7fSwgMzAwKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0RHJvcHBhYmxlKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciAkZHJvcHBhYmxlXHQ9XHRqUXVlcnkoJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdKTtcblxuXHRcdFx0XHRcdCRkcm9wcGFibGUuZHJvcHBhYmxlKHtcblx0XHRcdFx0XHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRcdFx0XHRcdGRyb3A6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggdWkuZHJhZ2dhYmxlLmRhdGEoJ2NvbnZvRHJhZ2dlZCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdFx0XHRcdHZhciBkYXRhXHRcdD1cdHVpLmRyYWdnYWJsZS5kYXRhKCdjb252b0RyYWdnZWQnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBpbmRleFx0XHQ9XHRjb250ZXh0RWxlbWVudHNDb250YWluZXIuaW5kZXhPZiggJHNjb3BlLmNvbnRleHRFbGVtZW50KSArIDE7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmICggZGF0YS50eXBlID09ICdkZWZpbml0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIG5ldyBjb21wb25lbnQnLCBkYXRhLmNvbXBvbmVudERlZmluaXRpb24sICd0byBjb250YWluZXInLCBjb250ZXh0RWxlbWVudHNDb250YWluZXIuZ2V0Q29udGFpbmVyKCksICdpbiBjb21wb25lbnQnLCAkc2NvcGUuY29udGV4dEVsZW1lbnQpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHByb3BlcnRpZXNDb250ZXh0LmFkZE5ld0NvbXBvbmVudChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb250ZXh0RWxlbWVudHNDb250YWluZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS5jb21wb25lbnREZWZpbml0aW9uLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZGF0YS50eXBlID09ICdjb21wb25lbnQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgbW92ZSBjb21wb25lbnQnLCBkYXRhLmNvbXBvbmVudCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQubW92ZUNvbXBvbmVudChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkYXRhLmNvbnRhaW5lckNvbnRyb2xsZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGV4dEVsZW1lbnRzQ29udGFpbmVyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRhdGEuY29tcG9uZW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgdG8gaGF2ZSB0eXBlIFtkZWZpbml0aW9uXSBvciBbY29tcG9uZW50XScpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggJ0V4cGVjdGVkIHRvIGhhdmUgW2NvbnZvRHJhZ2dlZF0gZGF0YScpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBfaW5pdENsaWNrKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciAkZGl2XHQ9XHRqUXVlcnkoJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdKTtcblx0XHRcdFx0XHQkZGl2LmJpbmQoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCkge1xuXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJHNjb3BlLmlzU2VsZWN0ZWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5zZXRTZWxlY3RlZENvbXBvbmVudCggJHNjb3BlLmNvbnRleHRFbGVtZW50LCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZW1vdmVTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YXIgY29udGV4dHMgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLnNlcnZpY2UuY29udGV4dHM7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0aW9uKCkuc2VydmljZS5jb250ZXh0cyAgID1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRleHRzLmZpbHRlciggZnVuY3Rpb24oIGNvbnRleHRFbGVtZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBjb250ZXh0RWxlbWVudFx0IT09XHQkc2NvcGUuY29udGV4dEVsZW1lbnQ7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0UHJldmlldygpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgY29udGFpbmVyXHQ9XHQkZWxlbWVudC5maW5kKCAnLnByZXZpZXcnKTtcblxuXHRcdFx0XHRcdGlmICggJHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX3ByZXZpZXdfYW5ndWxhcikge1xuXHRcdFx0XHRcdFx0dmFyIGh0bWxcdFx0PVx0JHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX3ByZXZpZXdfYW5ndWxhci50ZW1wbGF0ZTtcblx0XHRcdFx0XHRcdGNvbnRhaW5lci5odG1sKCBodG1sKTtcblx0XHRcdFx0XHRcdCRjb21waWxlKCBjb250YWluZXIuY29udGVudHMoKSkoICRzY29wZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnRhaW5lci5odG1sKCAnJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdjb252by5lZGl0b3InKVxuXHRcdC5kaXJlY3RpdmUoJ2NvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yJywgY29uZmlnU2VydmljZU1ldGFFZGl0b3IpO1xuXG5cdGZ1bmN0aW9uIGNvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yKCRsb2csIExvZ2luU2VydmljZSwgQ29udm93b3Jrc0FwaSlcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdFx0c2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2FwcC9jb252b3dvcmtzL2NvbmZpZy1zZXJ2aWNlLW1ldGEtZWRpdG9yLnRtcGwuaHRtbCcsXG5cdFx0XHRsaW5rOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXHRcdFx0XHQkbG9nLmxvZygnY29uZmlnU2VydmljZU1ldGFFZGl0b3IgbGlua2VkJyk7XG5cblx0XHRcdFx0dmFyIHVzZXIgPSBudWxsO1xuXG5cdFx0XHRcdExvZ2luU2VydmljZS5nZXRVc2VyKCkudGhlbihmdW5jdGlvbiAodSkge1xuXHRcdFx0XHRcdHVzZXIgPSB1O1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuY29uZmlnID0ge1xuXHRcdFx0XHRcdG5hbWU6ICcnLFxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiAnJyxcblx0XHRcdFx0XHRvd25lcjogJycsXG5cdFx0XHRcdFx0YWRtaW5zOiBbJyddXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0X2xvYWQoKTtcblxuXHRcdFx0XHR2YXIgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCRzY29wZS5jb25maWcpO1xuXHRcdFx0XHR2YXIgaXNfZXJyb3IgPVx0ZmFsc2U7XG5cblx0XHRcdFx0JHNjb3BlLnJldmVydENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkc2NvcGUuY29uZmlnID0gYW5ndWxhci5jb3B5KGNvbmZpZ0Jhayk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiAhYW5ndWxhci5lcXVhbHMoY29uZmlnQmFrLCAkc2NvcGUuY29uZmlnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS51cGRhdGVDb25maWcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRDb252b3dvcmtzQXBpLnVwZGF0ZVNlcnZpY2VNZXRhKCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICRzY29wZS5jb25maWcpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHRcdFx0dmFyIG1ldGEgPSByZXMuZGF0YTtcblx0XHRcdFx0XHRcdCRsb2cubG9nKCdjb25maWdTZXJ2aWNlTWV0YUVkaXRvciB1cGRhdGVDb25maWcoKSBnb3QgbmV3IG1ldGEnLCBtZXRhKTtcblxuXHRcdFx0XHRcdFx0JHNjb3BlLmNvbmZpZyA9IHtcblx0XHRcdFx0XHRcdFx0bmFtZTogbWV0YVsnbmFtZSddIHx8ICcnLFxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogbWV0YVsnZGVzY3JpcHRpb24nXSB8fCAnJyxcblx0XHRcdFx0XHRcdFx0b3duZXI6IG1ldGFbJ293bmVyJ10gfHwgJycsXG5cdFx0XHRcdFx0XHRcdGFkbWluczogbWV0YVsnYWRtaW5zJ10gfHwgWycnXVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLmNvbmZpZyk7XG5cdFx0XHRcdFx0XHRpc19lcnJvciA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cud2FybignY29uZmlnU2VydmljZU1ldGFFZGl0b3IgdXBkYXRlQ29uZmlnIGZhaWxlZCBmb3IgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHRcdGlzX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gX2xvYWQoKSB7XG5cdFx0XHRcdFx0Q29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlTWV0YSgkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkKS50aGVuKGZ1bmN0aW9uIChtZXRhKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmxvZygnY29uZmlnU2VydmljZU1ldGFFZGl0b3IgZ290IHNlcnZpY2UgbWV0YScsIG1ldGEpO1xuXHRcdFx0XHRcdFx0JHNjb3BlLmNvbmZpZyA9IHtcblx0XHRcdFx0XHRcdFx0bmFtZTogbWV0YVsnbmFtZSddIHx8ICcnLFxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogbWV0YVsnZGVzY3JpcHRpb24nXSB8fCAnJyxcblx0XHRcdFx0XHRcdFx0b3duZXI6IG1ldGFbJ293bmVyJ10gfHwgJycsXG5cdFx0XHRcdFx0XHRcdGFkbWluczogbWV0YVsnYWRtaW5zJ10gfHwgWycnXVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLmNvbmZpZyk7XG5cdFx0XHRcdFx0XHRpc19lcnJvciA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cud2FybignY29uZmlnU2VydmljZU1ldGFFZGl0b3IgZ2V0U2VydmljZU1ldGEgZmFpbGVkIGZvciByZWFzb24nLCByZWFzb24pO1xuXHRcdFx0XHRcdFx0aXNfZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCdjb25maWdEaWFsb2dmbG93RWRpdG9yJywgY29uZmlnRGlhbG9nZmxvd0VkaXRvcik7XG5cbiAgICBmdW5jdGlvbiBjb25maWdEaWFsb2dmbG93RWRpdG9yKCRsb2csICRxLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBMb2dpblNlcnZpY2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvY29uZmlnLWRpYWxvZ2Zsb3ctZWRpdG9yLnRtcGwuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMpIHtcblxuICAgICAgICAgICAgXHR2YXIgdXNlclx0PVx0bnVsbDtcbiAgICAgICAgICAgIFx0XG4gICAgICAgICAgICBcdExvZ2luU2VydmljZS5nZXRVc2VyKCkudGhlbiggZnVuY3Rpb24gKCB1KSB7XG4gICAgICAgICAgICBcdFx0dXNlciA9IHU7XG4gICAgICAgICAgICBcdH0pO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0ge1xuICAgICAgICAgICAgXHRcdG1vZGU6ICdtYW51YWwnLFxuXHRcdFx0XHRcdHByb2plY3RJZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZUFjY291bnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBhdmF0YXI6IG51bGxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGNvbmZpZ0JhayBcdD0gXHRhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIHZhciBpc19uZXdcdFx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaXNfZXJyb3JcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBoYXNfc3RhcnRlZFx0PVx0ZmFsc2U7XG5cdFx0XHRcdHZhciBsb2dsaW5lXHRcdD1cdCcnO1xuXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgX2xvYWQoKTtcblxuXHRcdFx0XHR2YXIgcHJlcGFyZWRVcGxvYWQgPSBudWxsO1xuXHRcdFx0XHR2YXIgcHJldmlvdXNNZWRpYUl0ZW1JZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzTmV3XHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiBpc19uZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5oaWRlQWxsXHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiAhaGFzX3N0YXJ0ZWQgJiYgaXNfbmV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RhcnRcdD0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0aGFzX3N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXHRoYXNfc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRDb25maWdVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiAnaHR0cHM6Ly9jb25zb2xlLmFjdGlvbnMuZ29vZ2xlLmNvbS9wcm9qZWN0LycgKyAkc2NvcGUuY29uZmlnLnByb2plY3RJZCArICcvZGlyZWN0b3J5aW5mb3JtYXRpb24vJ1xuXHRcdFx0XHR9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRsb2cuZGVidWcoJ2NvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3IgdXBkYXRlKCkgJHNjb3BlLmNvbmZpZycsICRzY29wZS5jb25maWcpO1xuXG5cdFx0XHRcdFx0dmFyIG1heWJlVXBsb2FkID0gcHJlcGFyZWRVcGxvYWQgP1xuXHRcdFx0XHRcdFx0Q29udm93b3Jrc0FwaS51cGxvYWRNZWRpYShcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcblx0XHRcdFx0XHRcdFx0J2RpYWxvZ2Zsb3cuYXZhdGFyJyxcblx0XHRcdFx0XHRcdFx0cHJlcGFyZWRVcGxvYWQuZmlsZSkgOlxuXHRcdFx0XHRcdFx0bnVsbDtcblxuXHRcdFx0XHRcdCRxLndoZW4obWF5YmVVcGxvYWQpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXHRcdFx0XHRcdFx0aWYgKHJlcyAmJiByZXMubWVkaWFJdGVtSWQpIHtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbmZpZy5hdmF0YXIgPSByZXMubWVkaWFJdGVtSWQ7XG5cdFx0XHRcdFx0XHRcdHByZXBhcmVkVXBsb2FkID0gbnVsbDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGlzX25ldykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gQ29udm93b3Jrc0FwaS5jcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoXG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcblx0XHRcdFx0XHRcdFx0XHQnZGlhbG9nZmxvdycsXG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbmZpZ1xuXHRcdFx0XHRcdFx0XHQpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuXHRcdFx0XHRcdFx0XHRcdGxvZ2xpbmUgPSAnY29uZmlnRGlhbG9nZmxvd0VkaXRvciBjcmVhdGUoKSByZXNwb25zZSc7XG5cdFx0XHRcdFx0XHRcdFx0aXNfbmV3ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0JHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuXHRcdFx0XHRcdFx0XHR9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0XHQkbG9nLmRlYnVnKCdjb25maWdEaWFsb2dmbG93RWRpdG9yIGNyZWF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0XHRcdGlzX2Vycm9yXHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNyZWF0ZSBjb25maWcgZm9yIERpYWxvZ2Zsb3cuIFwiICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlKVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0bG9nbGluZSA9ICdjb25maWdEaWFsb2dmbG93RWRpdG9yIHVwZGF0ZSgpIHJlc3BvbnNlJztcblx0XHRcdFx0XHRcdHJldHVybiBDb252b3dvcmtzQXBpLnVwZGF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyhcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcblx0XHRcdFx0XHRcdFx0J2RpYWxvZ2Zsb3cnLFxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuY29uZmlnXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSgkc2NvcGUuY29uZmlnKTtcblx0XHRcdFx0XHRcdGlzX2Vycm9yID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgJHNjb3BlLmNvbmZpZyk7XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHQkbG9nLmRlYnVnKGxvZ2xpbmUsIHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlzX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJldmVydENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRpZiAocHJlcGFyZWRVcGxvYWQpIHtcblx0XHRcdFx0XHRcdHByZXBhcmVkVXBsb2FkID0gbnVsbDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocHJldmlvdXNNZWRpYUl0ZW1JZCkge1xuXHRcdFx0XHRcdFx0cHJldmlvdXNNZWRpYUl0ZW1JZCA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBhbmd1bGFyLmNvcHkoY29uZmlnQmFrKTtcbiAgICAgICAgICAgICAgICB9XG5cblx0XHRcdFx0JHNjb3BlLm9uRmlsZVVwbG9hZCA9IGZ1bmN0aW9uIChmaWxlKSB7XG5cdFx0XHRcdFx0JGxvZy5sb2coJ0NvbmZpZ3VyYXRpb25zRWRpdG9yIG9uRmlsZVVwbG9hZCBmaWxlJywgZmlsZSk7XG5cblx0XHRcdFx0XHRwcmVwYXJlZFVwbG9hZCA9IHtcblx0XHRcdFx0XHRcdGZpbGU6IGZpbGVcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0cHJldmlvdXNNZWRpYUl0ZW1JZCA9ICRzY29wZS5jb25maWcuYXZhdGFyO1xuXHRcdFx0XHRcdCRzY29wZS5jb25maWcuYXZhdGFyID0gJ3RtcF91cGxvYWRfcmVhZHknO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLmdldE1lZGlhID0gZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0XHRcdHZhciBtZWRpYUl0ZW1JZCA9ICRzY29wZS5jb25maWdbdHlwZV07XG5cblx0XHRcdFx0XHRpZiAoIW1lZGlhSXRlbUlkKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKG1lZGlhSXRlbUlkID09PSAndG1wX3VwbG9hZF9yZWFkeScpIHtcblx0XHRcdFx0XHRcdG1lZGlhSXRlbUlkID0gcHJldmlvdXNNZWRpYUl0ZW1JZDtcblx0XHRcdFx0XHR9XG5cbi8vXHRcdFx0XHRcdCRsb2cubG9nKCdDb25maWd1cmF0aW9uc0VkaXRvciBnZXRNZWRpYSgnLCB0eXBlLCAnKSBtZWRpYUl0ZW1JZCcsIG1lZGlhSXRlbUlkKTtcblxuXHRcdFx0XHRcdHJldHVybiBDb252b3dvcmtzQXBpLmRvd25sb2FkTWVkaWEoJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgbWVkaWFJdGVtSWQpO1xuXHRcdFx0XHR9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWFuZ3VsYXIuZXF1YWxzKCBjb25maWdCYWssICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFx0Q29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdkaWFsb2dmbG93JykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3XHQ9XHRmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yXHQ9XHRmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnRGlhbG9nZmxvd0VkaXRvciBsb2FkUGxhdGZvcm1Db25maWcoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCByZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXHRpc19uZXdcdFx0PVx0dHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgXHRpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBcdHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yXHQ9XHR0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2NvbnZvLmVkaXRvcicpXG4gICAgICAgIC5kaXJlY3RpdmUoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvcicsIGNvbmZpZ0NvbnZvQ2hhdEVkaXRvcik7XG5cbiAgICBmdW5jdGlvbiBjb25maWdDb252b0NoYXRFZGl0b3IoJGxvZywgJHEsICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIExvZ2luU2VydmljZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7IHNlcnZpY2U6ICc9JyB9LFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdhcHAvY29udm93b3Jrcy9jb25maWctY29udm8tY2hhdC1lZGl0b3IudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXG4gICAgICAgICAgICBcdHZhciB1c2VyXHQ9XHRudWxsO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0TG9naW5TZXJ2aWNlLmdldFVzZXIoKS50aGVuKCBmdW5jdGlvbiAoIHUpIHtcbiAgICAgICAgICAgIFx0XHR1c2VyID0gdTtcbiAgICAgICAgICAgIFx0fSk7XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGVnYXRlTmxwOiBudWxsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHZhciBjb25maWdCYWsgXHQ9IFx0YW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICB2YXIgaXNfbmV3XHRcdD1cdHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlzX2Vycm9yXHQ9XHRmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgaGFzX3N0YXJ0ZWRcdD1cdGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgX2xvYWQoKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRJbnRlbnRObHBzXHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiBbJ2RpYWxvZ2Zsb3cnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzTmV3XHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiBpc19uZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5oaWRlQWxsXHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdHJldHVybiAhaGFzX3N0YXJ0ZWQgJiYgaXNfbmV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RhcnRcdD0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0aGFzX3N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXHRoYXNfc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0XG4gICAgICAgICAgICAgICAgXHRpZiAoIGlzX25ldykge1xuICAgICAgICAgICAgICAgIFx0XHRDb252b3dvcmtzQXBpLmNyZWF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJ2NvbnZvX2NoYXQnLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgXHRcdFx0JGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIGNyZWF0ZSgpICRzY29wZS5jb25maWcnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ld1x0XHQ9XHRmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciBjcmVhdGUoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjcmVhdGUgY29uZmlnIGZvciBDb252by4gXCIgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgICAgIFx0fSBlbHNlIHtcbiAgICAgICAgICAgICAgICBcdFx0Q29udm93b3Jrc0FwaS51cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdjb252b19jaGF0JywgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIFx0XHRcdCRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciB1cGRhdGUoKSAkc2NvcGUuY29uZmlnJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciB1cGRhdGUoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICAgICAgXHR9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJldmVydENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGFuZ3VsYXIuY29weShjb25maWdCYWspO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICRzY29wZS5pc0NvbmZpZ0NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhYW5ndWxhci5lcXVhbHMoIGNvbmZpZ0JhaywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9sb2FkKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXHRDb252b3dvcmtzQXBpLmdldFNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJ2NvbnZvX2NoYXQnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19uZXdcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3JcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgbG9hZFBsYXRmb3JtQ29uZmlnKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggcmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFx0aXNfbmV3XHRcdD1cdHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIFx0aXNfZXJyb3JcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgXHRyZXR1cm47O1x0XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdjb252by5lZGl0b3InKVxuICAgICAgICAuZGlyZWN0aXZlKCdjb25maWdBbWF6b25FZGl0b3InLCBjb25maWdBbWF6b25FZGl0b3IpO1xuXG4gICAgZnVuY3Rpb24gY29uZmlnQW1hem9uRWRpdG9yKCRsb2csICRxLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBMb2dpblNlcnZpY2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvY29uZmlnLWFtYXpvbi1lZGl0b3IudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXG4gICAgICAgICAgICBcdHZhciB1c2VyXHQ9XHRudWxsO1xuICAgICAgICAgICAgXHRcbiAgICAgICAgICAgIFx0TG9naW5TZXJ2aWNlLmdldFVzZXIoKS50aGVuKCBmdW5jdGlvbiAoIHUpIHtcbiAgICAgICAgICAgIFx0XHR1c2VyID0gdTtcbiAgICAgICAgICAgIFx0fSk7XG4gICAgICAgICAgICBcdFxuICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGU6ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICBpbnZvY2F0aW9uOiAkc2NvcGUuc2VydmljZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhcHBfaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9fZGlzcGxheTogZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGNvbmZpZ0JhayBcdD0gXHRhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIHZhciBpc19uZXdcdFx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaXNfZXJyb3JcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBoYXNfc3RhcnRlZFx0PVx0ZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBfbG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY29uZmlnLmF1dG9fZGlzcGxheScsIGZ1bmN0aW9uKG5ld1ZhbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdjb25maWdBbWF6b25FZGl0b3IgJHdhdGNoIGNvbmZpZy5hdXRvX2Rpc3BsYXkgbmV3IHZhbHVlJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmF1dG9fZGlzcGxheSA9IG5ld1ZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG5cdFx0XHRcdCRzY29wZS5nZXRDb25maWdVcmwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gJ2h0dHBzOi8vZGV2ZWxvcGVyLmFtYXpvbi5jb20vYWxleGEvY29uc29sZS9hc2svcHVibGlzaC9hbGV4YXB1Ymxpc2hpbmcvJyArICRzY29wZS5jb25maWcuYXBwX2lkICsgJy9kZXZlbG9wbWVudC9lbl9VUy9za2lsbC1pbmZvJ1xuXHRcdFx0XHR9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNNb2RlVmFsaWRcdD0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0cmV0dXJuICEoICRzY29wZS5jb25maWcubW9kZSA9PT0gJ2F1dG8nICYmICF1c2VyLmFtYXpvbl9hY2NvdW50X2xpbmtlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5pc05ld1x0PSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXHRyZXR1cm4gaXNfbmV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUFsbFx0PSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXHRyZXR1cm4gIWhhc19zdGFydGVkICYmIGlzX25ldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXJ0XHQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdGhhc19zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFx0aGFzX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBcdCRsb2cuZGVidWcoJ2NvbmZpZ0FtYXpvbkVkaXRvciB1cGRhdGUoKSAkc2NvcGUuY29uZmlnJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgXHRcbiAgICAgICAgICAgICAgICBcdGlmICggaXNfbmV3KSB7XG4gICAgICAgICAgICAgICAgXHRcdENvbnZvd29ya3NBcGkuY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnYW1hem9uJywgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3XHRcdD1cdGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yXHQ9XHRmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQW1hem9uRWRpdG9yIGNyZWF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yXHQ9XHR0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNyZWF0ZSBjb25maWcgZm9yIEFtYXpvbi4gXCIgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgICAgIFx0fSBlbHNlIHtcbiAgICAgICAgICAgICAgICBcdFx0Q29udm93b3Jrc0FwaS51cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdhbWF6b24nLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0FtYXpvbkVkaXRvciB1cGRhdGUoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0dHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICAgICAgXHR9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJldmVydENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGFuZ3VsYXIuY29weShjb25maWdCYWspO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICRzY29wZS5pc0NvbmZpZ0NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhYW5ndWxhci5lcXVhbHMoIGNvbmZpZ0JhaywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9sb2FkKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXHRDb252b3dvcmtzQXBpLmdldFNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJ2FtYXpvbicpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ld1x0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0FtYXpvbkVkaXRvciBsb2FkUGxhdGZvcm1Db25maWcoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCByZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXHRpc19uZXdcdFx0PVx0dHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgXHRpc19lcnJvclx0PVx0ZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBcdHJldHVybjs7XHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yXHQ9XHR0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSggJ2NvbnZvLmVkaXRvcicpXG5cdFx0LmRpcmVjdGl2ZSggJ2Jsb2NrQ29tcG9uZW50JywgYmxvY2tDb21wb25lbnQpO1xuXG5cdC8qIEBuZ0luamVjdCAqL1xuXHRmdW5jdGlvbiBibG9ja0NvbXBvbmVudCggJGxvZywgJHRpbWVvdXQsIENvbnZvd29ya3NBcGksIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UsIExvZ2luU2VydmljZSlcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdFx0c2NvcGU6IHsgJ2Jsb2NrJyA6ICc9JywgJ2Nhbk1vdmVVcCc6ICc9JywgJ2Nhbk1vdmVEb3duJzogJz0nIH0sXG5cdFx0XHRyZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0Jyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXBwL2NvbnZvd29ya3MvYmxvY2stY29tcG9uZW50LnRtcGwuaHRtbCcsXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG5cdFx0XHRcdHZhciBVU0VSX1BSRUZFUkVOQ0VTX0tFWVx0PVx0Jyc7XG5cdFx0XHRcdC8vIEFQSVxuXHRcdFx0XHQkc2NvcGUub3Zlclx0XHRcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLnJlYWR5XHRcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudFRpdGxlXHRcdD1cdFwiXCI7XG5cdFx0XHRcdCRzY29wZS5jb21wb25lbnROYW1lICAgICAgICA9ICAgXCJcIjtcblxuXHRcdFx0XHQkc2NvcGUuaXNTeXNCbG9ja1x0XHRcdD1cdGZhbHNlO1xuXHRcdFx0XHQkc2NvcGUuaXNSZWFkQmxvY2tcdFx0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmlzU3lzUHJvY2Vzc29yc1x0XHQ9XHRmYWxzZTtcblx0XHRcdFx0JHNjb3BlLmlzU2Vzc2lvbkVuZFx0XHRcdD1cdGZhbHNlO1xuXG5cdFx0XHRcdCRzY29wZS5pc1N5c0Jsb2NrT3Blblx0XHQ9XHR7IHZhbHVlOiBmYWxzZSB9O1xuXG5cdFx0XHRcdCRzY29wZS5nZXRDb21wb25lbnRUaXRsZVx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCAhJHNjb3BlLmRlZmluaXRpb24pIHtcblx0XHRcdFx0XHRcdHJldHVybiAnR2VuZXJhdGluZyB0aXRsZSAuLi4nO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLm5hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkLmluZGV4T2YoICdfXycpID09PSAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ1N5c3RlbSAtICcgKyAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCArICcnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkLmluZGV4T2YoICdfcmVhZF8nKSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICdGcmFnbWVudCAtICcgKyAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCArICcnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQ7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHQkc2NvcGUuaXNTZWxlY3RlZFx0PVx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLmNvbXBvbmVudCA9PT0gJHNjb3BlLmJsb2NrO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS50b2dnbGVPcGVuXHQ9XHRmdW5jdGlvbiggdHlwZSkge1xuXHRcdFx0XHRcdG9wZW5bdHlwZV1cdD1cdCFvcGVuW3R5cGVdO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0JHNjb3BlLmlzT3Blblx0PVx0ZnVuY3Rpb24oIHR5cGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gb3Blblt0eXBlXTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS4kb24oICckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRsb2cubG9nKCAnYmxvY2tDb21wb25lbnQgJGRlc3Ryb3knKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JHNjb3BlLm1vdmVVcCA9IGZ1bmN0aW9uKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRzY29wZS4kZW1pdCgnbW92ZUJsb2NrJywge1xuXHRcdFx0XHRcdFx0YmxvY2tJZDogJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJyxcblx0XHRcdFx0XHRcdGRpcjogLTFcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5tb3ZlRG93biA9IGZ1bmN0aW9uKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCRzY29wZS4kZW1pdCgnbW92ZUJsb2NrJywge1xuXHRcdFx0XHRcdFx0YmxvY2tJZDogJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJyxcblx0XHRcdFx0XHRcdGRpcjogMVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSU5JVFxuXHRcdFx0XHR2YXIgb3Blblx0PVx0e1xuXHRcdFx0XHRcdFx0ZWxlbWVudHMgOiBmYWxzZSxcblx0XHRcdFx0XHRcdHByb2Nlc3NvcnMgOiBmYWxzZSxcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGZhbHNlXG5cdFx0XHRcdH1cblx0XHRcdFx0X2luaXQoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGZ1bmN0aW9uIF9pbml0KClcblx0XHRcdFx0e1xuLy9cdFx0XHRcdFx0JGxvZy5sb2coICdibG9ja0NvbXBvbmVudCBfaW5pdCgpIGdvdCAnLCAnJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgWycrJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQrJ10nLCAnJHNjb3BlLmJsb2NrJywgJHNjb3BlLmJsb2NrKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRDb252b3dvcmtzQXBpLmdldENvbXBvbmVudERlZmluaXRpb24oICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXEVsZW1lbnRzXFxcXENvbnZlcnNhdGlvbkJsb2NrJykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbi8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdibG9ja0NvbXBvbmVudCBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkLmluZGV4T2YoICdfXycpID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuY29tcG9uZW50VGl0bGVcdD1cdCdTeXN0ZW0gLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJztcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmlzU3lzQmxvY2tcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdFx0aWYgKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2VydmljZVByb2Nlc3NvcnMnKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmlzU3lzUHJvY2Vzc29yc1x0XHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2Vzc2lvbkVuZCcpIHtcblx0XHRcdFx0XHRcdFx0XHQkc2NvcGUuaXNTZXNzaW9uRW5kXHRcdD1cdHRydWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkLmluZGV4T2YoICdfcmVhZF8nKSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHQvLyAkc2NvcGUuaXNSZWFkQmxvY2tcdFx0PVx0dHJ1ZTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudFRpdGxlXHQ9XHQnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnRUaXRsZVx0PVx0JHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQ7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdCRzY29wZS5jb21wb25lbnROYW1lICAgID0gICAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lO1xuXG5cdFx0XHRcdFx0XHQkc2NvcGUuZGVmaW5pdGlvblx0XHQ9XHRkZWZpbml0aW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dpblNlcnZpY2UuZ2V0VXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnYmxvY2tDb21wb25lbnQgZ290IHVzZXInLCB1c2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVU0VSX1BSRUZFUkVOQ0VTX0tFWSAgICA9ICAgdXNlci51c2VyX2lkICsgJ18nICsgcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKClbJ3NlcnZpY2VfaWQnXSArICdfJyArICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzWydfY29tcG9uZW50X2lkJ107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnYmxvY2tDb21wb25lbnQgZmluYWwgdXNlciBwcmVmZXJlbmNlcyBrZXknLCBVU0VSX1BSRUZFUkVOQ0VTX0tFWSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlLmdldERhdGEoVVNFUl9QUkVGRVJFTkNFU19LRVkpLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNTeXNCbG9ja09wZW4udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc1N5c0Jsb2NrT3Blbi52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCdibG9ja0NvbXBvbmVudCBnZXRVc2VyKCkgcmVqZWN0ZWQgd2l0aCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblx0XHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goJ2lzU3lzQmxvY2tPcGVuLnZhbHVlJywgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0VXNlclByZWZlcmVuY2VzU2VydmljZS5yZWdpc3RlckRhdGEoVVNFUl9QUkVGRVJFTkNFU19LRVksIHZhbHVlKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcblx0XHRcdFx0XHRcdCRsb2cuZXJyb3IoICdibG9ja0NvbXBvbmVudCBnb3QgcmVhc29uJywgcmVhc29uKTtcblx0XHRcdFx0XHR9KS5maW5hbGx5KCBmdW5jdGlvbigpIHtcbi8vXHRcdFx0XHRcdFx0JGxvZy5sb2coICdibG9ja0NvbXBvbmVudCBkZWZpbml0aW9ucyBmaW5hbGx5Jyk7XG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUucmVhZHlcdFx0XHQ9XHR0cnVlO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0JHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0X2luaXRDbGljaygpO1xuXHRcdFx0XHRcdH0sIDEwKVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRmdW5jdGlvbiBfaW5pdENsaWNrKClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciAkZGl2XHQ9XHRqUXVlcnkoJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdKTtcblxuXHRcdFx0XHRcdHZhciBjb250YWluZXJDb250cm9sbGVyID0gICB7XG5cdFx0XHRcdFx0XHRyZW1vdmVTZWxlY3Rpb246IGZ1bmN0aW9uKCkgeyBwcm9wZXJ0aWVzQ29udGV4dC5yZW1vdmVCbG9jayggJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQpOyB9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQkZGl2LmJpbmQoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICRzY29wZS5pc1NlbGVjdGVkKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0aWVzQ29udGV4dC5zZXRTZWxlY3RlZENvbXBvbmVudCggbnVsbCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoICRzY29wZS5ibG9jaywgY29udGFpbmVyQ29udHJvbGxlcik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHR9KTtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSkoKTsiXX0=
