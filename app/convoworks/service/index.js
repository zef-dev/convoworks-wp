import angular from 'angular';

import serviceContext from './service-context.directive';
import ServiceEditorController from './service-editor.controller';
import ServiceContextLoader from './service-context-loader.service';
import ComponentFactoryService from './component-factory.service';
import ClipboardService from './clipboard.service';
import ComponentDefinitionsHelperService from './component-definitions-helper.service';
import serviceSaveButtons from './service-save-buttons.directive';
import serviceSync from './service-sync.directive';

/* @ngInject */
export default angular
  .module('convo.service', [])
  .directive('serviceContext', serviceContext)
  .controller('ServiceEditorController', ServiceEditorController)
  .service('ServiceContextLoader', ServiceContextLoader)
  .service('ComponentFactoryService', ComponentFactoryService)
  .service('ClipboardService', ClipboardService)
  .service('ComponentDefinitionsHelperService', ComponentDefinitionsHelperService)
  .directive('serviceSaveButtons', serviceSaveButtons)
  .directive('serviceSync', serviceSync)
  .name;

