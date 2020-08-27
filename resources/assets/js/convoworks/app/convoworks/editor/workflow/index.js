import angular from 'angular';

import blockComponent from './block-component.directive';
import convoworksComponentsContainer from './convoworks-components-container.directive';
import selectableComponent from './selectable-component.directive';
import subroutineComponent from './subroutine-component.directive';
import variablesEditor from './variables-editor.directive';
import ConvoworksAddBlockService from './convoworks-add-block.service';

import contextElement from './context-element.directive';
import contextElementsContainer from './context-elements-container.directive';

export default angular
  .module('convo.editor.workflow', [])
  .service('ConvoworksAddBlockService', ConvoworksAddBlockService)
  .directive('blockComponent', blockComponent)
  .directive('convoworksComponentsContainer', convoworksComponentsContainer)
  .directive('selectableComponent', selectableComponent)
  .directive('subroutineComponent', subroutineComponent)
  .directive('variablesEditor', variablesEditor)
  .directive('contextElement', contextElement)
  .directive('contextElementsContainer', contextElementsContainer)
  .name;
