import angular from 'angular';
import '@uirouter/angularjs';

import LoginService from './login-service';
import convo from  './convoworks/index.js';
import wpHooks from  './wp-hooks/index.js';
import apiBuilder from  './api-builder/index.js';


const appModule =    angular.module( 'convo.wp', [
  'ui.router',
  convo,
  wpHooks,
  apiBuilder
]).service('LoginService', LoginService);

// combine all modules to create app module
export default appModule;
