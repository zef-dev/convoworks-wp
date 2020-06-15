(function () {
    'use strict';

    angular.module('adomee.admin').config(['$routeProvider', 'OR_JS_MK_VERSION',
        function ($routeProvider, OR_JS_MK_VERSION) {

    	
	        function fix_template( template)
	        {
	        	return template + '?v=' + OR_JS_MK_VERSION;
	        }
    	
            $routeProvider.
            
                when('/convoworks-editor', {
                    templateUrl: fix_template( 'app/convoworks/convoworks-menu.tmpl.html'),
					controller: 'ConvoworksMainController',
					controllerAs: 'mainCworksVm'
                }).

				when('/convoworks-editor/:service_id', {
					templateUrl: fix_template( 'app/convoworks/convoworks-editor.tmpl.html'),
					controller: 'ConvoworksEditorController',
					controllerAs: 'editorVm'
                }).
                
                when('/home', {
                    templateUrl: fix_template( 'app/home/home.tmpl.html'),
					controller: 'HomeController',
					controllerAs: 'homeVm'
                }).

                when('/oa/login', {
                    templateUrl: fix_template('app/oauth/oauth-login.tmpl.html'),
                    controller: 'OAuthLoginController',
                    controllerAs: 'oauthVm'
                }).

                when('/platform-configuration', {
					templateUrl: fix_template( 'app/configuration/platform-configuration.tmpl.html'),
					controller: 'PlatformConfigurationController',
					controllerAs: 'configVm'
                }).

                otherwise({
                    redirectTo: '/home'
                });

        }]);
})();