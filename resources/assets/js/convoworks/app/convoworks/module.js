(function () {
    'use strict';

    angular.module('convo.editor', [ 'ngRoute', 'ngAnimate', 'ngCookies', 'ngSanitize',
            'ui.bootstrap', 'ui.select', 'ui.bootstrap.contextMenu', 'LocalStorageModule', 'ngFileUpload', 'jsonFormatter']);
    
    angular.module('convo.editor').config(function (localStorageServiceProvider) {
          localStorageServiceProvider
            .setPrefix('convoAdmin')
//          .setStorageType('sessionStorage')
            .setNotify(true, true)
        });

})();