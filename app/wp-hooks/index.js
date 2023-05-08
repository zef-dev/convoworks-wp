import angular from 'angular';

import configWpHooksEditor from './config-wp-hooks-editor.directive';

/* @ngInject */
export default angular
    .module('wpHooks', ['convo'])
    .directive('configWpHooksEditor', configWpHooksEditor)
    .name;
