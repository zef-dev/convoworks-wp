import template from './configuration-meta-view.tmpl.html';

/* @ngInject */
export default function configurationMetaView($log)
{
    return {
        restrict: 'E',
        template,
        scope: {},
        require: '^serviceContext',
        link: function ($scope, $element, $attributes, serviceContext) {
            // Set service from serviceContext
            function updateService() {
                if (serviceContext.isLoaded()) {
                    $scope.service = serviceContext.getSelectedService();
                }
            }
            
            // Initial update
            updateService();
            
            // Watch for service context to load
            $scope.$watch(serviceContext.isLoaded, function(isLoaded) {
                if (isLoaded) {
                    updateService();
                }
            });
        }
    }
}

