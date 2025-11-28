import template from './workflow-search.tmpl.html';

/* @ngInject */
export default function workflowSearch($log, $document, $timeout, WorkflowSearchService) {
    return {
        restrict: 'E',
        require: '^serviceContext',
        template: template,
        scope: {},
        link: function($scope, $element, $attributes, serviceContext) {
            $scope.searchTerm = '';
            $scope.results = [];
            $scope.isOpen = false;
            $scope.selectedIndex = -1;
            $scope.isSearching = false;

            let searchTimeout = null;
            const DEBOUNCE_DELAY = 300;

            function keyboardShortcutHandler(event) {
                // Ctrl+F or Cmd+F
                if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                    event.preventDefault();
                    focusSearch();
                }
                // Escape to close
                if (event.key === 'Escape' && $scope.isOpen) {
                    $scope.$apply(() => {
                        closeSearch();
                    });
                }
            }

            // Close search when clicking outside
            const documentClickHandler = function(event) {
                if ($scope.isOpen && !$element[0].contains(event.target)) {
                    $scope.$apply(() => {
                        closeSearch();
                    });
                }
            };

            // Cleanup handlers
            $scope.$on('$destroy', function() {
                $document.off('keydown', keyboardShortcutHandler);
                $document.off('click', documentClickHandler);
            });

            $document.on('keydown', keyboardShortcutHandler);

            function focusSearch() {
                const input = $element.find('input')[0];
                if (input) {
                    input.focus();
                    $scope.$apply(() => {
                        $scope.isOpen = true;
                    });
                }
            }

            $scope.onSearchInput = function() {
                if (searchTimeout) {
                    $timeout.cancel(searchTimeout);
                }

                if (!$scope.searchTerm || $scope.searchTerm.trim() === '') {
                    $scope.results = [];
                    $scope.isOpen = false;
                    return;
                }

                $scope.isSearching = true;
                
                searchTimeout = $timeout(() => {
                    performSearch();
                }, DEBOUNCE_DELAY);
            };

            function performSearch() {
                try {
                    $scope.results = WorkflowSearchService.search(serviceContext, $scope.searchTerm);
                    $scope.selectedIndex = -1;
                    // Open dropdown if there are results or if we have a search term (to show "no results")
                    $scope.isOpen = $scope.searchTerm && $scope.searchTerm.trim() !== '';
                } catch (err) {
                    $log.error('workflowSearch: Search error', err);
                    $scope.results = [];
                    $scope.isOpen = $scope.searchTerm && $scope.searchTerm.trim() !== '';
                } finally {
                    $scope.isSearching = false;
                }
            }

            $scope.selectResult = function(result, index) {
                $scope.selectedIndex = index;
                closeSearch();
                WorkflowSearchService.navigateToResult(result, serviceContext);
            };

            $scope.closeSearch = function() {
                closeSearch();
            };

            function closeSearch() {
                $scope.isOpen = false;
                $scope.searchTerm = '';
                $scope.results = [];
                $scope.selectedIndex = -1;
                
                // Blur input
                const input = $element.find('input')[0];
                if (input) {
                    input.blur();
                }
            }

            // Keyboard navigation in results
            $scope.onSearchKeydown = function(event) {
                if (!$scope.isOpen || $scope.results.length === 0) {
                    return;
                }

                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        $scope.selectedIndex = ($scope.selectedIndex + 1) % $scope.results.length;
                        scrollToSelected();
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        $scope.selectedIndex = $scope.selectedIndex <= 0 ? 
                            $scope.results.length - 1 : $scope.selectedIndex - 1;
                        scrollToSelected();
                        break;
                    case 'Enter':
                        if ($scope.selectedIndex >= 0 && $scope.results[$scope.selectedIndex]) {
                            event.preventDefault();
                            $scope.selectResult($scope.results[$scope.selectedIndex], $scope.selectedIndex);
                        }
                        break;
                    case 'Escape':
                        event.preventDefault();
                        closeSearch();
                        break;
                }
            };

            function scrollToSelected() {
                $timeout(() => {
                    const selectedElement = $element.find('.search-result.selected')[0];
                    if (selectedElement) {
                        selectedElement.scrollIntoView({ block: 'nearest' });
                    }
                }, 10);
            }

            $scope.getPathString = function(result) {
                return WorkflowSearchService.buildPathString(result.path);
            };

            $scope.onInputFocus = function() {
                if ($scope.results.length > 0) {
                    $scope.isOpen = true;
                }
            };

            $document.on('click', documentClickHandler);
        }
    };
}

