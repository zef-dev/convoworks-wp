(function () {
    'use strict';

    angular.module('adomee.admin').config(['$routeProvider', 'OR_JS_MK_VERSION',
        function ($routeProvider, OR_JS_MK_VERSION) {

    	
	        function fix_template( template)
	        {
	        	return template + '?v=' + OR_JS_MK_VERSION;
	        }
    	
            $routeProvider.
            

				when('/convoworks-editor/:service_id', {
					templateUrl: fix_template( 'app/convoworks/convoworks-editor.tmpl.html'),
					controller: 'ConvoworksEditorController',
					controllerAs: 'editorVm'
                });

        }]);
})();