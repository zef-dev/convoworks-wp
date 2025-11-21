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
            showSaveButtons: '@',
            role: '@'
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

            // Detect when header becomes sticky
            var headerElement = $element[0].querySelector('.block-header');
            if (headerElement && typeof IntersectionObserver !== 'undefined') {
                // Create a sentinel element right before the header to detect when it sticks
                var sentinel = document.createElement('div');
                sentinel.style.position = 'absolute';
                sentinel.style.top = '0';
                sentinel.style.width = '1px';
                sentinel.style.height = '1px';
                sentinel.style.pointerEvents = 'none';
                sentinel.style.visibility = 'hidden';
                
                var parent = headerElement.parentElement;
                if (parent) {
                    parent.insertBefore(sentinel, headerElement);
                    
                    var observer = new IntersectionObserver(
                        function(entries) {
                            entries.forEach(function(entry) {
                                if (!entry.isIntersecting) {
                                    // Sentinel is out of view, header is stuck
                                    headerElement.classList.add('is-stuck');
                                } else {
                                    // Sentinel is visible, header is not stuck
                                    headerElement.classList.remove('is-stuck');
                                }
                            });
                        },
                        {
                            root: null,
                            threshold: 0
                        }
                    );

                    observer.observe(sentinel);

                    // Cleanup on destroy
                    $scope.$on('$destroy', function() {
                        observer.disconnect();
                        if (sentinel.parentNode) {
                            sentinel.parentNode.removeChild(sentinel);
                        }
                    });
                }
            }
        }
    }
};

