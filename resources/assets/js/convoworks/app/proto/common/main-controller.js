
export default class MainController {
  constructor( $scope, $log, LoginService) {
    $log.log('MainController init');
  
    $scope.signedIn             =   false;
    $scope.user                 =   null;
    
    $scope.logout           =   function () {
        LoginService.logout().then( function () {
            $location.url('/home');
        }, function ( reason) {
            $log.log('MainController logout failed reason', reason);
        });
    };
    
    $scope.getUserObject = function()
    {
        return $scope.user;
    }

    $scope.getAuthUser          =   function () {
        if ( $scope.user) {
            return $scope.user.name;
        }
        return null;    
    };

    
    
            // LOGIN STATE
    $scope.$watch( function () {
        return LoginService.isSignedIn();
    }, function( value) {
        if ( value) {
            loadUser();
        } else {
            $scope.signedIn     =   false;
            $scope.user         =   null;
        }
    });

    // INIT
    loadUser();

    
    function loadUser()
    {
        LoginService.getUser().then( function ( user) {
            $scope.user         =   user;
            $scope.signedIn     =   true;
        }, function ( reason) {
            $log.log('MainController loadUser failed reason', reason);
        });
    }
  }
}

//MainController.$inject = [ '$scope', '$log', 'LoginService'];

