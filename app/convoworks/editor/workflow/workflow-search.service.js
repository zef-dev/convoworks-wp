/* @ngInject */
export default function WorkflowSearchService($log, $rootScope, $state, $q, $timeout, $document, UserPreferencesService) {

    const service = {
        search: search,
        navigateToResult: navigateToResult,
        buildPathString: buildPathString
    };

    /**
     * Search through all blocks and fragments
     */
    function search(serviceContext, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }

        const service = serviceContext.getSelectedService();
        const results = [];
        const term = searchTerm.toLowerCase().trim();

        // Search through blocks (steps)
        if (service.blocks) {
            service.blocks.forEach(block => {
                const blockResults = traverseComponent(
                    block,
                    serviceContext,
                    [{ type: 'block', name: block.properties.name || block.properties.block_id, blockId: block.properties.block_id }]
                );
                results.push(...blockResults);
            });
        }

        // Search through fragments
        if (service.fragments) {
            service.fragments.forEach(fragment => {
                const fragmentResults = traverseComponent(
                    fragment,
                    serviceContext,
                    [{ type: 'fragment', name: fragment.properties.name || fragment.properties.fragment_id, fragmentId: fragment.properties.fragment_id }]
                );
                results.push(...fragmentResults);
            });
        }

        // Filter results by search term
        return results.filter(result => matchesSearch(result, term));
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
            const componentInfo = {
                component: component,
                path: [...path],
                componentId: component.properties._component_id,
                blockId: component.properties.block_id,
                fragmentId: component.properties.fragment_id,
                name: getComponentName(component, definition),
                type: component.properties.block_id ? 'block' :
                      component.properties.fragment_id ? 'fragment' : 'component'
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
        if (definition && definition.name) {
            return definition.name;
        }
        return 'Unnamed';
    }

    /**
     * Check if a component matches the search term
     */
    function matchesSearch(result, searchTerm) {
        // Search in component name
        if (result.name && result.name.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // Search in all property values (excluding system properties)
        return searchInProperties(result.component.properties, searchTerm);
    }

    /**
     * Recursively search through property values
     */
    function searchInProperties(obj, term) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        for (const key in obj) {
            // Skip system properties (starting with _)
            if (key.startsWith('_')) {
                continue;
            }

            const value = obj[key];

            // Skip component objects themselves (we search their properties separately)
            if (value && typeof value === 'object' && value.class && value.properties) {
                continue;
            }

            // Search in string values
            if (typeof value === 'string' && value.toLowerCase().includes(term)) {
                return true;
            }

            // Search in number values
            if (typeof value === 'number' && value.toString().includes(term)) {
                return true;
            }

            // Search in arrays (but not component arrays)
            if (Array.isArray(value)) {
                if (value.length > 0 && value[0] && value[0].class) {
                    // This is an array of components, skip
                    continue;
                }
                if (value.some(item => searchInProperties(item, term))) {
                    return true;
                }
            }

            // Recursively search in objects (but not component objects)
            if (typeof value === 'object' && value !== null) {
                if (!value.class) { // Not a component object
                    if (searchInProperties(value, term)) {
                        return true;
                    }
                }
            }
        }

        return false;
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
     * Expand direct parent containers in the path
     */
    function expandParentContainers(path, serviceContext) {
        const service = serviceContext.getSelectedService();

        // Find direct parent containers (not blocks/fragments)
        const parentContainers = path.filter(segment => segment.type === 'container');

        // Expand direct parents only (last container in path is the direct parent)
        if (parentContainers.length > 0) {
            const directParent = parentContainers[parentContainers.length - 1];
            const propPath = directParent.propertyPath || directParent.propName;
            const containerKey = service.service_id + '-' + directParent.containerId + '-' + propPath + '-open';
            UserPreferencesService.registerData(containerKey, true);
        }

        // Broadcast expand all to ensure containers are visible
        $rootScope.$broadcast('ExpandAllRequested');
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
     * Scroll component into view
     */
    function scrollToComponent(componentId) {
        $timeout(() => {
            // Find element by component ID
            // We'll add data-component-id attribute to selectable-component template
            const element = $document.find(`[data-component-id="${componentId}"]`);

            if (element.length) {
                // Scroll element into view
                element[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

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
     */
    function buildPathString(path) {
        const segments = [];

        path.forEach(segment => {
            if (segment.type === 'block') {
                segments.push(segment.name || 'Block');
            } else if (segment.type === 'fragment') {
                segments.push(segment.name || 'Fragment');
            } else if (segment.type === 'container') {
                segments.push(segment.propName || 'Container');
            }
        });

        return segments.join(' > ');
    }

    return service;
}

