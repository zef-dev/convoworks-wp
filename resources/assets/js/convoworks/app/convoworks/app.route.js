
import appModule from './app.module';

appModule.config([
  '$routeProvider',
  $routeProvider => {
    $routeProvider.
            
        when('/convoworks-editor', {
            template: require( './services/convoworks-menu.tmpl.html'),
            controller: 'ConvoworksMainController',
            controllerAs: 'mainCworksVm'
        }).

        when('/convoworks-editor/:service_id', {
            template: require( './editor/convoworks-editor.tmpl.html'),
            controller: 'ConvoworksEditorController',
            controllerAs: 'editorVm',
            reloadOnSearch: false
        });
  }
]);
