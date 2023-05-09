import angular from 'angular';

import propagationDropdown from './propagation-dropdown.directive';

import './propagation.scss';

export default angular
    .module('convo.editor.propagation', [])
    .directive('propagationDropdown', propagationDropdown)
    .name;