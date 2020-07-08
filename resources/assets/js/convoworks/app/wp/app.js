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