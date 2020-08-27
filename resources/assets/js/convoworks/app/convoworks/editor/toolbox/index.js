import angular from 'angular';

import convoworksToolbox from './convoworks-toolbox.directive';
import convoworksToolboxComponent from './convoworks-toolbox-component.directive';

export default angular
  .module('convo.editor.toolbox', [])
  .directive('convoworksToolbox', convoworksToolbox)
  .directive('convoworksToolboxComponent', convoworksToolboxComponent)
  .name;
