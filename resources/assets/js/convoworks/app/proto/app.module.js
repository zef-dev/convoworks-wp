import angular from 'angular';
import 'angular-route';

import protoCommon from './common';
import protoHome from './home';
import protoNav from './nav';
import protoConfig from './configuration';
import protoOauth from './oauth';
import convo from '../convoworks';
//
const appModule =    angular.module( 'proto.admin', [
  'ngRoute',
  protoCommon,
  protoNav,
  protoConfig,
  protoOauth,
  protoHome,
  convo
]);


// combine all modules to create app module
export default appModule;
