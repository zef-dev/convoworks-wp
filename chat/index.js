import angular from 'angular';

import './convo-chat.scss';

import ConvoChatApi from './convo-chat-api';
import ConvoChatPersister from './convo-chat-persister';
import convoChatbox from './chatbox.directive';

/* @ngInject */
export default angular
  .module('convo.chat', [])
  .directive('convoChatbox', convoChatbox)
  .service('ConvoChatApi', ConvoChatApi)
  .service('ConvoChatPersister', ConvoChatPersister)
  .name;
