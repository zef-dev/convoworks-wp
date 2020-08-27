import angular from 'angular';
import HomeController from './home.controller';

export default angular
  .module('proto.home', [])
  .controller('HomeController', HomeController)
  .name;
