(function () {
    'use strict';

    angular.module('adomee.admin').config(function (localStorageServiceProvider) {
    	  localStorageServiceProvider
    	    .setPrefix('convoAdmin')
//    	    .setStorageType('sessionStorage')
    	    .setNotify(true, true)
    	});

    angular.module('adomee.admin').factory('$exceptionHandler', function ($injector, $log) {


        return function (exception, cause) {
            var AdmAlertService = $injector.get('AdmAlertService');
            AdmAlertService.addDanger(exception.message);
            $log.error(exception);
//	    exception.message += ' (caused by "' + cause + '")';
//		  throw exception;
        };
    });

    angular.module('adomee.admin').directive('loading', ['$http', function ($http) {
        return {
            restrict: 'A',
            link: function (scope, elm, attrs) {
                scope.isLoading = function () {
                    return $http.pendingRequests.length > 0;
                };

                scope.$watch(scope.isLoading, function (v) {
                    if (v) {
                        elm.show();
                    } else {
                        elm.hide();
                    }
                });
            }
        };

    }]);

    angular.module('adomee.admin').directive('jsonText', ['$log', function($log) {
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
    
    angular.module('adomee.admin').run(

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

                        if ( next.originalPath && (next.originalPath != '/home')) {
                            event.preventDefault();
                            $location.url('/home');
                        }
                    }
                    else {
                        $log.debug( '$routeChangeStart run() ALLOW');
                    }
                });
            });
            }
    );

    angular.module('adomee.admin').factory( 'authInterceptor', function ( $rootScope, $q, $cookieStore, $log, $location, WP_NONCE) {
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
			    	$location.url('/home');
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

    angular.module('adomee.admin').config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    });
    
    
    angular.module('adomee.admin').filter('propsFilter', function() {
    	  return function(items, props) {
    	    var out = [];

    	    if (angular.isArray(items)) {
    	    	var hastext	=	false;
	    	      items.forEach(function(item) {
	    	        var itemMatches = false;
	
	    	        var keys = Object.keys(props);
	    	        if (keys.length == 0)
	    	        	return items;
	    	        for (var i = 0; i < keys.length; i++) {
	    	          var prop = keys[i];
	    	          var text = props[prop].toLowerCase();
	    	          
	    	          if (text)
	    	        	  hastext	=	true;
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
    
    
    
    angular.module('adomee.admin').filter('percent', [ function () {
    	return function (value) {
   			return value + ' %';
    	};     
    }]);
    
    angular.module('adomee.admin').filter('prettyJson', [ function() {
    	return function (value) {
    		return JSON.stringify( value, null, 2);
	    }
    }]);

    
    angular.module('adomee.admin').filter('admDate', function ( $filter) {
    	
    	return function ( strDate, format) {
    		
    		if (angular.isNumber( strDate))
    			return $filter('date')( new Date( strDate * 1000), format);
    		
    		return $filter('date')( Date.parse( strDate), format);
    	};     
    });
    
    angular.module('adomee.admin').filter('unsafe', function($sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    });

    angular.module('adomee.admin').filter('keys', function() {
    	return function (value) {
    		return Object.keys(value);
		}
	})

})();