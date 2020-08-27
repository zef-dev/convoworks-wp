import angular from 'angular';

import previewPanel from './preview-panel.directive';
import previewVariablesEditor from './preview-variables-editor.directive';

export default angular
  .module('convo.editor.preview', [])
  .directive('previewPanel', previewPanel)
  .directive('previewVariablesEditor', previewVariablesEditor)
  .name;
