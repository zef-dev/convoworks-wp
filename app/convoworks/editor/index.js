import angular from 'angular';

import convoEditorActions from './actions';
import convoEditorToolbox from './toolbox';
import convoEditorWorkflow from './workflow';
import convoEditorVariables from './variables';
import convoEditorProps from './props';
import convoEditorSync from './sync';
import convoEditorNotifications from './notifications';
import propagation from './propagation';

import ConvoworksEditorController from './convoworks-editor.controller';
import propertiesContext from './properties-context.directive';
import ConvoComponentFactoryService from './convo-component-factory.service';
import ConvoClipboardService from './convo-clipboard.service';
import ComponentDefinitionsHelperService from './component-definitions-helper.service';
import PropertiesServiceLoader from './properties-service-loader.service';

/* @ngInject */
export default angular
  .module('convo.editor', [
    convoEditorActions,
    convoEditorToolbox,
    convoEditorWorkflow,
    convoEditorProps,
    convoEditorVariables,
    convoEditorSync,
    convoEditorNotifications,
    propagation
  ])
  .controller('ConvoworksEditorController', ConvoworksEditorController)
  .directive('propertiesContext', propertiesContext)
  .service('ConvoComponentFactoryService', ConvoComponentFactoryService)
  .service('ConvoClipboardService', ConvoClipboardService)
  .service('ComponentDefinitionsHelperService', ComponentDefinitionsHelperService)
  .service('PropertiesServiceLoader', PropertiesServiceLoader)
  .name;
