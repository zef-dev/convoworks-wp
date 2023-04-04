import angular from 'angular';
import '@uirouter/angularjs';

import LoginService from './login-service';
import convo from  './convoworks/index.js';


const appModule =    angular.module( 'convo.wp', [
  'ui.router',
  convo
]).service('LoginService', LoginService);

// combine all modules to create app module
export default appModule;
