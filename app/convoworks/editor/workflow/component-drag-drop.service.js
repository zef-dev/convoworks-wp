/**
 * Component Drag Drop Service
 *
 * Provides unified drag and drop functionality for workflow components.
 * Handles both dragging existing components and dragging new component definitions from toolbox.
 */

// Drag and Drop Configuration Constants
export const DRAG_DROP_CONFIG = {
    // Timing
    DELAY: 200,                    // Default drag delay in milliseconds
    DELAY_TOUCH: 100,              // Drag delay for touch devices
    REVERT_DURATION: 50,           // Revert animation duration
    HELPER_CLEANUP_DELAY: 50,      // Delay before removing helper from DOM
    CLICK_PREVENT_UNBIND_DELAY: 300, // Delay before unbinding click prevent

    // Visual
    Z_INDEX: 100,                   // Z-index for dragging element
    DISTANCE: 5,                    // Minimum distance before drag starts
    OPACITY: 1,                     // Opacity for dragging element

    // Selectors
    APPEND_TO: '.convoworks',      // Container to append helper to
    COMPONENT_SELECTOR: 'div.selectable-component',
    TOOLBOX_COMPONENT_SELECTOR: '.toolbox-component',

    // Helper type
    HELPER_TYPE: 'clone',          // Type of helper (clone, original, function)

    // Tolerance
    TOLERANCE: 'pointer'            // Drop tolerance mode
};

