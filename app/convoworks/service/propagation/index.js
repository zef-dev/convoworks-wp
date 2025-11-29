import angular from 'angular';

import propagationDropdown from './propagation-dropdown.directive';

import './propagation.scss';

export default angular
    .module('convo.service.propagation', [])
    .directive('propagationDropdown', propagationDropdown)
    .name;