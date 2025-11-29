/* @ngInject */
export default function WorkflowSearchService($log, $rootScope, $state, $q, $timeout, $document, UserPreferencesService) {

    const service = {
        search: search,
        navigateToResult: navigateToResult,
        buildPathString: buildPathString,
        buildFullPathString: buildFullPathString,
        getHighlightedName: getHighlightedName,
        getMatchContext: getMatchContext
    };

    /**
     * Search through all blocks and fragments
     */
    function search(serviceContext, searchTerm) {
        if (!searchTerm || String(searchTerm).trim() === '') {
            return [];
        }

        const service = serviceContext.getSelectedService();
        if (!service) {
            return [];
        }

        const results = [];
        const term = String(searchTerm).toLowerCase().trim();

        // Search through blocks (steps)
        if (service.blocks && Array.isArray(service.blocks)) {
            service.blocks.forEach(block => {
                if (!block || !block.properties) return;
                try {
                    const blockResults = traverseComponent(
                        block,
                        serviceContext,
                        [{ type: 'block', name: block.properties.name || block.properties.block_id, blockId: block.properties.block_id }]
                    );
                    results.push(...blockResults);
                } catch (err) {
                    $log.warn('WorkflowSearchService: Error traversing block', err);
                }
            });
        }

        // Search through fragments
        if (service.fragments && Array.isArray(service.fragments)) {
            service.fragments.forEach(fragment => {
                if (!fragment || !fragment.properties) return;
                try {
                    const fragmentResults = traverseComponent(
                        fragment,
                        serviceContext,
                        [{ type: 'fragment', name: fragment.properties.name || fragment.properties.fragment_id, fragmentId: fragment.properties.fragment_id }]
                    );
                    results.push(...fragmentResults);
                } catch (err) {
                    $log.warn('WorkflowSearchService: Error traversing fragment', err);
                }
            });
        }

        // Filter results by search term
        return results.filter(result => {
            try {
                return matchesSearch(result, term);
            } catch (err) {
                $log.warn('WorkflowSearchService: Error matching result', err);
                return false;
            }
        });
    }

    /**
     * Recursively traverse a component and its children
     */
    function traverseComponent(component, serviceContext, path = []) {
        if (!component || !component.class) {
            return [];
        }

        const results = [];

        try {
            const definition = serviceContext.getComponentDefinition(component.class);

            // Add current component to results
            if (!component.properties || !component.properties._component_id) {
                $log.warn('WorkflowSearchService: Component missing required properties', component);
                return results;
            }

            const componentInfo = {
                component: component,
                definition: definition, // Store definition for matching
                path: Array.isArray(path) ? [...path] : [],
                componentId: component.properties._component_id,
                blockId: component.properties.block_id || null,
                fragmentId: component.properties.fragment_id || null,
                name: getComponentName(component, definition) || 'Unnamed',
                definitionName: (definition && definition.name) ? definition.name : null,
                type: component.properties.block_id ? 'block' : 
                      component.properties.fragment_id ? 'fragment' : 'component',
                matchInfo: null // Initialize to null, will be set by matchesSearch
            };
            results.push(componentInfo);

            // Get component properties that might contain child components
            const componentProperties = definition.component_properties || {};

            // Check regular properties
            for (const propName in componentProperties) {
                // Skip system properties (starting with _)
                if (propName.startsWith('_')) {
                    continue;
                }

                const propDef = componentProperties[propName];

                // Check if this property contains components
                if (propDef.editor_type === 'service_components') {
                    const propValue = component.properties[propName];

                    if (propDef.editor_properties && propDef.editor_properties.multiple) {
                        // Array of components
                        if (Array.isArray(propValue)) {
                            propValue.forEach((child, index) => {
                                if (child && child.class) {
                                    const childPath = [...path, {
                                        type: 'container',
                                        propName: propDef.name || propName,
                                        propertyPath: propName,
                                        containerId: component.properties._component_id,
                                        index: index
                                    }];
                                    results.push(...traverseComponent(child, serviceContext, childPath));
                                }
                            });
                        }
                    } else {
                        // Single component
                        if (propValue && propValue.class) {
                            const childPath = [...path, {
                                type: 'container',
                                propName: propDef.name || propName,
                                propertyPath: propName,
                                containerId: component.properties._component_id
                            }];
                            results.push(...traverseComponent(propValue, serviceContext, childPath));
                        }
                    }
                }
            }

            // Check ok_specific properties (nested properties)
            const okSpecific = componentProperties.ok_specific;
            if (okSpecific) {
                for (const propName in okSpecific) {
                    // Skip system properties
                    if (propName.startsWith('_')) {
                        continue;
                    }

                    const propDef = okSpecific[propName];

                    if (propDef.editor_type === 'service_components') {
                        const nestedPath = 'ok_specific.' + propName;
                        const propValue = component.properties.ok_specific && component.properties.ok_specific[propName];

                        if (propDef.editor_properties && propDef.editor_properties.multiple) {
                            // Array of components
                            if (Array.isArray(propValue)) {
                                propValue.forEach((child, index) => {
                                    if (child && child.class) {
                                        const childPath = [...path, {
                                            type: 'container',
                                            propName: propDef.name || propName,
                                            propertyPath: nestedPath,
                                            containerId: component.properties._component_id,
                                            index: index
                                        }];
                                        results.push(...traverseComponent(child, serviceContext, childPath));
                                    }
                                });
                            }
                        } else {
                            // Single component
                            if (propValue && propValue.class) {
                                const childPath = [...path, {
                                    type: 'container',
                                    propName: propDef.name || propName,
                                    propertyPath: nestedPath,
                                    containerId: component.properties._component_id
                                }];
                                results.push(...traverseComponent(propValue, serviceContext, childPath));
                            }
                        }
                    }
                }
            }

        } catch (err) {
            $log.warn('WorkflowSearchService: Error traversing component', err);
        }

        return results;
    }

    /**
     * Get component name from component or definition
     */
    function getComponentName(component, definition) {
        if (component.properties && component.properties.name) {
            return component.properties.name;
        }
        if (component.properties && component.properties.title) {
            return component.properties.title;
        }
        if (definition && definition.name) {
            return definition.name;
        }
        return 'Unnamed';
    }

    /**
     * Check if a component matches the search term and track what matched
     */
    function matchesSearch(result, searchTerm) {
        if (!result || !result.component || !searchTerm) {
            return false;
        }

        const term = String(searchTerm).toLowerCase().trim();
        if (!term) {
            return false;
        }

        result.matchInfo = {
            nameMatch: false,
            definitionNameMatch: false,
            propertyMatches: []
        };

        let hasMatch = false;

        // Search in component name (properties.name or properties.title)
        if (result.name && typeof result.name === 'string' && result.name.toLowerCase().includes(term)) {
            result.matchInfo.nameMatch = true;
            result.matchInfo.nameMatchIndex = result.name.toLowerCase().indexOf(term);
            hasMatch = true;
        }

        // Search in component definition name (class name)
        if (result.definitionName && typeof result.definitionName === 'string' && result.definitionName.toLowerCase().includes(term)) {
            result.matchInfo.definitionNameMatch = true;
            result.matchInfo.definitionNameMatchIndex = result.definitionName.toLowerCase().indexOf(term);
            hasMatch = true;
        }

        // Always search in property values (to show match context even if name matches)
        if (result.component && result.component.properties) {
            const propertyMatch = searchInProperties(result.component.properties, term, result.matchInfo);
            if (propertyMatch) {
                hasMatch = true;
            }
        }

        // If no match found, clear matchInfo
        if (!hasMatch) {
            result.matchInfo = null;
            return false;
        }

        return true;
    }

    /**
     * Recursively search through property values and track matches
     */
    function searchInProperties(obj, term, matchInfo, propertyPath = '') {
        if (!obj || typeof obj !== 'object' || !term || !matchInfo) {
            return false;
        }

        const searchTerm = String(term).toLowerCase();
        let found = false;

        for (const key in obj) {
            // Skip system properties (starting with _)
            if (key.startsWith('_')) {
                continue;
            }

            const value = obj[key];
            const currentPath = propertyPath ? `${propertyPath}.${key}` : key;

            // Skip component objects themselves (we search their properties separately)
            if (value && typeof value === 'object' && value.class && value.properties) {
                continue;
            }

            // Search in string values
            if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
                const matchIndex = value.toLowerCase().indexOf(searchTerm);
                const snippet = _extractSnippet(value, searchTerm, matchIndex);
                if (matchInfo.propertyMatches) {
                    matchInfo.propertyMatches.push({
                        property: currentPath,
                        value: value,
                        matchIndex: matchIndex,
                        snippet: snippet
                    });
                }
                found = true;
            }

            // Search in number values
            if (typeof value === 'number' && value.toString().includes(searchTerm)) {
                const valueStr = value.toString();
                const matchIndex = valueStr.indexOf(searchTerm);
                if (matchInfo.propertyMatches) {
                    matchInfo.propertyMatches.push({
                        property: currentPath,
                        value: valueStr,
                        matchIndex: matchIndex,
                        snippet: valueStr
                    });
                }
                found = true;
            }

            // Search in arrays (but not component arrays)
            if (Array.isArray(value)) {
                if (value.length > 0 && value[0] && value[0].class) {
                    // This is an array of components, skip
                    continue;
                }
                value.forEach((item, index) => {
                    if (typeof item === 'string' && item.toLowerCase().includes(searchTerm)) {
                        const matchIndex = item.toLowerCase().indexOf(searchTerm);
                        const snippet = _extractSnippet(item, searchTerm, matchIndex);
                        if (matchInfo.propertyMatches) {
                            matchInfo.propertyMatches.push({
                                property: `${currentPath}[${index}]`,
                                value: item,
                                matchIndex: matchIndex,
                                snippet: snippet
                            });
                        }
                        found = true;
                    } else if (typeof item === 'object' && item !== null && !item.class) {
                        if (searchInProperties(item, searchTerm, matchInfo, `${currentPath}[${index}]`)) {
                            found = true;
                        }
                    }
                });
            }

            // Recursively search in objects (but not component objects)
            if (typeof value === 'object' && value !== null) {
                if (!value.class) { // Not a component object
                    if (searchInProperties(value, searchTerm, matchInfo, currentPath)) {
                        found = true;
                    }
                }
            }
        }

        return found;
    }

    /**
     * Extract a snippet around the match for display
     */
    function _extractSnippet(text, term, matchIndex, contextLength = 30) {
        if (!text || typeof text !== 'string' || matchIndex === -1) {
            return text || '';
        }

        const start = Math.max(0, matchIndex - contextLength);
        const end = Math.min(text.length, matchIndex + (term ? term.length : 0) + contextLength);
        let snippet = text.substring(start, end);
        
        if (start > 0) {
            snippet = '...' + snippet;
        }
        if (end < text.length) {
            snippet = snippet + '...';
        }
        
        return snippet;
    }

    /**
     * Navigate to a search result
     */
    function navigateToResult(result, serviceContext) {
        if (!serviceContext) {
            $log.error('WorkflowSearchService: navigateToResult requires serviceContext');
            return;
        }

        // Extract block/fragment info from path (first segment) or from result
        let targetTab = 'steps';
        let targetId = null;

        // Find the root block or fragment from the path
        const rootSegment = result.path && result.path.length > 0 ? result.path[0] : null;

        if (rootSegment) {
            if (rootSegment.type === 'block' && rootSegment.blockId) {
                targetTab = 'steps';
                targetId = rootSegment.blockId;
            } else if (rootSegment.type === 'fragment' && rootSegment.fragmentId) {
                targetTab = 'fragments';
                targetId = rootSegment.fragmentId;
            }
        }

        // Fallback to result's own block/fragment IDs
        if (!targetId) {
            if (result.blockId) {
                targetTab = 'steps';
                targetId = result.blockId;
            } else if (result.fragmentId) {
                targetTab = 'fragments';
                targetId = result.fragmentId;
            }
        }

        if (!targetId) {
            $log.warn('WorkflowSearchService: Cannot navigate to result - no blockId or fragmentId found', result);
            return;
        }

        // Get current state to check if we need to navigate to editor first
        const currentState = $state.current.name;
        const needsEditorNav = !currentState || !currentState.includes('editor');

        // First ensure we're on the editor tab
        const navigateToEditor = needsEditorNav ?
            $state.go('convoworks-editor-service.editor', {}, {
                inherit: true,
                reload: false,
                notify: true,
                location: true
            }) : $q.when();

        navigateToEditor.then(() => {
            // Switch to appropriate tab and select block/fragment
            return $state.go('convoworks-editor-service.editor', {
                sv: targetTab,
                sb: targetId
            }, {
                inherit: true,
                reload: false,
                notify: true,
                location: true
            });
        }).then(() => {
            // Wait a bit for state to settle
            return $timeout(() => {}, 100);
        }).then(() => {
            // Expand direct parent containers along the path
            expandParentContainers(result.path, serviceContext);

            // Wait for containers to expand and DOM to update
            return $timeout(() => {
                // Find the component by ID in the service structure
                const actualComponent = findComponentById(result.componentId, serviceContext.getSelectedService());

                if (actualComponent) {
                    selectComponent(actualComponent, serviceContext);
                    scrollToComponent(result.componentId);
                } else {
                    $log.warn('WorkflowSearchService: Could not find component by ID', result.componentId);
                    // Try with original component reference as fallback
                    selectComponent(result.component, serviceContext);
                    scrollToComponent(result.componentId);
                }
            }, 500); // Wait for DOM to update after state change
        }).catch((err) => {
            $log.error('WorkflowSearchService: Navigation error', err);
        });
    }

    /**
     * Expand containers in the path (only those needed to show the target component)
     */
    function expandParentContainers(path, serviceContext) {
        const service = serviceContext.getSelectedService();

        // Find all container segments in the path (not blocks/fragments)
        const parentContainers = path.filter(segment => segment.type === 'container');

        // Expand all containers in the path so the target component becomes visible
        // We need to expand from root to leaf to ensure nested containers are accessible
        parentContainers.forEach(container => {
            const propPath = container.propertyPath || container.propName;
            const containerKey = service.service_id + '-' + container.containerId + '-' + propPath + '-open';
            UserPreferencesService.registerData(containerKey, true);
        });

        // Do NOT broadcast ExpandAllRequested - that would expand ALL containers, not just those in the path
    }

    /**
     * Find component by ID in service structure
     */
    function findComponentById(componentId, service) {
        function searchInComponent(comp) {
            if (!comp || !comp.properties) {
                return null;
            }

            if (comp.properties._component_id === componentId) {
                return comp;
            }

            // Search in all properties
            for (const key in comp.properties) {
                if (key.startsWith('_')) {
                    continue;
                }

                const value = comp.properties[key];

                if (value && typeof value === 'object') {
                    if (value.class && value.properties) {
                        // It's a component
                        const found = searchInComponent(value);
                        if (found) return found;
                    } else if (Array.isArray(value) && value.length > 0 && value[0] && value[0].class) {
                        // It's an array of components
                        for (const child of value) {
                            const found = searchInComponent(child);
                            if (found) return found;
                        }
                    } else if (typeof value === 'object') {
                        // Check nested objects like ok_specific
                        for (const nestedKey in value) {
                            const nestedValue = value[nestedKey];
                            if (nestedValue && nestedValue.class) {
                                const found = searchInComponent(nestedValue);
                                if (found) return found;
                            } else if (Array.isArray(nestedValue) && nestedValue.length > 0 && nestedValue[0] && nestedValue[0].class) {
                                for (const child of nestedValue) {
                                    const found = searchInComponent(child);
                                    if (found) return found;
                                }
                            }
                        }
                    }
                }
            }

            return null;
        }

        // Search in blocks
        if (service.blocks) {
            for (const block of service.blocks) {
                const found = searchInComponent(block);
                if (found) return found;
            }
        }

        // Search in fragments
        if (service.fragments) {
            for (const fragment of service.fragments) {
                const found = searchInComponent(fragment);
                if (found) return found;
            }
        }

        return null;
    }

    /**
     * Select a component (if it's selectable)
     */
    function selectComponent(component, serviceContext) {
        // Use serviceContext to select the component
        if (component) {
            serviceContext.setSelectedComponent(component);
        }
    }

    /**
     * Scroll component into view within the scrollable container
     */
    function scrollToComponent(componentId) {
        $timeout(() => {
            // Find element by component ID
            const element = $document.find(`[data-component-id="${componentId}"]`);

            if (element.length) {
                const targetElement = element[0];
                
                // Find the scrollable components-container that contains this element
                let scrollContainer = targetElement;
                while (scrollContainer && scrollContainer !== document.body) {
                    if (scrollContainer.classList && scrollContainer.classList.contains('components-container')) {
                        break;
                    }
                    scrollContainer = scrollContainer.parentElement;
                }

                // If we found the container, scroll within it
                if (scrollContainer && scrollContainer.classList && scrollContainer.classList.contains('components-container')) {
                    // Get current positions relative to viewport
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elementRect = targetElement.getBoundingClientRect();
                    
                    // Calculate element's absolute position in the container's scrollable content
                    // elementRect.top is relative to viewport, containerRect.top is relative to viewport
                    // The difference gives us the element's position relative to the visible top of container
                    // Add the container's current scroll position to get absolute position in scrollable content
                    const elementTopInContent = (elementRect.top - containerRect.top) + scrollContainer.scrollTop;
                    
                    // Calculate desired scroll position (center the element vertically in container viewport)
                    const containerHeight = scrollContainer.clientHeight;
                    const elementHeight = elementRect.height;
                    const desiredScrollTop = elementTopInContent - (containerHeight / 2) + (elementHeight / 2);
                    
                    // Smoothly scroll the container, not the page
                    // Use requestAnimationFrame to ensure DOM updates are complete
                    requestAnimationFrame(() => {
                        scrollContainer.scrollTo({
                            top: Math.max(0, Math.min(desiredScrollTop, scrollContainer.scrollHeight - containerHeight)),
                            behavior: 'smooth'
                        });
                    });
                } else {
                    // Fallback: if container not found, use scrollIntoView but with 'nearest' to minimize page scroll
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }

                // Highlight briefly
                element.addClass('search-highlight');
                $timeout(() => {
                    element.removeClass('search-highlight');
                }, 2000);
            }
        }, 500); // Wait for containers to expand
    }

    /**
     * Build a human-readable path string from path segments
     * Skips containers and uses smart truncation (4 segments before/after ellipsis)
     */
    function buildPathString(path) {
        if (!path || !Array.isArray(path)) {
            return '';
        }

        // Filter out containers and build display names
        const segments = [];

        path.forEach(segment => {
            if (!segment) return;
            
            if (segment.type === 'block') {
                segments.push({
                    type: 'block',
                    displayName: segment.name || 'Block'
                });
            } else if (segment.type === 'fragment') {
                segments.push({
                    type: 'fragment',
                    displayName: segment.name || 'Fragment'
                });
            }
            // Skip containers (segment.type === 'container')
        });

        if (segments.length === 0) {
            return '';
        }

        // Smart truncation: show first 4, ellipsis, last 4
        const maxSegments = 4;
        if (segments.length <= maxSegments * 2) {
            // Show all if we have 8 or fewer segments
            return segments.map(s => s.displayName).join(' > ');
        }

        const start = segments.slice(0, maxSegments);
        const end = segments.slice(-maxSegments);
        return start.map(s => s.displayName).join(' > ') + 
               ' > ... > ' + 
               end.map(s => s.displayName).join(' > ');
    }

    /**
     * Get full path string (for tooltip)
     */
    function buildFullPathString(path) {
        if (!path || !Array.isArray(path)) {
            return '';
        }

        const segments = [];

        path.forEach(segment => {
            if (!segment) return;
            
            if (segment.type === 'block') {
                segments.push(segment.name || 'Block');
            } else if (segment.type === 'fragment') {
                segments.push(segment.name || 'Fragment');
            }
        });

        return segments.join(' > ');
    }

    /**
     * Highlight matched text in a string
     */
    function highlightMatch(text, searchTerm, matchIndex) {
        if (matchIndex === -1 || !text || !searchTerm) {
            return text || '';
        }

        // Escape HTML in text parts to prevent XSS
        const escapeHtml = (str) => {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const before = escapeHtml(text.substring(0, matchIndex));
        const match = escapeHtml(text.substring(matchIndex, matchIndex + searchTerm.length));
        const after = escapeHtml(text.substring(matchIndex + searchTerm.length));

        return before + '<mark>' + match + '</mark>' + after;
    }

    /**
     * Get highlighted component name
     */
    function getHighlightedName(result, searchTerm) {
        if (!result) {
            return 'Unnamed';
        }
        
        if (!result.matchInfo || !searchTerm) {
            return result.name || 'Unnamed';
        }

        // If name matches, highlight the name
        if (result.matchInfo.nameMatch) {
            const matchIndex = result.matchInfo.nameMatchIndex;
            if (matchIndex !== -1) {
                return highlightMatch(result.name, searchTerm, matchIndex);
            }
        }

        // If definition name matches but not the display name, show definition name match
        if (result.matchInfo.definitionNameMatch && result.definitionName) {
            const matchIndex = result.matchInfo.definitionNameMatchIndex;
            if (matchIndex !== -1) {
                // Show: "ComponentName (definition name match)"
                const highlightedDef = highlightMatch(result.definitionName, searchTerm, matchIndex);
                return (result.name || 'Unnamed') + ' <span style="opacity: 0.6;">(' + highlightedDef + ')</span>';
            }
        }
        
        return result.name || 'Unnamed';
    }

    /**
     * Get match context snippet (always show if there's a match)
     */
    function getMatchContext(result, searchTerm) {
        if (!result || !result.matchInfo || !searchTerm) {
            return null;
        }

        // If there are property matches, show the first one
        if (result.matchInfo.propertyMatches && result.matchInfo.propertyMatches.length > 0) {
            const firstMatch = result.matchInfo.propertyMatches[0];
            if (firstMatch && firstMatch.snippet) {
                const snippetLower = firstMatch.snippet.toLowerCase();
                const termLower = searchTerm.toLowerCase();
                const matchIndex = snippetLower.indexOf(termLower);
                
                const highlightedSnippet = highlightMatch(
                    firstMatch.snippet, 
                    searchTerm, 
                    matchIndex
                );

                return {
                    property: firstMatch.property || '',
                    snippet: highlightedSnippet
                };
            }
        }

        // If name matches, show that
        if (result.matchInfo.nameMatch && result.name) {
            const highlightedName = highlightMatch(
                result.name,
                searchTerm,
                result.matchInfo.nameMatchIndex
            );
            return {
                property: 'name',
                snippet: highlightedName
            };
        }

        // If definition name matches, show that
        if (result.matchInfo.definitionNameMatch && result.definitionName) {
            const highlightedDefName = highlightMatch(
                result.definitionName,
                searchTerm,
                result.matchInfo.definitionNameMatchIndex
            );
            return {
                property: 'component',
                snippet: highlightedDefName
            };
        }

        return null;
    }

    return service;
}



