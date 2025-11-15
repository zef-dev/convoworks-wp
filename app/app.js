
require('jquery');

import 'angular';

// routes
import app_route from './app.ui-route';

import appModule from './app.module';

appModule.config( app_route);

appModule.factory( '$exceptionHandler', function ( $injector, $log) {
    return function (exception, cause) {
        const AlertService = $injector.get('AlertService');
        let message;

        if (exception === null || exception === undefined) {
            message = "Something went wrong. Please try again later.";
        } else if (typeof exception === 'string') {
            message = exception;
        } else {
            message = (exception.data && exception.data.message) || exception.message;
        }

        AlertService.addDanger(message);
        $log.error('app $exceptionHandler exception', exception, 'cause', cause);
    };
});

appModule.run( function( $log, $rootScope, $location, LoginService, ConvoClipboardService) {
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
        ConvoClipboardService.init();
    }
);

appModule.factory( 'authInterceptor', function ( $rootScope, $q, $log, $location) {
    return {
        'request': function(config) {

            if (ConvoScriptData.nonce !== undefined && ConvoScriptData.nonce !== null && ConvoScriptData.nonce !== '') {
                $log.log('authInterceptor set X-WP-Nonce header', ConvoScriptData.nonce);
                config.headers['X-WP-Nonce'] = ConvoScriptData.nonce;
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

appModule.config( function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
});
