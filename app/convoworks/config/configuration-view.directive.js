import template from './configuration-view.tmpl.html';

/* @ngInject */
export default function configurationView($log, $state)
{
    return {
        restrict: 'E',
        template,
        scope: { service: '=' },
        require: '^serviceContext',
        link: function ($scope, $element, $attributes, serviceContext) {
            $scope.isConfigTabActive = function(tabName) {
                if (tabName === 'meta') {
                    return $state.includes('convoworks-editor-service.configuration.meta') || 
                           $state.is('convoworks-editor-service.configuration');
                }
                if (tabName === 'platforms') {
                    return $state.includes('convoworks-editor-service.configuration.platforms');
                }
                return false;
            };

            // Redirect to meta if directly on abstract state
            $scope.$watch(function() {
                return $state.current.name;
            }, function(stateName) {
                if (stateName === 'convoworks-editor-service.configuration') {
                    $state.go('convoworks-editor-service.configuration.meta', {}, {location: 'replace'});
                }
            });
            
            // Initial check
            if ($state.current.name === 'convoworks-editor-service.configuration') {
                $state.go('convoworks-editor-service.configuration.meta', {}, {location: 'replace'});
            }
        }
    }
}
