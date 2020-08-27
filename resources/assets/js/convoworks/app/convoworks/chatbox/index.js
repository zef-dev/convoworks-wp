import angular from 'angular';

import './convo-chat.css';

import ConvoChatApi from './convo-chat-api';
import convoChatbox from './chatbox.directive';

export default angular
  .module('convo.chat', [])
  .directive('convoChatbox', convoChatbox)
  .service('ConvoChatApi', ConvoChatApi)
  .name;
