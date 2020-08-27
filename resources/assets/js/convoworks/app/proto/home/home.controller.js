
export default class HomeController {
  constructor( $log, $scope, LoginService, PROTO_HOME_CHAT_SERVICE_ID) {
    $log.log('HomeController');

    // API
    $scope.ready                =   false;
    $scope.credentials          =   {};
    $scope.errorMessage         =   null;
    $scope.demoServiceId        =   null;

    $scope.login            =   function () {
        LoginService.login( $scope.credentials.username, $scope.credentials.password).then( function () {
            $scope.errorMessage         =   null;
        }, function ( reason) {
            $log.log('HomeController Login failed reason', reason);
            $scope.errorMessage         =   reason;
        });
    };
    
    
    _init();

    // INIT
    function _init()
    {
        $scope.demoServiceId        =   PROTO_HOME_CHAT_SERVICE_ID;
        $log.log('HomeController $scope.demoServiceId', $scope.demoServiceId);
    }

  }
}

//HomeController.$inject = [ $log, $scope, LoginService, PROTO_HOME_CHAT_SERVICE_ID];
