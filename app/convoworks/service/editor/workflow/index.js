import angular from 'angular';

import './workflow-editor-view.scss';
import './selectable-component.scss';
import './convoworks-components-container.scss';
import './collapse-expand-buttons.scss';
import './workflow-search.scss';

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
import workflowSearch from './workflow-search.directive';
import WorkflowSearchService from './workflow-search.service';

/* @ngInject */
export default angular
    .module('convo.editor.workflow', [])
    .service('ConvoworksAddBlockService', ConvoworksAddBlockService)
    .service('ComponentDragDropService', ComponentDragDropService)
    .service('WorkflowSearchService', WorkflowSearchService)
    .directive('blockComponent', blockComponent)
    .directive('blockHeader', blockHeader)
    .directive('selectableComponentButtons', selectableComponentButtons)
    .directive('convoworksComponentsContainer', convoworksComponentsContainer)
    .directive('selectableComponent', selectableComponent)
    .directive('subroutineComponent', subroutineComponent)
    .directive('contextElement', contextElement)
    .directive('contextElementsContainer', contextElementsContainer)
    .directive('workflowSearch', workflowSearch)
    .controller('WorkflowEditorController', WorkflowEditorController)
    .name;
