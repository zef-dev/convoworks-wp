import angular from 'angular';

import configApiBuilderEditor from './config-api-builder-editor.directive';

/* @ngInject */
export default angular
    .module('apiBuilder', ['convo'])
    .directive('configApiBuilderEditor', configApiBuilderEditor)
    .name;
