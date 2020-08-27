import appModule from './app.module';


appModule.config([
  '$routeProvider',
  $routeProvider => {
     $routeProvider.
            
        when('/home', {
            template: require( './home/home.tmpl.html'),
            controller: 'HomeController',
            controllerAs: 'homeVm'
        }).

        when('/oa/login', {
            template: require( './oauth/oauth-login.tmpl.html'),
            controller: 'OAuthLoginController',
            controllerAs: 'oauthVm'
        }).

        when('/platform-configuration', {
            template: require( './configuration/platform-configuration.tmpl.html'),
            controller: 'PlatformConfigurationController',
            controllerAs: 'configVm'
        }).

        otherwise({
            redirectTo: '/home'
        });
  }
]);