import angular from 'angular';

import convoEditorToolbox from './toolbox';
import convoEditorWorkflow from './workflow';
import convoEditorProps from './props';
import convoEditorNotifications from './notifications';
import propagation from './propagation';
import convoEditorVariables from '../variables';

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
