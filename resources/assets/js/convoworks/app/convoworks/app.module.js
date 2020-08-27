import angular from 'angular';

import 'angular-local-storage';

import 'angular-route';
import 'angular-animate';
import 'angular-bootstrap-contextmenu';
import 'angular-cookies';
import 'angular-sanitize';
import 'angularjs-ui-bootstrap';
import 'ng-file-upload';

import convoCommon from './common';
import convoChat from './chatbox';
import convoEditor from './editor';
import convoServices from './services';

export default angular
    .module('convo', [ 
        convoCommon,
        convoChat,
        convoEditor,
        convoServices,
        'LocalStorageModule',
        'ui.bootstrap', 'ui.bootstrap.contextMenu',
        'ngSanitize', 'ngRoute', 'ngAnimate', 'ngCookies', 
        'ngFileUpload'
    ]);
