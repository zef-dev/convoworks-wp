import appModule from './app.module';


appModule.config([
  '$routeProvider',
  $routeProvider => {
     $routeProvider.
        otherwise({
            redirectTo: '/convoworks-editor'
        });
  }
]);