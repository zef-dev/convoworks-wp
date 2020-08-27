import angular from 'angular';
import ConvoProtoApi from './convo-proto-api';
import LoginService from './login-service';
import MainController from './main-controller';

export default angular
  .module('proto.common', [])
  .service('ConvoProtoApi', ConvoProtoApi)
  .service('LoginService', LoginService)
  .controller('MainController', MainController)
  .name;
