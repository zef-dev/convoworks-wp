export default function LoginService( $log, $q, ConvoProtoApi, $rootScope, $interval) {
  
    this.isSignedIn     =   isSignedIn;
    this.login          =   login;
    this.logout         =   logout;
    this.getUser        =   getUser;

    var signed_in       =   false;
    var user            =   null;   

    var INTERVAL        =   10 * 60 * 1000;
    var auto_refresh    =   null;
    
    $rootScope.clearUser    =   function() {
        $log.log( 'LoginService clearUser()');
        signed_in       =   false;
        user            =   null;   
    }
    
    function _initAutoRefresh()
    {
        if ( !auto_refresh) {
            $log.log( 'LoginService _initAutoRefresh()');
            auto_refresh    =   $interval( function () {
                user            =   null;   
                getUser();
            }, INTERVAL);
        }
    }
    
    function _stopAutoRefresh()
    {
        $log.log( 'LoginService _stopAutoRefresh()');
        $interval.cancel( auto_refresh);
        auto_refresh    =   null;
    }
    
    function getUser()
    {
        var deferred    =   $q.defer();
        if ( user) {
            deferred.resolve( user);
        } else {
            ConvoProtoApi.getUser().then( function ( u) {
                $log.log( 'LoginService getUser() u', u);
                user        =   u;
                signed_in   =   true;
                deferred.resolve( user);
                _initAutoRefresh();
            }, function ( reason) {
                $log.log( 'LoginService getUser() reason', reason);
                signed_in   =   false;
                user        =   null;
                deferred.reject( reason);
                _stopAutoRefresh();
            });
        }
        return deferred.promise;
    }

    function isSignedIn()
    {
        return signed_in;
    }

    function login( username, password) {
        $log.log( 'LoginService login()');
        return ConvoProtoApi.login( username, password).then(
            function ( u) {
                $log.log( 'LoginService login OK', u);
                signed_in   =   true;
                user        =   u;
                _initAutoRefresh();
            },
            function ( reason) {
                $log.log( 'LoginService login NOK', reason);
                signed_in   =   false;
                user        =   null;
                _stopAutoRefresh();
            }
        );
    }

    function logout() {
        $log.log( 'LoginService logout()');
        return ConvoProtoApi.logout().then(
            function () {
                $log.log( 'LoginService logout OK');
                signed_in   =   false;
                user        =   null;
                _stopAutoRefresh();
            },
            function ( reason) {
                signed_in   =   false;
                user        =   null;
            }
        );
    }
    
    return this;
};
