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

    // Track if we're currently dragging to handle wheel events
    var isDragging = false;
    var wheelHandler = null;
    var activeContainer = null; // Track the active scrollable container during drag

    /**
     * Detects if the current device is a touch device
     * @returns {boolean}
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Finds the scrollable container element at the given mouse coordinates
     * @param {number} clientX - Mouse X coordinate
     * @param {number} clientY - Mouse Y coordinate
     * @returns {HTMLElement|null} The scrollable container or null
     */
    function findScrollableContainer(clientX, clientY) {
        // Try elementFromPoint first
        var element = document.elementFromPoint(clientX, clientY);
        if (element) {
            // Walk up the DOM tree to find the components-container
            var current = element;
            while (current && current !== document.body) {
                if (current.classList && current.classList.contains('components-container')) {
                    return current;
                }
                current = current.parentElement;
            }
        }

        // If elementFromPoint didn't find it (e.g., helper element is blocking),
        // check all components-container elements to see if mouse is within their bounds
        var containers = document.querySelectorAll('.components-container');
        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            var rect = container.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
                return container;
            }
        }

        return null;
    }

    /**
     * Handles wheel events during drag to scroll the container instead of the view
     * @param {WheelEvent} event - The wheel event
     */
    function handleWheelDuringDrag(event) {
        if (!isDragging) {
            return;
        }

        // Try to find the scrollable container under the mouse
        var container = findScrollableContainer(event.clientX, event.clientY);

        // If not found, use the active container from drag start
        if (!container && activeContainer) {
            container = activeContainer;
        }

        if (container) {
            // Prevent default scrolling behavior
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            // Calculate scroll amount - normalize different event types
            // Delta mode constants: 0 = pixels, 1 = lines, 2 = pages
            var DELTA_MODE_PIXEL = 0;
            var DELTA_MODE_LINE = 1;
            var DELTA_MODE_PAGE = 2;

            var scrollAmount = 0;
            if (event.deltaY !== undefined) {
                // Modern wheel event - handle different delta modes
                if (event.deltaMode === DELTA_MODE_PIXEL || event.deltaMode === undefined) {
                    // Delta is in pixels (or undefined, default to pixels)
                    scrollAmount = event.deltaY;
                } else if (event.deltaMode === DELTA_MODE_LINE) {
                    // Delta is in lines, approximate as 20px per line
                    scrollAmount = event.deltaY * 20;
                } else if (event.deltaMode === DELTA_MODE_PAGE) {
                    // Delta is in pages, use container height
                    scrollAmount = event.deltaY * container.clientHeight;
                } else {
                    // Default: assume pixels
                    scrollAmount = event.deltaY;
                }
            } else if (event.detail !== undefined) {
                // Firefox legacy event (units are lines)
                scrollAmount = event.detail * 20;
            } else if (event.wheelDelta !== undefined) {
                // Older browsers (units are approximate pixels/3)
                scrollAmount = -event.wheelDelta;
            }

            // Scroll the container
            container.scrollTop += scrollAmount;

            return false;
        }
    }

    /**
     * Sets up wheel event handling for drag operations
     */
    function setupWheelHandling() {
        if (wheelHandler) {
            return; // Already set up
        }

        // Use capture phase to intercept before it reaches the view
        wheelHandler = function(event) {
            return handleWheelDuringDrag(event);
        };

        // Add event listener with capture to catch events early
        // Use window instead of document for better compatibility
        window.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
        // Also handle older browsers
        window.addEventListener('mousewheel', wheelHandler, { passive: false, capture: true });
        window.addEventListener('DOMMouseScroll', wheelHandler, { passive: false, capture: true });

        // Also attach directly to components-container elements for extra coverage
        var containers = document.querySelectorAll('.components-container');
        for (var i = 0; i < containers.length; i++) {
            containers[i].addEventListener('wheel', wheelHandler, { passive: false, capture: true });
            containers[i].addEventListener('mousewheel', wheelHandler, { passive: false, capture: true });
            containers[i].addEventListener('DOMMouseScroll', wheelHandler, { passive: false, capture: true });
        }
    }

    /**
     * Removes wheel event handling after drag ends
     */
    function cleanupWheelHandling() {
        if (wheelHandler) {
            window.removeEventListener('wheel', wheelHandler, { passive: false, capture: true });
            window.removeEventListener('mousewheel', wheelHandler, { passive: false, capture: true });
            window.removeEventListener('DOMMouseScroll', wheelHandler, { passive: false, capture: true });

            // Remove from container elements
            var containers = document.querySelectorAll('.components-container');
            for (var i = 0; i < containers.length; i++) {
                containers[i].removeEventListener('wheel', wheelHandler, { passive: false, capture: true });
                containers[i].removeEventListener('mousewheel', wheelHandler, { passive: false, capture: true });
                containers[i].removeEventListener('DOMMouseScroll', wheelHandler, { passive: false, capture: true });
            }

            wheelHandler = null;
        }
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
                // Mark that we're dragging and set up wheel handling
                isDragging = true;

                // Try to find and store the active container at drag start
                activeContainer = findScrollableContainer(event.clientX, event.clientY);

                setupWheelHandling();

                if (options.onStart) {
                    options.onStart.call(this, event, ui);
                }
            },
            stop: function(event, ui) {
                // Clean up wheel handling
                isDragging = false;
                activeContainer = null;
                cleanupWheelHandling();
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
                var $draggable = $(this);
                var data = $draggable.data('convoDragged');
                
                // Clean up any leftover helper from previous drag
                if (data && data.helper) {
                    removeHelper(data.helper);
                    data.helper = null;
                }
                
                // Clean up any leftover helpers in the DOM that might be from previous drags
                // jQuery UI appends helpers to the APPEND_TO container
                var $appendTo = $(DRAG_DROP_CONFIG.APPEND_TO);
                if ($appendTo.length) {
                    // Remove any elements that look like leftover helpers (clones with is-dragging class)
                    $appendTo.find('.is-dragging').not($draggable).remove();
                    // Also clean up any elements with ui-draggable-dragging class that aren't the current draggable
                    $appendTo.find('.ui-draggable-dragging').not(ui.helper || []).remove();
                }
                
                // Mark that we're dragging and set up wheel handling
                isDragging = true;
                
                // Try to find and store the active container at drag start
                activeContainer = findScrollableContainer(event.clientX, event.clientY);
                
                setupWheelHandling();

                // Reset drag data state for this drag operation
                if (data) {
                    // Reset handled flag for new drag operation
                    data.handled = false;
                    data.isDifferentContainer = false;
                    // Store helper reference for this drag
                    if (ui.helper) {
                        data.helper = ui.helper;
                    }
                }

                if (options.onStart) {
                    options.onStart.call(this, event, ui);
                }

                // Set ARIA attributes for accessibility
                if (data && options.getComponentTitle) {
                    $draggable.attr('aria-grabbed', 'true');
                    $draggable.attr('aria-label', 'Dragging ' + (options.getComponentTitle() || 'component'));
                }

                // Add visual feedback class
                $draggable.addClass('is-dragging');

                // Prevent clicks on helper
                if (ui.helper) {
                    ui.helper.bind("click.prevent", function(event) {
                        event.preventDefault();
                    });
                }
            },
            stop: function(event, ui) {
                // Clean up wheel handling
                isDragging = false;
                activeContainer = null;
                cleanupWheelHandling();

                var $draggable = $(this);
                var data = $draggable.data('convoDragged');

                // Always clean up helper, regardless of whether drop was handled
                // This ensures helper is removed even on revert
                if (ui.helper && ui.helper.length) {
                    // Clean up helper after a short delay to allow revert animation
                    $timeout(function() {
                        removeHelper(ui.helper);
                    }, DRAG_DROP_CONFIG.REVERT_DURATION + 50);
                }

                // Clean up helper if component was moved to different container
                if (data && data.handled && data.type === 'component' && data.isDifferentContainer) {
                    if (data.helper) {
                        removeHelper(data.helper);
                    }
                }

                // Reset drag data state if not handled (reverted)
                if (data && !data.handled) {
                    // Reset state for next drag
                    data.handled = false;
                    data.helper = null;
                    data.isDifferentContainer = false;
                }

                // Reset ARIA attributes
                $draggable.attr('aria-grabbed', 'false');
                $draggable.removeClass('is-dragging');

                // Unbind click prevent after delay
                $timeout(function() {
                    if (ui.helper && ui.helper.length) {
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
                var $draggable = $(this);
                
                // Reset display in case element was hidden in a previous drag
                if ($draggable.css('display') === 'none') {
                    $draggable.css('display', '');
                }
                
                // Store helper reference in drag data
                var data = $draggable.data('convoDragged');
                if (data && ui.helper) {
                    data.helper = ui.helper;
                }

                if (callbacks.onStart) {
                    callbacks.onStart.call(this, event, ui);
                }
            },
            onStop: function(event, ui) {
                var $draggable = $(this);
                var data = $draggable.data('convoDragged');

                // If component was successfully moved to a different container, hide original
                if (data && data.handled && data.type === 'component' && data.isDifferentContainer && callbacks.hideOriginal) {
                    callbacks.hideOriginal();
                } else if (data && !data.handled) {
                    // If dropped in same place (reverted), ensure display is restored
                    if ($draggable.css('display') === 'none') {
                        $draggable.css('display', '');
                    }
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
        destroyDraggable: destroyDraggable,

        // Internal state (exposed for testing/debugging)
        isDragging: function() {
            return isDragging;
        }
    };
}
