import angular from 'angular';

import ModalInstanceCtrl from './convoworks-add-service.controller';
import ConvoworksMainController from './convoworks-main.controller';

export default angular
  .module('convo.services', ['convo.common'])
  .controller( 'ConvoworksMainController', ConvoworksMainController)
  .controller( 'ModalInstanceCtrl', ModalInstanceCtrl)
//  .service('ConvoChatApi', ConvoChatApi)
  .name;
