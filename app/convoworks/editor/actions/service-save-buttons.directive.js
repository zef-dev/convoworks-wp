import template from './service-save-buttons.tmpl.html';

/* @ngInject */
export default function serviceSaveButtons($log) {
    return {
        restrict: 'E',
        template,
        scope: false,
        require: '^propertiesContext',
        link: function ($scope, $element, $attributes, propertiesContext) {
            $log.log('serviceSaveButtons linked');

            $scope.loading = false;

            $scope.saveChanges = () => {
                $log.log('serviceSaveButtons saving changes');
                $scope.loading = true;

                propertiesContext.saveChanges().then(() => {
                    $log.log('serviceSaveButtons changes saved');
                    $scope.loading = false;
                })
            }

            $scope.isServiceChanged = propertiesContext.isServiceChanged;
            $scope.hasActiveProcesses = propertiesContext.hasActiveProcesses;

            // Expose revertClicked from parent scope (propertiesContext)
            // Since scope: false, we need to walk up to find propertiesContext scope
            var findRevertClicked = function(scope) {
                if (scope && typeof scope.revertClicked === 'function') {
                    return scope.revertClicked;
                }
                if (scope && scope.$parent) {
                    return findRevertClicked(scope.$parent);
                }
                return null;
            };

            var revertFn = findRevertClicked($scope.$parent);
            if (revertFn) {
                $scope.revertClicked = revertFn;
            } else {
                // Fallback: create wrapper if not found in scope chain
                $scope.revertClicked = function() {
                    $log.log('serviceSaveButtons revertClicked - calling propertiesContext.revertChanges');
                    if (propertiesContext && propertiesContext.revertChanges) {
                        propertiesContext.revertChanges();
                    }
                };
            }

            // Attach handlers after DOM is ready
            $scope.$evalAsync(function() {
                // Stop event propagation on all button clicks to prevent triggering block selection
                $element.find('button').on('click', function(event) {
                    event.stopPropagation();
                });

                // Stop propagation on form submit
                $element.find('form').on('submit', function(event) {
                    event.stopPropagation();
                });
            });

            // Cleanup on destroy
            $scope.$on('$destroy', function() {
                $element.find('button').off('click');
                $element.find('form').off('submit');
            });
        }
    }
}