/* @ngInject */
export default function ComponentDragDropService($log, $timeout) {

    /**
     * Detects if the current device is a touch device
     * @returns {boolean}
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Removes helper element from DOM to prevent it from "hanging"
     * @param {jQuery} helper - The helper element to remove
     */
    function removeHelper(helper) {
        if (helper && helper.length) {
            // Hide immediately
            helper.css({
                'display': 'none',
                'visibility': 'hidden',
                'opacity': '0'
            });
            // Remove from DOM immediately
            helper.detach();
            // Backup removal after delay
            $timeout(function() {
                if (helper && helper.length) {
                    helper.remove();
                }
            }, DRAG_DROP_CONFIG.HELPER_CLEANUP_DELAY);
        }
    }

    /**
     * Creates draggable configuration for component definitions (from toolbox)
     * @param {Object} options - Configuration options
     * @param {Function} options.onStart - Callback for drag start
     * @returns {Object} jQuery UI draggable configuration
     */
    function createDefinitionDraggableConfig(options) {
        return {
            revert: false,
            zIndex: DRAG_DROP_CONFIG.Z_INDEX,
            opacity: DRAG_DROP_CONFIG.OPACITY,
            helper: DRAG_DROP_CONFIG.HELPER_TYPE,
            tolerance: DRAG_DROP_CONFIG.TOLERANCE,
            refreshPositions: true,
            start: function(event, ui) {
                if (options.onStart) {
                    options.onStart.call(this, event, ui);
                }
            }
        };
    }

    /**
     * Creates draggable configuration for existing components
     * @param {Object} options - Configuration options
     * @param {Function} options.onStart - Callback for drag start
     * @param {Function} options.onStop - Callback for drag stop
     * @param {Function} options.onDrag - Callback for drag event
     * @param {Function} options.getComponentTitle - Function to get component title for ARIA
     * @returns {Object} jQuery UI draggable configuration
     */
    function createComponentDraggableConfig(options) {
        var config = {
            revert: function(validDrop) {
                // Don't revert if drop was valid (handled)
                var data = $(this).data('convoDragged');
                if (data && data.handled) {
                    return false; // Don't revert
                }
                // Revert if drop was invalid
                return !validDrop;
            },
            revertDuration: DRAG_DROP_CONFIG.REVERT_DURATION,
            zIndex: DRAG_DROP_CONFIG.Z_INDEX,
            delay: DRAG_DROP_CONFIG.DELAY,
            tolerance: DRAG_DROP_CONFIG.TOLERANCE,
            appendTo: DRAG_DROP_CONFIG.APPEND_TO,
            helper: DRAG_DROP_CONFIG.HELPER_TYPE,
            refreshPositions: true,
            distance: DRAG_DROP_CONFIG.DISTANCE,
            create: function(event, ui) {
                // Adjust delay for touch devices
                if (isTouchDevice()) {
                    $(this).draggable('option', 'delay', DRAG_DROP_CONFIG.DELAY_TOUCH);
                }
            },
            start: function(event, ui) {
                if (options.onStart) {
                    options.onStart.call(this, event, ui);
                }

                // Set ARIA attributes for accessibility
                var $draggable = $(this);
                var data = $draggable.data('convoDragged');
                if (data && options.getComponentTitle) {
                    $draggable.attr('aria-grabbed', 'true');
                    $draggable.attr('aria-label', 'Dragging ' + (options.getComponentTitle() || 'component'));
                }

                // Add visual feedback class
                $draggable.addClass('is-dragging');

                // Prevent clicks on helper
                ui.helper.bind("click.prevent", function(event) {
                    event.preventDefault();
                });
            },
            stop: function(event, ui) {
                var $draggable = $(this);
                var data = $draggable.data('convoDragged');

                // Clean up helper if component was moved to different container
                if (data && data.handled && data.type === 'component' && data.isDifferentContainer) {
                    if (data.helper) {
                        removeHelper(data.helper);
                    }
                    if (ui.helper && ui.helper.length) {
                        removeHelper(ui.helper);
                    }
                }

                // Reset ARIA attributes
                $draggable.attr('aria-grabbed', 'false');
                $draggable.removeClass('is-dragging');

                // Unbind click prevent after delay
                $timeout(function() {
                    if (ui.helper) {
                        ui.helper.unbind("click.prevent");
                    }
                }, DRAG_DROP_CONFIG.CLICK_PREVENT_UNBIND_DELAY);

                if (options.onStop) {
                    options.onStop.call(this, event, ui);
                }
            },
            drag: function(event, ui) {
                // Prevent scroll interference on touch devices
                if (event.originalEvent && event.originalEvent.touches) {
                    event.preventDefault();
                }

                if (options.onDrag) {
                    options.onDrag.call(this, event, ui);
                }
            }
        };

        return config;
    }

    /**
     * Initializes draggable for component definition (from toolbox)
     * @param {jQuery} $element - jQuery element to make draggable
     * @param {Object} componentDefinition - Component definition being dragged
     * @param {Function} onStart - Optional callback for drag start
     * @returns {jQuery} The draggable element
     */
    function initDefinitionDraggable($element, componentDefinition, onStart) {
        var config = createDefinitionDraggableConfig({
            onStart: function(event, ui) {
                // Set drag data
                $(this).data('convoDragged', {
                    type: 'definition',
                    componentDefinition: componentDefinition
                });

                if (onStart) {
                    onStart.call(this, event, ui);
                }
            }
        });

        $element.draggable(config);

        return $element;
    }

    /**
     * Initializes draggable for existing component
     * @param {jQuery} $element - jQuery element to make draggable
     * @param {Object} component - Component being dragged
     * @param {Object} containerController - Container controller
     * @param {Object} callbacks - Callback functions
     * @returns {jQuery} The draggable element
     */
    function initComponentDraggable($element, component, containerController, callbacks) {
        var dragData = {
            type: 'component',
            component: component,
            containerController: containerController,
            handled: false,
            helper: null,
            isDifferentContainer: false
        };
        $element.data('convoDragged', dragData);

        var config = createComponentDraggableConfig({
            onStart: function(event, ui) {
                // Store helper reference in drag data
                var data = $(this).data('convoDragged');
                if (data && ui.helper) {
                    data.helper = ui.helper;
                }

                if (callbacks.onStart) {
                    callbacks.onStart.call(this, event, ui);
                }
            },
            onStop: function(event, ui) {
                var data = $(this).data('convoDragged');

                // If component was successfully moved to a different container, hide original
                if (data && data.handled && data.type === 'component' && data.isDifferentContainer && callbacks.hideOriginal) {
                    callbacks.hideOriginal();
                }

                if (callbacks.onStop) {
                    callbacks.onStop.call(this, event, ui);
                }
            },
            getComponentTitle: callbacks.getComponentTitle
        });

        $element.draggable(config);

        return $element;
    }

    /**
     * Destroys draggable instance
     * @param {jQuery} $element - The draggable element
     */
    function destroyDraggable($element) {
        if ($element && $element.length) {
            try {
                $element.draggable('option', 'disabled', true);
                $element.draggable('destroy');
            } catch (e) {
                $log.warn('Error destroying draggable:', e);
            }
        }
    }

    // Public API
    return {
        // Configuration
        CONFIG: DRAG_DROP_CONFIG,

        // Utility functions
        isTouchDevice: isTouchDevice,
        removeHelper: removeHelper,

        // Initialization
        initDefinitionDraggable: initDefinitionDraggable,
        initComponentDraggable: initComponentDraggable,

        // Cleanup
        destroyDraggable: destroyDraggable
    };
}
