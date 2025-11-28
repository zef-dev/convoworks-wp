import template from './workflow-search.tmpl.html';

/* @ngInject */
export default function workflowSearch($log, $document, $timeout, $sce, WorkflowSearchService) {
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
                    const searchTerm = $scope.searchTerm || '';
                    $scope.results = WorkflowSearchService.search(serviceContext, searchTerm) || [];
                    $scope.selectedIndex = -1;
                    // Open dropdown if there are results or if we have a search term (to show "no results")
                    $scope.isOpen = searchTerm && searchTerm.trim() !== '';
                } catch (err) {
                    $log.error('workflowSearch: Search error', err, err.stack);
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
                if (!result || !result.path) {
                    return $sce.trustAsHtml('');
                }
                try {
                    const path = WorkflowSearchService.buildPathString(result.path);
                    return $sce.trustAsHtml(path || '');
                } catch (err) {
                    $log.warn('workflowSearch: Error building path', err);
                    return $sce.trustAsHtml('');
                }
            };

            $scope.getFullPathString = function(result) {
                if (!result || !result.path) {
                    return '';
                }
                try {
                    return WorkflowSearchService.buildFullPathString(result.path) || '';
                } catch (err) {
                    $log.warn('workflowSearch: Error building full path', err);
                    return '';
                }
            };

            $scope.getHighlightedName = function(result) {
                if (!result) {
                    return $sce.trustAsHtml('Unnamed');
                }
                try {
                    const searchTerm = $scope.searchTerm || '';
                    const html = WorkflowSearchService.getHighlightedName(result, searchTerm);
                    return $sce.trustAsHtml(html || result.name || 'Unnamed');
                } catch (err) {
                    $log.warn('workflowSearch: Error highlighting name', err);
                    return $sce.trustAsHtml(result.name || 'Unnamed');
                }
            };

            // Cache for match contexts to avoid multiple calls
            const matchContextCache = new Map();

            $scope.getMatchContext = function(result) {
                if (!result) {
                    return null;
                }
                
                // Use cache key based on componentId and searchTerm
                const cacheKey = (result.componentId || '') + '|' + ($scope.searchTerm || '');
                if (matchContextCache.has(cacheKey)) {
                    return matchContextCache.get(cacheKey);
                }

                try {
                    const searchTerm = $scope.searchTerm || '';
                    const context = WorkflowSearchService.getMatchContext(result, searchTerm);
                    if (!context || !context.property) {
                        matchContextCache.set(cacheKey, null);
                        return null;
                    }
                    const cachedContext = {
                        property: context.property || '',
                        snippet: $sce.trustAsHtml(context.snippet || '')
                    };
                    matchContextCache.set(cacheKey, cachedContext);
                    return cachedContext;
                } catch (err) {
                    $log.warn('workflowSearch: Error getting match context', err);
                    matchContextCache.set(cacheKey, null);
                    return null;
                }
            };

            // Helper to safely get match context property
            $scope.getMatchContextProperty = function(result) {
                const context = $scope.getMatchContext(result);
                return context ? context.property : '';
            };

            // Helper to safely get match context snippet
            $scope.getMatchContextSnippet = function(result) {
                const context = $scope.getMatchContext(result);
                return context ? context.snippet : null;
            };

            // Clear cache when search term changes
            $scope.$watch('searchTerm', function() {
                matchContextCache.clear();
            });

            $scope.onInputFocus = function() {
                if ($scope.results.length > 0) {
                    $scope.isOpen = true;
                }
            };

            // Prevent scroll propagation when scrolling within search results reaches boundaries
            function handleResultsScroll(event) {
                const listElement = event.target;
                
                // Get current scroll position
                const scrollTop = listElement.scrollTop;
                const scrollHeight = listElement.scrollHeight;
                const clientHeight = listElement.clientHeight;
                const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
                
                // Check if we're at boundaries (with small threshold for rounding)
                const isAtTop = scrollTop <= 1;
                const isAtBottom = scrollTop >= maxScrollTop - 1;
                
                // Get scroll direction
                // deltaY > 0 means scrolling down (wheel down)
                // deltaY < 0 means scrolling up (wheel up)
                let deltaY = event.deltaY;
                if (deltaY === undefined) {
                    // Fallback for older browsers
                    deltaY = event.wheelDelta ? -event.wheelDelta / 3 : 0;
                }
                
                // Only stop propagation if we're at a boundary and trying to scroll past it
                if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
                    event.stopPropagation();
                }
            }

            // Set up scroll event handler on the results list
            $scope.$watch('isOpen', function(newVal) {
                $timeout(() => {
                    const resultsList = $element.find('.search-results-list')[0];
                    if (resultsList) {
                        if (newVal) {
                            resultsList.addEventListener('wheel', handleResultsScroll, { passive: false });
                        } else {
                            resultsList.removeEventListener('wheel', handleResultsScroll);
                        }
                    }
                }, 0);
            });

            // Cleanup scroll handler
            $scope.$on('$destroy', function() {
                const resultsList = $element.find('.search-results-list')[0];
                if (resultsList) {
                    resultsList.removeEventListener('wheel', handleResultsScroll);
                }
            });

            $document.on('click', documentClickHandler);
        }
    };
}

