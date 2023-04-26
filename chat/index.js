import angular from 'angular';
//import 'angular-animate';

import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.js';

import './convo-chat.scss';

import ConvoChatApi from './convo-chat-api';
import convoChatbox from './chatbox.directive';

/* @ngInject */
export default angular
  .module('convo.chat', [])
//  .module('convo.chat', ['ngAnimate'])
  .directive('convoChatbox', convoChatbox)
  .service('ConvoChatApi', ConvoChatApi)
  .name;
