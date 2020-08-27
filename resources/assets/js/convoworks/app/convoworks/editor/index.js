import angular from 'angular';

import convoEditorConfig from './config';
import convoEditorToolbox from './toolbox';
import convoEditorPreview from './preview';
import convoEditorIntents from './intents';
import convoEditorWorkflow from './workflow';
import convoEditorProps from './props';

import ConvoworksEditorController from './convoworks-editor.controller';
import propertiesContext from './properties-context.directive';
import ConvoComponentFactoryService from './convo-component-factory.service';

export default angular
  .module('convo.editor', [convoEditorConfig, convoEditorToolbox, convoEditorPreview, convoEditorIntents, convoEditorWorkflow, convoEditorProps])
  .controller('ConvoworksEditorController', ConvoworksEditorController)
  .directive('propertiesContext', propertiesContext)
  .service('ConvoComponentFactoryService', ConvoComponentFactoryService)
  .name;
