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
        require: '?^serviceContext',
        template: template,
        link: function($scope, $element, $attributes, serviceContext) {
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

            // Check if we have serviceContext for save buttons
            if ($scope.showSaveButtons && !serviceContext) {
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

                    var isStuck = false;
                    var pendingUpdate = null;
                    var rafId = null;
                    var debounceTimer = null;
                    var lastIntersectingState = null;
                    var DEBOUNCE_DELAY = 30; // Small delay to ensure state stability

                    var applyStuckState = function(shouldBeStuck) {
                        if (shouldBeStuck === isStuck) {
                            return; // State already matches, no change needed
                        }

                        if (shouldBeStuck) {
                            headerElement.classList.add('is-stuck');
                            isStuck = true;
                        } else {
                            headerElement.classList.remove('is-stuck');
                            isStuck = false;
                        }
                    };

                    var updateStuckState = function(entry) {
                        var currentIntersecting = entry.isIntersecting;
                        var shouldBeStuck = !currentIntersecting;

                        // Clear any pending debounce timer
                        if (debounceTimer) {
                            clearTimeout(debounceTimer);
                            debounceTimer = null;
                        }

                        // Ignore if intersection state hasn't actually changed
                        if (lastIntersectingState === currentIntersecting) {
                            return;
                        }

                        // Update the tracked state immediately
                        lastIntersectingState = currentIntersecting;

                        // Debounce the actual DOM update to prevent rapid toggling
                        debounceTimer = setTimeout(function() {
                            // Verify state hasn't changed again during debounce
                            if (lastIntersectingState === currentIntersecting) {
                                pendingUpdate = shouldBeStuck;

                                // Cancel any pending animation frame
                                if (rafId) {
                                    cancelAnimationFrame(rafId);
                                }

                                // Use requestAnimationFrame to batch DOM updates
                                rafId = requestAnimationFrame(function() {
                                    if (pendingUpdate !== null) {
                                        applyStuckState(pendingUpdate);
                                        pendingUpdate = null;
                                    }
                                    rafId = null;
                                });
                            }
                            debounceTimer = null;
                        }, DEBOUNCE_DELAY);
                    };

                    var observer = new IntersectionObserver(
                        function(entries) {
                            // Process only the first entry (should only be one sentinel)
                            if (entries.length > 0) {
                                updateStuckState(entries[0]);
                            }
                        },
                        {
                            root: null,
                            threshold: 0
                        }
                    );

                    observer.observe(sentinel);

                    // Cleanup on destroy
                    $scope.$on('$destroy', function() {
                        if (rafId) {
                            cancelAnimationFrame(rafId);
                        }
                        if (debounceTimer) {
                            clearTimeout(debounceTimer);
                        }
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

