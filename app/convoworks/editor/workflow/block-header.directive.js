import template from './block-header.tmpl.html';

/* @ngInject */
export default function blockHeader($log) {
    return {
        restrict: 'E',
        scope: {
            title: '@',
            namespace: '@',
            description: '@',
            showButtons: '@',
            toggleFn: '&?',
            showSaveButtons: '@'
        },
        require: '?^propertiesContext',
        template: template,
        link: function($scope, $element, $attributes, propertiesContext) {
            $log.log('blockHeader linked');

            // Parse boolean attributes (Angular expressions are evaluated to strings "true"/"false")
            // With @ binding, $scope.showButtons will contain the interpolated string value
            // Default to true if not specified
            var parseBoolean = function(value) {
                if (value === undefined || value === null || value === '') {
                    return true; // Default to true
                }
                if (typeof value === 'boolean') {
                    return value;
                }
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true';
                }
                return !!value;
            };

            $scope.showButtons = parseBoolean($scope.showButtons);
            $scope.showSaveButtons = parseBoolean($scope.showSaveButtons);

            // Check if we have propertiesContext for save buttons
            if ($scope.showSaveButtons && !propertiesContext) {
                $scope.showSaveButtons = false;
            }
        }
    }
};

