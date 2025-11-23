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
import convoConfig from './config';
import convoReleases from './releases';
import convoIntents from './intents';
import convoImpExp from './import-export';
import convoEntities from './entities';
import convoTest from './test';
import convoEditor from './editor';
import convoServices from './services';

/* @ngInject */
export default angular
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
