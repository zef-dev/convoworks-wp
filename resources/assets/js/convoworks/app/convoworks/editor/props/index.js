import angular from 'angular';

import propertiesEditor from './properties-editor.directive';

import convoIntentEditor from './convo-intent-editor.directive';
import intentUtteranceEditor from './intent-utterance-editor.directive';
import systemIntentEditor from './system-intent-editor.directive';

export default angular
  .module('convo.editor.props', [])
  .directive('propertiesEditor', propertiesEditor)
  .directive('convoIntentEditor', convoIntentEditor)
  .directive('intentUtteranceEditor', intentUtteranceEditor)
  .directive('systemIntentEditor', systemIntentEditor)
  .name;
