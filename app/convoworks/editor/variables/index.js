import angular from 'angular';

import './variables.scss';

import variablesEditor from './variables-editor.directive';

/* @ngInject */
export default angular
  .module('convo.editor.variables', [])
  .directive('variablesEditor', variablesEditor)
  .name;
