import angular from 'angular';
import navbarToggle from './navbar-toggle.directive';
import admNavigation from './navigation.directive';

export default angular
  .module('proto.nav', [])
  .directive('navbarToggle', navbarToggle)
  .directive('admNavigation', admNavigation)
  .name;
