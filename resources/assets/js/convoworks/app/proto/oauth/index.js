import angular from 'angular';
import OAuthLoginController from './oauth-login.controller';
import OAuthApi from './oauth.api';

export default angular
  .module('proto.oauth', ['proto.common'])
  .controller('OAuthLoginController', OAuthLoginController)
  .service('OAuthApi', OAuthApi)
  .name;
