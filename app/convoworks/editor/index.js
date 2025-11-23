import angular from 'angular';

import convoEditorToolbox from './toolbox';
import convoEditorWorkflow from './workflow';
import convoEditorVariables from './variables';
import convoEditorProps from './props';
import convoEditorNotifications from './notifications';
import propagation from './propagation';

/* @ngInject */
export default angular
  .module('convo.editor', [
    convoEditorToolbox,
    convoEditorWorkflow,
    convoEditorProps,
    convoEditorVariables,
    convoEditorNotifications,
    propagation
  ])
  .name;
