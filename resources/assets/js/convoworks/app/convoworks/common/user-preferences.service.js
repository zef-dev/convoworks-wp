
export default function UserPreferencesService( $q, localStorageService)
{
    this.registerData       =   registerData;
    this.getData            =   getData;
    
    function getData( key)
    {
        var deferred    =   $q.defer();
        deferred.resolve( localStorageService.get( key));
        return deferred.promise;
    }
    
    function registerData( key, data)
    {
        localStorageService.set( key, data)
    }
};
