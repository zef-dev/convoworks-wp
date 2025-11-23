import template from './selectable-component.tmpl.html';

/* @ngInject */
export default function selectableComponent( $log, UserPreferencesService, $timeout, $compile,
    $state, AlertService, ContextMenuEvents, ClipboardService, ComponentDragDropService)
    {
        return {
            restrict: 'E',
            scope: { 'component' : '=' },
            require: [ '^serviceContext' , '^convoworksComponentsContainer'],
            template: template,
            link: function( $scope, $element, $attributes, $ctrls) {

                var serviceContext               =   $ctrls[0];
                var convoworksComponentsContainer   =   $ctrls[1];
                var $draggable;
                var $droppable;
                var $componentElement;  // Cached jQuery element for the selectable-component div
                var keyboardDragMode = false;  // Track if keyboard drag is active
                var keyboardMoveTimer = null;  // Timer for keyboard move operations

                var defaultTitle            =   'Unknown'
                $scope.over                 =   false;
                $scope.ready                =   false;

                $scope.isElement            =   false;
                $scope.isProcessor          =   false;
                $scope.isFilter             =   false;
                $scope.contextOptions       =   [];

                _init();

                $scope.$on(ContextMenuEvents.ContextMenuOpening, function(event, data) {
                    _generateOptions();
                  });

                $scope.getContextOptions = function() {
                    return $scope.contextOptions;
                }

                $scope.isSelected   =   function() {
                    return serviceContext.getSelection().component === $scope.component;
                };

                $scope.getBlockName =   function( blockId) {
                    try {
                        var block   =   serviceContext.findBlock( blockId);
                    } catch ( err) {
                        return 'ID: ' + blockId;
                    }
                    if ( block.properties.name) {
                        return block.properties.name;
                    }
                    return 'ID: ' + blockId;
                }

                $scope.isBlockLinkable  =   function( blockId)
                {
                    try {
                        serviceContext.findBlock( blockId);
                        return true;
                    } catch ( err) {
                    }
                    return false;
                }

                $scope.selectBlock  =   function( blockId)
                {
                    $state.go( 'convoworks-editor-service.editor', { sb:blockId, sv:'steps'},
                    { inherit:true, reload:false, notify:true, location:true});
                }


                $scope.getSubroutineName    =   function( fragmentId) {
                    try {
                        var fragment    =   serviceContext.findSubroutine( fragmentId);
                    } catch ( err) {
                        return 'ID: ' + fragmentId;
                    }
                    if ( fragment.properties.name) {
                        return fragment.properties.name;
                    }
                    return 'ID: ' + fragmentId;
                }

                $scope.isSubroutineLinkable  =   function( fragmentId)
                {
                    try {
                        serviceContext.findSubroutine( fragmentId);
                        return true;
                    } catch ( err) {
                    }
                    return false;
                }

                $scope.selectSubroutine  =   function( fragmentId)
                {
                    $state.go( 'convoworks-editor-service.editor', { sb:fragmentId, sv:'fragments'},
                    { inherit:true, reload:false, notify:true, location:true});
                }

                $scope.isSystemIntent = function(intentName)
                {
                    return intentName.includes('.');
                }

                $scope.getIntentIndex = function(intentName)
                {
                    return serviceContext.getSelectedService().intents.findIndex((intent) => intent.name === intentName);
                }

                $scope.gotoIntent = function(intentName)
                {
                    const i = serviceContext.getSelectedService().intents.findIndex((intent) => intent.name === intentName);

                    if (i > -1) {
                        $state.go('convoworks-editor-service.intent-details', { index: i }, {
                            inherit: true,
                            reload: false,
                            notify: true,
                            location: true
                        });
                    }
                }

                $scope.getComponentTitle =   function() {
                    if ( $scope.definition && $scope.component) {
                        if ( $scope.component.properties.name) {
                            if ( UserPreferencesService.get( 'show_default_titles', true)) {
                                return $scope.definition.name + ' - ' + $scope.component.properties.name;
                            }
                            return $scope.component.properties.name;
                        }
                        return $scope.definition.name;
                    }
                    return defaultTitle;
                }

                $scope.getComponentNamespace = function() {
                    return $scope.component.namespace;
                }

                $scope.showComponentTitle =   function() {
                    if ( $scope.definition && $scope.component) {
                        if ( $scope.component.properties.name
                            || UserPreferencesService.get( 'show_default_titles', true)
                            || !$scope.definition.component_properties._preview_angular) {
                            return true;
                        }
                        return false;
                    }
                    return true;
                }

                $scope.isString = function(value) {
                    return typeof value === 'string';
                };

                $scope.$on( '$destroy', function() {
                    $log.log( 'selectableComponent $destroy');
                    
                    // Cleanup draggable using service
                    if ($draggable) {
                        ComponentDragDropService.destroyDraggable($draggable);
                        $draggable = null;
                    }
                    
                    // Cleanup droppable
                    if ($droppable) {
                        try {
                            $droppable.droppable('destroy');
                        } catch (e) {
                            $log.warn('Error destroying droppable:', e);
                        }
                        $droppable = null;
                    }
                    
                    // Cleanup click handler
                    if ($componentElement) {
                        $componentElement.off('click');
                        $componentElement.off('keydown');
                        $componentElement = null;
                    }
                    
                    // Cleanup keyboard move timer
                    if (keyboardMoveTimer) {
                        $timeout.cancel(keyboardMoveTimer);
                        keyboardMoveTimer = null;
                    }
                });

                function _init()
                {
//                  $log.log( 'selectableComponent _init() $scope.component', $scope.component);

                    if ( !$scope.component) {
                        throw new Error( 'No component defined');
                    }
//                  $log.log( 'selectableComponent _init() got class ['+$scope.component['class']+']', '$scope.component', $scope.component);

                    var class_name  =       $scope.component['class'];
                    if ( !class_name) {
                        $log.log( 'selectableComponent _init() $scope.component', $scope.component);
                        throw new Error( 'No class in component');
                    }

                    try {
                        $scope.definition       =   serviceContext.getComponentDefinition( class_name);
                        $scope.isElement        =   false;
                        if ( $scope.definition.component_properties._interface) {
                            if ( $scope.definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationProcessor') {
                                $scope.isProcessor      =   true;
                            } else if ( $scope.definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IRequestFilter') {
                                $scope.isFilter         =   true;
                            } else if ( $scope.definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationElement') {
                                $scope.isElement        =   true;
                            }
                        }

                        _generateOptions();

                        $timeout( function() {
                            // Cache the component element once
                            $componentElement = $($element.find( ComponentDragDropService.CONFIG.COMPONENT_SELECTOR)[0]);
                            
                            _initPreview();
                            _initDraggable();
                            _initDroppable();
                            _initClick();
                        }, 10)
                    } catch ( err) {
                        $log.error( err);
                        $scope.definition       =   null;
                        defaultTitle            =   err.message;
                        // good old timeout
                        $timeout( function() {
                            _initClick();
                        }, 10)
                    }

                    $scope.$applyAsync( function() {
                        $scope.ready            =   true;
                    });
                }


                function _generateOptions()
                {
                    $scope.contextOptions.length = 0;
                    $scope.contextOptions.push(
                        {
                            text: 'Cut',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context cut');
                                ClipboardService.cut( $scope.component, () => {
                                    convoworksComponentsContainer.removeComponent( $scope.component);
                                });
                            }
                        }
                    );

                    $scope.contextOptions.push(
                        {
                            text: 'Copy',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context copy');
                                ClipboardService.copy( $scope.component);
                            }
                        }
                    );

                    if ( ClipboardService.hasClipboard())
                    {
                        const paste_data = ClipboardService.getPasteData(
                            serviceContext.getSelectedService().packages);

                        if (!paste_data.allowed)
                        {
                            $scope.contextOptions.push(
                                {
                                    text: 'Paste',
                                    click: function () {
                                        AlertService.addWarning(`Cannot paste, the following packages are not enabled: [${paste_data.missing.join(', ')}].`);
                                    }
                                }
                            );
                        }
                        else if (convoworksComponentsContainer.acceptsComponent(
                            ClipboardService.getClipboard()))
                        {
                            $scope.contextOptions.push(
                                {
                                    text: 'Paste',
                                    click: function ($itemScope, $event, modelValue, text, $li) {
                                        $log.log( 'selectableComponent context paste');
                                        var index       =   convoworksComponentsContainer.indexOf( $scope.component) + 1;
                                        serviceContext.paste( convoworksComponentsContainer, index);
                                    }
                                }
                            );
                        }
                    }

                    $scope.contextOptions.push( null);
                    $scope.contextOptions.push(
                        {
                            text: 'Delete',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context delete');
                                if ( serviceContext.getSelection().component === $scope.component) {
                                    serviceContext.setSelectedComponent( null);
                                }
                                convoworksComponentsContainer.removeComponent( $scope.component);
                            }
                        }
                    );
                }

                function _initDraggable()
                {
                    // Use cached element if available, otherwise cache it
                    if (!$componentElement) {
                        $componentElement = $($element.find( ComponentDragDropService.CONFIG.COMPONENT_SELECTOR)[0]);
                    }
                    $draggable = $componentElement;
                    
//                  $log.log( 'selectableComponent link() $draggable', $draggable);
                    
                    // Use service to initialize draggable for existing component
                    ComponentDragDropService.initComponentDraggable(
                        $draggable,
                        $scope.component,
                        convoworksComponentsContainer,
                        {
                            onStop: function(event, ui) {
                                var data = $(this).data('convoDragged');
                                
                                // Reset keyboard drag mode if active
                                if (keyboardDragMode) {
                                    keyboardDragMode = false;
                                    $componentElement.removeClass('keyboard-drag-mode');
                                }
                            },
                            hideOriginal: function() {
                                // Hide the original element since it's being moved to a different container
                                $componentElement.css('display', 'none');
                            },
                            getComponentTitle: function() {
                                return $scope.getComponentTitle();
                            }
                        }
                    );
                }

                function _initDroppable()
                {
                    // Use cached element if available, otherwise cache it
                    if (!$componentElement) {
                        $componentElement = $($element.find( ComponentDragDropService.CONFIG.COMPONENT_SELECTOR)[0]);
                    }
                    $droppable = $componentElement;

                    $droppable.droppable({
                        greedy: true,
                        over: function( event, ui) {
                            var data    =   ui.draggable.data('convoDragged');
//                            var target  =   ui.draggable;
                            var target  =   this;
                            var $target =   $(target);
                            
                            if ( data.type == 'definition')
                            {
                                if ( !convoworksComponentsContainer.acceptsDefinition( data.componentDefinition))
                                {
                                      $target.addClass('drop-blocked');
                                      $target.attr('aria-dropeffect', 'none');
                                }
                                else
                                {
                                    $target.addClass('drop-allowed');
                                    $target.attr('aria-dropeffect', 'move');
                                }
                            }
                            else if ( data.type == 'component')
                            {
                                if ( !convoworksComponentsContainer.acceptsComponent( data.component))
                                {
                                      $target.addClass('drop-blocked');
                                      $target.attr('aria-dropeffect', 'none');
                                }
                                 else
                                {
                                    $target.addClass('drop-allowed');
                                    $target.attr('aria-dropeffect', 'move');
                                }
                            }
                          },
                          out: function( event, ui) {
                            var $target = $(this);
                            $target.removeClass('drop-blocked drop-allowed ui-droppable-hover');
                            $target.removeAttr('aria-dropeffect');
                        },
                        deactivate: function (event, ui) { // dropped somewhere
                            var $target = $(this);
                            $target.removeClass('drop-blocked drop-allowed ui-droppable-hover ui-droppable-active');
                            $target.removeAttr('aria-dropeffect');
                        },
                        drop: function( event, ui ) {

                            var data        =   ui.draggable.data('convoDragged');
                            $log.log( 'selectableComponent drop event', event, 'ui', ui, 'data', data);
                              if ( data) {

                                  if ( data.handled) {
                                      $log.log( 'selectableComponent already handled');
                                      return;
                                  }

                                    if ( data.type == 'definition' && !convoworksComponentsContainer.acceptsDefinition( data.componentDefinition))
                                    {
                                          AlertService.addInfo( 'Can not add componet "' + data.componentDefinition.name + '" to "' +
                                          convoworksComponentsContainer.getPropertyDefinition().name) + '"';
                                          return false;
                                    }

                                    if ( data.type == 'component' && !convoworksComponentsContainer.acceptsComponent( data.component))
                                    {
                                          AlertService.addInfo( 'Can not move componet to "' +
                                          convoworksComponentsContainer.getPropertyDefinition().name) + '"';
                                          return false;
                                    }

                                  // Mark as will be handled immediately (before async $scope.$apply)
                                  // This ensures revert function knows not to revert
                                  data.handled = true;
                                  
                                  // Store reference to helper for cleanup
                                  data.helper = ui.helper;
                                  data.isDifferentContainer = (data.type === 'component' && 
                                                               data.containerController !== convoworksComponentsContainer);
                                  
                                   // Remove helper immediately using service method
                                   ComponentDragDropService.removeHelper(ui.helper);

                                  $scope.$apply( function() {

                                      var targetIndex = convoworksComponentsContainer.indexOf( $scope.component);
                                      var index = targetIndex + 1;
                                      
                                      if ( data.type == 'definition') {
                                          $log.log( 'selectableComponent new component', data.componentDefinition, 'to container', $scope.container, 'in component', $scope.component);

                                          serviceContext.addNewComponent(
                                                  convoworksComponentsContainer,
                                                  data.componentDefinition,
                                                  index);

                                      } else if ( data.type == 'component') {
                                          $log.log( 'selectableComponent move component', data.component);
                                          
                                          // If moving within the same container, we need to adjust the index
                                          // because the component will be removed first, shifting all subsequent indices
                                          var isSameContainer = data.containerController === convoworksComponentsContainer;
                                          if (isSameContainer) {
                                              var draggedIndex = data.containerController.indexOf(data.component);
                                              // If dragging from before the target, the target index shifts down by 1 after removal
                                              if (draggedIndex < targetIndex) {
                                                  index = targetIndex; // Insert at target's position (which becomes targetIndex after removal)
                                              } else {
                                                  // If dragging from after the target, target index stays the same
                                                  index = targetIndex + 1;
                                              }
                                          }

                                          serviceContext.moveComponent(
                                                  data.containerController,
                                                  convoworksComponentsContainer,
                                                  data.component,
                                                  index);

                                      } else {
                                          throw new Error( 'Expected to have type [definition] or [component]');
                                      }
                                      // data.handled already set above
                                });
                              } else {
                                  $log.error( 'selectableComponent Expected to have [convoDragged] data  ['+event.target.className+']');
                              }
                              
                              $(event.target).removeClass('ui-droppable-hover');
                              return false;
                          }
                        });
                }

                function _initClick()
                {
                    // Use cached element if available, otherwise cache it
                    if (!$componentElement) {
                        $componentElement = $($element.find( ComponentDragDropService.CONFIG.COMPONENT_SELECTOR)[0]);
                    }
                    $componentElement.on( 'click', function( event) {
                        $log.log( 'selectableComponent click $scope.isSelected()', $scope.isSelected());

                        $scope.$apply( function () {
                            if ( $scope.isSelected()) {
                                serviceContext.setSelectedComponent( null);
                            } else {
                                serviceContext.setSelectedComponent(
                                    $scope.component,
                                    {
                                        deleteSelectedComponent: convoworksComponentsContainer.removeComponent,
                                        getComponentContainer: () => convoworksComponentsContainer.getComponentContainer()
                                    }
                                );
                            }
                        });

                        event.stopPropagation();
                    });
                    
                    // Add keyboard navigation
                    $componentElement.on( 'keydown', function( event) {
                        _handleKeyboardNavigation(event);
                    });
                }
                
                function _handleKeyboardNavigation(event) {
                    // Only handle if component is selected
                    if (!$scope.isSelected()) {
                        return;
                    }
                    
                    var key = event.key || event.keyCode;
                    var handled = false;
                    
                    // Enter key - start drag mode (visual feedback)
                    if (key === 'Enter' || key === 13) {
                        if (!keyboardDragMode) {
                            keyboardDragMode = true;
                            $componentElement.addClass('keyboard-drag-mode');
                            $componentElement.attr('aria-grabbed', 'true');
                            event.preventDefault();
                            handled = true;
                        }
                    }
                    // Escape key - cancel drag mode
                    else if (key === 'Escape' || key === 27) {
                        if (keyboardDragMode) {
                            keyboardDragMode = false;
                            $componentElement.removeClass('keyboard-drag-mode');
                            $componentElement.attr('aria-grabbed', 'false');
                            event.preventDefault();
                            handled = true;
                        }
                    }
                    // Arrow keys - move component
                    else if (keyboardDragMode && (key === 'ArrowUp' || key === 'ArrowDown' || 
                                                   key === 38 || key === 40)) {
                        var direction = (key === 'ArrowUp' || key === 38) ? 'up' : 'down';
                        _moveComponentWithKeyboard(direction);
                        event.preventDefault();
                        handled = true;
                    }
                    
                    if (handled) {
                        event.stopPropagation();
                    }
                }
                
                function _moveComponentWithKeyboard(direction) {
                    if (keyboardMoveTimer) {
                        $timeout.cancel(keyboardMoveTimer);
                    }
                    
                    // Debounce keyboard moves
                    keyboardMoveTimer = $timeout(function() {
                        $scope.$apply(function() {
                            var currentIndex = convoworksComponentsContainer.indexOf($scope.component);
                            var targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                            
                            // Only move if target index is valid (non-negative)
                            // The moveComponent function will handle validation
                            if (targetIndex >= 0) {
                                serviceContext.moveComponent(
                                    convoworksComponentsContainer,
                                    convoworksComponentsContainer,
                                    $scope.component,
                                    direction === 'up' ? targetIndex : targetIndex + 1
                                );
                            }
                        });
                    }, 150);
                }

                function _initPreview() {
                    var container   =   $element.find( '.preview');
                    if ( $scope.definition.component_properties._preview_angular) {
//                      $log.log( 'selectableComponent _initPreview() $scope.definition.component_properties._preview_angular', $scope.definition.component_properties._preview_angular);
                        var html        =   $scope.definition.component_properties._preview_angular.template;
                        container.html( html);
                        $compile( container.contents())( $scope);
                    } else {
                        container.html( '');
                    }
                };
            }
        }
    };
