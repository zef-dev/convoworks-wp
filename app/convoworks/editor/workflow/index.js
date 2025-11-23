import angular from 'angular';

import './workflow-editor-view.scss';
import './selectable-component.scss';
import './convoworks-components-container.scss';
import './collapse-expand-buttons.scss';

import convoEditorActions from '../actions';

import blockComponent from './block-component.directive';
import blockHeader from './block-header.directive';
import selectableComponentButtons from './selectable-component-buttons.directive';
import convoworksComponentsContainer from './convoworks-components-container.directive';
import selectableComponent from './selectable-component.directive';
import subroutineComponent from './subroutine-component.directive';
import ConvoworksAddBlockService from './convoworks-add-block.service';
import ComponentDragDropService from './component-drag-drop.service';

import contextElement from './context-element.directive';
import contextElementsContainer from './context-elements-container.directive';
import WorkflowEditorController from './workflow-editor.controller';

/* @ngInject */
export default angular
    .module('convo.editor.workflow', ['convo.editor.actions'])
    .service('ConvoworksAddBlockService', ConvoworksAddBlockService)
    .service('ComponentDragDropService', ComponentDragDropService)
    .directive('blockComponent', blockComponent)
    .directive('blockHeader', blockHeader)
    .directive('selectableComponentButtons', selectableComponentButtons)
    .directive('convoworksComponentsContainer', convoworksComponentsContainer)
    .directive('selectableComponent', selectableComponent)
    .directive('subroutineComponent', subroutineComponent)
    .directive('contextElement', contextElement)
    .directive('contextElementsContainer', contextElementsContainer)
    .controller('WorkflowEditorController', WorkflowEditorController)
    .name;
