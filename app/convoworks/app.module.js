import angular from 'angular';

import 'angular-animate';
import 'angular-bootstrap-contextmenu';
import 'angular-cookies';
import 'angular-sanitize';
//import 'angularjs-ui-bootstrap';
import 'ui-bootstrap4';
import '@uirouter/angularjs';
import 'angular-local-storage';
import 'ng-file-upload';
import 'angular-ui-sortable';

import convoCommon from './common';
import convoService from './service';
import convoConfig from './service/config';
import convoReleases from './service/releases';
import convoIntents from './service/intents';
import convoImpExp from './service/import-export';
import convoEntities from './service/entities';
import convoTest from './service/test';
import convoEditor from './service/editor';
import convoServices from './services';

/* @ngInject */
const appModule = angular
    .module('convo', [
        convoCommon,
        convoService,
        convoConfig,
        convoReleases,
        convoIntents,
        convoImpExp,
        convoEntities,
        convoTest,
        convoEditor,
        convoServices,
        'LocalStorageModule',
        'ui.bootstrap', 'ui.bootstrap.contextMenu',
        'ngSanitize', 'ui.router', 'ngAnimate', 'ngCookies',
        'ngFileUpload', 'ui.sortable',
    ]);

/**
 * Global Angular exception handler.
 * Keeps full details in the console, but shows a short, user‑friendly alert.
 */
appModule.factory('$exceptionHandler', /* @ngInject */ function($log, AlertService) {
    return function(exception, cause) {
        $log.error('Angular exception', exception, cause);
        AlertService.addDanger('Unexpected error occurred in the editor. Please check console or reload the page.');
    };
});

export default appModule;
