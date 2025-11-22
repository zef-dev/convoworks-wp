import angular from 'angular';

import './convo-chat.scss';

import convoChatbox from './chatbox.directive';

/* @ngInject */
export default angular
  .module('convo.adminChat', ['convo.common'])
  .directive('convoChatbox', convoChatbox)
  .name;

