(function () {
    'use strict';

    angular.module('convo.editor').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
            
                when('/convoworks-editor', {
                    templateUrl: 'app/convoworks/convoworks-menu.tmpl.html',
					controller: 'ConvoworksMainController',
					controllerAs: 'mainCworksVm'
                }).

				when('/convoworks-editor/:service_id', {
					templateUrl: 'app/convoworks/convoworks-editor.tmpl.html',
					controller: 'ConvoworksEditorController',
					controllerAs: 'editorVm',
                    reloadOnSearch: false
                });
        }]);
})();