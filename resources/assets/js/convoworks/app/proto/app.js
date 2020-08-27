
var jQuery = require('jquery');
require('jquery-ui'); 

import 'angular';
import 'bootstrap/dist/css/bootstrap.css';

// routes
import './app.route';

// import css here
//import './styles/styles.css';

import appModule from './app.module';


appModule.factory('$exceptionHandler', function ($injector, $log) {

    return function (exception, cause) {
        $log.log( 'app exceptionHandler exception', exception, 'cause', cause);
        var AlertService = $injector.get('AlertService');
        if ( exception.data && exception.data.message) {
            AlertService.addDanger(exception.data.message);
        } else if (exception.message) {
            AlertService.addDanger(exception.message);
        }
        
        $log.error(exception);
//      exception.message += ' (caused by "' + cause + '")';
//        throw exception;
    };
});

appModule.run(
    function( $log, $rootScope, $location, LoginService, AlertService) {
        
        LoginService.getUser().catch( function ( err) {
             $log.debug('$routeChangeStart catch', err);
//                 throw new Error( err.data.message);
        }).finally( function () {
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
                        AlertService.addDanger( 'Not authenticated. Redirecting to home');
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

appModule.factory( 'authInterceptor', function ( $rootScope, $q, $log, $location) {
    return {
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

appModule.config(function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
    $httpProvider.defaults.withCredentials = true;
});



