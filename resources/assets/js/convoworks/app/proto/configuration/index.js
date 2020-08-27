import angular from 'angular';
import PlatformConfigurationController from './platform-configuration.controller';

export default angular
  .module('proto.configuration', [])
  .controller('PlatformConfigurationController', PlatformConfigurationController)
  .name;
