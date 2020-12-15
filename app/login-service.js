
 export default function LoginService( $q, WP_USER) {

    this.isSignedIn     =   isSignedIn;
    this.getUser        =   getUser;

    function getUser()
    {
        var deferred    =   $q.defer();
        deferred.resolve( WP_USER);
        return deferred.promise;
    }

    function isSignedIn()
    {
        return true;
    }
}
