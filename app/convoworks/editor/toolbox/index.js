import angular from 'angular';

import './toolbox.scss';

import convoworksToolbox from './convoworks-toolbox.directive';
import convoworksToolboxComponent from './convoworks-toolbox-component.directive';

/* @ngInject */
export default angular
  .module('convo.editor.toolbox', ['convo.editor.workflow'])
  .directive('convoworksToolbox', convoworksToolbox)
  .directive('convoworksToolboxComponent', convoworksToolboxComponent)
  .name;
