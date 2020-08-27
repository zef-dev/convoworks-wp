import angular from 'angular';

import entityEditor from './entity-editor.directive';
import intentEditor from './intent-editor.directive';

export default angular
  .module('convo.editor.intents', [])
  .directive('entityEditor', entityEditor)
  .directive('intentEditor', intentEditor)
  .name;
