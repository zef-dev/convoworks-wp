(function () {
    'use strict';

    angular.module('convo.wp', [ 'convo.editor', 'ngRoute']);

    angular.module('convo.wp').factory('$exceptionHandler', function ($injector, $log) {


        return function (exception, cause) {
            var AlertService = $injector.get('AlertService');
            AlertService.addDanger(exception.message);
            $log.error(exception);
//      exception.message += ' (caused by "' + cause + '")';
//        throw exception;
        };
    });

    angular.module('convo.wp').run(

        function( $log, $rootScope, $location, LoginService) {

            LoginService.getUser().finally( function () {
                // register listener to watch route changes
                $rootScope.$on( "$routeChangeStart", function( event, next, current) {

                    $log.debug('$routeChangeStart current', current);
                    $log.debug('$routeChangeStart next', next);
                    $log.debug('$routeChangeStart next.originalPath', next.originalPath);
                    $log.debug('$routeChangeStart', LoginService);
                    if (!LoginService.isSignedIn()) {
                        $log.debug( '$routeChangeStart run() DENY');

                        if ( next.originalPath && (next.originalPath != '/')) {
                            event.preventDefault();
                            $location.url('/');
                        }
                    }
                    else {
                        $log.debug( '$routeChangeStart run() ALLOW');
                    }
                });
            });
        }
    );

    angular.module('convo.wp').factory( 'authInterceptor', function ( $rootScope, $q, $log, $location, WP_NONCE) {
        return {
            'request': function(config) {
                if (WP_NONCE !== undefined && WP_NONCE !== null && WP_NONCE !== '') {
                    $log.log('authInterceptor set X-WP-Nonce header', WP_NONCE);
                    config.headers['X-WP-Nonce'] = WP_NONCE;
                }

                return config;
            },
            responseError: function ( response) {
                $log.debug('authInterceptor response', response);
                if ( response.status === 401) {
                    $log.debug('authInterceptor clear user $location.url()', $location.url());
                    $rootScope.clearUser();
                    $location.url('/');
                    return $q.reject( response);
                }

                if ( response.status >= 400) {
                    $log.debug('authInterceptor rejecting response.status', response.status);
                    return $q.reject( response);
                }

                return response || $q.when( response);
            }
        };
    });

    angular.module('convo.wp').config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    });

})();
(function() {
    angular
        .module('convo.wp')
        .service('LoginService', LoginService);

    /* @ngInject */
    function LoginService( $log, $q, WP_USER) {

        this.isSignedIn    	=   isSignedIn;
        this.getUser   		=   getUser;

        function getUser()
        {
            var deferred	=	$q.defer();
            deferred.resolve( WP_USER);
            return deferred.promise;
        }

        function isSignedIn()
        {
            return true;
        }

    }
})();
(function () {
    'use strict';

    angular.module('convo.wp').config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider.
            otherwise({
                redirectTo: '/convoworks-editor'
            });
        }]);
})();

import template from './variables-editor.tmpl.html';

export default function variablesEditor( $log)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function( $scope) {
            // QUICKFIX
            if ( !$scope.service.variables) {
                $scope.service.variables    =   {};
            }

            _init();

            $scope.addVariablesPair     =   function()
            {
                var current_greatest_index  =   $scope.variables_buffer.length - 1 < 0? 0 : $scope.variables_buffer.length - 1;

                var new_pair    =   { 'key': 'tmp_key_' + current_greatest_index, 'value': 'tmp_value' };

                $scope.variables_buffer.push( new_pair);
            };

            $scope.removeVariablesPair  =   function( i)
            {
                $scope.variables_buffer.splice( i, 1);
            };

            // INIT
            function _init()
            {
                _setupVariablesBuffer();
                _setupServiceWatch();
                _setupBufferWatch();
            }

            // PRIVATE
            function _setupVariablesBuffer()
            {
                $scope.variables_buffer =   [];

                for ( var key in $scope.service.variables) {
                    $scope.variables_buffer.push( { 'key': key, 'value': $scope.service.variables[key] });
                }

                $log.log( 'variablesEditor _setupVariablesBuffer() done, buffer', $scope.variables_buffer);
            }

            function _setupServiceWatch()
            {
                $scope.$watch('service.variables', function() {
                    _setupVariablesBuffer();
                }, true);
            }

            function _setupBufferWatch()
            {
                $scope.$watch( 'variables_buffer', function () {
                    // QUICKFIX
                    if ( !Object.keys( $scope.service.variables).length) {
                        $scope.service.variables    =   [];
                    } else {
                        $scope.service.variables    =   {};
                    }

                    for ( var i in $scope.variables_buffer) {
                        var pair        =   $scope.variables_buffer[i];
                        var safe_key    =   _sanitizeKey( pair.key);

                        $scope.service.variables[safe_key]  =   pair.value;
                    }
                }, true);
            }
        },
        link: function( $scope, $element, $attributes) {}
    }
}

function _sanitizeKey( key)
{
    return key.replace( /\s{2,}\.-/, '_');
}

import template from './subroutine-component.tmpl.html';

export default function subroutineComponent( $log, $timeout, ConvoworksApi)
    {
        return {
            restrict: 'E',
            scope: { 'block' : '=', 'canMoveUp': '=', 'canMoveDown': '=' },
            require: '^propertiesContext',
            template: template,
            link: function( $scope, $element, $attributes, propertiesContext) {

                // API
                $scope.over                 =   false;
                $scope.ready                =   false;
                $scope.componentTitle       =   "";
                $scope.componentName        =   "";

                $scope.isReadBlock          =   false;

                $scope.getComponentTitle    =   function() {
                    if ( !$scope.definition) {
                        return 'Generating title ...';
                    }

                    if ( $scope.block.properties.name) {
                        return $scope.block.properties.name;
                    }

                    return 'Fragment - ' + $scope.block.properties.fragment_id + '';
                };

                $scope.isSelected   =   function() {
                    return propertiesContext.getSelection().component === $scope.block;
                };

                $scope.toggleOpen   =   function( type) {
                    open[type]  =   !open[type];
                };

                $scope.isOpen   =   function( type) {
                    return open[type];
                };

                $scope.$on( '$destroy', function() {
                    $log.log( 'subroutineComponent $destroy');
                });

                $scope.moveUp = function()
                {
                    $scope.$emit('moveFragment', {
                        fragmentId: $scope.block.properties.fragment_id + '',
                        dir: -1
                    });
                }

                $scope.moveDown = function()
                {
                    $scope.$emit('moveFragment', {
                        fragmentId: $scope.block.properties.fragment_id + '',
                        dir: 1
                    });
                }

                // INIT
                var open    =   {
                        elements : false,
                        processors : false,
                }
                _init();

                function _init()
                {
//                  $log.log( 'subroutineComponent _init() got ', '$scope.block.properties.subroutine_id ['+$scope.block.properties.subroutine_id+']', '$scope.block', $scope.block);

                    var serviceId = propertiesContext.getSelectedService()['service_id'];
                    $log.log('subroutineComponent going to get definition', serviceId);

                    if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment') {
                        ConvoworksApi.getComponentDefinition( serviceId, '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment').then( function( definition) {
    //                      $log.log( 'subroutineComponent got definition', definition);

                            $scope.componentTitle       =   'Fragment - ' + $scope.block.properties.fragment_id + '';
                            $scope.componentName        =   $scope.block.properties.name;
                            $scope.definition           =   definition;
                            $scope.propertyName         =   'elements';
                            $scope.propertyDefinition   =   definition.component_properties.elements;

                        }, function( reason) {
                            $log.error( 'subroutineComponent got reason', reason);
                        }).finally( function() {
    //                      $log.log( 'subroutineComponent definitions finally');
                            $scope.$applyAsync( function() {
                                $scope.ready            =   true;
                            });
                        });
                    } else if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment') {
                        ConvoworksApi.getComponentDefinition( serviceId, '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment').then( function( definition) {
    //                      $log.log( 'subroutineComponent got definition', definition);

                            $scope.componentTitle       =   'Fragment - ' + $scope.block.properties.fragment_id + '';
                            $scope.componentName        =   $scope.block.properties.name;
                            $scope.definition           =   definition;
                            $scope.propertyName         =   'processors';
                            $scope.propertyDefinition   =   definition.component_properties.processors;

                        }, function( reason) {
                            $log.error( 'subroutineComponent got reason', reason);
                        }).finally( function() {
    //                      $log.log( 'subroutineComponent definitions finally');
                            $scope.$applyAsync( function() {
                                $scope.ready            =   true;
                            });
                        });
                    } else {
                        throw new Error( 'Unexpected subroutine type ['+$scope.block.properties._workflow+']');
                    }



                    $timeout( function() {
                        _initClick();
                    }, 10)
                }

                function _initClick()
                {
                    var $div    =   $element.find( 'div.selectable-component')[0];

                    var containerController =   {
                        removeSelection: function() { propertiesContext.removeSubroutine( $scope.block.properties.fragment_id); }
                    };


                    $($div).bind( 'click', function( event) {
                        $scope.$apply( function () {
                            if ( $scope.isSelected()) {
                                propertiesContext.setSelectedComponent( null);
                            } else {
                                propertiesContext.setSelectedComponent( $scope.block, containerController);
                            }
                            event.stopPropagation();
                        });
                    });
                }
            }
        }
    };


import template from './selectable-component.tmpl.html';

export default function selectableComponent( $log, ConvoworksApi, $timeout, $compile)
    {
        return {
            restrict: 'E',
            scope: { 'component' : '=' },
            require: [ '^propertiesContext' , '^convoworksComponentsContainer'],
            template: template,
            link: function( $scope, $element, $attributes, $ctrls) {

                var propertiesContext               =   $ctrls[0];
                var convoworksComponentsContainer   =   $ctrls[1];
                var $draggable;
                var service                 =   propertiesContext.getSelectedService();
//              $log.log( 'selectableComponent link() $scope.component', $scope.component);

                $scope.showTitle            =   true;
                $scope.over                 =   false;
                $scope.ready                =   false;
                $scope.componentTitle       =   "";

                $scope.isElement            =   false;
                $scope.isProcessor          =   false;
                $scope.isFilter             =   false;

                _init();

                $scope.isSelected   =   function() {
                    return propertiesContext.getSelection().component === $scope.component;
                };

                $scope.getBlockName =   function( blockId) {
                    try {
                        var block   =   propertiesContext.findBlock( blockId);
                    } catch ( err) {
                        return 'ID: ' + blockId;
                    }
                    if ( block.properties.name) {
                        return block.properties.name;
                    }
                    return 'ID: ' + blockId;
                }

                $scope.getSubroutineName    =   function( fragmentId) {
                    try {
                        var fragment    =   propertiesContext.findSubroutine( fragmentId);
                    } catch ( err) {
                        return 'ID: ' + fragmentId;
                    }
                    if ( fragment.properties.name) {
                        return fragment.properties.name;
                    }
                    return 'ID: ' + fragmentId;
                }

                $scope.isCut    =   function() {
                    return propertiesContext.isCut( $scope.component);
                }

                $scope.getContextOptions    =   function() {

                    var options =   [];

                    options.push(
                        {
                            text: 'Cut',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context cut');
                                propertiesContext.cut( convoworksComponentsContainer, $scope.component);
                            }
                        }
                    );

                    options.push(
                        {
                            text: 'Copy',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context copy');
                                propertiesContext.copy( $scope.component);
                            }
                        }
                    );

                    if ( propertiesContext.hasClipboard()) {
                        options.push(
                            {
                                text: 'Paste',
                                click: function ($itemScope, $event, modelValue, text, $li) {
                                    $log.log( 'selectableComponent context paste');
                                    var index       =   convoworksComponentsContainer.indexOf( $scope.component) + 1;
                                    propertiesContext.paste( convoworksComponentsContainer, index);
                                }
                            }
                        );
                    }

                    options.push( null);
                    options.push(
                        {
                            text: 'Delete',
                            click: function ($itemScope, $event, modelValue, text, $li) {
                                $log.log( 'selectableComponent context delete');
                                if ( propertiesContext.getSelection().component === $scope.component) {
                                    propertiesContext.setSelectedComponent( null);
                                }
                                convoworksComponentsContainer.removeComponent( $scope.component);
                            }
                        }
                    );

                    return options;
                }


                $scope.$on( '$destroy', function() {
                    $log.log( 'selectableComponent $destroy');
                    if ($draggable) {
                        $draggable.draggable({disabled: true}).draggable( 'destroy');
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
                    ConvoworksApi.getComponentDefinition( propertiesContext.getSelectedService()['service_id'], class_name).then( function( definition) {
//                      $log.log( 'selectableComponent got definition', definition);

                        $scope.definition       =   definition;
                        $scope.componentTitle   =   definition.name;
                        $scope.isElement        =   false;

                        if ( definition.component_properties._interface) {
                            if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationProcessor') {
                                $scope.isProcessor      =   true;
                                $scope.componentTitle   =   definition.name;
                            } else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IRequestFilter') {
                                $scope.isFilter         =   true;
                            } else if ( definition.component_properties._interface === '\\Convo\\Core\\Workflow\\IConversationElement') {
                                $scope.isElement        =   true;
                            }
                        }

                        if ( definition.component_properties._preview_angular && definition.component_properties._workflow != 'process') {
                            $scope.showTitle    =   false;
                        }

                    }, function( reason) {
                        $log.error( 'selectableComponent definitions got reason', reason);
                    }).finally( function() {
//                      $log.log( 'selectableComponent definitions finally');
                        $scope.$applyAsync( function() {
                            $scope.ready            =   true;
                        });

                        // good old timeout
                        $timeout( function() {
                            _initPreview();
                            _initDraggable();
                            _initDroppable();
                            _initClick();
                        }, 10)
                    });
                }

                function _initDraggable()
                {
                    $draggable  =   $($element.find( 'div.selectable-component')[0]);
//                  $log.log( 'selectableComponent link() $draggable', $draggable);
                    $draggable.draggable( {
                        revert: true,
                        revertDuration : 50,
                        zIndex: 100,
                        delay : 200,
                        tolerance : 'pointer',
                        appendTo: 'body',
                        helper: 'clone',
                        refreshPositions: true,
                        start: function( event, ui) {
//                          $(this).data( 'component', $scope.component);
                            $(this).data( 'convoDragged', {
                                type : 'component',
                                component : $scope.component,
                                containerController : convoworksComponentsContainer
                            });

                            ui.helper.bind( "click.prevent",
                                    function(event) { event.preventDefault(); });
                        },
                        stop: function( event, ui) {
                            setTimeout(function(){ui.helper.unbind("click.prevent");}, 300);
                        },
                    });
                }

                function _initDroppable()
                {
                    var $droppable  =   $($element.find( 'div.selectable-component')[0]);

                    $droppable.droppable({
                        greedy: true,
                        drop: function( event, ui ) {
                            var data        =   ui.draggable.data('convoDragged');
                            $log.log( 'selectableComponent drop event', event, 'ui', ui, 'data', data);
                              if ( data) {

                                  if ( data.handled) {
                                      $log.log( 'selectableComponent already handled');
                                      return;
                                  }

                                  $scope.$apply( function() {

                                      var index     =   convoworksComponentsContainer.indexOf( $scope.component) + 1;
                                      if ( data.type == 'definition') {
                                          $log.log( 'selectableComponent new component', data.componentDefinition, 'to container', $scope.container, 'in component', $scope.component);

                                          propertiesContext.addNewComponent(
                                                  convoworksComponentsContainer,
                                                  data.componentDefinition,
                                                  index);

                                      } else if ( data.type == 'component') {
                                          $log.log( 'selectableComponent move component', data.component);

                                          propertiesContext.moveComponent(
                                                  data.containerController,
                                                  convoworksComponentsContainer,
                                                  data.component,
                                                  index);

                                      } else {
                                          throw new Error( 'Expected to have type [definition] or [component]');
                                      }
                                      data.handled  =   true;
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
                    var $div    =   $element.find( 'div.selectable-component')[0];
                    $($div).bind( 'click', function( event) {
                        $log.log( 'selectableComponent click $scope.isSelected()', $scope.isSelected());

                        $scope.$apply( function () {
                            if ( $scope.isSelected()) {
                                propertiesContext.setSelectedComponent( null);
                            } else {
                                propertiesContext.setSelectedComponent( $scope.component, { removeSelection: convoworksComponentsContainer.removeComponent });
                            }
                        });

                        event.stopPropagation();
                    });
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

import angular from 'angular';

import blockComponent from './block-component.directive';
import convoworksComponentsContainer from './convoworks-components-container.directive';
import selectableComponent from './selectable-component.directive';
import subroutineComponent from './subroutine-component.directive';
import variablesEditor from './variables-editor.directive';
import ConvoworksAddBlockService from './convoworks-add-block.service';

import contextElement from './context-element.directive';
import contextElementsContainer from './context-elements-container.directive';

export default angular
  .module('convo.editor.workflow', [])
  .service('ConvoworksAddBlockService', ConvoworksAddBlockService)
  .directive('blockComponent', blockComponent)
  .directive('convoworksComponentsContainer', convoworksComponentsContainer)
  .directive('selectableComponent', selectableComponent)
  .directive('subroutineComponent', subroutineComponent)
  .directive('variablesEditor', variablesEditor)
  .directive('contextElement', contextElement)
  .directive('contextElementsContainer', contextElementsContainer)
  .name;


import template from './convoworks-components-container.tmpl.html';


export default function convoworksComponentsContainer( $log, $timeout)
    {
        var AUTO_OPEN_TIMEOUT   =   1500;
        
        return {
            restrict: 'E',
            scope: { 
                'component' : '=',
                'propertyName' : '=',
                'propertyDefinition' : '=',
            },
            require: [ '^convoworksComponentsContainer', '^propertiesContext'],
            template: template,
            controller : function ( $scope) {
                
                this.getPropertyDefinition      =   getPropertyDefinition;
                this.getContainer               =   getContainer;
                this.isMultiple                 =   isMultiple;
                this.indexOf                    =   indexOf;
                this.addComponent               =   addComponent;
                this.removeComponent            =   removeComponent;
                
                function getPropertyDefinition()
                {
                    return $scope.propertyDefinition;
                }
                
                function getContainer()
                {
                    if ( $scope.propertyName.indexOf( '.') > -1) {
                        var o       =   $scope.component.properties;
                        var parts   =   $scope.propertyName.split( '.');

                        for ( var i = 0; i < parts.length; i++) {
                            o   =   o[parts[i]];
                        }

                        return o;
                    }

                    if ( $scope.component && $scope.component.properties)
                        return $scope.component.properties[$scope.propertyName];

                    $log.warn( 'convoworksComponentsContainer controller getContainer() no property ['+$scope.propertyName+'] in $scope.component', $scope.component);
                }
                
                function isMultiple()
                {
                    return $scope.propertyDefinition.editor_properties.multiple;
                }
                
                function indexOf( component)
                {
                    if ( isMultiple()) {
                        return getContainer().indexOf( component);
                    }
                    return 0;
                }
                
                function addComponent( component, index)
                {
                    if ( !index) {
                        index   =   0;
                    }
                    
                    if ( isMultiple()) {
                        $log.log( 'convoworksComponentsContainer controller addComponent() adding component', component, 'at index', index);
                        getContainer().splice( index, 0, component);
                        return;
                    }
                    
                    $log.log( 'convoworksComponentsContainer controller addComponent() setting component', component);
                    $scope.component.properties[$scope.propertyName]    =   component;
                }
                
                function removeComponent( component)
                {
                    if ( isMultiple()) {
                        var index   =   getContainer().indexOf( component);
                        $log.log( 'convoworksComponentsContainer controller removeComponent() removing component', component, 'from index', index);
                        getContainer().splice( index, 1);
                        return;
                    }
                    
                    $log.log( 'convoworksComponentsContainer controller removeComponent() setting container at null');
                    $scope.component.properties[$scope.propertyName]    =   null;
                }
            },
            link: function( $scope, $element, $attributes, $ctrls) {
                
                var convoworksComponentsContainer   =   $ctrls[0];
                var propertiesContext               =   $ctrls[1];
//              $log.log( 'convoworksComponentsContainer link() $scope.component.properties[$scope.propertyName]', $scope.component.properties[$scope.propertyName], 'convoworksComponentsContainer', convoworksComponentsContainer);
                
                var open        =   false;
                var open_timer  =   null;
                
                if ( 'defaultOpen' in $scope.propertyDefinition) {
//                  $log.log( 'convoworksComponentsContainer setting defaultOpen', $scope.propertyDefinition['defaultOpen']);
                    open    =   $scope.propertyDefinition['defaultOpen'];
                }
//              _initDroppableBackground();
                
                _initDroppable();
                
                // API
                $scope.toggleOpen       =   function() {
                    open    =   !open;
                };
                
                $scope.isOpen       =   function() {
                    return open;
                };
                
                
                
                $scope.shouldHide   =   function() {
                    if ( !convoworksComponentsContainer.getContainer()) {
                        return true;
                    }
                    return $scope.propertyDefinition.editor_properties.hideWhenEmpty && convoworksComponentsContainer.getContainer().length == 0; 
                }
                
                $scope.getContainer =   convoworksComponentsContainer.getContainer;
                
                $scope.getContextOptions    =   function() {
                    
                    var options =   [];
                    
                    if ( propertiesContext.hasClipboard()) {
                        options.push(
                            {
                                text: 'Paste',
                                click: function ($itemScope, $event, modelValue, text, $li) {
                                    $log.log( 'convoworksComponentsContainer context paste');
                                    propertiesContext.paste( convoworksComponentsContainer, convoworksComponentsContainer.getContainer().length);
                                }
                            }
                        );    
                    }
                    
                    return options;
                }
                
                $scope.$on(
                        "$destroy",
                        function( event ) {
                              if ( open_timer) {
                                  $timeout.cancel( open_timer );
                                  open_timer    =   null;
                              }
                        }
                    );
                
                
                // PRIVATE
                function _initDroppable()
                {
                    var $droppable  =   $($element.find( '.prop-container')[0]);
                    $droppable.droppable({
                        greedy: true,
                        drop: function( event, ui ) {
                            var data    =   ui.draggable.data('convoDragged');
                            $log.log( 'convoworksComponentsContainer drop event', event, 'ui', ui, 'data', data);
                            
                            if ( data) {
                                
                                  if ( data.handled) {
                                      $log.log( 'convoworksComponentsContainer already handled');
                                      return;
                                  }
                                
                                  $scope.$apply( function() {
                                      
                                      if ( data.type == 'definition') {
                                          $log.log( 'convoworksComponentsContainer new component', data.componentDefinition, 'to container', $scope.component.properties[$scope.propertyName], 'in component', $scope.component);
                                          
                                          propertiesContext.addNewComponent( 
                                                  convoworksComponentsContainer, 
                                                  data.componentDefinition);
                                      } else if ( data.type == 'component') {
                                          $log.log( 'convoworksComponentsContainer move component', data.component);
                                          
                                          propertiesContext.moveComponent( 
                                                  data.containerController,
                                                  convoworksComponentsContainer, 
                                                  data.component);
//                                        }
                                      } else {
                                          throw new Error( 'Expected to have type [definition] or [component]');
                                      }
                                      data.handled  =   true;
                                      open = true;
                                });
                              } else {
                                  $log.error( 'convoworksComponentsContainer Expected to have [convoDragged] data ['+event.target.className+']');
                              }
                            return false;
                          },
                          over: function( event, ui) {
                              if ( !open) {
                                  open_timer    =   $timeout( function() {
                                      open = true;
                                  }, AUTO_OPEN_TIMEOUT);
                              }
                          }, 
                          out: function( event, ui) {
                              if ( open_timer) {
                                  $timeout.cancel( open_timer );
                                  open_timer    =   null;
                              }
                          }, 
                        });
                }
                function _initDroppableBackground()
                {
                    var $droppable  =   $($element.find( '.real-container')[0]);
//                  $log.log( 'convoworksComponentsContainer _initDroppableBackground() $droppable', $droppable);
//                  $droppable.on( 'dragover', function( event) {
//                      $log.log( 'convoworksComponentsContainer _initDroppableBackground()');
//                      event.stopImmediatePropagation();
//                  })
                    $droppable.droppable({
                        greedy: true,
//                      accept : '#pattern',
                        over: function( event, ui ) {
                    //      event.stopImmediatePropagation();
                        },
                        activate: function( event, ui ) {
                        //  event.stopImmediatePropagation();
                        },
//                      out: function( event, ui ) {
//                          event.stopImmediatePropagation();
//                      },
                    });
                }
            }
        }
    }


import template from './convoworks-add-block.tmpl.html';

export default function ConvoworksAddBlockService( $log, $uibModal) {

    this.showModal              =   showModal;
    this.showSubroutineModal    =   showSubroutineModal;
    
    function showModal( service, type, propertiesContext)
    {
        var modalInstance = $uibModal.open({
            template: template,
            controller: ModalInstanceCtrl,
            size : 'md',
            resolve: {
                service: function () {
                    return service;
                },
                type: function () {
                    return type;
                },
                subroutineType: function () {
                    return null;
                },
                propertiesContext: function () {
                    return propertiesContext;
                },
            }
        });
    }


    function showSubroutineModal( service, propertiesContext, subroutineType)
    {
        var modalInstance = $uibModal.open({
            template: template,
            controller: ModalInstanceCtrl,
            size : 'md',
            resolve: {
                service: function () {
                    return service;
                },
                type: function () {
                    return 'reader';
                },
                subroutineType: function () {
                    return subroutineType;
                },
                propertiesContext: function () {
                    return propertiesContext;
                },
            }
        });
    }

    
    /* @ngInject */
    var ModalInstanceCtrl = function ( $scope, $timeout, $uibModalInstance, service, type, subroutineType, propertiesContext) {

        $scope.service          =   service;

        $scope.block            =   {
                name : '',
        };
        
        if ( type == 'user') 
        {
            $scope.title            =   'Add new step';
            $scope.description      =   'Create a new step in rhe conversation workflow.';
            $scope.block.name       =   'My new conversation step';
            
            $scope.createBlock          =   function () {
                $log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
                propertiesContext.addBlock( $scope.block.name);
                $uibModalInstance.dismiss('cancel');
            };
        } 
        else if ( type == 'reader') 
        {
            if ( subroutineType == 'read') 
            {
                $scope.title            =   'Add new read fragment';
                $scope.description      =   'Create new fragment which can be invoked from conversation elemets';
                $scope.block.name       =   'My new read fragment';
            
                $scope.createBlock          =   function () {
                    $log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
                    propertiesContext.addReadSubroutine( $scope.block.name);
                    $uibModalInstance.dismiss('cancel');
                };
            }
            else if ( subroutineType == 'process')
            {
                $scope.title            =   'Add new process fragment';
                $scope.description      =   'Create new fragment which can be invoked from conversation processors';
                $scope.block.name       =   'My new process fragment';

                                
                $scope.createBlock          =   function () {
                    $log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
                    propertiesContext.addProcessSubroutine( $scope.block.name);
                    $uibModalInstance.dismiss('cancel');
                };
            }
            else
            {
                throw new Error( 'Unexpected subroutineType ['+subroutineType+']');
            }


            
        } 
        else 
        {
            throw new Error( 'Unexpected type ['+type+']');
        }
        

        $scope.cancel           =   function () {
            $uibModalInstance.dismiss('cancel');
        };
        
    };
};

import template from './context-elements-container.tmpl.html';

export default function contextElementsContainer( $log)
{
    var AUTO_OPEN_TIMEOUT   =   1500;

    return {
        restrict: 'E',
        template: template,
        require: [ '^contextElementsContainer', '^propertiesContext'],
        scope: { 'service': '=' },
        controller: function( $scope) {

            this.getContainer       =   getContainer;
            this.indexOf            =   indexOf;
            this.isMultiple         =   isMultiple;
            this.addComponent       =   addComponent;
            this.removeComponent    =   removeComponent;

            function getContainer()
            {
                return $scope.service.contexts;
            }

            function indexOf( component)
            {
                return getContainer().findIndex( function( context) {
                    return context.properties._component_id === component.properties._component_id ;
                });
            }

            function isMultiple()
            {
                return true;
            }

            function addComponent( component, index)
            {
                if ( !index) {
                    index   =   0;
                }

                getContainer().splice( index, 0, component);
            }

            function removeComponent( component)
            {
                $scope.service.contexts =   getContainer().filter( function( context) {
                    return context.properties.id    !==     component.properties.id;
                });
            }
        },
        link: function( $scope, $element, $attributes, $ctrls)
        {
            var contextElementsContainer    =   $ctrls[0];
            var propertiesContext           =   $ctrls[1];

            var open        =   true;
            var open_timer  =   null;

            _initDroppable();

            $scope.isOpen           =   function()
            {
                return open;
            };

            $scope.toggleOpen       =   function()
            {
                open    =   !open;
            };

            $scope.$on(
                "$destroy",
                function( event ) {
                    if ( open_timer) {
                        $timeout.cancel( open_timer );
                        open_timer  =   null;
                    }
                }
            );

            function _initDroppable()
            {
                var $droppable  =   $($element.find( '.context-container')[0]);
                $droppable.droppable({
                    greedy: true,
                    drop: function( event, ui ) {
                        if ( ui.draggable.data( 'convoDragged')) {
                            $scope.$apply( function() {
                                var data    =   ui.draggable.data( 'convoDragged');

                                $log.log( 'contextElementsContainer droppable data', data);

                                if ( data.type == 'definition') {
                                    propertiesContext.addNewComponent(
                                        contextElementsContainer,
                                        data.componentDefinition);
                                } else if ( data.type == 'component') {
                                    propertiesContext.moveComponent(
                                        data.containerController,
                                        contextElementsContainer,
                                        data.component);
                                } else {
                                    throw new Error( 'Expected to have type [definition] or [component]');
                                }
                            });
                        } else {
                            throw new Error( 'Expected to have [convoDragged] data');
                        }
                    },
                    over: function( event, ui) {
                        if ( !open) {
                            open_timer  =   $timeout( function() {
                                open = true;
                            }, AUTO_OPEN_TIMEOUT);
                        }
                    },
                    out: function( event, ui) {
                        if ( open_timer) {
                            $timeout.cancel( open_timer );
                            open_timer  =   null;
                        }
                    },
                });
            }
        }
    }
};

import template from './selectable-component.tmpl.html';


export default function contextElement( $log, ConvoworksApi, $timeout, $compile)
{
    return {
        restrict: 'E',
        scope: { 'contextElement' : '=' },
        require: [ '^propertiesContext', '^contextElementsContainer'],
        template: template,
        link: function( $scope, $element, $attributes, $ctrls) {
            var $draggable;

            var propertiesContext           =   $ctrls[0];
            var contextElementsContainer    =   $ctrls[1];

            $scope.showTitle            =   true;
            $scope.over                 =   false;
            $scope.ready                =   false;
            $scope.componentTitle       =   "";

            _init();

            $scope.isSelected   =   function() {
                return propertiesContext.getSelection().component === $scope.contextElement;
            };

            $scope.$on( '$destroy', function() {
                $log.log( 'contextElement $destroy');
                $draggable.draggable({ disabled: true }).draggable( 'destroy');
            });

            function _init()
            {
                if ( !$scope.contextElement) {
                    throw new Error( 'No element provided!');
                }

                var class_name  =       $scope.contextElement['class'];

                if ( !class_name) {
                    $log.log( 'contextElement _init() $scope.contextElement', $scope.contextElement);
                    throw new Error( 'No class in component');
                }

                ConvoworksApi.getComponentDefinition( propertiesContext.getSelectedService()['service_id'], class_name).then( function( definition) {

                    $log.log( 'contextElement directive getComponentDefinition() then definition', definition);

                    $scope.definition       =   definition;
                    $scope.componentTitle   =   definition.name;

                    if ( !definition.component_properties._interface) {
                        if ( definition.component_properties._preview_angular) {
                            $scope.showTitle    =   false;
                        }
                        return;
                    }

                }, function( reason) {
                    $log.error( 'contextElement definitions got reason', reason);
                }).finally( function() {
                    $scope.$applyAsync( function() {
                        $scope.ready            =   true;
                    });

                    // good old timeout
                    $timeout( function() {
                        _initPreview();
                        _initDraggable();
                        _initDroppable();
                        _initClick();
                    }, 10)
                });
            }

            function _initDraggable()
            {
                $draggable  =   $($element.find( 'div.selectable-component')[0]);

                $draggable.draggable( {
                    revert: true,
                    revertDuration : 50,
                    zIndex: 100,
                    delay : 200,
                    tolerance : 'pointer',
                    start: function( event, ui) {
                        $(this).data( 'convoDragged', {
                            type : 'component',
                            component : $scope.contextElement,
                            containerController: contextElementsContainer
                        });

                        ui.helper.bind( "click.prevent",
                            function(event) { event.preventDefault(); });
                    },
                    stop: function( event, ui) {
                        setTimeout(function(){ui.helper.unbind("click.prevent");}, 300);
                    }
                });
            }

            function _initDroppable()
            {
                var $droppable  =   $($element.find( 'div.selectable-component')[0]);

                $droppable.droppable({
                    greedy: true,
                    drop: function( event, ui ) {
                        if ( ui.draggable.data('convoDragged')) {
                            $scope.$apply( function() {

                                var data        =   ui.draggable.data('convoDragged');
                                var index       =   contextElementsContainer.indexOf( $scope.contextElement) + 1;

                                if ( data.type == 'definition') {
                                    $log.log( 'convoworksComponentsContainer new component', data.componentDefinition, 'to container', contextElementsContainer.getContainer(), 'in component', $scope.contextElement);

                                    propertiesContext.addNewComponent(
                                        contextElementsContainer,
                                        data.componentDefinition,
                                        index);

                                } else if ( data.type == 'component') {
                                    $log.log( 'convoworksComponentsContainer move component', data.component);

                                    propertiesContext.moveComponent(
                                        data.containerController,
                                        contextElementsContainer,
                                        data.component,
                                        index);

                                } else {
                                    throw new Error( 'Expected to have type [definition] or [component]');
                                }
                            });
                        } else {
                            throw new Error( 'Expected to have [convoDragged] data');
                        }
                    }
                });
            }

            function _initClick()
            {
                var $div    =   $($element.find( 'div.selectable-component')[0]);
                $div.bind( 'click', function( event) {

                    $scope.$apply( function () {
                        if ( $scope.isSelected()) {
                            propertiesContext.setSelectedComponent( null);
                        } else {
                            propertiesContext.setSelectedComponent( $scope.contextElement, {
                                removeSelection: function() {
                                    var contexts    =   propertiesContext.getSelection().service.contexts;

                                    propertiesContext.getSelection().service.contexts   =
                                            contexts.filter( function( contextElement) {
                                                return contextElement   !== $scope.contextElement;
                                            });
                            }});
                        }
                    });

                    event.stopPropagation();
                });
            }

            function _initPreview()
            {
                var container   =   $element.find( '.preview');

                if ( $scope.definition.component_properties._preview_angular) {
                    var html        =   $scope.definition.component_properties._preview_angular.template;
                    container.html( html);
                    $compile( container.contents())( $scope);
                } else {
                    container.html( '');
                }
            }
        }
    }
};


import template from './block-component.tmpl.html';


export default function blockComponent( $log, $timeout, ConvoworksApi, UserPreferencesService, LoginService)
{
    return {
        restrict: 'E',
        scope: { 'block' : '=', 'canMoveUp': '=', 'canMoveDown': '=' },
        require: '^propertiesContext',
        template: template,
        link: function( $scope, $element, $attributes, propertiesContext) {
            var USER_PREFERENCES_KEY    =   '';
            // API
            $scope.over                 =   false;
            $scope.ready                =   false;
            $scope.componentTitle       =   "";
            $scope.componentName        =   "";

            $scope.isSysBlock           =   false;
            $scope.isReadBlock          =   false;
            $scope.isSysProcessors      =   false;
            $scope.isSessionEnd         =   false;

            $scope.isSysBlockOpen       =   { value: false };

            $scope.getComponentTitle    =   function() {
                if ( !$scope.definition) {
                    return 'Generating title ...';
                }

                if ( $scope.block.properties.name) {
                    return $scope.block.properties.name;
                }

                if ( $scope.block.properties.block_id.indexOf( '__') === 0) {
                    return 'System - ' + $scope.block.properties.block_id + '';
                }

                if ( $scope.block.properties.block_id.indexOf( '_read_') === 0) {
                    return 'Fragment - ' + $scope.block.properties.block_id + '';
                }

                return $scope.block.properties.block_id;
            };

            $scope.isSelected   =   function() {
                return propertiesContext.getSelection().component === $scope.block;
            };

            $scope.toggleOpen   =   function( type) {
                open[type]  =   !open[type];
            };

            $scope.isOpen   =   function( type) {
                return open[type];
            };

            $scope.$on( '$destroy', function() {
                $log.log( 'blockComponent $destroy');
            });

            $scope.moveUp = function()
            {
                $scope.$emit('moveBlock', {
                    blockId: $scope.block.properties.block_id + '',
                    dir: -1
                });
            }

            $scope.moveDown = function()
            {
                $scope.$emit('moveBlock', {
                    blockId: $scope.block.properties.block_id + '',
                    dir: 1
                });
            }

            // INIT
            var open    =   {
                    elements : false,
                    processors : false,
                    default: false
            }
            _init();

            function _init()
            {

                ConvoworksApi.getComponentDefinition( propertiesContext.getSelectedService()['service_id'], '\\Convo\\Pckg\\Core\\Elements\\ConversationBlock').then( function( definition) {
                    if ( $scope.block.properties.block_id.indexOf( '__') === 0) {

                        $scope.componentTitle   =   'System - ' + $scope.block.properties.block_id + '';
                        $scope.isSysBlock       =   true;
                        if ( $scope.block.properties.block_id === '__serviceProcessors') {
                            $scope.isSysProcessors      =   true;
                        } else if ( $scope.block.properties.block_id === '__sessionEnd') {
                            $scope.isSessionEnd     =   true;
                        }
                    } else if ( $scope.block.properties.block_id.indexOf( '_read_') === 0) {
                        // $scope.isReadBlock       =   true;
                        $scope.componentTitle   =   'Fragment - ' + $scope.block.properties.block_id + '';
                    } else {
                        $scope.componentTitle   =   $scope.block.properties.block_id;
                    }

                    $scope.componentName    =   $scope.block.properties.name;

                    $scope.definition       =   definition;

                    LoginService.getUser().then(function (user) {
                        $log.log('blockComponent got user', user);
                        USER_PREFERENCES_KEY    =   user.user_id + '_' + propertiesContext.getSelectedService()['service_id'] + '_' + $scope.block.properties['_component_id'];

                        $log.log('blockComponent final user preferences key', USER_PREFERENCES_KEY);

                        UserPreferencesService.getData(USER_PREFERENCES_KEY).then(function (value) {
                            if (value !== null && value !== undefined) {
                                $scope.isSysBlockOpen.value = value;
                            } else {
                                $scope.isSysBlockOpen.value = false;
                            }
                        });
                    }, function (reason) {
                        $log.warn('blockComponent getUser() rejected with reason', reason);
                    });

                    $scope.$watch('isSysBlockOpen.value', function(value) {
                        UserPreferencesService.registerData(USER_PREFERENCES_KEY, value);
                    });
                }, function( reason) {
                    $log.error( 'blockComponent got reason', reason);
                }).finally( function() {
                    $scope.$applyAsync( function() {
                        $scope.ready            =   true;
                    });
                });

                $timeout( function() {
                    _initClick();
                }, 10)
            }

            function _initClick()
            {
                var $div    =   $($element.find( 'div.selectable-component')[0]);

                var containerController =   {
                    removeSelection: function() { propertiesContext.removeBlock( $scope.block.properties.block_id); }
                };

                $div.bind( 'click', function( event) {
                    $scope.$apply( function () {
                        if ( $scope.isSelected()) {
                            propertiesContext.setSelectedComponent( null);
                        } else {
                            propertiesContext.setSelectedComponent( $scope.block, containerController);
                        }
                        event.stopPropagation();
                    });
                });
            }
        }
    }
};

import angular from 'angular';

import convoworksToolbox from './convoworks-toolbox.directive';
import convoworksToolboxComponent from './convoworks-toolbox-component.directive';

export default angular
  .module('convo.editor.toolbox', [])
  .directive('convoworksToolbox', convoworksToolbox)
  .directive('convoworksToolboxComponent', convoworksToolboxComponent)
  .name;


import template from './convoworks-toolbox.tmpl.html';

export default function convoworksToolbox( $log, ConvoworksApi, UserPreferencesService)
{
    return {
        restrict: 'E',
        scope: {
            'definitions' : '=',
            'availablePackages': '=',
            'service' : '='
        },
        require: '^propertiesContext',
        template: template,
        link: function( $scope, $element, $attributes, propertiesContext)
        {
            $log.log( 'convoworksToolbox _init() $scope.definitions', $scope.definitions, $scope.availablePackages);

            var core            =   ['convo-core', 'amazon', 'google-nlp'];
            $scope.open         =   {};

            $scope.groupedDefinitions = {};

            if ( !$scope.service.packages) {
                $scope.service.packages =   [];
            }

            _initGroupedDefinitions();

            UserPreferencesService.getData( 'openToolboxes').then( function( openToolboxes) {
                if ( openToolboxes) {
                    $scope.open    =   openToolboxes;
                }
            });

            $scope.$watch( 'open', function( value) {
                UserPreferencesService.registerData( 'openToolboxes', value);
            }, true);

            $scope.$watch('definitions', function (value) {
                var names = value.map(function (p) { return p.namespace });
                $log.log('Triggering grouped definitions refresh with possible values', names);
                _initGroupedDefinitions();
            }, true);

            $scope.isOpen       =   function( namespace)
            {
                if ( namespace in $scope.open) {
                    return $scope.open[namespace];
                }
                return (core.indexOf(namespace) > -1);
            };

            $scope.toggleOpen   =   function( namespace)
            {
                $scope.open[namespace]  =   !$scope.isOpen( namespace);
            }

            $scope.isEnabled    =   function( namespace)
            {
                return $scope.service.packages.includes(namespace);

                // for ( var i=0; i<$scope.service.packages.length; i++) {
                //     if ( $scope.service.packages[i] == namespace) {
                //         return true;
                //     }
                // }
                // return false;
            }

            $scope.toggleEnabled = function(namespace)
            {
                if ($scope.isEnabled(namespace))
                {
                    // $scope.service.packages =   $scope.service.packages.filter( function(e) { return e !== namespace })
                    ConvoworksApi.removeServicePackage($scope.service['service_id'], namespace).then(function(packages) {
                        $log.log('ConvoworksToolbox removePackage [' + namespace + '] done');
                        propertiesContext.reloadService();
                        propertiesContext.setComponentDefinitions(packages);
                        $scope.open[namespace] = false;
                    }, function (reason) {
                        $log.error('ConvoworksToolbox removePackage rejected for reason', reason);
                    });
                }
                else
                {
                    ConvoworksApi.addServicePackage($scope.service['service_id'], namespace).then(function(packages) {
                        $log.log('ConvoworksToolbox addPackage [' + namespace + '] done');
                        propertiesContext.reloadService();
                        propertiesContext.setComponentDefinitions(packages);
                    }, function (reason) {
                        $log.error('ConvoworksToolbox addPackage rejected for reason', reason);
                    });
                }
            }

            function _initGroupedDefinitions()
            {
                $scope.groupedDefinitions = {};

                for (var i in $scope.definitions) {
                    $log.log($scope.definitions[i]);
                    var namespace = $scope.definitions[i].namespace;

                    if (!$scope.groupedDefinitions[namespace]) {
                        $scope.groupedDefinitions[namespace] = {};
                    }

                    for (var j in $scope.definitions[i].components) {
                        var cmpt = $scope.definitions[i].components[j];
                        var grp = _uppercaseWord(cmpt['component_properties']['_workflow']);

                        if (!$scope.groupedDefinitions[namespace][grp]) {
                            $scope.groupedDefinitions[namespace][grp] = [];
                        }

                        if (!cmpt.name.toLowerCase().includes('x!')) {
                            $scope.groupedDefinitions[namespace][grp].push(cmpt);
                        }
                    }
                }
            }

            function _uppercaseWord(word) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
        }
    }
}


import template from './convoworks-toolbox-component.tmpl.html';

export default function convoworksToolboxComponent( $log, $compile)
{
    return {
        restrict: 'E',
        scope: { 
            'componentDefinition' : '='
        },
        require : '^propertiesContext',
        template: template,
        link: function( $scope, $element, $attributes, propertiesContext) {

            _initDraggable();
            
            $scope.isDeprecated =   function() {
                if ( $scope.componentDefinition.name.indexOf('X!') === 0 || $scope.componentDefinition.name.indexOf('x!') === 0) {
                    return true;
                }
                return false;
            }
            
            function _initDraggable()
            {
                var $draggable  =   $element.find( '.toolbox-component');
                $draggable.draggable( { 
                    revert: false, 
                    zIndex: 100, 
                    opacity: 1, 
                    helper: 'clone',
                    tolerance : 'pointer',
                    refreshPositions: true,
                    start: function(e) {
                        $(this).data( 'convoDragged', {
                            type : 'definition',
                            componentDefinition : $scope.componentDefinition
                        });
                    },
                });
            }
        }
    }
}

import template from './system-intent-editor.tmpl.html';

export default function systemIntentEditor( $log) {
        return {
            restrict: 'E',
            require: '^propertiesContext',
            template: template,
            scope: {
                component: '=',
                propertyDefinition: '=',
                key: '=',
                service: '='
            },
            link: function ( $scope, $element, $attributes, propertiesContext) {
                $log.debug( 'systemIntentEditor link');
                $scope.value    =   _deserialize( $scope.component.properties[$scope.key]);
                $scope.error    =   false;
                
                $scope.$watch( 'value', function ( value) {
                    try {
                        $scope.component.properties[$scope.key] =   _serialize( value);
                        $log.debug( 'systemIntentEditor changed value for key', $scope.key);
                        $scope.error    =   false;
                    } catch ( err) {
                        $scope.error    =   true;
                    }
                });
                
                $scope.$watch( function () {
                    $log.debug( 'systemIntentEditor component value changed for key', $scope.key);
                    return $scope.component.properties[$scope.key];
                }, function ( value) {
                    $scope.value    =   _deserialize( value);
                    $scope.error    =   false;
                });
                
                function _serialize( val)
                {
                    if ( val) {
                        return val.split(',').map( function(item) {
                              return item.trim();
                        });
                    }
                    return [];
                }
                
                function _deserialize( val)
                {
                    if ( angular.isArray( val)) {
//                      val = val.filter(function (el) {
//                            return el.trim() != '';
//                      });
                        return val.join( ',');
                    }
                    return '';
                }
                
            }
        }
    };

import template from './properties-editor.tmpl.html';

export default function propertiesEditor( $log, ConvoworksApi) {
    return  {
        restrict: 'E',
        require: '^propertiesContext',
        template: template,
        scope: {
            component: '=',
            definition: '=',
            service: '=',
            help: '=?'
        },
        link: function ( $scope, $element, $attributes, propertiesContext) {
            var watchers    =   [];
            $scope.help = null;
            $scope.tabIndex = { active: "b" };

            _setupBlockIds();

            $scope.getBlockId   =   function() {
                var block_id    =   null;
                if ( $scope.component.properties.block_id) {
                    block_id    =   $scope.component.properties.block_id;
                }
                if ( $scope.component.properties.fragment_id) {
                    block_id    =   $scope.component.properties.fragment_id;
                }

                return block_id;
            };

            $scope.getComponentName =   function() {

                if ( $scope.component.properties.name) {
                    return $scope.component.properties.name + ' ('+$scope.definition.name+')';
                }

                if ( $scope.component.properties.block_id) {
                    return $scope.component.properties.block_id + ' ('+$scope.definition.name+')';
                }

                if ( $scope.component.properties.fragment_id) {
                    return $scope.component.properties.fragment_id + ' ('+$scope.definition.name+')';
                }

                return $scope.definition.name;
            };

            $scope.getComponentDescription  =   function() {

                var block_id    =   $scope.getBlockId();

                if ( block_id === '__serviceProcessors') {
                    return 'System block which contains only processors. This processors will be considered on any active step process phase.';
                }

                if ( block_id === '__sessionStart') {
                    return 'System block that executes only when the new session has started. If you leave it empty, the first regular step will be used.';
                }

                if ( block_id === '__sessionEnd') {
                    return 'This step is called when session ends. You can not output anything here, but you might do cleanup or statistics here.';
                }

                if ( block_id === '__mediaControls') {
                    return 'Serves for handling media playing requests (they are sessionless)';
                }

                return $scope.definition.description;
            };

            $scope.checkComponentHelp = function() {
                if ( $scope.help !== null) {
                    return true;
                }
            };

            $scope.displayEditor    =   function() {
                return !!$scope.component && Object.keys( $scope.component).length > 0;
            };

            $scope.closeEditor      =   function() {
                propertiesContext.setSelectedComponent( null );
            };

            $scope.removeComponent  =   function()
            {
                propertiesContext.removeComponent();
                propertiesContext.setSelectedComponent( null, null);
            };

            $scope.isSystemBlock    =   function()
            {
                return !!$scope.component.properties.block_id && _isSystem( $scope.component.properties.block_id);
            };

            $scope.isObject         =   function( val) {
                return ( val !== null) && ( !Array.isArray( val)) && ( val instanceof Object);
            };

            $scope.removeUtterance  =   function( i)
            {
                $scope.component.properties.utterances.splice( i, 1);
            };

            $scope.addUtterance     =   function()
            {
                if ( !$scope.component.properties.utterances) {
                    $scope.component.properties.utterances  =   [];
                }
                $scope.component.properties.utterances.push( "New utterance");
            };

            $scope.addOkSpecificUtterance   =   function( name)
            {
                if ( !$scope.component.properties.ok_specific[name].properties.utterances) {
                    $scope.component.properties.ok_specific[name].properties.utterances =   [];
                }

                $scope.component.properties.ok_specific[name].properties.utterances.push( "New utterance");
            };

            $scope.removeOkSpecificUtterance    =   function( name, i)
            {
                $scope.component.properties.ok_specific[name].properties.utterances.splice( i, 1);
            };

            $scope.maybeInt                     =   function( value)
            {
                var ret =   value * 1;

                if ( isNaN( ret))
                    return value;

                return ret;
            };

            $scope.$watch( 'service.blocks', _setupBlockIds, true);

            $scope.$watch( 'component.properties._component_id', function () {
                $scope.help = null;
                $scope.tabIndex = { active: "b" };
                _getComponentHelp($scope.component.class);
            }, true);

            $scope.$watch( 'component', function (newVal) {
                if ( !newVal) {
                    return;
                }

                if (!$scope.component.properties) {
                    $log.warn( 'propertiesEditor block quickfix');
                    return;
                }

                _setupParamBuffer();

                // TODO: this should be handled in property editors themself
                angular.forEach( $scope.definition.component_properties, function( definition, key) {
                    // $log.log( 'propertiesEditor $watch.component each %o definition %o', key, definition);

                    if ( definition.editor_type == 'service_components') {
                        return;
                    }

                    if ( key.indexOf( '_') === 0) {
                        return;
                    }

                    if ( !$scope.component.properties[key]) {
                        return;
                    }

                    if ( key === 'ok_specific' || key === 'nok_specific') {
                        return;
                    }

                    switch ( definition.valueType)
                    {
                        case 'string':
                            if ( !!definition.editor_properties.multiple) {
                                $scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'string');
                            } else {
                                $scope.component.properties[key]    =   "" + $scope.component.properties[key];
                            }

                            break;
                        case 'boolean':
                            $scope.component.properties[key]    =   _castToBool( $scope.component.properties[key]);
                            break;
                        case 'array':
                            $scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'other');
                            break;
                        case 'int':
                            if ( !!definition.editor_properties.multiple) {
                                $scope.component.properties[key]    =   _asArray( $scope.component.properties[key], 'number');
                            } else {
                                $scope.component.properties[key]    =   parseInt( $scope.component.properties[key], 10);
                            }
                            break;
                        case 'object':
                            break;
                        default:
                            throw new Error( 'Unknown value type [' +
                                    $scope.definition.component_properties[key].valueType + '] for ['+key+'] and value ['+ $scope.component.properties[key] +']');
                    }
                });
            }, true);

            function _setupBlockIds()
            {
                $scope.processSubroutines   =   $scope.service.fragments.filter( function( fragment) {
                    return fragment.class === '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment';
                }).map( function( fragment) {
                    return { id : fragment.properties.fragment_id, name : _fixName( fragment.properties.fragment_id, fragment.properties.name)};
                });

                $scope.readSubroutines  =   $scope.service.fragments.filter( function( fragment) {
                    return fragment.class === '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment';
                }).map( function( fragment) {
                    return { id : fragment.properties.fragment_id, name : _fixName( fragment.properties.fragment_id, fragment.properties.name)};
                });

                $scope.userBlocks   =   $scope.service.blocks.filter( function( block) {
                    return block.properties.block_id.indexOf('__') !== 0;
                }).map( function( block) {
                    return { id : block.properties.block_id, name : _fixName( block.properties.block_id, block.properties.name)};
                });
            }

            function _fixName( id, name) {
                if ( name) {
                    return name;
                }
                return 'ID: ' + id;
            }

            function _setupParamBuffer()
            {
                if ( watchers.length > 0) {
                    angular.forEach( watchers, function( watcher) { watcher(); });
                }

                watchers    =   [];

                $scope.paramBuffer  =   {};

                for ( var key in $scope.definition.component_properties)
                {
                    if ( $scope.definition.component_properties[key].editor_type !== 'params') {
                        continue;
                    }

                    // TODO: this is a quickfix, needs to be handled properly.
                    if ( $scope.definition.component_properties[key].valueType !== 'array') {
                        continue;
                    }

                    var id  =   _keyToIdentifier( key);

                    $scope.paramBuffer[id] =   [];

                    for ( var prop in $scope.component.properties[key])
                    {
                        $scope.paramBuffer[id].push( {
                            'key': prop,
                            'value': $scope.component.properties[key][prop]
                        });
                    }
                }

                $scope.keyToIdentifier  =   _keyToIdentifier;
                $scope.identifierToKey  =   _identifierToKey;

                $scope.removeParamPair  =   function( id, i)
                {
                    $scope.paramBuffer[id].splice( i, 1);
                };

                $scope.addParamPair     =   function( id)
                {
                    var new_idx =   $scope.paramBuffer[id].length;

                    $scope.paramBuffer[id].push( {
                        'key': 'new_value_' + new_idx,
                        'value': 'temp_value'
                    })
                };

                var i   =   -1;

                // TODO: this is really suboptimal, but it works. Fix later.
                for ( var key in $scope.paramBuffer)
                {
                    watchers[++i]   =   $scope.$watch( 'paramBuffer.'+key, function ( newVal) {
                        for ( var id in $scope.paramBuffer)
                        {
                            var prop_name   =   _identifierToKey( id);
                            var new_props   =   {};

                            for ( var i in $scope.paramBuffer[id])
                            {
                                var pair    =   $scope.paramBuffer[id][i];

                                var new_key =   _cleanKey( pair.key);

                                new_props[new_key] =   pair.value;
                            }

                            $scope.component.properties[prop_name]  =   new_props;
                        }
                    }, true);
                }
            }

            // UTIL
            function _cleanKey( key)
            {
                if ( key === '') {
                    return 'temp';
                }

                // var cleaned  =   key.toLowerCase();

                return key.replace( /\s+\./g, '_');
            }

            function _isSystem( blockId) {
                return blockId.indexOf( '__') >= 0;
            }

            function _isRead( blockId) {
                return blockId.indexOf( '_read_') >= 0;
            }

            function _castToBool( value) {
                if ( value === 'false')
                    return false;

                if ( value === 'true')
                    return true;

                return !!value;
            }

            function _asArray( value, prevType) {
                $log.log( 'propertiesEditor _asArray value', value, 'prevType', prevType);

                if ( !prevType) {
                    throw new Error( 'Expected a type to work with, got ' + prevType);
                }

                if ( !value) {
                    return [];
                }

                if ( Array.isArray( value)) { // Already an array, cast values just to be sure
                    switch ( prevType)
                    {
                        case 'other':
                        case 'string':
                            return value
                                .map( function( val) { return val.split( ',').map( function( piece) { return ("" + piece).trim(); }); })
                                .reduce( function( a, b) { return a.concat( b); }, []);
                        default:
                            throw new TypeError( 'Unsupported type [' + prevType + ']');
                    }
                }

                switch ( prevType)
                {
                    case 'string':
                        $log.log( 'propertiesEditor _asArray prevType is string');
                        var splitArray  =   value.split( ',').map( function( s) { return ("" + s).trim(); });

                        $log.log( 'propertiesEditor _asArray returning', splitArray);

                        return splitArray;
                    case 'number':
                        var numbers     =   value.split( /\s,/g).map( function( n) { return parseInt( n, 10) });

                        $log.log( 'propertiesEditor _asArray returning', numbers);

                        return numbers;
                    case 'other': // TODO: temporary
                        return value;
                    default:
                        throw new Error( 'Unsupported type [' + prevType + ']');
                }

                // return value;
            }

            function _getComponentHelp(componentClass)
            {
                ConvoworksApi.getComponentDefinition($scope.service['service_id'], componentClass).then(function (definition) {
                    if ($scope.help === null && definition.component_properties._help) {
                        if (definition.component_properties._help.type === 'file') {
                            ConvoworksApi.getPackageComponentHelp($scope.component.namespace, definition.component_properties._help.filename).then(function (data) {
                                $scope.help = data;
                            }, function (reason) {
                                $log.debug('propertiesEditor getComponentHelp() reason', reason);
                            });
                        } else if (definition.component_properties._help.type === 'html') {
                            $scope.help = definition.component_properties._help.template;
                        }
                    }
                }, function(reason) {
                    $log.error('component got reason', reason)
                });
            }


            // PARAMS UTIL
            function _keyToIdentifier( key)
            {
                return '$$_'+key+'_pbuffer';
            }

            function _identifierToKey( id)
            {
                var regex   =   /\$\$_(\w+)_pbuffer/g;

                var matches =   regex.exec( id);

                return matches[1];
            }
        }
    }
};


import template from './intent-utterance-editor.tmpl.html';

export default function intentUtteranceEditor( $log) {
    return {
        restrict: 'E',
        require: '^propertiesContext',
        template: template,
        scope: {
            component: '=',
            propertyDefinition: '=',
            key: '=',
            service: '='
        },
        link: function ( $scope, $element, $attributes, propertiesContext) {
            $log.debug( 'intentUtteranceEditor link');
            $scope.value    =   JSON.stringify( $scope.component.properties[$scope.key], null, 2);
            $scope.error    =   false;
            
            $scope.$watch( 'value', function ( value) {
                try {
                    $scope.component.properties[$scope.key] =   JSON.parse( value);
                    // $log.debug( 'intentUtteranceEditor changed value for key', $scope.key);
                    $scope.error    =   false;
                } catch ( err) {
                    $scope.error    =   true;
                }
            });
            
            $scope.$watch( function () {
                // $log.debug( 'intentUtteranceEditor component value changed for key', $scope.key);
                return $scope.component.properties[$scope.key];
            }, function ( value) {
                $scope.value    =   JSON.stringify( value, null, 2);
                $scope.error    =   false;
            });
        }
    }
};
import angular from 'angular';

import propertiesEditor from './properties-editor.directive';

import convoIntentEditor from './convo-intent-editor.directive';
import intentUtteranceEditor from './intent-utterance-editor.directive';
import systemIntentEditor from './system-intent-editor.directive';

export default angular
  .module('convo.editor.props', [])
  .directive('propertiesEditor', propertiesEditor)
  .directive('convoIntentEditor', convoIntentEditor)
  .directive('intentUtteranceEditor', intentUtteranceEditor)
  .directive('systemIntentEditor', systemIntentEditor)
  .name;


import template from './convo-intent-editor.tmpl.html';

export default function convoIntentEditor( $log) {
    return {
        restrict: 'E',
        require: '^propertiesContext',
        template: template,
        scope: {
            component: '=',
            propertyDefinition: '=',
            key: '=',
            service: '='
        },
        link: function ( $scope, $element, $attributes, propertiesContext) {
            $log.debug( 'convoIntentEditor link');
            $scope.error        =   false;
            $scope.intents      =   propertiesContext.getConvoIntents();
            $scope.slotPreviews =   {};
            
            $log.debug( 'convoIntentEditor $scope.intents', $scope.intents, $scope.service);

            $scope.$watch(function() {
                return $scope.component.properties[$scope.key];
            }, function (val) {
                $log.log('convoIntentEditor selected intent changed', val);
                $scope.slotPreviews = {};

                if (val)
                {
                    var intent = $scope.intents.filter(function(i) {
                        return i.name === val;
                    })[0];

                    $log.log('convoIntentEditor $watch got matched intent', intent);

                    if (intent.utterances)
                    {
                        intent.utterances
                            .map(function (utterance) {
                                // $log.log('convoIntentEditor mapping utterance models', utterance.model);
                                return utterance.model;
                            })
                            .flat()
                            .filter(function(model) {
                                // $log.log('convoIntentEditor filtering models with types', model);
                                return model.hasOwnProperty('type');
                            })
                            .map(function(model) {
                                // $log.log('convoIntentEditor mapping model types and values', model);
                                var slotValue = model['slot_value'] || model.type.replace('@', '');
                                var slotType = model.type;

                                if (!$scope.slotPreviews[slotValue]) {
                                    $scope.slotPreviews[slotValue] = slotType;
                                }
                            });
                    }
                }
            });
        }
    }
};

import template from './preview-variables-editor.tmpl.html';

export default function previewVariablesEditor( $log)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function( $scope) {
            // QUICKFIX
            if ( !$scope.service.preview_variables) {
                $scope.service.preview_variables    =   {};
            }

            _init();

            $scope.addPreviewVariablesPair     =   function()
            {
                var current_greatest_index  =   $scope.preview_variables_buffer.length - 1 < 0? 0 : $scope.preview_variables_buffer.length - 1;

                var new_pair    =   { 'key': 'tmp_key_' + current_greatest_index, 'value': 'tmp_value' };

                $scope.preview_variables_buffer.push( new_pair);
            };

            $scope.removePreviewVariablesPair  =   function( i)
            {
                $scope.preview_variables_buffer.splice( i, 1);
            };

            // INIT
            function _init()
            {
                _setupVariablesBuffer();
                _setupServiceWatch();
                _setupBufferWatch();
            }

            // PRIVATE
            function _setupVariablesBuffer()
            {
                $scope.preview_variables_buffer =   [];

                for ( var key in $scope.service.preview_variables) {
                    $scope.preview_variables_buffer.push( { 'key': key, 'value': $scope.service.preview_variables[key] });
                }

                $log.log( 'previewVariablesEditor _setupVariablesBuffer() done, buffer', $scope.preview_variables_buffer);
            }

            function _setupServiceWatch()
            {
                $scope.$watch('service.preview_variables', function() {
                    _setupVariablesBuffer();
                }, true);
            }

            function _setupBufferWatch()
            {
                $scope.$watch( 'preview_variables_buffer', function () {
                    // QUICKFIX
                    if ( !Object.keys( $scope.service.preview_variables).length) {
                        $scope.service.preview_variables    =   [];
                    } else {
                        $scope.service.preview_variables    =   {};
                    }

                    for ( var i in $scope.preview_variables_buffer) {
                        var pair        =   $scope.preview_variables_buffer[i];
                        var safe_key    =   _sanitizeKey( pair.key);

                        $scope.service.preview_variables[safe_key]  =   pair.value;
                    }
                }, true);
            }
        },
        link: function( $scope, $element, $attributes) {}
    }
}

function _sanitizeKey( key)
{
    return key.replace( /\s{2,}\.-/, '_');
}

import template from './preview-panel.tmpl.html';

export default function previewPanel($log, ConvoworksApi, AlertService) {
    return {
        restrict: 'E',
        scope: {
            service: '='
        },
        require: '^propertiesContext',
        template: template,
        link: function ($scope, $element, $attributes) {
            $log.log('previewPanel link');

            $scope.ready = false;
            $scope.preview = {};

            $scope.generateText = function ( text) {
                text = "<speak><p>" + text + "</p></speak>";

                _copyToClipboard(text);
                AlertService.addInfo("Copied [" + text + "]" + " to clipboard.");
            };

            _init();

            $scope.getUserMessageGroups = function(messages)
            {
                var found = [];
                var groups = [];

                for (var i in messages)
                {
                    if (!found.includes(messages[i].intent))
                    {
                        found.push(messages[i].intent);
                        groups.push({
                            intent: messages[i].intent,
                            text: messages.filter(function (msg) {
                                return msg.intent === messages[i].intent;
                            }).map(function (msg) { return msg.text })
                        });
                    }
                }

                return groups;
            }

            function _init() {
                ConvoworksApi.getServicePreview($scope.service.service_id).then(function (preview) {
                    $scope.preview = preview;
                    $scope.ready = true;
                }, function (reason) {
                    $log.error('previewPanel could not get service preview, reason', reason);
                });
            }

            function _copyToClipboard(text) {
                // Create new element
                var el = document.createElement('textarea');
                // Set value (string to be copied)
                el.value = text;
                // Set non-editable to avoid focus and move outside of view
                el.setAttribute('readonly', '');
                el.style = {position: 'absolute', left: '-9999px'};
                document.body.appendChild(el);
                // Select text inside element
                el.select();
                // Copy text to clipboard
                document.execCommand('copy');
                // Remove temporary element
                document.body.removeChild(el);
            }
        }
    }
};
import angular from 'angular';

import previewPanel from './preview-panel.directive';
import previewVariablesEditor from './preview-variables-editor.directive';

export default angular
  .module('convo.editor.preview', [])
  .directive('previewPanel', previewPanel)
  .directive('previewVariablesEditor', previewVariablesEditor)
  .name;


import template from './intent-editor.tmpl.html';

export default function intentEditor( $log, $rootScope, $window)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        link: function( $scope, $element, $attributes) {
            $log.debug( 'intentEditor link');
            $scope.value    =   JSON.stringify( $scope.service.intents, null, 2);
            $scope.error    =   false;

            var open = [];

            $scope.selectIntent = function(index) {
                if (!open[index]) {
                    open[index] = true;
                    return;
                }

                open[index] = !open[index];
            }

            $scope.isIntentSelected = function(index) {
                return open[index];
            }

            $scope.deleteIntent = function(index) {
                var intentName = $scope.service.intents[index].name;

                if ($window.confirm("Are you sure you want to delete " + intentName + "?")) {
                    $scope.service.intents.splice(index, 1);
                }
            }

            $scope.addIntent = function() {
                var retindex = $scope.service.intents.length;
                $scope.service.intents.push({
                    "name": "NewIntent",
                    "type": "custom",
                    "utterances": [
                        {
                            "raw": "",
                            "model": [
                                {
                                    "text": ""
                                }
                            ]
                        }
                    ]
                });

                return retindex;
            }

            $scope.$on('JsonError', function(event, args) {
                $scope.error = args;
            });

            $scope.$watch( 'value', function ( value) {
                try {
                    $scope.service.intents  =   JSON.parse( value);

                    for (var i in $scope.service.intents) {
                        if (!$scope.service.intents[i].name ||
                            $scope.service.intents[i].name == "") {
                            $scope.service.intents[i].name = "NamelessIntent";
                        }
                    }

                    $scope.error    =   false;
                } catch ( err) {
                    $scope.error    =   true;
                }
            });

            $scope.$watch( function () {
                // $log.debug( 'intentEditor component value changed');
                return $scope.service.intents;
            }, function ( value) {
                $scope.value    =   JSON.stringify( $scope.service.intents, null, 2);
                $scope.error    =   false;
            });
        }
    }
};

import angular from 'angular';

import entityEditor from './entity-editor.directive';
import intentEditor from './intent-editor.directive';

export default angular
  .module('convo.editor.intents', [])
  .directive('entityEditor', entityEditor)
  .directive('intentEditor', intentEditor)
  .name;


import template from './entity-editor.tmpl.html';

export default function entityEditor( $log, $window)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        link: function( $scope, $element, $attributes) {
            $log.debug( 'entityEditor link');
            $scope.value    =   JSON.stringify( $scope.service.entities, null, 2);
            $scope.error    =   false;
            
            var open = [];

            $scope.selectEntity = function(index) {
                if (!open[index]) {
                    open[index] = true;
                    return;
                }
                
                open[index] = !open[index];
            }

            $scope.isEntitySelected = function(index) {
                return open[index];
            }
            
            $scope.deleteEntity = function(index) {
                var entityName = $scope.service.entities[index].name;
                
                if ($window.confirm("Are you sure you want to delete " + entityName + "?")) {
                    selected = null;
                    $scope.service.entities.splice(index, 1);
                }
            }

            $scope.addEntity = function() {
                var retindex = $scope.service.entities.length;
                $scope.service.entities.push({
                    "name": "NewEntity",
                    "values": [
                        {
                            "value": "",
                            "synonyms" : [""]
                        }
                    ]
                });

                return retindex;
            }

            $scope.$on('JsonError', function(event, args) {
                $scope.error = args;
            })

            $scope.$watch( 'value', function ( value) {
                try {
                    $scope.service.entities =   JSON.parse( value);
                    for (var i in $scope.service.entities ||
                        $scope.service.entities[i].name == "") {
                        if (!$scope.service.entities[i].name) {
                            $scope.service.entities[i].name = "NamelessEntity";
                        }
                    }
                    $scope.error    =   false;
                } catch ( err) {
                    $scope.error    =   true;
                }
            });
            
            $scope.$watch( function () {
                // $log.debug( 'entityEditor component value changed');
                return $scope.service.entities;
            }, function ( value) {
                $scope.value    =   JSON.stringify( $scope.service.entities, null, 2);
                $scope.error    =   false;
            });
        }
    }
}

import template from './versions-editor.tmpl.html';

export default function versionsEditor( $log, $rootScope, ConvoworksApi, CONVO_ADMIN_API_BASE_URL)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        require: '^propertiesContext',
        template: template,
        controller: function( $scope) {

        },
        link: function( $scope, $element, $attributes, propertiesContext) {

            $log.log( 'versionsEditor link');
            
            $scope.versions =   [];
            
            $rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
                _load();
            });
            
            _load();
            
            function _load()
            {
                ConvoworksApi.getServiceVersions( $scope.service.service_id).then( function ( versions) {
                    $scope.versions =   versions;
                }, function ( reason) {
                    $log.log( 'versionsEditor getServiceVersions reason', reason);
                });                 
            }
            
            
        }
    }
};

import template from './releases-editor.tmpl.html';

export default function releasesEditor( $log, $q, $rootScope, ConvoworksApi, CONVO_PUBLIC_API_BASE_URL)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        require: '^propertiesContext',
        template: template,
        controller: function( $scope) {

        },
        link: function( $scope, $element, $attributes, propertiesContext) {
            $log.log( 'releasesEditor link');

            $scope.releases     =   [];
            var PROMOTE_OPTIONS =   {};
            var IMPORT_WORKFLOW_OPTIONS =   {};
            var SUBMIT_OPTIONS  =   {};

            $scope.getReleaseUrl    =   function ( release) {

            //  http://convo-proto.lokal.com/rest_public/convo/v1/service-run/webchat/a/tribes-ascend

                return CONVO_PUBLIC_API_BASE_URL + '/service-run/' + release['platform_id'] + '/'
                + release['alias'] + '/' + release['service_id'];
            };


            $scope.getPromoteOptions    =   function ( release) {
                return PROMOTE_OPTIONS[ _getReleaseKey( release)];
            };


            $scope.promoteRelease   =   function ( row, type, stage) {
                $log.log( 'releasesEditor promoteRelease type', type, 'row', row);
                ConvoworksApi.promoteRelease(
                        $scope.service.service_id,
                        row['release_id'],
                        type,
                        stage).then( function () {
                            _load();
                            $rootScope.$broadcast('ServiceReleasesUpdated');
                }, function ( reason) {
                    $log.log( 'releasesEditor promoteRelease reason', reason);
                });
            };

            $scope.getSubmitOptions =   function ( release) {
                return SUBMIT_OPTIONS[ _getReleaseKey( release)];
            };

            $scope.submitRelease    =   function ( row, type, stage) {
                $log.log( 'releasesEditor submitRelease type', type, 'row', row);
                ConvoworksApi.createRelease(
                        $scope.service.service_id,
                        row['platform_id'],
                        type,
                        stage).then( function () {
                            _load();
                            $rootScope.$broadcast('ServiceReleasesUpdated');
                }, function ( reason) {
                    $log.log( 'releasesEditor submitRelease reason', reason);
                });
            };


            $scope.getImportWorkflow    =   function ( release) {
                return IMPORT_WORKFLOW_OPTIONS[ _getReleaseKey( release)];
            };

            $scope.importWorkflowRelease    =   function ( row, releaseId) {
                $log.log( 'releasesEditor importWorkflowRelease releaseId', releaseId);
                ConvoworksApi.importWorkflowIntoRelease(
                        $scope.service.service_id,
                        releaseId,
                        row['version_id']).then( function () {
                            _load();
                            $rootScope.$broadcast('ServiceReleasesUpdated');
                }, function ( reason) {
                    $log.log( 'releasesEditor importWorkflowRelease reason', reason);
                });
            };

            function get_release( platformId, type, stage)
            {
                for ( var i=0; i<$scope.releases.length; i++) {
                    var release =   $scope.releases[i];
                    if ( release['type'] === type && release['stage'] === stage && release['platform_id'] === platformId) {
                        $log.log( 'releasesEditor get_release found platformId', platformId, 'type', type, 'stage', stage, release['release_id']);
                        return release['release_id'];
                    }
                }

                $log.log( 'releasesEditor get_release not found platformId', platformId, 'type', type, 'stage', stage);
                return null;
            }

            $rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
                _load();
            });

            _load();

            function _load() {
                ConvoworksApi.getServiceReleases( $scope.service.service_id).then( function ( releases) {
                    $log.log( 'releasesEditor releases loaded');
                    $scope.releases =   releases;
                    _initOptions();
                }, function ( reason) {
                    $log.log( 'releasesEditor getServiceReleases reason', reason);
                })
            }

            function _initOptions()
            {
                $log.log( 'releasesEditor _initOptions');

                PROMOTE_OPTIONS =   {};
                IMPORT_WORKFLOW_OPTIONS =   {};
                SUBMIT_OPTIONS  =   {};

                var releases    =   $scope.getDevelopment();
                for ( var i=0; i<releases.length; i++) {
                    var release =   releases[i];
                    var key     =   _getReleaseKey( release);

                    var options =   _getSubmitOptions( release);
                    SUBMIT_OPTIONS[key] =   options;

                    var options =   _getWorkflowOptions( release);
                    IMPORT_WORKFLOW_OPTIONS[key]    =   options;
                }

                var releases    =   $scope.getTest();
                for ( var i=0; i<releases.length; i++) {
                    var release =   releases[i];
                    var key     =   _getReleaseKey( release);

                    var options =   _getPromoteOptions( release);
                    PROMOTE_OPTIONS[key]    =   options;

                    var options =   _getWorkflowOptions( release);
                    IMPORT_WORKFLOW_OPTIONS[key]    =   options;
                }

                var releases    =   $scope.getProduction();
                for ( var i=0; i<releases.length; i++) {
                    var release =   releases[i];
                    var key     =   _getReleaseKey( release);

                    var options =   _getPromoteOptions( release);
                    PROMOTE_OPTIONS[key]    =   options;
                }
            }

            function _getReleaseKey( release) {
                return release['release_id'] ? release['release_id'] : release['platform_id'] + '_' + release['type'];
            }

            function _getSubmitOptions( release) {
                var options =   [];

                if ( release['platform_id'] === 'amazon') {
                    options.push( {
                        title : 'Submit to review',
                        type : 'production',
                        stage : 'review',
                    });
                } else if ( release['platform_id'] === 'dialogflow') {
                    options.push( {
                        title : 'Submit to review',
                        type : 'production',
                        stage : 'review',
                    });
                    options.push( {
                        title : 'Submit to alpha test',
                        type : 'test',
                        stage : 'alpha',
                    });
                } else if ( release['platform_id'] === 'convo_chat') {
                    var release_id  =   get_release( 'convo_chat', 'production', 'release');
                    if ( !release_id) {
                        options.push( {
                            title : 'Submit as release',
                            type : 'production',
                            stage : 'release',
                        });
                    }
                } else if (release['platform_id'] === 'facebook_messenger') {
                    var release_id  =   get_release( 'facebook_messenger', 'production', 'release');
                    if ( !release_id) {
                        options.push( {
                            title : 'Submit as release',
                            type : 'production',
                            stage : 'release',
                        });
                    }
                } else if (release['platform_id'] === 'viber') {
                    var release_id  =   get_release( 'viber', 'production', 'release');
                    if ( !release_id) {
                        options.push( {
                            title : 'Submit as release',
                            type : 'production',
                            stage : 'release',
                        });
                    }
                }

                return options;
            }

            function _getPromoteOptions( release) {
                var options =   [];
                if ( release['platform_id'] === 'amazon') {
                    if ( release['stage'] === 'review') {
                        options.push( {
                            title : 'Promote to release',
                            type : 'production',
                            stage : 'release'
                        });
                    }
                } else if ( release['platform_id'] === 'dialogflow') {
                    if ( release['type'] === 'production' && release['stage'] === 'review') {
                        options.push( {
                            title : 'Promote to release',
                            type : 'production',
                            stage : 'release'
                        });
                    } else if ( release['type'] === 'test') {
                        options.push( {
                            title : 'Promote to review',
                            type : 'production',
                            stage : 'review'
                        });
                    }
                }
                return options;
            }

            function _getWorkflowOptions( release) {
                var options =   [];

                if ( release['platform_id'] === 'amazon') {
                    var release_id  =   get_release( 'amazon', 'production', 'release');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to release',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }

                    var release_id  =   get_release( 'amazon', 'production', 'review');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to review',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                } else if ( release['platform_id'] === 'dialogflow') {
                    var release_id  =   get_release( 'dialogflow', 'production', 'release');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to release',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }

                    var release_id  =   get_release( 'dialogflow', 'production', 'review');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to review',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                    var release_id  =   get_release( 'dialogflow', 'test', 'alpha');
                    if ( release_id && release['type'] !== 'test') {
                        options.push( {
                            title : 'Import to alpha',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                } else if ( release['platform_id'] === 'convo_chat') {
                    var release_id  =   get_release( 'convo_chat', 'production', 'release');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to release',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                } else if ( release['platform_id'] === 'facebook_messenger') {
                    var release_id  =   get_release( 'facebook_messenger', 'production', 'release');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to release',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                } else if ( release['platform_id'] === 'viber') {
                    var release_id  =   get_release( 'viber', 'production', 'release');
                    if ( release_id) {
                        options.push( {
                            title : 'Import to release',
                            version_id : release['version_id'],
                            release_id : release_id
                        });
                    }
                }
                return options;
            };



            // GRID DATA
            $scope.getProduction    =   function () {
                var releases = $scope.releases.filter( function( release) {
                    return release.type === 'production';
                });
                return releases;
            };

            $scope.getTest          =   function () {
                var releases = $scope.releases.filter( function( release) {
                  return release.type   === 'test';
                });
                return releases;
            };

            $scope.getDevelopment   =   function () {
                var releases = $scope.releases.filter( function( release) {
                  return release.type   === 'develop';
                });
                return releases;
            };
        }
    }
};


import template from './misc-panel.tmpl.html';

export default function miscPanel( $log, ConvoworksApi, CONVO_ADMIN_API_BASE_URL)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        require: '^propertiesContext',
        template: template,
        controller: function( $scope) {

        },
        link: function( $scope, $element, $attributes, propertiesContext) {

            $scope.uploadOptions    =   {
                keep_vars : true,
                keep_configs : true,
            };

            $scope.uploadSubmitted  =   function( file)
            {
                $log.debug( 'miscPanel uploadSubmitted() file', file, '$scope.uploadOptions', $scope.uploadOptions);
                ConvoworksApi.uploadServiceData( 
                                $scope.service.service_id, 
                                file, 
                                $scope.uploadOptions.keep_vars, 
                                $scope.uploadOptions.keep_configs).then( function () {
                    $log.debug( 'miscPanel uploadSubmitted() OK');
                    propertiesContext.reloadService();
                }, function ( reason) {
                    $log.debug( 'miscPanel uploadSubmitted() reason', reason);
                });
            }
            
            $scope.download  =   function()
            {
                $log.debug( 'miscPanel download()');
                var url =   CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/export/' + $scope.service.service_id;
                $log.debug( 'miscPanel redirecting to ['+url+']');
                document.location.href  =   url;
            }
            
            $scope.downloadPlatform  =   function( platformId)
            {
                $log.debug( 'miscPanel downloadPlatform()', platformId);
                var url =   CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/export/' + $scope.service.service_id + '/' + platformId;
                $log.debug( 'miscPanel redirecting to ['+url+']');
                document.location.href  =   url;
            }
            
        }
    }
};
import angular from 'angular';

import configAmazonEditor from './config-amazon-editor.directive';
import configConvoChatEditor from './config-convo-chat-editor.directive';
import configDialogflowEditor from './config-dialogflow-editor.directive';
import configMessengerEditor from './config-messenger-editor.directive';
import configViberEditor from './config-viber-editor.directive';
import configServiceMetaEditor from './config-service-meta-editor.directive';
import miscPanel from './misc-panel.directive';
import releasesEditor from './releases-editor.directive';
import versionsEditor from './versions-editor.directive';

export default angular
  .module('convo.editor.config', [])
  .directive('configAmazonEditor', configAmazonEditor)
  .directive('configConvoChatEditor', configConvoChatEditor)
  .directive('configDialogflowEditor', configDialogflowEditor)
  .directive('configMessengerEditor', configMessengerEditor)
  .directive('configViberEditor', configViberEditor)
  .directive('configServiceMetaEditor', configServiceMetaEditor)
  .directive('miscPanel', miscPanel)
  .directive('releasesEditor', releasesEditor)
  .directive('versionsEditor', versionsEditor)
  .name;


import template from './config-viber-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_VIBER_WEBHOOK_EVENT_TYPES) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template,
        controller ($scope) {

        },
        link ($scope, $element, $attributes) {

            let user    =   null;

            LoginService.getUser().then( function ( u) {
                user = u;
            });

            $scope.config = {
                delegateNlp: null,
                account_id: null,
                auth_token: null,
                event_types: []
            };

            $scope.event_types = PROTO_VIBER_WEBHOOK_EVENT_TYPES;

            let configBak   =   angular.copy( $scope.config);
            let is_new      =   true;
            let is_error    =   false;
            let has_started =   false;


            _load();

            $scope.getIntentNlps    = function () {
                return ['dialogflow'];
            }

            $scope.isNew    = function () {
                return is_new;
            }

            $scope.hideAll  = function () {
                return !has_started && is_new;
            }

            $scope.start    = function () {
                has_started = true;
            }

            $scope.cancel = function () {
                has_started = false;
            }

          $scope.getConfigUrl = function() {
            return 'https://partners.viber.com/account/' + $scope.config.account_id + '/info'
          }

            $scope.updateConfig = function () {
                _updateSelectedWebhookEvents();
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'viber', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor create() response', response);
                        is_error    =   true;
                        throw new Error(`Can't create config for Convo. ${  response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'viber', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor update() response', response);
                        is_error    =   true;
                    });
                }
            }

            $scope.registerChange = function(webhookEvent) {
                var eventName = webhookEvent.event.name;
                var isEventEnabled = !webhookEvent.event.checked;

                if (isEventEnabled) {
                    $scope.config.event_types.push(eventName);
                } else {
                    $scope.config.event_types = _arrayRemove($scope.config.event_types, eventName);
                }
                $scope.getWebhookEvents();
            }

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                var fieldChange = !angular.equals( configBak, $scope.config);
                return fieldChange;
            }

            $scope.getWebhookEvents = function () {
                // update array with values from config
                if ($scope.config.event_types && $scope.config.event_types.length > 0) {
                    for (var i = 0; i < $scope.event_types.length; i++) {
                        if ($scope.config.event_types.includes($scope.event_types[i].name)) {
                            $scope.event_types[i].checked = true;
                        }
                    }
                }
                console.log("Webhook Event types: " + $scope.event_types);
                return $scope.event_types;
            };

            function _updateSelectedWebhookEvents() {
                $scope.config.event_types = [];
                for (var i = 0; i < $scope.event_types.length; i++) {
                    if ($scope.event_types[i].checked) {
                        var webhookEventName = $scope.event_types[i].name;
                        $scope.config.event_types.push(webhookEventName);
                    }
                }
            }

            function _arrayRemove(arr, value) {
                 return arr.filter(function(ele) {
                     return ele !== value;
                 });
            }

            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'viber').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configConvoChatEditor loadPlatformConfig() response', response);

                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;
                    }
                    is_error    =   true;
                });
            }
        }
    }
}


import template from './config-service-meta-editor.tmpl.html';

export default function configServiceMetaEditor($log, LoginService, ConvoworksApi)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        link: function($scope, $element, $attributes) {
            $log.log('configServiceMetaEditor linked');

            var user = null;

            LoginService.getUser().then(function (u) {
                user = u;
            });

            $scope.config = {
                name: '',
                description: '',
                owner: '',
                admins: ['']
            };

            _load();

            var configBak = angular.copy($scope.config);
            var is_error =  false;

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                return !angular.equals(configBak, $scope.config);
            }

            $scope.updateConfig = function() {
                ConvoworksApi.updateServiceMeta($scope.service.service_id, $scope.config).then(function (res) {
                    var meta = res.data;
                    $log.log('configServiceMetaEditor updateConfig() got new meta', meta);

                    $scope.config = {
                        name: meta['name'] || '',
                        description: meta['description'] || '',
                        owner: meta['owner'] || '',
                        admins: meta['admins'] || ['']
                    }

                    configBak = angular.copy($scope.config);
                    is_error = false;
                }, function (reason) {
                    $log.warn('configServiceMetaEditor updateConfig failed for reason', reason);
                    is_error = true;
                    throw new Error(reason.data.message)
                });
            }

            function _load() {
                ConvoworksApi.getServiceMeta($scope.service.service_id).then(function (meta) {
                    $log.log('configServiceMetaEditor got service meta', meta);
                    $scope.config = {
                        name: meta['name'] || '',
                        description: meta['description'] || '',
                        owner: meta['owner'] || '',
                        admins: meta['admins'] || ['']
                    }

                    configBak = angular.copy($scope.config);
                    is_error = false;
                }, function (reason) {
                    $log.warn('configServiceMetaEditor getServiceMeta failed for reason', reason);
                    is_error = true;
                });
            }
        }
    }
}

import template from './config-messenger-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template,
        controller ($scope) {

        },
        link ($scope, $element, $attributes) {

            let user    =   null;

            LoginService.getUser().then( function ( u) {
                user = u;
            });

            $scope.config = {
                delegateNlp: null,
                page_id: null,
                page_access_token: null,
                app_id: null,
                app_secret: null,
                webhook_verify_token: null,
                webhook_events: []
            };

            $scope.webhook_events = PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS;

            let configBak   =   angular.copy( $scope.config);
            let is_new      =   true;
            let is_error    =   false;
            let has_started =   false;


            _load();

            $scope.getIntentNlps    = function () {
                return ['dialogflow'];
            }

            $scope.isNew    = function () {
                return is_new;
            }

            $scope.hideAll  = function () {
                return !has_started && is_new;
            }

            $scope.start    = function () {
                has_started = true;
            }

            $scope.cancel = function () {
                has_started = false;
            }

          $scope.getConfigUrl = function() {
            return 'https://developers.facebook.com/apps/' + $scope.config.app_id + '/messenger/settings/'
          }

            $scope.updateConfig = function () {
                _updateSelectedWebhookEvents();
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'facebook_messenger', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor create() response', response);
                        is_error    =   true;
                        throw new Error(`Can't create config for Convo. ${  response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'facebook_messenger', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor update() response', response);
                        is_error    =   true;
                    });
                }
            }

            $scope.registerChange = function(webhookEvent) {
                var eventName = webhookEvent.event.name;
                var isEventEnabled = !webhookEvent.event.checked;

                if (isEventEnabled) {
                    $scope.config.webhook_events.push(eventName);
                } else {
                    $scope.config.webhook_events = _arrayRemove($scope.config.webhook_events, eventName);
                }
                $scope.getWebhookEvents();
            }

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                var fieldChange = !angular.equals( configBak, $scope.config);
                return fieldChange;
            }

            $scope.getWebhookEvents = function () {
                // update array with values from config
                if ($scope.config.webhook_events && $scope.config.webhook_events.length > 0) {
                    for (var i = 0; i < $scope.webhook_events.length; i++) {
                        if ($scope.config.webhook_events.includes($scope.webhook_events[i].name)) {
                            $scope.webhook_events[i].checked = true;
                        }
                    }
                }
                return $scope.webhook_events;
            };

            function _updateSelectedWebhookEvents() {
                $scope.config.webhook_events = [];
                for (var i = 0; i < $scope.webhook_events.length; i++) {
                    if ($scope.webhook_events[i].checked) {
                        var webhookEventName = $scope.webhook_events[i].name;
                        $scope.config.webhook_events.push(webhookEventName);
                    }
                }
            }

            function _arrayRemove(arr, value) {
                 return arr.filter(function(ele) {
                     return ele !== value;
                 });
            }

            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'facebook_messenger').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configConvoChatEditor loadPlatformConfig() response', response);

                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;
                    }
                    is_error    =   true;
                });
            }
        }
    }
}


import template from './config-dialogflow-editor.tmpl.html';

export default function configDialogflowEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_DIALOGFLOW_LANGUAGES) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            template: template,
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

                var user    =   null;
                
                LoginService.getUser().then( function ( u) {
                    user = u;
                });
                
                $scope.config = {
                    mode: 'manual',
                    projectId: null,
                    serviceAccount: null,
                    name: null,
                    description: null,
                    avatar: null,
                    default_locale: 'en',
                    supported_locales: ['en']
                };

                $scope.languages = PROTO_DIALOGFLOW_LANGUAGES;

                var configBak   =   angular.copy( $scope.config);
                var is_new      =   true;
                var is_error    =   false;
                var has_started =   false;
                var logline     =   '';

                
                _load();

                var preparedUpload = null;
                var previousMediaItemId = null;

                $scope.$watch('config.default_locale', function(newDefaultLocale) {
                    if (newDefaultLocale !== undefined) {
                        $log.log('configDialogflowEditor $watch config.default_locale new value', $scope.config);
                        $scope.config.default_locale = newDefaultLocale;
                        $scope.config.supported_locales = [$scope.config.default_locale]
                    }
                });
                
                $scope.isNew    = function () {
                    return is_new;
                }
                
                $scope.hideAll  = function () {
                    return !has_started && is_new;
                }
                
                $scope.start    = function () {
                    has_started = true;
                }

                $scope.cancel = function () {
                    has_started = false;
                }

                $scope.getConfigUrl = function() {
                    return 'https://console.actions.google.com/project/' + $scope.config.projectId + '/directoryinformation/'
                }

                $scope.updateConfig = function () {
                    $log.debug('configDialogflowEditor update() $scope.config', $scope.config);

                    var maybeUpload = preparedUpload ?
                        ConvoworksApi.uploadMedia(
                            $scope.service.service_id,
                            'dialogflow.avatar',
                            preparedUpload.file) :
                        null;

                    $q.when(maybeUpload).then(function (res) {
                        if (res && res.mediaItemId) {
                            $scope.config.avatar = res.mediaItemId;
                            preparedUpload = null;
                        }

                        if (is_new) {
                            return ConvoworksApi.createServicePlatformConfig(
                                $scope.service.service_id,
                                'dialogflow',
                                $scope.config
                            ).then(function (data) {
                                configBak = angular.copy( $scope.config);
                                logline = 'configDialogflowEditor create() response';
                                is_new = false;
                                $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                            }, function (response) {
                                $log.debug('configDialogflowEditor create() response', response);
                                is_error    =   true;
                                throw new Error("Can't create config for Dialogflow. " + response.data.message)
                            });
                        }

                        logline = 'configDialogflowEditor update() response';
                        return ConvoworksApi.updateServicePlatformConfig(
                            $scope.service.service_id,
                            'dialogflow',
                            $scope.config
                        );
                    }).then(function (data) {
                        configBak = angular.copy($scope.config);
                        is_error = false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function (response) {
                        $log.debug(logline, response);
                        is_error = true;
                    });
                }

                $scope.revertConfig = function () {
                    if (preparedUpload) {
                        preparedUpload = null;
                    }

                    if (previousMediaItemId) {
                        previousMediaItemId = null;
                    }

                    $scope.config = angular.copy(configBak);
                }

                $scope.onFileUpload = function (file) {
                    $log.log('ConfigurationsEditor onFileUpload file', file);

                    preparedUpload = {
                        file: file
                    };

                    previousMediaItemId = $scope.config.avatar;
                    $scope.config.avatar = 'tmp_upload_ready';
                }

                $scope.getMedia = function(type) {
                    var mediaItemId = $scope.config[type];

                    if (!mediaItemId) {
                        return '';
                    }

                    if (mediaItemId === 'tmp_upload_ready') {
                        mediaItemId = previousMediaItemId;
                    }

//                  $log.log('ConfigurationsEditor getMedia(', type, ') mediaItemId', mediaItemId);

                    return ConvoworksApi.downloadMedia($scope.service.service_id, mediaItemId);
                }

                $scope.isConfigChanged = function () {
                    return !angular.equals( configBak, $scope.config);
                }
                
                function _load()
                {
                    ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'dialogflow').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new  =   false;
                        is_error    =   false;
                    }, function ( response) {
                        $log.debug('configDialogflowEditor loadPlatformConfig() response', response);
                        
                        if ( response.status === 404) {
                            is_new      =   true
                            is_error    =   false;
                            return;
                        }
                        is_error    =   true;
                    });
                }
            }
        }
    }

import template from './config-convo-chat-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function ($scope) {

        },
        link: function ($scope, $element, $attributes) {

            var user    =   null;
            
            LoginService.getUser().then( function ( u) {
                user = u;
            });
            
            $scope.config = {
                delegateNlp: null
            };

            var configBak   =   angular.copy( $scope.config);
            var is_new      =   true;
            var is_error    =   false;
            var has_started =   false;

            
            _load();

            $scope.getIntentNlps    = function () {
                return ['dialogflow'];
            }
            
            $scope.isNew    = function () {
                return is_new;
            }
            
            $scope.hideAll  = function () {
                return !has_started && is_new;
            }
            
            $scope.start    = function () {
                has_started = true;
            }

            $scope.cancel = function () {
                has_started = false;
            }
            
            $scope.updateConfig = function () {
                
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor create() response', response);
                        is_error    =   true;
                        throw new Error("Can't create config for Convo. " + response.data.message)
                    });                     
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor update() response', response);
                        is_error    =   true;
                    });                     
                }
            }
            
            

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }
            

            $scope.isConfigChanged = function () {
                return !angular.equals( configBak, $scope.config);
            }
            
            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo_chat').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configConvoChatEditor loadPlatformConfig() response', response);
                    
                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;    
                    }
                    is_error    =   true;
                });
            }
        }
    }
}

import template from './config-amazon-editor.tmpl.html';

export default function configAmazonEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_AMAZON_LANGUAGES, PROTO_AMAZON_ALL_ENGLISH) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function ($scope) {

        },
        link: function ($scope, $element, $attributes) {

            var user    =   null;
            
            LoginService.getUser().then( function ( u) {
                user = u;
            });
            
            $scope.config = {
                mode: 'manual',
                invocation: $scope.service.name,
                app_id: null,
                default_locale: 'en-US',
                supported_locales: ['en-US'],
                propagate_to_all_english: false,
                auto_display: false
            };

            $scope.languages = PROTO_AMAZON_LANGUAGES;

            var configBak   =   angular.copy( $scope.config);
            var is_new      =   true;
            var is_error    =   false;
            var has_started =   false;

            
            _load();

            $scope.$watch('config.auto_display', function(newVal) {
                if (newVal !== undefined) {
                    $log.log('configAmazonEditor $watch config.auto_display new value', $scope.config);
                    $scope.config.auto_display = newVal;
                }
            });

            $scope.$watch('config.propagate_to_all_english', function(isAllEnglish) {
                if (isAllEnglish !== undefined) {
                    $log.log('configAmazonEditor $watch config.propagate_to_all_english new value', $scope.config);
                    $scope.config.propagate_to_all_english = isAllEnglish;

                    if (isAllEnglish) {
                        $scope.config.supported_locales = PROTO_AMAZON_ALL_ENGLISH
                    } else {
                        $scope.config.supported_locales = [$scope.config.default_locale]
                    }
                }
            });

            $scope.$watch('config.default_locale', function(newDefaultLocale) {
                if (newDefaultLocale !== undefined) {
                    $log.log('configAmazonEditor $watch config.default_locale new value', $scope.config);
                    $scope.config.default_locale = newDefaultLocale;
                    if (!$scope.config.propagate_to_all_english) {
                        $scope.config.supported_locales = [$scope.config.default_locale]
                    }
                }
            });

            $scope.getConfigUrl = function() {
                return 'https://developer.amazon.com/alexa/console/ask/publish/alexapublishing/' + $scope.config.app_id + '/development/en_US/skill-info'
            }

            $scope.isModeValid  = function () {
                return !( $scope.config.mode === 'auto' && !user.amazon_account_linked);
            }
            
            $scope.isNew    = function () {
                return is_new;
            }
            
            $scope.hideAll  = function () {
                return !has_started && is_new;
            }
            
            $scope.start    = function () {
                has_started = true;
            }

            $scope.cancel = function () {
                has_started = false;
            }
            
            $scope.updateConfig = function () {
                $log.debug('configAmazonEditor update() $scope.config', $scope.config);
                
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configAmazonEditor create() response', response);
                        is_error    =   true;
                        throw new Error("Can't create config for Amazon. " + response.data.message)
                    });                     
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configAmazonEditor update() response', response);
                        is_error    =   true;
                    });                     
                }
            }
            
            

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }
            

            $scope.isConfigChanged = function () {
                return !angular.equals( configBak, $scope.config);
            }
            
            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'amazon').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configAmazonEditor loadPlatformConfig() response', response);
                    
                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;    
                    }
                    is_error    =   true;
                });
            }
            
            
        }
    }
}

import angular from 'angular';

import ModalInstanceCtrl from './convoworks-add-service.controller';
import ConvoworksMainController from './convoworks-main.controller';

export default angular
  .module('convo.services', ['convo.common'])
  .controller( 'ConvoworksMainController', ConvoworksMainController)
  .controller( 'ModalInstanceCtrl', ModalInstanceCtrl)
//  .service('ConvoChatApi', ConvoChatApi)
  .name;


import template from './convoworks-add-service.tmpl.html';
import ModalInstanceCtrl from './convoworks-add-service.controller';

ConvoworksMainController.$inject = [ '$log', '$scope', '$uibModal', 'ConvoworksApi'];

export default function ConvoworksMainController( $log, $scope, $uibModal, ConvoworksApi)
{
    
    $log.debug( 'ConvoworksMainController init');
    
    // API
    $scope.ready                =   false;
    $scope.availableServices    =   [];

    $scope.createService        =   function()
    {
        $uibModal.open({
            template: template,
            controller: ModalInstanceCtrl,
            size : 'md',
            resolve: { ConvoworksApi: function() { return ConvoworksApi; }}
        })
    };
    
    $scope.saveChanges          =   function()
    {
        
    };
    
    $scope.saveDisabled         =   function()
    {
        
    };
    
    $scope.revertClicked        =   function()
    {
        
    };
    
    $scope.revertDisabled       =   function()
    {
        
    };
    
    $scope.publishedOn = function(service) {
        var published = [];

        angular.forEach(service.versions, function (value, key) {
            if (!published.includes(key)) {
                published.push(_cleanKey(key));
            }
        });

        return published;
    }
    
    _init();

    // INIT
    function _init()
    {
        ConvoworksApi.getAllServices().then( function( services) {
            $scope.availableServices    =   services;
        }, function( reason) {
            $log.warn( 'ConvoworksMainController fetching all services failed because of', reason);

            throw new Error( reason.data.message);
        }).finally( function() {
            $scope.ready    =   true;
        })
    }

    function _cleanKey(key) {
        return key.split('_').map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }).join(' ');
    }
}



export default function ModalInstanceCtrl( $scope, $uibModalInstance, $location, ConvoworksApi)
{
    $scope.new_service  =   {
        "name" : "",
        "template_id" : "convo-core.blank"
    };

    $scope.templates    =   [];
    
    ConvoworksApi.getTemplates().then( function ( all) {
        $scope.templates    =   all;
    });
    
    $scope.create       =   function()
    {
        ConvoworksApi.createService( $scope.new_service.name, $scope.new_service.template_id).then( function( data) {
            var id  =   data['service_id'];

            $uibModalInstance.dismiss( 'cancel');
            $location.path( 'convoworks-editor/' + id);
        })
    };

    $scope.cancel   =   function() { $uibModalInstance.dismiss( 'cancel'); }
}


export default function propertiesContext( $log, $rootScope, ConvoworksApi, ConvoworksAddBlockService, ConvoComponentFactoryService, AlertService) {
    return {
        restrict: 'A',
        require: '^propertiesContext',
        scope: true,
        controller: function( $scope) {

            // PUBLIC API
            this.getComponentDefinitions    =   getComponentDefinitions;
            this.setComponentDefinitions    =   setComponentDefinitions;
            this.getComponentDefinition     =   getComponentDefinition;
            this.isLoaded                   =   isLoaded;
            this.getConvoIntents            =   getConvoIntents;

            this.setSelectedComponent       =   setSelectedComponent;
            this.getSelection               =   getSelection;
            this.getSelectedService         =   getSelectedService;

            this.isServiceChanged           =   isServiceChanged;
            this.revertChanges              =   revertChanges;
            this.saveChanges                =   saveChanges;

            this.getAvailablePackages       =   getAvailablePackages;

            this.findBlock                  =   findBlock;
            this.findSubroutine             =   findSubroutine;

            this.addBlock                   =   addBlock;
            this.addProcessSubroutine       =   addProcessSubroutine;
            this.addReadSubroutine          =   addReadSubroutine;
            this.removeBlock                =   removeBlock;
            this.removeSubroutine           =   removeSubroutine;

            this.removeComponent            =   removeComponent;

            this.addNewComponent            =   addNewComponent;
            this.moveComponent              =   moveComponent;

            this.reloadService              =   reloadService;


            // DEFINITION
            if ( !$scope.serviceId) {
                throw new Error( 'No serviceId in scope');
            }

            var service_id          =   $scope.serviceId;
            var ready               =   false;
            var definitions         =   [];
            var original_service    =   null;
            var available_packages  =   [];
            var selection           =   {
                component : null,
                definition : null,
                service : null,
                containerController : null
            };


            _init();

            function _init()
            {
                ConvoworksApi.getAvailablePackages().then(function(available) {
                    available_packages = available;

                    ConvoworksApi.getComponentDefinitions(service_id).then( function( defs) {
                        $log.log( 'propertiesContext controller definitions pre-loaded. Now will start.');
                        definitions     =   defs;

                        ConvoworksApi.getServiceById( service_id).then( function( service) {
                            $log.log( 'propertiesContext controller got service', service);
                            selection.service   =   service;
                            original_service    =   angular.copy( selection.service);
                            ready               =   true;
                        }, function( reason) {
                            $log.error( 'propertiesContext controller service got reason', reason);
                            throw new Error(reason.data.message);
                        });
                    }, function( reason) {
                        $log.error( 'propertiesContext controller definitions got reason', reason);
                    });
                })
            }

            this.hasClipboard       =   hasClipboard;
            this.cut        =   cut;
            this.copy       =   copy;
            this.paste      =   paste;
            this.isCut      =   isCut;

            var clipboard   =   null;

            function hasClipboard()
            {
                return !!clipboard;
            }

            function cut( container, component)
            {
                clipboard   =   {
                        is_cut : true,
                        component : component,
                        container : container,
                };
            }

            function copy( component)
            {
                clipboard   =   {
                        is_cut : false,
                        component : component,
                };
            }

            function paste( containerController, index)
            {
                if ( !clipboard) {
                    return;
                }

                if ( clipboard.is_cut) {
                    $log.log( 'propertiesContext paste cut');
                    // function moveComponent( oldContainerController, containerController, component, index)
                    moveComponent( clipboard.container, containerController, clipboard.component, index);
                    clipboard.is_cut    =   false;
                    clipboard.container =   null;
                } else {
                    $log.log( 'propertiesContext paste copy');

                    containerController.addComponent(
                            ConvoComponentFactoryService.copyComponent( getSelectedService(), clipboard.component),
                            index);
                }
            }

            function isCut( component)
            {
                return clipboard && clipboard.is_cut && clipboard.component === component;
            }

            function getConvoIntents()
            {
                var intents =   [];

                // SERVICE
                for ( var i=0; i < selection.service.intents.length; i++) {
                    intents.push( selection.service.intents[i]);
                }

                // SYSTEM
                for ( var i=0; i<definitions.length; i++) {
                    var pckg    =   definitions[i];
                    if ( !pckg.intents) {
                        continue;
                    }
                    for ( var j=0; j<pckg.intents.length; j++) {
                        intents.push( pckg.intents[j]);
                    }
                }

                return intents;
            }

            function getAvailablePackages()
            {
                return available_packages;
            }

            function getComponentDefinitions()
            {
                return definitions;
            }

            function setComponentDefinitions(defs)
            {
                $log.log('setting defs', defs);
                definitions = defs;
            }

            function getComponentDefinition(serviceId, className)
            {
                for (var i = 0; i < definitions.length; i++)
                {
                    var pckg = definitions[i];

                    for (var j = 0; j < pckg.components.length; j++)
                    {
                        var comp = pckg.components[j];

                        if (comp['type'] === className)
                        {
                            return comp;
                        }
                    }
                }
                throw new Error( 'Definition ['+className+'] not found');
            }

            function isLoaded() {
                return ready;
            }

            // SELECTION
            function setSelectedComponent( component, containerController) {
                if ( !component) {
                    selection.component     =   null;
                    selection.definition    =   null;
                    return;
                }

                if ( !containerController) {
                    selection.containerController   =   null;
                }

                selection.containerController   =   containerController;
                selection.definition            =   getComponentDefinition(selection.service['service_id'], component['class']);
                selection.component             =   component;
            }

            function getSelection() {
                return selection;
            }

            // SERVICE
            function getSelectedService() {
                if ( !selection.service) {
                    throw new Error( 'No selected service');
                }
                return selection.service;
            }

            function isServiceChanged() {
                return !angular.equals( original_service, selection.service);
            }

            function revertChanges() {
                angular.copy( original_service, selection.service);
            }

            function saveChanges() {
                $log.log( 'propertiesContext controller saveChanges()');

                ConvoworksApi.updateService( service_id, selection.service).then( function( res) {
                    $log.log( 'propertiesContext controller saveChanges() done');

                    angular.merge( selection.service, res.data);
                    original_service    =   angular.copy( selection.service);
                    $rootScope.$broadcast('ServiceWorkflowUpdated', selection.service);
                    AlertService.addSucess( 'Service workflow saved');
                }, function( reason) {
                    $log.log( 'propertiesContext controller saveChanges() reason', reason);
                    throw new Error(reason.data.message);
                })
            }

            // BLOCKS
            function addBlock( name) {
                ConvoComponentFactoryService.createBlock( getSelectedService(), name).then( function ( block) {
                    getSelectedService().blocks.push( block);
                });
            }

            function addReadSubroutine( name)
            {
                ConvoComponentFactoryService.createReadSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                });
            }

            function addProcessSubroutine( name) {
                ConvoComponentFactoryService.createProcessSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                });
            }

            function removeBlock( blockId) {

                for ( var i=0; i<selection.service.blocks.length; i++) {
                    var block   =   selection.service.blocks[i];
                    if ( block.properties.block_id == blockId) {
                        selection.service.blocks.splice( i, 1);
                        return ;
                    }
                }

                throw new Error( 'Could not find block ['+blockId+']');
            }

            function removeSubroutine( fragmentId) {

                for ( var i=0; i<selection.service.fragments.length; i++) {
                    var fragment    =   selection.service.fragments[i];
                    if ( fragment.properties.fragment_id == fragmentId) {
                        selection.service.fragments.splice( i, 1);
                        return ;
                    }
                }

                throw new Error( 'Could not find fragment ['+fragmentId+']');
            }

            function removeComponent()
            {
                if ( !selection.containerController) {
                    $log.warn( 'propertiesContext directive removeComponent() no containerController');
                    return ;
                }

                selection.containerController.removeSelection( selection.component);
            }

            function findBlock( blockId) {
                for ( var i=0; i<selection.service.blocks.length; i++) {
                    var block   =   selection.service.blocks[i];
                    if ( block.properties.block_id == blockId) {
                        return block;
                    }
                }
                throw new Error( 'Block ['+blockId+'] not found');
            }

            function findSubroutine( fragmentId) {
                for ( var i=0; i<selection.service.fragments.length; i++) {
                    var fragment    =   selection.service.fragments[i];
                    if ( fragment.properties.fragment_id == fragmentId) {
                        return fragment;
                    }
                }
                throw new Error( 'Fragment ['+fragmentId+'] not found');
            }

            // OTHER COMPONENTS
            function addNewComponent( containerController, componentDefinition, index)
            {
                if ( !index) {
                    index   =   0;
                }

                var component   =   ConvoComponentFactoryService.createComponent( getSelectedService(), componentDefinition);
                containerController.addComponent( component, index);
            };

            function moveComponent( oldContainerController, containerController, component, index) {

                if ( !index) {
                    index   =   0;
                }

                oldContainerController.removeComponent( component);
                containerController.addComponent( component, index);
            };

            function reloadService() {
                ConvoworksApi.getServiceById( service_id).then( function( service) {
                    $log.log( 'propertiesContext controller got service', service);
                    selection.service   =   service;
                    original_service    =   angular.copy( selection.service);
                    ready               =   true;
                }, function( reason) {
                    $log.error( 'propertiesContext controller service got reason', reason);
                    throw new Error(reason.data.message);
                });
            };

            },
            link : function( $scope, $element, $attributes, propertiesContext) {

                $log.log( 'propertiesContext link');

                function _init()
                {
                    $log.log( 'propertiesContext _init() service', propertiesContext.getSelectedService());
                }

                function _destroy()
                {
                }


                $scope.isServiceChanged     =   propertiesContext.isServiceChanged;
                $scope.saveChanges          =   propertiesContext.saveChanges;
                $scope.getSelection         =   propertiesContext.getSelection;

                $scope.revertClicked        =   function()
                {
                    $log.log( 'propertiesContext revertClicked()');
                    propertiesContext.revertChanges();
                    _destroy();
                    _init();
                };


                $scope.addNewBlock      =   function()
                {
                    $log.log( 'propertiesContext addNewBlock()');
                    ConvoworksAddBlockService.showModal( propertiesContext.getSelectedService(), 'user', propertiesContext)
                };

                $scope.showNewReadSubroutine        =   function()
                {
                    $log.warn( 'propertiesContext showNewReadSubroutine()');
                    ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'read')
                };

                $scope.showNewProcessSubroutine     =   function()
                {
                    $log.warn( 'propertiesContext showNewProcessSubroutine()');
                    ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'process')
                };

                // $scope.removeBlock       =   function( blockId)
                // {
                //  $log.log( 'propertiesContext removeBlock() blockId', blockId);
                // };

                $scope.isReady          =   propertiesContext.isLoaded;
//              $scope.isReady          =   function() {
//                  $log.log( 'propertiesContext isReady()');
//                  return true
//              };

                //
                $scope.getSubroutines   =   function() { return _filterSubroutines( propertiesContext.getSelectedService()); };
                $scope.getBlocks        =   function() { return _filterBlocks( propertiesContext.getSelectedService()); };
                $scope.getDefinitions   =   propertiesContext.getComponentDefinitions;
                $scope.setDefinitions   =   propertiesContext.setComponentDefinitions;
                $scope.getAvailablePackages = propertiesContext.getAvailablePackages;

                $scope.canBlockMoveUp = function(blockId)
                {
                    var index = $scope.getBlocks().findIndex(function (b) {
                        return b.properties.block_id === blockId;
                    });

                    return index > 1;
                }

                $scope.canBlockMoveDown = function(blockId)
                {
                    var blocks = $scope.getBlocks();
                    var index = blocks.findIndex(function (b) {
                        return b.properties.block_id === blockId;
                    });

                    return index < blocks.length - 4;
                }

                $scope.canFragmentMoveUp = function(fragmentId)
                {
                    var index = $scope.getSubroutines().findIndex(function (s) {
                        return s.properties.fragment_id === fragmentId;
                    });

                    return index > 0;
                }

            $scope.canFragmentMoveDown = function(fragmentId)
            {
                var blocks = $scope.getSubroutines();
                var index = blocks.findIndex(function (s) {
                    return s.properties.fragment_id === fragmentId;
                });

                return index < blocks.length - 1;
            }


            $scope.$on('moveBlock', function (event, data) {
                $log.log('Block', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
                var service = propertiesContext.getSelectedService();

                var currentIndex = service.blocks.findIndex(function (b) { return b.properties.block_id === data.blockId; });
                var targetIndex = currentIndex + data.dir;
                $log.log('Block', data.blockId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

                [service.blocks[currentIndex], service.blocks[targetIndex]] = [service.blocks[targetIndex], service.blocks[currentIndex]];
            });

            $scope.$on('moveFragment', function (event, data) {
                $log.log('Fragment', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
                var service = propertiesContext.getSelectedService();

                var currentIndex = service.fragments.findIndex(function (f) { return f.properties.fragment_id === data.fragmentId; });
                var targetIndex = currentIndex + data.dir;
                $log.log('Block', data.fragmentId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

                [service.fragments[currentIndex], service.fragments[targetIndex]] = [service.fragments[targetIndex], service.fragments[currentIndex]];
            });

            $scope.$watch( propertiesContext.isLoaded, function( val) {
                if ( val) {
                    _init();
                } else {
                    _destroy();
                }
            });
        }
    }
}

function _filterBlocks( service)
{
    var user_blocks     =   service.blocks.filter( function( block) { return !_isSystem( block.properties.block_id);    });
    var system_blocks   =   service.blocks.filter( function( block) { return _isSystem( block.properties.block_id); });

    var session_start_block         =   system_blocks.find( function( b) { return b.properties.block_id === '__sessionStart'; });
    var service_processors_block    =   system_blocks.find( function( b) { return b.properties.block_id === '__serviceProcessors'; });
    var session_end_block           =   system_blocks.find( function( b) { return b.properties.block_id === '__sessionEnd'; });
    var media_controls_block        =   system_blocks.find( function( b) { return b.properties.block_id === '__mediaControls'; });

    var sorted  =   user_blocks;

    sorted.unshift( session_start_block);
    sorted.push( media_controls_block);
    sorted.push( service_processors_block);
    sorted.push( session_end_block);

    return sorted;
}

function _filterSubroutines( service)
{
    return service.fragments;
}

function _isSystem( blockId) {
    if ( blockId) {
        return blockId.indexOf( '__') >= 0;
    }
    return false;
}

import angular from 'angular';

import convoEditorConfig from './config';
import convoEditorToolbox from './toolbox';
import convoEditorPreview from './preview';
import convoEditorIntents from './intents';
import convoEditorWorkflow from './workflow';
import convoEditorProps from './props';

import ConvoworksEditorController from './convoworks-editor.controller';
import propertiesContext from './properties-context.directive';
import ConvoComponentFactoryService from './convo-component-factory.service';

export default angular
  .module('convo.editor', [convoEditorConfig, convoEditorToolbox, convoEditorPreview, convoEditorIntents, convoEditorWorkflow, convoEditorProps])
  .controller('ConvoworksEditorController', ConvoworksEditorController)
  .directive('propertiesContext', propertiesContext)
  .service('ConvoComponentFactoryService', ConvoComponentFactoryService)
  .name;


export default function ConvoworksEditorController( $log, $scope, $rootScope, $routeParams, $location, ConvoworksApi, AlertService) {

        var random_slug         =   Math.floor( Math.random() * 100000);
        var device_id           =   'admin-chat-' + random_slug;

        var platform_info       =   {}

        $scope.serviceId        =   $routeParams.service_id;
        var search              =   $location.search();
        var tab_selected_1       =  search.tab1 ? search.tab1 : 'workflow';
        var tab_selected_2       =  search.tab2 ? search.tab2 :'steps';

        $scope.tabInfo1          =   { active: tab_selected_1};
        $scope.tabInfo2          =   { active: tab_selected_2};

        $scope.delegateNlp      =   null;
        $scope.delegateOptions  =   [
            {
                label: 'Amazon',
                value: 'amazon'
            },
            {
                label: 'Dialogflow',
                value: 'dialogflow'
            }
        ];


        _load();

        $scope.tab1Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab1Select $tab', $tab);
            _updateUrl( $tab, 'steps');
        }

        $scope.tab2Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab2Select $tab', $tab);
            if ( $scope.tabInfo1.active == 'workflow') {
                _updateUrl( 'workflow', $tab);
            }
        }

        function _updateUrl( tab1, tab2)
        {
            $log.log( 'ConvoworksEditorController _updateUrl tab1Select tabs', tab1, tab2);
            if ( tab1 == 'workflow') {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', tab2);
            } else {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', null);
            }

            $location.replace();
        }

        $scope.getDeviceId      =   function() {
            return device_id;
        }


        $rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
            _load();
        });

        $rootScope.$on( 'ServiceWorkflowUpdated', function ( evt, data) {
            _load();
        });

        $rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
            _load();
        });


        $scope.isPlatformPropagateAllowed       =   function( platformId) {
            if ( !platform_info[platformId]) {
                return false;
            }
            return platform_info[platformId]['allowed'];
        }

        $scope.isPlatformPropagateAvailable     =   function( platformId) {
            return true;
            if ( !platform_info[platformId]) {
                return false;
            }
            return platform_info[platformId]['available'];
        }

        $scope.propagatePlatformChanges     =   function( platformId) {
            $log.log( 'ConvoworksEditorController propagatePlatformChanges() platformId', platformId);

            if (platformId === 'all') {
                const availablePlatforms = Object.keys(platform_info);
                availablePlatforms.forEach(function(availablePlatformId) {
                    ConvoworksApi.propagateServicePlatform( $scope.serviceId, availablePlatformId).then(function (data) {
                        platform_info[availablePlatformId] = data;
                        AlertService.addSucess( 'Service propagation to '+availablePlatformId+' done');
                    }, function( reason) {
                        $log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
                        throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
                    });
                })
            } else {
                ConvoworksApi.propagateServicePlatform( $scope.serviceId, platformId).then(function (data) {
                    platform_info[platformId] = data;
                    AlertService.addSucess( 'Service propagation to '+platformId+' done');
                }, function( reason) {
                    $log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
                    throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
                });
            }

        }


        function _load()
        {
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'amazon').then(function (data) {
                platform_info['amazon'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for amazon")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'dialogflow').then(function (data) {
                platform_info['dialogflow'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for dialogflow")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'facebook_messenger').then(function (data) {
                platform_info['facebook_messenger'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for Facebook Messenger")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'viber').then(function (data) {
                platform_info['viber'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for Viber")
            });
        }

//      setTimeout( function () {
//          _initTabs();
//      }, 2 * 1000);

        function _initTabs()
        {
            $( '#tab_steps').droppable({
                greedy: true,
                over: function( event, ui) {
                    $log.log( 'ConvoworksEditorController tab_steps over');
                    $scope.$apply( function () {
                        $scope.tabInfo.active   =   'steps';
                    });
                },
            });
            $( '#tab_subroutines').droppable({
                greedy: true,
                over: function( event, ui) {
                    $log.log( 'ConvoworksEditorController tab_subroutines over');
                    $scope.$apply( function () {
                        $scope.tabInfo.active   =   'subroutines';
                    });
                },
            });
        }
    }


export default function ConvoComponentFactoryService( $log, $q, ConvoworksApi) {

    this.generateUniqueId           =   generateUniqueId;
    this.createComponent            =   createComponent;
    this.copyComponent              =   copyComponent;

    this.createBlock                =   createBlock;
    this.createReadSubroutine       =   createReadSubroutine;
    this.createProcessSubroutine    =   createProcessSubroutine;


    function generateUniqueId() {
        var result = '';
        result += makeid( 8);
        result += '-';
        result += makeid( 4);
        result += '-';
        result += makeid( 4);
        result += '-';
        result += makeid( 4);
        result += '-';
        result += makeid( 12);

        return result.toLowerCase();
    }

    function makeid( length) {
           var result           = '';
           var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
           var charactersLength = characters.length;
           for ( var i = 0; i < length; i++ ) {
              result += characters.charAt(Math.floor(Math.random() * charactersLength));
           }
           return result;
    }

    function copyComponent( service, componentToCopy)
    {
        $log.log( 'ConvoComponentFactoryService copyComponent componentToCopy', componentToCopy);

        var component   =   angular.copy( componentToCopy);
        _regenerateComponentIds( component);
        return component;
    }

    function _regenerateComponentIds( component)
    {
        component.properties._component_id  =   generateUniqueId();

        for ( var key in component.properties) {
            if ( angular.isArray( component.properties[key])) {
                for ( var i=0; i<component.properties[key].length; i++) {
                    if ( component.properties[key][i]['class']) {
                        _regenerateComponentIds( component.properties[key][i]);
                    }
                }
            } else {
                if ( component.properties[key] && component.properties[key]['class']) {
                    _regenerateComponentIds( component.properties[key]);
                }
            }
        }
    }

    function createComponent( service, definition, name)
    {
        $log.log( 'ConvoComponentFactoryService createComponent() creating definition.type', definition.type, 'name', name);
        var component       =   {
                class : definition.type,
                namespace : definition.namespace,
                properties : {
                }
        };

        for ( var key in definition.component_properties)
        {
            $log.log( 'ConvoComponentFactoryService createComponent() checking property', key);

            if ( definition.component_properties[key].editor_type === 'block_id' ||
                definition.component_properties[key].editor_type === 'process_fragment' ||
                definition.component_properties[key].editor_type === 'read_fragment') {
                // block_id - predefined behaviour
                component.properties[key] = _generateBlockId( service, name);
            } else if ( definition.component_properties[key].editor_type === 'service_components') {

                $log.log( 'ConvoComponentFactoryService createComponent() service_components editor');

                if ( typeof definition.component_properties[key].defaultValue === 'undefined') {
                    $log.log( 'ConvoComponentFactoryService createComponent() no default value');
                    continue;
                }

                if ( !definition.component_properties[key].defaultValue) {
                    $log.log( 'ConvoComponentFactoryService createComponent() empty default value', definition.component_properties[key].defaultValue);
                    component.properties[key]       =   definition.component_properties[key].defaultValue;
                    continue;
                }

                if ( definition.component_properties[key].editor_properties.multiple) {
                    $log.log( 'ConvoComponentFactoryService createComponent() multiple components');
                    component.properties[key]   =   [];
                    for ( var i=0; i<definition.component_properties[key].defaultValue.length; i++) {
                        var child                       =   angular.copy( definition.component_properties[key].defaultValue[i]);
                        child.properties._component_id  =   generateUniqueId();
                        component.properties[key][component.properties[key].length]       =   child;
                    }
                } else {
                    $log.log( 'ConvoComponentFactoryService createComponent() single component');
                    var child                       =   angular.copy( definition.component_properties[key].defaultValue);
                    child.properties._component_id  =   generateUniqueId();
                    component.properties[key]       =   child;
                }
            } else if ( key.indexOf( '_') === 0) {
                // system props - just copy the component id - predefined behaviour
                if (key === '_component_id') {
                    component.properties[key] = definition.component_properties[key];
                } else {
                    delete component.properties[key];
                }
            } else if ( typeof definition.component_properties[key].defaultValue !== 'undefined') {
                // use default value
                $log.log( 'ConvoComponentFactoryService createComponent() default value', definition.component_properties[key].defaultValue);
                component.properties[key] = definition.component_properties[key].defaultValue;
            }
        }

        if ( name) {
            component.properties.name   =   name;
        }

        component.properties['_component_id'] = generateUniqueId();

        $log.log( 'ConvoComponentFactoryService createComponent() created component', component);

        return component;
    }

    function createBlock( service, name)
    {
        var deferred    =   $q.defer();

        ConvoworksApi.getComponentDefinition( service['service_id'], '\\Convo\\Pckg\\Core\\Elements\\ConversationBlock').then( function( definition) {
            $log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
            deferred.resolve( createComponent( service, definition, name));
        }, function( reason) {
            deferred.reject( reason);
        })

        return deferred.promise;
    }

    function createReadSubroutine( service, name)
    {
        var deferred    =   $q.defer();

        ConvoworksApi.getComponentDefinition( service['service_id'], '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment').then( function( definition) {
            $log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
            deferred.resolve( createComponent( service, definition, name));
        }, function( reason) {
            deferred.reject( reason);
        })

        return deferred.promise;
    }

    function createProcessSubroutine( service, name)
    {
        var deferred    =   $q.defer();

        ConvoworksApi.getComponentDefinition( service['service_id'], '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment').then( function( definition) {
            $log.log( 'ConvoComponentFactoryService got definition', definition, 'name', name);
            deferred.resolve( createComponent( service, definition, name));
        }, function( reason) {
            deferred.reject( reason);
        })

        return deferred.promise;
    }



    // PRIVATE UTIL

    function _findBlock( service, blockId) {
        for ( var i=0; i<service.blocks.length; i++) {
            var block   =   service.blocks[i];
            if ( block.properties.block_id === blockId) {
                return block;
            }
        }
        for ( var i=0; i<service.fragments.length; i++) {
            var block   =   service.fragments[i];
            if ( block.properties.fragment_id === blockId) {
                return block;
            }
        }

        return null;
    }

    function _generateBlockId( service, name) {

        if ( !name) {
            return null;
        }

        var block_id    =   name.replace(/[^A-Z0-9]+/ig, "_");
        var block       =   _findBlock( service, block_id);

        if ( block) {
            var parse_info  =   _parseNumericSuffix( block_id);

            if ( parse_info.num) {
                block_id    =   parse_info.base + '_' + (parse_info.num + 1);
            } else {
                block_id    +=  '_1';
            }

            return _generateBlockId( service, block_id);
        }

        return block_id;
    }

    function _parseNumericSuffix( str) {
        var index   =   str.lastIndexOf( '_');
        $log.log( 'ConvoComponentFactoryService _parseNumericSuffix str', str, 'index', index);
        if ( index <= 0) {
            return {
                num : 0,
                base : str
            };
        }
        $log.log( 'ConvoComponentFactoryService _parseNumericSuffix str.substr( 0, index)', str.substr( 0, index),
                'parseInt( str.substr( index + 1))', parseInt( str.substr( index + 1)), 'str.substr( index + 1)', str.substr( index + 1));
        return {
            num : parseInt( str.substr( index + 1)) || 0,
            base : str.substr( 0, index)
        };
    }
};


export default function UserPreferencesService( $q, localStorageService)
{
    this.registerData       =   registerData;
    this.getData            =   getData;
    
    function getData( key)
    {
        var deferred    =   $q.defer();
        deferred.resolve( localStorageService.get( key));
        return deferred.promise;
    }
    
    function registerData( key, data)
    {
        localStorageService.set( key, data)
    }
};


export default function textArray( $log) {
    
    $log.log('textArray init');
    
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function ($scope, $element, $attributes, ngModel) {
            function into(input) {
                return input.split(',').map(function (s) { return s.trim() });
            }

            function out(data) {
                return data.join(', ');
            }

            ngModel.$parsers.push(into);
            ngModel.$formatters.push(out);
        }
    };
}

import template from './loading.tmpl.html';

export default function loadingIndicator( $http, $log) {
    
    $log.log('loadingIndicator init');
    
    return {
        restrict: 'E',
        template : template,
        link: function (scope, elm, attrs) {
                
            $log.log( 'loadingIndicator link', elm);

            scope.$watch( function () {
                return $http.pendingRequests.length > 0;
            }, function (v) {
                if (v) {
                    elm.find('div.sk-cube-grid').show();
                } else {
                    elm.find('div.sk-cube-grid').hide();
                }
            });
        }
    };
}


export default function alertIndicator( $log) {
    
    $log.log('jsonText init');
    
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ngModel) 
        {
            function into(input) {
                try {
                    scope.$emit('JsonError', false);
                    return JSON.parse(input);
                } catch (e) {
                    $log.warn('Error parsing JSON:', e.message);
                    scope.$emit('JsonError', true);
                    return {};
                }
            }
            
            function out(data) {
                return JSON.stringify(data, null, 2);
            }

            ngModel.$parsers.push(into);
            ngModel.$formatters.push(out);
        }
    };
}

import angular from 'angular';
import 'angular-local-storage';

import { propsFilter, percent, prettyJson, admDate, unsafe, keys} from './filters';
import alertIndicator from './alert-indicator.directive';
import AlertService from './alert-service';
import UserPreferencesService from './user-preferences.service';
import DeferredsStackService from './deferreds-stack.service';
import ConvoworksApi from './convoworks-api';

import jsonText from './json-text.directive';
import loadingIndicator from './loading.directive';
import textArray from './text-array.directive';

export default angular
  .module('convo.common', ['LocalStorageModule'])
  .filter('propsFilter', propsFilter)
  .filter('percent', percent)
  .filter('prettyJson', prettyJson)
  .filter('admDate', admDate)
  .filter('unsafe', unsafe)
  .filter('keys', keys)
  .directive('alertIndicator', alertIndicator)
  .directive('jsonText', jsonText)
  .directive('loadingIndicator', loadingIndicator)
  .directive('textArray', textArray)
  .factory('AlertService', AlertService)
  .service('DeferredsStackService', DeferredsStackService)
  .service('UserPreferencesService', UserPreferencesService)
  .service('ConvoworksApi', ConvoworksApi)
  .name;


export function propsFilter() {
  return function( items, props) {
        var out = [];
    
        if (angular.isArray(items)) {
            var hastext =   false;
              items.forEach(function(item) {
                var itemMatches = false;
    
                var keys = Object.keys(props);
                if (keys.length == 0)
                    return items;
                for (var i = 0; i < keys.length; i++) {
                  var prop = keys[i];
                  var text = props[prop].toLowerCase();
                  
                  if (text)
                      hastext   =   true;
                  if (item[prop] && (item[prop].toString().toLowerCase().indexOf(text) !== -1)) {
                    itemMatches = true;
                    break;
                  }
                }
                if (itemMatches) {
                  out.push(item);
                }
              });
          
            if (!hastext)
                return items;
        
        
        } else {
          // Let the output be the input untouched
          out = items;
        }
    
        return out;
      };
}

export function percent() {
    return function (value) {
            return value + ' %';
    };
}

export function prettyJson() {
    return function (value) {
        return JSON.stringify( value, null, 2);
    };
}

export function admDate( $filter) {
    return function ( strDate, format) {
        if ( angular.isNumber( strDate)) {
            return $filter('date')( new Date( strDate * 1000), format);
        }
        return $filter('date')( Date.parse( strDate), format);
    };
}

export function unsafe( $sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
}

export function keys() {
    return function (value) {
        return Object.keys(value);
    };
}




function DeferredsStack()
{
    this.groups         =   {};
    this.resoulutions   =   {};
}


DeferredsStack.prototype.registered = function( key)
{
    var deferreds   =   this._getGroup( key);
    if (deferreds.length) {
        return true;
    }
    return false;
}

DeferredsStack.prototype.register = function( key, deferred)
{
    if (key in this.resoulutions)
    {
        deferred.resolve( this.resoulutions[key]);
        delete this.resoulutions[key];
        return;
    }
    
    var deferreds   =   this._getGroup( key);
    deferreds.push( deferred);
}

DeferredsStack.prototype.resolve = function( key, result)
{
    var deferreds   =   this._getGroup( key);
    
    if (deferreds.length == 0)
    {
        this.resoulutions[key]  =   result;
        return;
    }
    
    var deferred;
    while (deferred = deferreds.shift()) {
        deferred.resolve( result);
    }
}

DeferredsStack.prototype.reject = function( key, reason)
{
    var deferreds   =   this._getGroup( key);
    var deferred;
    while (deferred = deferreds.shift()) {
        deferred.reject( reason);
    }
}

DeferredsStack.prototype.rejectAll = function()
{
    for (var key in this.groups)
        this.reject( key, null);
}

DeferredsStack.prototype._getGroup = function( key)
{
    if (angular.isUndefined( this.groups[key]))
        this.groups[key] = [];
    return this.groups[key];
}


export default function DeferredsStackService( $log)
{
    this.getNew     =   getNew;
        
    function getNew()
    {
        return new DeferredsStack();
    }
};


export default function ConvoworksApi( $log, $http, $q, CONVO_ADMIN_API_BASE_URL, CONVO_PUBLIC_API_BASE_URL) {


        $log.log("ConvoworksApi init");

        var definitions     =   null;

        // INTERFACE

        // /convo-definitions
        this.getComponentDefinitions    =   getComponentDefinitions;
        this.getComponentDefinition     =   getComponentDefinition;
        this.getTemplates               =   getTemplates;

        // /service-packages
        this.getAvailablePackages       =   getAvailablePackages;
        this.addServicePackage          =   addServicePackage;
        this.removeServicePackage       =   removeServicePackage;

        // /services
        this.getAllServices             =   getAllServices;

        // /services/{serviceId}
        this.getServiceById             =   getServiceById;
        this.getServiceMeta             =   getServiceMeta;
        this.createService              =   createService;
        this.updateService              =   updateService;

        // /services/{serviceId}/meta
        this.updateServiceMeta          =   updateServiceMeta;

        // /services/{serviceId}/preview
        this.getServicePreview          =   getServicePreview;

        // /service-run/{serviceId}
        this.sendMessage                =   sendMessage;

        // /service-imp-exp/import/{serviceId}
        this.uploadServiceData          =   uploadServiceData;

        // /service-platfform-config/{serviceId}
        this.loadPlatformConfig         =   loadPlatformConfig;
        this.getServicePlatformConfig   =   getServicePlatformConfig;
        this.createServicePlatformConfig   =   createServicePlatformConfig;
        this.updateServicePlatformConfig   =   updateServicePlatformConfig;
        this.propagateServicePlatform   =   propagateServicePlatform;
        this.getPropagateInfo           =   getPropagateInfo;

        // publish-service/{platformId}/{serviceId}
        this.getPublishInformation      =   getPublishInformation;

        this.getServiceVersions         =   getServiceVersions;
        this.getServiceReleases         =   getServiceReleases;
        this.createRelease              =   createRelease;
        this.promoteRelease             =   promoteRelease;
        this.importWorkflowIntoRelease  =   importWorkflowIntoRelease;

        // media/{serviceId}
        this.uploadMedia = uploadMedia;
        this.downloadMedia = downloadMedia;

        // package-help/{packageId}/{filename}
        this.getPackageComponentHelp = getPackageComponentHelp;

        this.requestAuthUrl = requestAuthUrl;

 this.getPlatformConfiguration = getPlatformConfiguration;
        this.updatePlatformConfiguration = updatePlatformConfiguration;

        function getPlatformConfiguration()
        {
            return $http({
                method: 'get',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config'
            }).then(function (res) {
                $log.log("ConvoworksApi getPlatformConfiguration() res", res);

                return res.data;
            });
        }

        function updatePlatformConfiguration(config)
        {
            return $http({
                method: 'put',
                url: CONVO_ADMIN_API_BASE_URL + '/user-platform-config',
                headers: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                data: config
            }).then(function (res) {
                $log.log("ConvoworksApi updatePlatformConfig() res", res);

                return res.data;
            });
        }


        function requestAuthUrl(user)
        {
            return $http({
                method: 'GET',
                url: CONVO_PUBLIC_API_BASE_URL + '/admin-auth/amazon?username=' + user.email
            }).then(function (res) {
                $log.log('Got res', res);
                return res.data;
            });
        }


        // TEMPLATES
//         function getTemplates(serviceId) {
//             var d   =   $q.defer();
//
//             getComponentDefinitions(serviceId).then( function( definitions) {
//                 var templates   =   [];
//                 for ( var i=0; i<definitions.length; i++) {
//                     var pckg    =   definitions[i];
//                     for ( var j=0; j<pckg.templates.length; j++) {
//                         templates.push( pckg.templates[j]);
//                     }
//                 }
//
//                 d.resolve( templates);
//
// //              d.reject( 'Component ['+className+'] not found');
//             });
//
//             return d.promise;
//         }

        function getTemplates()
        {
            return $http({
                method: 'GET',
                url: CONVO_ADMIN_API_BASE_URL + '/templates'
            }).then(function(res) {
                return res.data;
            });
        }

        // DEFINITIONS
        function getComponentDefinitions(serviceId) {
            if ( !!definitions)
            {
                var d   =   $q.defer();

                d.resolve( definitions);

                return d.promise;
            }
            else
            {
                return $http({
                    method: 'GET',
                    url: CONVO_ADMIN_API_BASE_URL + '/service-packages/' + serviceId
                }).then( function ( res) {
                    definitions =   res.data;
                    return definitions;
                });
            }
        }

        function getComponentDefinition( serviceId, className) {
//          $log.log( 'ConvoworksApi getComponentDefinition(%s)', className);
//             $log.log('ConvoworksApi getComponentDefinition()', serviceId, className);

            var d = $q.defer();

            getComponentDefinitions(serviceId).then(function(definitions) {
                // $log.log('ConvoworksApi getComponentDefinition() definitions', definitions);

                for (var i = 0; i < definitions.length; i++)
                {
                    var pckg = definitions[i];
                    // $log.log('ConvoworksApi getComponentDefinition() currently on package', pckg['namespace']);
                    for (var j = 0; j < pckg.components.length; j++)
                    {
                        var comp = pckg.components[j];

                        // $log.log('ConvoworksApi getComponentDefinition() current component', comp['type']);
                        if (comp['type'] === className)
                        {
                            // $log.log('ConvoworksApi getComponentDefinition() found component', comp);
                            d.resolve(comp);
                            return comp;
                        }
                        if (comp['component_properties']['_class_aliases'] &&
                            comp['component_properties']['_class_aliases'].includes(className))
                        {
                            d.resolve(comp);
                            return comp;
                        }
                    }
                }
                d.reject( 'Component ['+className+'] not found');
            });

            return d.promise;
        }

        // PACKAGES
        function getAvailablePackages()
        {
            return $http({
                method: 'GET',
                url: CONVO_ADMIN_API_BASE_URL + '/user-packages'
            }).then(function(res) {
                return res.data;
            })
        }

        function addServicePackage(serviceId, packageId)
        {
            $log.log('ConvoworksApi addServicePackage()', serviceId, packageId);

            return $http({
                method: 'POST',
                url: CONVO_ADMIN_API_BASE_URL + '/service-packages/' + serviceId,
                data: { 'package_id': packageId }
            }).then(function(res) {
                $log.log('ConvoworksApi addServicePackage() then', res.data);
                return res.data;
            });
        }

        function removeServicePackage(serviceId, packageId)
        {
            $log.log('ConvoworksApi removeServicePackage()', serviceId, packageId);

            return $http({
                method: 'DELETE',
                url: CONVO_ADMIN_API_BASE_URL + '/service-packages/' + serviceId,
                data: { 'package_id': packageId }
            }).then(function(res) {
                $log.log('ConvoworksApi removeServicePackage() then', res.data);
                return res.data;
            })
        }

        function getAllServices() {
            $log.log( 'ConvoworksApi getAllServices()');

            return $http({
                method: 'GET',
                url: CONVO_ADMIN_API_BASE_URL + '/services'
            }).then( function ( res) {
                return res.data;
            })
        }

        function getServiceById( serviceId) {
            $log.log( 'ConvoworksApi getServiceById(%s)', serviceId);
            return $http({
                method: 'GET',
                url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId
            }).then( function ( res) {
                return res.data;
            });
        }

        function getServiceMeta( serviceId) {
            $log.log( 'ConvoworksApi getServiceMeta(%s)', serviceId);
            return $http({
                method: 'GET',
                url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/meta'
            }).then( function ( res) {
                return res.data;
            });
        }

        function createService( serviceName, templateId)
        {
            return $http({
                method: 'post',
                url: CONVO_ADMIN_API_BASE_URL + '/services',
                data: { 'service_name' : serviceName, 'template_id' : templateId }
            }).then( function ( res) {
                return res.data;
            });
        }

        function updateService( serviceId, service) {
            $log.log( 'ConvoworksApi postService() serviceId', serviceId);

            return $http.put( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId, service);
        }

        function updateServiceMeta( serviceId, meta) {
            $log.log( 'ConvoworksApi updateServiceMeta() serviceId', serviceId, 'meta', meta);

            return $http.put( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/meta', meta);
        }

        function getServicePreview(serviceId) {
            $log.log('ConvoworksApi getServicePrevies() serviceId', serviceId);

            return $http
                .get( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/preview')
                .then(function (res) {
                    return res.data
                });
        }

        function sendMessage( serviceId, deviceId, text, isLaunch, variant, delegateNlp)
        {
            if ( !variant) {
                variant =   'develop';
            }

            return $http({
                method: "post",
                url: CONVO_ADMIN_API_BASE_URL + '/service-test/' + serviceId,
                data : { device_id : deviceId, text : text, lunch : isLaunch, platform_id: delegateNlp }
            }).then( function ( response) {
                $log.log('ConvoworksApi sendMessage response.data', response.data);
                return response.data;
            });
        }

        function uploadServiceData( serviceId, file, keepVars, keepConfigs) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi uploadServiceData() serviceId', serviceId, 'file', file);
            var fd = new FormData();
            fd.append("service_definition", file);
            fd.append("keep_vars", keepVars);
            fd.append("keep_configs", keepConfigs);

            return $http
            .post( CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/import/' + serviceId, fd, { headers: {'Content-Type': undefined }})
            .then(function (res) {
                $log.log('ConvoworksApi uploadServiceData() res', res);
                return res.data;
            });
        }

        function loadPlatformConfig( serviceId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi loadPlatformConfig() serviceId', serviceId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId)
            .then(function (res) {
                $log.log('ConvoworksApi loadPlatformConfig() res', res);
                return res.data;
            });
        }

        function getServicePlatformConfig( serviceId, platformId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi getServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId)
            .then(function (res) {
                $log.log('ConvoworksApi getServicePlatformConfig() res', res);
                return res.data;
            });
        }

        function createServicePlatformConfig( serviceId, platformId, data) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi createServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);

            return $http
            .post( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
            .then(function (res) {
                $log.log('ConvoworksApi createServicePlatformConfig() res', res);
                return res.data;
            });
        }

        function updateServicePlatformConfig( serviceId, platformId, data) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi updateServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);

            return $http
            .put( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
            .then(function (res) {
                $log.log('ConvoworksApi updateServicePlatformConfig() res', res);
                return res.data;
            });
        }

        function propagateServicePlatform( serviceId, platformId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi propagateServicePlatform() serviceId', serviceId, 'platformId', platformId);

            return $http
            .post( CONVO_ADMIN_API_BASE_URL + '/service-platform-propagate/' + serviceId +'/'+platformId)
            .then(function (res) {
                $log.log('ConvoworksApi propagateServicePlatform() res', res);
                return res.data;
            });
        }

        function getPropagateInfo( serviceId, platformId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi getPropagateInfo() serviceId', serviceId, 'platformId', platformId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-platform-propagate/' + serviceId +'/'+platformId)
            .then(function (res) {
                $log.log('ConvoworksApi getPropagateInfo() res', res);
                return res.data;
            });
        }

        function getPublishInformation( serviceId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi getPublishInformation() serviceId', serviceId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-publish/' + serviceId)
            .then(function (res) {
                $log.log('ConvoworksApi getPublishInformation() res', res);
                return res.data;
            });
        }


        function getServiceVersions( serviceId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi getServiceVersions() serviceId', serviceId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-versions/' + serviceId)
            .then(function (res) {
                $log.log('ConvoworksApi getServiceVersions() res', res);
                return res.data;
            });
        }

        function createRelease( serviceId, platformId, type, stage) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi createRelease() serviceId', serviceId);

            var data    =   {
                    platform_id : platformId,
                    type : type,
                    stage : stage
            };

            return $http
            .post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
            .then(function (res) {
                $log.log('ConvoworksApi createRelease() res', res);
                return res.data;
            });
        }

        function promoteRelease( serviceId, releaseId, type, stage) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi promoteRelease() serviceId', serviceId);

            var data    =   {
                    release_id : releaseId,
                    type : type,
                    stage : stage
            };

            return $http
            .put( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
            .then(function (res) {
                $log.log('ConvoworksApi promoteRelease() res', res);
                return res.data;
            });
        }

        function importWorkflowIntoRelease( serviceId, releaseId, versionId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi importWorkflowIntoRelease() serviceId', serviceId);

            return $http
            .post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId + '/' + releaseId + '/import-workflow/' + versionId)
            .then(function (res) {
                $log.log('ConvoworksApi importWorkflowIntoRelease() res', res);
                return res.data;
            });
        }

        function getServiceReleases( serviceId) {

            if ( !serviceId) {
                throw new Error( 'Missing service id');
            }

            $log.log( 'ConvoworksApi getServiceReleases() serviceId', serviceId);

            return $http
            .get( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId)
            .then(function (res) {
                $log.log('ConvoworksApi getServiceReleases() res', res);
                return res.data;
            });
        }


        function uploadMedia(serviceId, kind, file) {
            if (!serviceId) {
                throw new Error("Missing service ID");
            }

            $log.log('ConvoworksApi uploadMedia serviceId', serviceId, 'kind', kind, 'file', file);

            var fd = new FormData();
            fd.append(kind, file);

            return $http
            .post(
                CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId,
                fd,
                {
                    headers: { 'Content-Type': undefined }
                }
            )
            .then(function(res) {
                $log.log('ConvoworksApi uploadMedia res', res);
                return res.data;
            });
        }

        function downloadMedia(serviceId, mediaItemId) {
            return CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId + '/' + mediaItemId + '/download';
        }

        function getPackageComponentHelp(packageId, filename) {
            return $http
                .get( CONVO_ADMIN_API_BASE_URL + '/package-help/' + packageId + '/' + filename)
                .then(function (res) {
                    $log.log('ConvoworksApi getPackageComponentHelp() res', res);
                    return res.data;
                });
        }
    }


export default function AlertService( $log, $timeout)
{
    var DURATION    =   5000;
    var     alertsService   =   {};
    
    alertsService.alerts    =   [];
    
    alertsService.getAlerts =   function()
    {
        return alertsService.alerts;
    };
    
    alertsService.addSucess =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'success'}, DURATION);
    };
    
    alertsService.addDanger =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'danger'}, DURATION);
    };
    
    alertsService.addInfo   =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'info'}, DURATION);
    };
    
    alertsService.addWarning    =   function( msg)
    {
        alertsService._addAlert( { msg : msg, type : 'warning'}, DURATION);
    };
    
    alertsService._addAlert =   function( alert, timeout)
    {
        alertsService.alerts.push( alert);
        $timeout(function () {
            alertsService.closeAlertObj( alert);
        }, timeout);
    };
    
    alertsService.closeAlert    =   function( index)
    {
        alertsService.alerts.splice(index, 1);
    };
    
    alertsService.closeAlertObj =   function( alert)
    {
        var index   =   alertsService.alerts.indexOf( alert);
        if (index > -1)
            alertsService.closeAlert( index);
    };
    
    return alertsService;
};



import template from './alert-indicator.tmpl.html';

export default function alertIndicator( AlertService, $log) {
    
    $log.log('alertIndicator init');
    
    return {
        restrict: 'E',
        template : template,
        link: function ( $scope, $elem) {
            
            $log.log( 'alertIndicator link');
            
            $scope.getAlerts     =   AlertService.getAlerts;
            $scope.closeAlert    =   AlertService.closeAlert;
        }
    };
}

import angular from 'angular';

import './convo-chat.css';

import ConvoChatApi from './convo-chat-api';
import convoChatbox from './chatbox.directive';

export default angular
  .module('convo.chat', [])
  .directive('convoChatbox', convoChatbox)
  .service('ConvoChatApi', ConvoChatApi)
  .name;


export default function ConvoChatApi( $log, $http, $q, CONVO_PUBLIC_API_BASE_URL)
{
    this.sendMessage = sendMessage;

    function sendMessage( serviceId, deviceId, text, isLaunch, variant)
    {
        if ( !variant) {
            variant =   'develop';
        }

        return $http({
            method: "post",
            url: CONVO_PUBLIC_API_BASE_URL + '/service-run/webchat/' + variant + '/' + serviceId,
            data : { device_id : deviceId, text : text, lunch : isLaunch}
        }).then( function ( response) {
            $log.log('ConvoChatApi sendMessage response.data', response.data);
            return response.data;
        });
    }
};

import template from './chatbox.tmpl.html';

export default function convoChatbox( $log, $q, $timeout, ConvoworksApi, ConvoChatApi, UserPreferencesService) {
    
    $log.log('convoChatbox init');
    
    return {
        restrict: 'E',
        template : template,
        scope: {
            deviceId : '=',
            serviceId : '=',
            collapsed : '=',
            mode : '=',
            name : '=?',
            variant : '=?',
            delegateNlp : '=?',
            toggleDebug : '=?',
            exception : '=?',
            variables : '=?'
        },
        link: function( $scope, $elem, $attrs)
        {
            $log.log( 'convoChatbox link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);

            // $scope.collapsed    =   true;

            $scope.toggleDebug  =   false;
            $scope.message      =   '';
            $scope.messages     =   [];

            var sending         =   false;
            
            var REPROMPT_TIMEOUT    =   20 * 1000;
            var SEQUENCE_TIMEOUT    =   2 * 1000;
            var reprompt_timeout    =   null;
            var sequence_timeout    =   null;

            $scope.$watch('delegateNlp', function(newVal, oldVal) {
                $log.log('convoChatbox $watch delegateNlp old value', oldVal, 'new value', newVal);
                
                if (!newVal) {
                    return;
                }
                
                $scope.resetChat();
            });

            $scope.$watch('toggleDebug', function(newVal) {

                UserPreferencesService.registerData( 'toggleDebug', newVal);
                $log.log('convoChatbox $watch toggleDebug new value', newVal);
                $scope.toggleDebug = newVal;
            });

            _init();

            var input           =   $elem.find( 'input[type=text]')[0];
            $log.log( 'convoChatbox link input', input);


            $scope.formSubmited =   function()
            {
                $log.log( 'convoChatbox formSubmited()', $scope.message);
                var msg             =   $scope.message;

                sending             =   true;
                if ( msg) {
                    _appendBreak();
                    _appendUserMessage( msg);
                }

                _cancelMsgs();

                _getApi().sendMessage( $scope.serviceId, $scope.deviceId, msg, false, $scope.variant, $scope.delegateNlp).then( function( response) {
                    $log.log( 'convoChatbox formSubmited() sendMessage() response', response);
                    $scope.message      =   '';
                    _readResponse( response);
                }, function( reason) {
                    $log.log( 'convoChatbox formSubmited() sendMessage() reason', reason);
                }).finally( function() {
                    $log.log( 'convoChatbox formSubmited() sendMessage() finally');
                    sending             =   false;
                });

            };

            $scope.resetChat    =   function()
            {
                $log.log( 'convoChatbox resetChat()');

                $scope.messages     =   [];
                $scope.message      =   '';

                _cancelMsgs();
                sending             =   true;

                _getApi().sendMessage( $scope.serviceId, $scope.deviceId, '', true, $scope.variant, $scope.delegateNlp).then( function( response) {
                    $log.log( 'convoChatbox resetChat() sendMessage() response', response);
                    _readResponse( response);
                }, function( reason) {
                    $log.log( 'convoChatbox resetChat() sendMessage() reason', reason);
                }).finally( function() {
                    $log.log( 'convoChatbox resetChat() sendMessage() finally');
                    sending     =   false;
                });
            };
            
            $scope.formDisabled =   function()
            {
                return sending || $scope.message.trim() == '';
            };

            $scope.isSending    =   function()
            {
                return sending;
            };

            function _init()
            {
                $log.log( 'convoChatbox _init()');
                sending             =   true;

                _getApi().sendMessage( $scope.serviceId, $scope.deviceId, '', true, $scope.variant, $scope.delegateNlp).then( function( response) {
                    $log.log( 'convoChatbox _init() response', response);
                    _readResponse( response);
                }, function( reason) {
                    $log.log( 'convoChatbox _init() reason', reason);
                }).finally( function() {
                    $log.log( 'convoChatbox _init() finally');
                    sending             =   false;
                });

                UserPreferencesService.getData( 'toggleDebug').then( function( toggleDebug) {
                    $log.log( 'convoChatbox getData() toggleDebug', toggleDebug);
                    if (toggleDebug) {
                        $scope.toggleDebug = toggleDebug;
                    }
                });
            }

            function _readResponse( data)
            {
                _appendBreak();
                _appendSequence( data.text_responses, true);
                $scope.exception = data.exception;
                $scope.variables = data.variables;
                if ( data.text_reprompts.length) {
                    reprompt_timeout    =   $timeout( function() {
                        _appendBreak();
                        _appendSequence( data.text_reprompts, true);
                    }, REPROMPT_TIMEOUT);
                }
            }

            function _appendSequence( msgs, immediate)
            {
                if ( immediate) {
                    var msg =   msgs.shift();
                    _appendConvoResponse( [msg]);
                }

                if ( msgs.length) {
                    sequence_timeout    =   $timeout( function() {
                        var msg =   msgs.shift();
                        _appendConvoResponse( [msg]);
                        if ( msgs.length) {
                            _appendSequence( msgs, false);
                        }
                    }, SEQUENCE_TIMEOUT);
                }

            }

            function _cancelMsgs()
            {
                $timeout.cancel( reprompt_timeout );
                reprompt_timeout    =   null;
                $timeout.cancel( sequence_timeout );
                sequence_timeout    =   null;
            }

            function _appendBreak()
            {
                $scope.messages.push( {
                    type : 'break',
                });
            }

            function _appendConvoResponse( msgs) {
                $log.log( 'convoChatbox _appendConvoResponse()', msgs);

                for (var i=0;i<msgs.length; i++) {
                    $scope.messages.push( {
                        text : msgs[i],
                        source : 'convo',
                        avatar: 'img/pbtour-avatar-pb.png'
                    });
                }
            }

            function _appendUserMessage( msg) {
                $log.log( 'convoChatbox _appendUserMessage()', msg);
                $scope.messages.push( {
                    text : msg,
                    source : 'user',
                    avatar: 'img/pbtour-avatar-me.png'
                });
            }

            function _getApi()
            {
                if ( $scope.mode == 'public') {
                    return ConvoChatApi;
                } else if ( $scope.mode == 'admin') {
                    return ConvoworksApi;
                } else {
                    throw new Error( 'Unknown mode ['+$scope.mode+']');
                }
            }

            // ANIMATE SCROLL
            $scope.$watchCollection( 'messages', function() {
                $log.log( 'convoChatbox $watchCollection()');
                setTimeout( function() {
                    $log.log( 'convoChatbox queue()');
                    var $list           =   $elem.find( '#chat-panel-body');
                    var scrollHeight    =   $list.prop( 'scrollHeight');
                    $list.animate( { scrollTop : scrollHeight}, 500);
                },10);
            });

            // FOCUS
            $scope.$watch( function() {
                return $scope.isSending();
            }, function( sending) {
                $log.log( 'convoChatbox $watch() sending', sending);
                setTimeout( function() {
                    $log.log( 'convoChatbox input.focus()');
                    input.focus();
                },10);
            });
        }
    };
}


import appModule from './app.module';

import 'angular-local-storage';

import './app.route';

import './style.css';

//import 'angular-route';
//import 'angular-animate';
//import 'angular-bootstrap-contextmenu';
//import 'angular-cookies';
//import 'angular-sanitize';
//import 'angularjs-ui-bootstrap';
//import 'ng-file-upload';


export default appModule
    .config( function ( localStorageServiceProvider) {
      localStorageServiceProvider
        .setPrefix( 'convoAdmin')
//      .setStorageType( 'sessionStorage')
        .setNotify( true, true)
    })
    .name;


import appModule from './app.module';

appModule.config([
  '$routeProvider',
  $routeProvider => {
    $routeProvider.
            
        when('/convoworks-editor', {
            template: require( './services/convoworks-menu.tmpl.html'),
            controller: 'ConvoworksMainController',
            controllerAs: 'mainCworksVm'
        }).

        when('/convoworks-editor/:service_id', {
            template: require( './editor/convoworks-editor.tmpl.html'),
            controller: 'ConvoworksEditorController',
            controllerAs: 'editorVm',
            reloadOnSearch: false
        });
  }
]);

import angular from 'angular';

import 'angular-local-storage';

import 'angular-route';
import 'angular-animate';
import 'angular-bootstrap-contextmenu';
import 'angular-cookies';
import 'angular-sanitize';
import 'angularjs-ui-bootstrap';
import 'ng-file-upload';

import convoCommon from './common';
import convoChat from './chatbox';
import convoEditor from './editor';
import convoServices from './services';

export default angular
    .module('convo', [ 
        convoCommon,
        convoChat,
        convoEditor,
        convoServices,
        'LocalStorageModule',
        'ui.bootstrap', 'ui.bootstrap.contextMenu',
        'ngSanitize', 'ngRoute', 'ngAnimate', 'ngCookies', 
        'ngFileUpload'
    ]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImxvZ2luLXNlcnZpY2UuanMiLCJhcHAucm91dGUuanMiLCJlZGl0b3Ivd29ya2Zsb3cvdmFyaWFibGVzLWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3Ivd29ya2Zsb3cvc3Vicm91dGluZS1jb21wb25lbnQuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL3dvcmtmbG93L3NlbGVjdGFibGUtY29tcG9uZW50LmRpcmVjdGl2ZS5qcyIsImVkaXRvci93b3JrZmxvdy9pbmRleC5qcyIsImVkaXRvci93b3JrZmxvdy9jb252b3dvcmtzLWNvbXBvbmVudHMtY29udGFpbmVyLmRpcmVjdGl2ZS5qcyIsImVkaXRvci93b3JrZmxvdy9jb252b3dvcmtzLWFkZC1ibG9jay5zZXJ2aWNlLmpzIiwiZWRpdG9yL3dvcmtmbG93L2NvbnRleHQtZWxlbWVudHMtY29udGFpbmVyLmRpcmVjdGl2ZS5qcyIsImVkaXRvci93b3JrZmxvdy9jb250ZXh0LWVsZW1lbnQuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL3dvcmtmbG93L2Jsb2NrLWNvbXBvbmVudC5kaXJlY3RpdmUuanMiLCJlZGl0b3IvdG9vbGJveC9pbmRleC5qcyIsImVkaXRvci90b29sYm94L2NvbnZvd29ya3MtdG9vbGJveC5kaXJlY3RpdmUuanMiLCJlZGl0b3IvdG9vbGJveC9jb252b3dvcmtzLXRvb2xib3gtY29tcG9uZW50LmRpcmVjdGl2ZS5qcyIsImVkaXRvci9wcm9wcy9zeXN0ZW0taW50ZW50LWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3IvcHJvcHMvcHJvcGVydGllcy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL3Byb3BzL2ludGVudC11dHRlcmFuY2UtZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9wcm9wcy9pbmRleC5qcyIsImVkaXRvci9wcm9wcy9jb252by1pbnRlbnQtZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9wcmV2aWV3L3ByZXZpZXctdmFyaWFibGVzLWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3IvcHJldmlldy9wcmV2aWV3LXBhbmVsLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9wcmV2aWV3L2luZGV4LmpzIiwiZWRpdG9yL2ludGVudHMvaW50ZW50LWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3IvaW50ZW50cy9pbmRleC5qcyIsImVkaXRvci9pbnRlbnRzL2VudGl0eS1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL2NvbmZpZy92ZXJzaW9ucy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL2NvbmZpZy9yZWxlYXNlcy1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL2NvbmZpZy9taXNjLXBhbmVsLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9jb25maWcvaW5kZXguanMiLCJlZGl0b3IvY29uZmlnL2NvbmZpZy12aWJlci1lZGl0b3IuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL2NvbmZpZy9jb25maWctc2VydmljZS1tZXRhLWVkaXRvci5kaXJlY3RpdmUuanMiLCJlZGl0b3IvY29uZmlnL2NvbmZpZy1tZXNzZW5nZXItZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9jb25maWcvY29uZmlnLWRpYWxvZ2Zsb3ctZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9jb25maWcvY29uZmlnLWNvbnZvLWNoYXQtZWRpdG9yLmRpcmVjdGl2ZS5qcyIsImVkaXRvci9jb25maWcvY29uZmlnLWFtYXpvbi1lZGl0b3IuZGlyZWN0aXZlLmpzIiwic2VydmljZXMvaW5kZXguanMiLCJzZXJ2aWNlcy9jb252b3dvcmtzLW1haW4uY29udHJvbGxlci5qcyIsInNlcnZpY2VzL2NvbnZvd29ya3MtYWRkLXNlcnZpY2UuY29udHJvbGxlci5qcyIsImVkaXRvci9wcm9wZXJ0aWVzLWNvbnRleHQuZGlyZWN0aXZlLmpzIiwiZWRpdG9yL2luZGV4LmpzIiwiZWRpdG9yL2NvbnZvd29ya3MtZWRpdG9yLmNvbnRyb2xsZXIuanMiLCJlZGl0b3IvY29udm8tY29tcG9uZW50LWZhY3Rvcnkuc2VydmljZS5qcyIsImNvbW1vbi91c2VyLXByZWZlcmVuY2VzLnNlcnZpY2UuanMiLCJjb21tb24vdGV4dC1hcnJheS5kaXJlY3RpdmUuanMiLCJjb21tb24vbG9hZGluZy5kaXJlY3RpdmUuanMiLCJjb21tb24vanNvbi10ZXh0LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9pbmRleC5qcyIsImNvbW1vbi9maWx0ZXJzLmpzIiwiY29tbW9uL2RlZmVycmVkcy1zdGFjay5zZXJ2aWNlLmpzIiwiY29tbW9uL2NvbnZvd29ya3MtYXBpLmpzIiwiY29tbW9uL2FsZXJ0LXNlcnZpY2UuanMiLCJjb21tb24vYWxlcnQtaW5kaWNhdG9yLmRpcmVjdGl2ZS5qcyIsImNoYXRib3gvaW5kZXguanMiLCJjaGF0Ym94L2NvbnZvLWNoYXQtYXBpLmpzIiwiY2hhdGJveC9jaGF0Ym94LmRpcmVjdGl2ZS5qcyIsImluZGV4LmpzIiwiYXBwLm1vZHVsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeGtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QXREekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QXVEdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY29udm8tYWxsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY29udm8ud3AnLCBbICdjb252by5lZGl0b3InLCAnbmdSb3V0ZSddKTtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by53cCcpLmZhY3RvcnkoJyRleGNlcHRpb25IYW5kbGVyJywgZnVuY3Rpb24gKCRpbmplY3RvciwgJGxvZykge1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleGNlcHRpb24sIGNhdXNlKSB7XG4gICAgICAgICAgICB2YXIgQWxlcnRTZXJ2aWNlID0gJGluamVjdG9yLmdldCgnQWxlcnRTZXJ2aWNlJyk7XG4gICAgICAgICAgICBBbGVydFNlcnZpY2UuYWRkRGFuZ2VyKGV4Y2VwdGlvbi5tZXNzYWdlKTtcbiAgICAgICAgICAgICRsb2cuZXJyb3IoZXhjZXB0aW9uKTtcbi8vICAgICAgZXhjZXB0aW9uLm1lc3NhZ2UgKz0gJyAoY2F1c2VkIGJ5IFwiJyArIGNhdXNlICsgJ1wiKSc7XG4vLyAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLndwJykucnVuKFxuXG4gICAgICAgIGZ1bmN0aW9uKCAkbG9nLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sIExvZ2luU2VydmljZSkge1xuXG4gICAgICAgICAgICBMb2dpblNlcnZpY2UuZ2V0VXNlcigpLmZpbmFsbHkoIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyByZWdpc3RlciBsaXN0ZW5lciB0byB3YXRjaCByb3V0ZSBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oIFwiJHJvdXRlQ2hhbmdlU3RhcnRcIiwgZnVuY3Rpb24oIGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnJHJvdXRlQ2hhbmdlU3RhcnQgY3VycmVudCcsIGN1cnJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCckcm91dGVDaGFuZ2VTdGFydCBuZXh0JywgbmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJyRyb3V0ZUNoYW5nZVN0YXJ0IG5leHQub3JpZ2luYWxQYXRoJywgbmV4dC5vcmlnaW5hbFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCckcm91dGVDaGFuZ2VTdGFydCcsIExvZ2luU2VydmljZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghTG9naW5TZXJ2aWNlLmlzU2lnbmVkSW4oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJyRyb3V0ZUNoYW5nZVN0YXJ0IHJ1bigpIERFTlknKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBuZXh0Lm9yaWdpbmFsUGF0aCAmJiAobmV4dC5vcmlnaW5hbFBhdGggIT0gJy8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnVybCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJyRyb3V0ZUNoYW5nZVN0YXJ0IHJ1bigpIEFMTE9XJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjb252by53cCcpLmZhY3RvcnkoICdhdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoICRyb290U2NvcGUsICRxLCAkbG9nLCAkbG9jYXRpb24sIFdQX05PTkNFKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAncmVxdWVzdCc6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChXUF9OT05DRSAhPT0gdW5kZWZpbmVkICYmIFdQX05PTkNFICE9PSBudWxsICYmIFdQX05PTkNFICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnYXV0aEludGVyY2VwdG9yIHNldCBYLVdQLU5vbmNlIGhlYWRlcicsIFdQX05PTkNFKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnNbJ1gtV1AtTm9uY2UnXSA9IFdQX05PTkNFO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2F1dGhJbnRlcmNlcHRvciByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAoIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2F1dGhJbnRlcmNlcHRvciBjbGVhciB1c2VyICRsb2NhdGlvbi51cmwoKScsICRsb2NhdGlvbi51cmwoKSk7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuY2xlYXJVc2VyKCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi51cmwoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCggcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggcmVzcG9uc2Uuc3RhdHVzID49IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdhdXRoSW50ZXJjZXB0b3IgcmVqZWN0aW5nIHJlc3BvbnNlLnN0YXR1cycsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgJHEud2hlbiggcmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NvbnZvLndwJykuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ2F1dGhJbnRlcmNlcHRvcicpO1xuICAgIH0pO1xuXG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2NvbnZvLndwJylcbiAgICAgICAgLnNlcnZpY2UoJ0xvZ2luU2VydmljZScsIExvZ2luU2VydmljZSk7XG5cbiAgICAvKiBAbmdJbmplY3QgKi9cbiAgICBmdW5jdGlvbiBMb2dpblNlcnZpY2UoICRsb2csICRxLCBXUF9VU0VSKSB7XG5cbiAgICAgICAgdGhpcy5pc1NpZ25lZEluICAgIFx0PSAgIGlzU2lnbmVkSW47XG4gICAgICAgIHRoaXMuZ2V0VXNlciAgIFx0XHQ9ICAgZ2V0VXNlcjtcblxuICAgICAgICBmdW5jdGlvbiBnZXRVc2VyKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkXHQ9XHQkcS5kZWZlcigpO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggV1BfVVNFUik7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzU2lnbmVkSW4oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgfVxufSkoKTsiLCJcbmltcG9ydCBhcHBNb2R1bGUgZnJvbSAnLi9hcHAubW9kdWxlJztcblxuYXBwTW9kdWxlLmNvbmZpZyhbXG4gICckcm91dGVQcm92aWRlcicsXG4gICRyb3V0ZVByb3ZpZGVyID0+IHtcbiAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgIFxuICAgICAgICB3aGVuKCcvY29udm93b3Jrcy1lZGl0b3InLCB7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogcmVxdWlyZSggJy4vc2VydmljZXMvY29udm93b3Jrcy1tZW51LnRtcGwuaHRtbCcpLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnZvd29ya3NNYWluQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICdtYWluQ3dvcmtzVm0nXG4gICAgICAgIH0pLlxuXG4gICAgICAgIHdoZW4oJy9jb252b3dvcmtzLWVkaXRvci86c2VydmljZV9pZCcsIHtcbiAgICAgICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCAnLi9lZGl0b3IvY29udm93b3Jrcy1lZGl0b3IudG1wbC5odG1sJyksXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnZWRpdG9yVm0nLFxuICAgICAgICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgICAgIH0pO1xuICB9XG5dKTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdmFyaWFibGVzLWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2YXJpYWJsZXNFZGl0b3IoICRsb2cpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuICAgICAgICAgICAgLy8gUVVJQ0tGSVhcbiAgICAgICAgICAgIGlmICggISRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlcyAgICA9ICAge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICRzY29wZS5hZGRWYXJpYWJsZXNQYWlyICAgICA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50X2dyZWF0ZXN0X2luZGV4ICA9ICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIubGVuZ3RoIC0gMSA8IDA/IDAgOiAkc2NvcGUudmFyaWFibGVzX2J1ZmZlci5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgdmFyIG5ld19wYWlyICAgID0gICB7ICdrZXknOiAndG1wX2tleV8nICsgY3VycmVudF9ncmVhdGVzdF9pbmRleCwgJ3ZhbHVlJzogJ3RtcF92YWx1ZScgfTtcblxuICAgICAgICAgICAgICAgICRzY29wZS52YXJpYWJsZXNfYnVmZmVyLnB1c2goIG5ld19wYWlyKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5yZW1vdmVWYXJpYWJsZXNQYWlyICA9ICAgZnVuY3Rpb24oIGkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIuc3BsaWNlKCBpLCAxKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIElOSVRcbiAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0KClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBfc2V0dXBWYXJpYWJsZXNCdWZmZXIoKTtcbiAgICAgICAgICAgICAgICBfc2V0dXBTZXJ2aWNlV2F0Y2goKTtcbiAgICAgICAgICAgICAgICBfc2V0dXBCdWZmZXJXYXRjaCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQUklWQVRFXG4gICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBWYXJpYWJsZXNCdWZmZXIoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS52YXJpYWJsZXNfYnVmZmVyID0gICBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAoIHZhciBrZXkgaW4gJHNjb3BlLnNlcnZpY2UudmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS52YXJpYWJsZXNfYnVmZmVyLnB1c2goIHsgJ2tleSc6IGtleSwgJ3ZhbHVlJzogJHNjb3BlLnNlcnZpY2UudmFyaWFibGVzW2tleV0gfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGxvZy5sb2coICd2YXJpYWJsZXNFZGl0b3IgX3NldHVwVmFyaWFibGVzQnVmZmVyKCkgZG9uZSwgYnVmZmVyJywgJHNjb3BlLnZhcmlhYmxlc19idWZmZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBTZXJ2aWNlV2F0Y2goKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3NlcnZpY2UudmFyaWFibGVzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpO1xuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBCdWZmZXJXYXRjaCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggJ3ZhcmlhYmxlc19idWZmZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFFVSUNLRklYXG4gICAgICAgICAgICAgICAgICAgIGlmICggIU9iamVjdC5rZXlzKCAkc2NvcGUuc2VydmljZS52YXJpYWJsZXMpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UudmFyaWFibGVzICAgID0gICBbXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlcyAgICA9ICAge307XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaSBpbiAkc2NvcGUudmFyaWFibGVzX2J1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhaXIgICAgICAgID0gICAkc2NvcGUudmFyaWFibGVzX2J1ZmZlcltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzYWZlX2tleSAgICA9ICAgX3Nhbml0aXplS2V5KCBwYWlyLmtleSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnZhcmlhYmxlc1tzYWZlX2tleV0gID0gICBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge31cbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9zYW5pdGl6ZUtleSgga2V5KVxue1xuICAgIHJldHVybiBrZXkucmVwbGFjZSggL1xcc3syLH1cXC4tLywgJ18nKTtcbn0iLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3N1YnJvdXRpbmUtY29tcG9uZW50LnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN1YnJvdXRpbmVDb21wb25lbnQoICRsb2csICR0aW1lb3V0LCBDb252b3dvcmtzQXBpKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZTogeyAnYmxvY2snIDogJz0nLCAnY2FuTW92ZVVwJzogJz0nLCAnY2FuTW92ZURvd24nOiAnPScgfSxcbiAgICAgICAgICAgIHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXG4gICAgICAgICAgICAgICAgLy8gQVBJXG4gICAgICAgICAgICAgICAgJHNjb3BlLm92ZXIgICAgICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVhZHkgICAgICAgICAgICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgICAgICA9ICAgXCJcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50TmFtZSAgICAgICAgPSAgIFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNSZWFkQmxvY2sgICAgICAgICAgPSAgIGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdldENvbXBvbmVudFRpdGxlICAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhJHNjb3BlLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnR2VuZXJhdGluZyB0aXRsZSAuLi4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuZnJhZ21lbnRfaWQgKyAnJztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzU2VsZWN0ZWQgICA9ICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3Rpb24oKS5jb21wb25lbnQgPT09ICRzY29wZS5ibG9jaztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZU9wZW4gICA9ICAgZnVuY3Rpb24oIHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blblt0eXBlXSAgPSAgICFvcGVuW3R5cGVdO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNPcGVuICAgPSAgIGZ1bmN0aW9uKCB0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcGVuW3R5cGVdO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCAnJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50ICRkZXN0cm95Jyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubW92ZVVwID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdtb3ZlRnJhZ21lbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudElkOiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCArICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyOiAtMVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubW92ZURvd24gPSBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ21vdmVGcmFnbWVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50SWQ6ICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkICsgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXI6IDFcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSU5JVFxuICAgICAgICAgICAgICAgIHZhciBvcGVuICAgID0gICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50cyA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc29ycyA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfaW5pdCgpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXQoKVxuICAgICAgICAgICAgICAgIHtcbi8vICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IF9pbml0KCkgZ290ICcsICckc2NvcGUuYmxvY2sucHJvcGVydGllcy5zdWJyb3V0aW5lX2lkIFsnKyRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLnN1YnJvdXRpbmVfaWQrJ10nLCAnJHNjb3BlLmJsb2NrJywgJHNjb3BlLmJsb2NrKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VydmljZUlkID0gcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKClbJ3NlcnZpY2VfaWQnXTtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ3N1YnJvdXRpbmVDb21wb25lbnQgZ29pbmcgdG8gZ2V0IGRlZmluaXRpb24nLCBzZXJ2aWNlSWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmJsb2NrLmNsYXNzID09ICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXEVsZW1lbnRzXFxcXEVsZW1lbnRzRnJhZ21lbnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldENvbXBvbmVudERlZmluaXRpb24oIHNlcnZpY2VJZCwgJ1xcXFxDb252b1xcXFxQY2tnXFxcXENvcmVcXFxcRWxlbWVudHNcXFxcRWxlbWVudHNGcmFnbWVudCcpLnRoZW4oIGZ1bmN0aW9uKCBkZWZpbml0aW9uKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IGdvdCBkZWZpbml0aW9uJywgZGVmaW5pdGlvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50VGl0bGUgICAgICAgPSAgICdGcmFnbWVudCAtICcgKyAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCArICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnROYW1lICAgICAgICA9ICAgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVmaW5pdGlvbiAgICAgICAgICAgPSAgIGRlZmluaXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnByb3BlcnR5TmFtZSAgICAgICAgID0gICAnZWxlbWVudHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eURlZmluaXRpb24gICA9ICAgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5lbGVtZW50cztcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdzdWJyb3V0aW5lQ29tcG9uZW50IGdvdCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IGRlZmluaXRpb25zIGZpbmFsbHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVhZHkgICAgICAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCAkc2NvcGUuYmxvY2suY2xhc3MgPT0gJ1xcXFxDb252b1xcXFxQY2tnXFxcXENvcmVcXFxcUHJvY2Vzc29yc1xcXFxQcm9jZXNzb3JGcmFnbWVudCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggc2VydmljZUlkLCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3N1YnJvdXRpbmVDb21wb25lbnQgZ290IGRlZmluaXRpb24nLCBkZWZpbml0aW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgICAgICA9ICAgJ0ZyYWdtZW50IC0gJyArICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkICsgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudE5hbWUgICAgICAgID0gICAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5kZWZpbml0aW9uICAgICAgICAgICA9ICAgZGVmaW5pdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHlOYW1lICAgICAgICAgPSAgICdwcm9jZXNzb3JzJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uICAgPSAgIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMucHJvY2Vzc29ycztcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdzdWJyb3V0aW5lQ29tcG9uZW50IGdvdCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzdWJyb3V0aW5lQ29tcG9uZW50IGRlZmluaXRpb25zIGZpbmFsbHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVhZHkgICAgICAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnVW5leHBlY3RlZCBzdWJyb3V0aW5lIHR5cGUgWycrJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuX3dvcmtmbG93KyddJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2luaXRDbGljaygpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfaW5pdENsaWNrKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZGl2ICAgID0gICAkZWxlbWVudC5maW5kKCAnZGl2LnNlbGVjdGFibGUtY29tcG9uZW50JylbMF07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRhaW5lckNvbnRyb2xsZXIgPSAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVNlbGVjdGlvbjogZnVuY3Rpb24oKSB7IHByb3BlcnRpZXNDb250ZXh0LnJlbW92ZVN1YnJvdXRpbmUoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkKTsgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICAgICAgJCgkZGl2KS5iaW5kKCAnY2xpY2snLCBmdW5jdGlvbiggZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5pc1NlbGVjdGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCAkc2NvcGUuYmxvY2ssIGNvbnRhaW5lckNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9zZWxlY3RhYmxlLWNvbXBvbmVudC50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWxlY3RhYmxlQ29tcG9uZW50KCAkbG9nLCBDb252b3dvcmtzQXBpLCAkdGltZW91dCwgJGNvbXBpbGUpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7ICdjb21wb25lbnQnIDogJz0nIH0sXG4gICAgICAgICAgICByZXF1aXJlOiBbICdecHJvcGVydGllc0NvbnRleHQnICwgJ15jb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciddLFxuICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCAkY3RybHMpIHtcblxuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzQ29udGV4dCAgICAgICAgICAgICAgID0gICAkY3RybHNbMF07XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyICAgPSAgICRjdHJsc1sxXTtcbiAgICAgICAgICAgICAgICB2YXIgJGRyYWdnYWJsZTtcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZSAgICAgICAgICAgICAgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpO1xuLy8gICAgICAgICAgICAgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBsaW5rKCkgJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dUaXRsZSAgICAgICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICRzY29wZS5vdmVyICAgICAgICAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ICAgICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50VGl0bGUgICAgICAgPSAgIFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNFbGVtZW50ICAgICAgICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5pc1Byb2Nlc3NvciAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzRmlsdGVyICAgICAgICAgICAgID0gICBmYWxzZTtcblxuICAgICAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNTZWxlY3RlZCAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLmNvbXBvbmVudCA9PT0gJHNjb3BlLmNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdldEJsb2NrTmFtZSA9ICAgZnVuY3Rpb24oIGJsb2NrSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBibG9jayAgID0gICBwcm9wZXJ0aWVzQ29udGV4dC5maW5kQmxvY2soIGJsb2NrSWQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoICggZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ0lEOiAnICsgYmxvY2tJZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIGJsb2NrLnByb3BlcnRpZXMubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrLnByb3BlcnRpZXMubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ0lEOiAnICsgYmxvY2tJZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U3Vicm91dGluZU5hbWUgICAgPSAgIGZ1bmN0aW9uKCBmcmFnbWVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJhZ21lbnQgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmZpbmRTdWJyb3V0aW5lKCBmcmFnbWVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoIGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdJRDogJyArIGZyYWdtZW50SWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCBmcmFnbWVudC5wcm9wZXJ0aWVzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmcmFnbWVudC5wcm9wZXJ0aWVzLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdJRDogJyArIGZyYWdtZW50SWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzQ3V0ICAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnRpZXNDb250ZXh0LmlzQ3V0KCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0Q29udGV4dE9wdGlvbnMgICAgPSAgIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gICBbXTtcblxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ0N1dCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uICgkaXRlbVNjb3BlLCAkZXZlbnQsIG1vZGVsVmFsdWUsIHRleHQsICRsaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBjdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuY3V0KCBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciwgJHNjb3BlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnQ29weScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uICgkaXRlbVNjb3BlLCAkZXZlbnQsIG1vZGVsVmFsdWUsIHRleHQsICRsaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBjb3B5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmNvcHkoICRzY29wZS5jb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIHByb3BlcnRpZXNDb250ZXh0Lmhhc0NsaXBib2FyZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnUGFzdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKCRpdGVtU2NvcGUsICRldmVudCwgbW9kZWxWYWx1ZSwgdGV4dCwgJGxpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBwYXN0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ICAgICAgID0gICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5pbmRleE9mKCAkc2NvcGUuY29tcG9uZW50KSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5wYXN0ZSggY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ0RlbGV0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uICgkaXRlbVNjb3BlLCAkZXZlbnQsIG1vZGVsVmFsdWUsIHRleHQsICRsaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgY29udGV4dCBkZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3Rpb24oKS5jb21wb25lbnQgPT09ICRzY29wZS5jb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5yZW1vdmVDb21wb25lbnQoICRzY29wZS5jb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oICckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgJGRlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRkcmFnZ2FibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRkcmFnZ2FibGUuZHJhZ2dhYmxlKHtkaXNhYmxlZDogdHJ1ZX0pLmRyYWdnYWJsZSggJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXQoKVxuICAgICAgICAgICAgICAgIHtcbi8vICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0KCkgJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICggISRzY29wZS5jb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ05vIGNvbXBvbmVudCBkZWZpbmVkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0KCkgZ290IGNsYXNzIFsnKyRzY29wZS5jb21wb25lbnRbJ2NsYXNzJ10rJ10nLCAnJHNjb3BlLmNvbXBvbmVudCcsICRzY29wZS5jb21wb25lbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjbGFzc19uYW1lICA9ICAgICAgICRzY29wZS5jb21wb25lbnRbJ2NsYXNzJ107XG4gICAgICAgICAgICAgICAgICAgIGlmICggIWNsYXNzX25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBfaW5pdCgpICRzY29wZS5jb21wb25lbnQnLCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ05vIGNsYXNzIGluIGNvbXBvbmVudCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKClbJ3NlcnZpY2VfaWQnXSwgY2xhc3NfbmFtZSkudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVmaW5pdGlvbiAgICAgICA9ICAgZGVmaW5pdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgID0gICBkZWZpbml0aW9uLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNFbGVtZW50ICAgICAgICA9ICAgZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9pbnRlcmZhY2UgPT09ICdcXFxcQ29udm9cXFxcQ29yZVxcXFxXb3JrZmxvd1xcXFxJQ29udmVyc2F0aW9uUHJvY2Vzc29yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNQcm9jZXNzb3IgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFRpdGxlICAgPSAgIGRlZmluaXRpb24ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9pbnRlcmZhY2UgPT09ICdcXFxcQ29udm9cXFxcQ29yZVxcXFxXb3JrZmxvd1xcXFxJUmVxdWVzdEZpbHRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzRmlsdGVyICAgICAgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faW50ZXJmYWNlID09PSAnXFxcXENvbnZvXFxcXENvcmVcXFxcV29ya2Zsb3dcXFxcSUNvbnZlcnNhdGlvbkVsZW1lbnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc0VsZW1lbnQgICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXIgJiYgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fd29ya2Zsb3cgIT0gJ3Byb2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dUaXRsZSAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvciggJ3NlbGVjdGFibGVDb21wb25lbnQgZGVmaW5pdGlvbnMgZ290IHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IGRlZmluaXRpb25zIGZpbmFsbHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHlBc3luYyggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ICAgICAgICAgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ29vZCBvbGQgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9pbml0UHJldmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9pbml0RHJhZ2dhYmxlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2luaXREcm9wcGFibGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfaW5pdENsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXREcmFnZ2FibGUoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyYWdnYWJsZSAgPSAgICQoJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdKTtcbi8vICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IGxpbmsoKSAkZHJhZ2dhYmxlJywgJGRyYWdnYWJsZSk7XG4gICAgICAgICAgICAgICAgICAgICRkcmFnZ2FibGUuZHJhZ2dhYmxlKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnREdXJhdGlvbiA6IDUwLFxuICAgICAgICAgICAgICAgICAgICAgICAgekluZGV4OiAxMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheSA6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvbGVyYW5jZSA6ICdwb2ludGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZFRvOiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWxwZXI6ICdjbG9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZyZXNoUG9zaXRpb25zOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmRhdGEoICdjb21wb25lbnQnLCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmRhdGEoICdjb252b0RyYWdnZWQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAnY29tcG9uZW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IDogJHNjb3BlLmNvbXBvbmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQ29udHJvbGxlciA6IGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5oZWxwZXIuYmluZCggXCJjbGljay5wcmV2ZW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihldmVudCkgeyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiggZXZlbnQsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3VpLmhlbHBlci51bmJpbmQoXCJjbGljay5wcmV2ZW50XCIpO30sIDMwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfaW5pdERyb3BwYWJsZSgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGRyb3BwYWJsZSAgPSAgICQoJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdKTtcblxuICAgICAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLmRyb3BwYWJsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkcm9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhICAgICAgICA9ICAgdWkuZHJhZ2dhYmxlLmRhdGEoJ2NvbnZvRHJhZ2dlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnc2VsZWN0YWJsZUNvbXBvbmVudCBkcm9wIGV2ZW50JywgZXZlbnQsICd1aScsIHVpLCAnZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGRhdGEuaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3NlbGVjdGFibGVDb21wb25lbnQgYWxyZWFkeSBoYW5kbGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggICAgID0gICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5pbmRleE9mKCAkc2NvcGUuY29tcG9uZW50KSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGF0YS50eXBlID09ICdkZWZpbml0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IG5ldyBjb21wb25lbnQnLCBkYXRhLmNvbXBvbmVudERlZmluaXRpb24sICd0byBjb250YWluZXInLCAkc2NvcGUuY29udGFpbmVyLCAnaW4gY29tcG9uZW50JywgJHNjb3BlLmNvbXBvbmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmFkZE5ld0NvbXBvbmVudChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuY29tcG9uZW50RGVmaW5pdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIGRhdGEudHlwZSA9PSAnY29tcG9uZW50Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IG1vdmUgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5tb3ZlQ29tcG9uZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbnRhaW5lckNvbnRyb2xsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbXBvbmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdFeHBlY3RlZCB0byBoYXZlIHR5cGUgW2RlZmluaXRpb25dIG9yIFtjb21wb25lbnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5oYW5kbGVkICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdzZWxlY3RhYmxlQ29tcG9uZW50IEV4cGVjdGVkIHRvIGhhdmUgW2NvbnZvRHJhZ2dlZF0gZGF0YSAgWycrZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSsnXScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChldmVudC50YXJnZXQpLnJlbW92ZUNsYXNzKCd1aS1kcm9wcGFibGUtaG92ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2luaXRDbGljaygpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGRpdiAgICA9ICAgJGVsZW1lbnQuZmluZCggJ2Rpdi5zZWxlY3RhYmxlLWNvbXBvbmVudCcpWzBdO1xuICAgICAgICAgICAgICAgICAgICAkKCRkaXYpLmJpbmQoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IGNsaWNrICRzY29wZS5pc1NlbGVjdGVkKCknLCAkc2NvcGUuaXNTZWxlY3RlZCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmlzU2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5zZXRTZWxlY3RlZENvbXBvbmVudCggbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoICRzY29wZS5jb21wb25lbnQsIHsgcmVtb3ZlU2VsZWN0aW9uOiBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lci5yZW1vdmVDb21wb25lbnQgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfaW5pdFByZXZpZXcoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb250YWluZXIgICA9ICAgJGVsZW1lbnQuZmluZCggJy5wcmV2aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX3ByZXZpZXdfYW5ndWxhcikge1xuLy8gICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdzZWxlY3RhYmxlQ29tcG9uZW50IF9pbml0UHJldmlldygpICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXInLCAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fcHJldmlld19hbmd1bGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodG1sICAgICAgICA9ICAgJHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX3ByZXZpZXdfYW5ndWxhci50ZW1wbGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5odG1sKCBodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRjb21waWxlKCBjb250YWluZXIuY29udGVudHMoKSkoICRzY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuaHRtbCggJycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4iLCJpbXBvcnQgYW5ndWxhciBmcm9tICdhbmd1bGFyJztcblxuaW1wb3J0IGJsb2NrQ29tcG9uZW50IGZyb20gJy4vYmxvY2stY29tcG9uZW50LmRpcmVjdGl2ZSc7XG5pbXBvcnQgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgZnJvbSAnLi9jb252b3dvcmtzLWNvbXBvbmVudHMtY29udGFpbmVyLmRpcmVjdGl2ZSc7XG5pbXBvcnQgc2VsZWN0YWJsZUNvbXBvbmVudCBmcm9tICcuL3NlbGVjdGFibGUtY29tcG9uZW50LmRpcmVjdGl2ZSc7XG5pbXBvcnQgc3Vicm91dGluZUNvbXBvbmVudCBmcm9tICcuL3N1YnJvdXRpbmUtY29tcG9uZW50LmRpcmVjdGl2ZSc7XG5pbXBvcnQgdmFyaWFibGVzRWRpdG9yIGZyb20gJy4vdmFyaWFibGVzLWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UgZnJvbSAnLi9jb252b3dvcmtzLWFkZC1ibG9jay5zZXJ2aWNlJztcblxuaW1wb3J0IGNvbnRleHRFbGVtZW50IGZyb20gJy4vY29udGV4dC1lbGVtZW50LmRpcmVjdGl2ZSc7XG5pbXBvcnQgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyIGZyb20gJy4vY29udGV4dC1lbGVtZW50cy1jb250YWluZXIuZGlyZWN0aXZlJztcblxuZXhwb3J0IGRlZmF1bHQgYW5ndWxhclxuICAubW9kdWxlKCdjb252by5lZGl0b3Iud29ya2Zsb3cnLCBbXSlcbiAgLnNlcnZpY2UoJ0NvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UnLCBDb252b3dvcmtzQWRkQmxvY2tTZXJ2aWNlKVxuICAuZGlyZWN0aXZlKCdibG9ja0NvbXBvbmVudCcsIGJsb2NrQ29tcG9uZW50KVxuICAuZGlyZWN0aXZlKCdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lcicsIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyKVxuICAuZGlyZWN0aXZlKCdzZWxlY3RhYmxlQ29tcG9uZW50Jywgc2VsZWN0YWJsZUNvbXBvbmVudClcbiAgLmRpcmVjdGl2ZSgnc3Vicm91dGluZUNvbXBvbmVudCcsIHN1YnJvdXRpbmVDb21wb25lbnQpXG4gIC5kaXJlY3RpdmUoJ3ZhcmlhYmxlc0VkaXRvcicsIHZhcmlhYmxlc0VkaXRvcilcbiAgLmRpcmVjdGl2ZSgnY29udGV4dEVsZW1lbnQnLCBjb250ZXh0RWxlbWVudClcbiAgLmRpcmVjdGl2ZSgnY29udGV4dEVsZW1lbnRzQ29udGFpbmVyJywgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyKVxuICAubmFtZTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vY29udm93b3Jrcy1jb21wb25lbnRzLWNvbnRhaW5lci50bXBsLmh0bWwnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyKCAkbG9nLCAkdGltZW91dClcbiAgICB7XG4gICAgICAgIHZhciBBVVRPX09QRU5fVElNRU9VVCAgID0gICAxNTAwO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZTogeyBcbiAgICAgICAgICAgICAgICAnY29tcG9uZW50JyA6ICc9JyxcbiAgICAgICAgICAgICAgICAncHJvcGVydHlOYW1lJyA6ICc9JyxcbiAgICAgICAgICAgICAgICAncHJvcGVydHlEZWZpbml0aW9uJyA6ICc9JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXF1aXJlOiBbICdeY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXInLCAnXnByb3BlcnRpZXNDb250ZXh0J10sXG4gICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgICAgICBjb250cm9sbGVyIDogZnVuY3Rpb24gKCAkc2NvcGUpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmdldFByb3BlcnR5RGVmaW5pdGlvbiAgICAgID0gICBnZXRQcm9wZXJ0eURlZmluaXRpb247XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRDb250YWluZXIgICAgICAgICAgICAgICA9ICAgZ2V0Q29udGFpbmVyO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNNdWx0aXBsZSAgICAgICAgICAgICAgICAgPSAgIGlzTXVsdGlwbGU7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleE9mICAgICAgICAgICAgICAgICAgICA9ICAgaW5kZXhPZjtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCAgICAgICAgICAgICAgID0gICBhZGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQgICAgICAgICAgICA9ICAgcmVtb3ZlQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldFByb3BlcnR5RGVmaW5pdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0Q29udGFpbmVyKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLnByb3BlcnR5TmFtZS5pbmRleE9mKCAnLicpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvICAgICAgID0gICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFydHMgICA9ICAgJHNjb3BlLnByb3BlcnR5TmFtZS5zcGxpdCggJy4nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvICAgPSAgIG9bcGFydHNbaV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmNvbXBvbmVudCAmJiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdO1xuXG4gICAgICAgICAgICAgICAgICAgICRsb2cud2FybiggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGNvbnRyb2xsZXIgZ2V0Q29udGFpbmVyKCkgbm8gcHJvcGVydHkgWycrJHNjb3BlLnByb3BlcnR5TmFtZSsnXSBpbiAkc2NvcGUuY29tcG9uZW50JywgJHNjb3BlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzTXVsdGlwbGUoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5wcm9wZXJ0eURlZmluaXRpb24uZWRpdG9yX3Byb3BlcnRpZXMubXVsdGlwbGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluZGV4T2YoIGNvbXBvbmVudClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggaXNNdWx0aXBsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q29udGFpbmVyKCkuaW5kZXhPZiggY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWRkQ29tcG9uZW50KCBjb21wb25lbnQsIGluZGV4KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ICAgPSAgIDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICggaXNNdWx0aXBsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGNvbnRyb2xsZXIgYWRkQ29tcG9uZW50KCkgYWRkaW5nIGNvbXBvbmVudCcsIGNvbXBvbmVudCwgJ2F0IGluZGV4JywgaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0Q29udGFpbmVyKCkuc3BsaWNlKCBpbmRleCwgMCwgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBjb250cm9sbGVyIGFkZENvbXBvbmVudCgpIHNldHRpbmcgY29tcG9uZW50JywgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdICAgID0gICBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudCggY29tcG9uZW50KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCBpc011bHRpcGxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCAgID0gICBnZXRDb250YWluZXIoKS5pbmRleE9mKCBjb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBjb250cm9sbGVyIHJlbW92ZUNvbXBvbmVudCgpIHJlbW92aW5nIGNvbXBvbmVudCcsIGNvbXBvbmVudCwgJ2Zyb20gaW5kZXgnLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRDb250YWluZXIoKS5zcGxpY2UoIGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBjb250cm9sbGVyIHJlbW92ZUNvbXBvbmVudCgpIHNldHRpbmcgY29udGFpbmVyIGF0IG51bGwnKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdICAgID0gICBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsICRjdHJscykge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciAgID0gICAkY3RybHNbMF07XG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXNDb250ZXh0ICAgICAgICAgICAgICAgPSAgICRjdHJsc1sxXTtcbi8vICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGxpbmsoKSAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLnByb3BlcnR5TmFtZV0nLCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLnByb3BlcnR5TmFtZV0sICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lcicsIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgb3BlbiAgICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBvcGVuX3RpbWVyICA9ICAgbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoICdkZWZhdWx0T3BlbicgaW4gJHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvbikge1xuLy8gICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIHNldHRpbmcgZGVmYXVsdE9wZW4nLCAkc2NvcGUucHJvcGVydHlEZWZpbml0aW9uWydkZWZhdWx0T3BlbiddKTtcbiAgICAgICAgICAgICAgICAgICAgb3BlbiAgICA9ICAgJHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvblsnZGVmYXVsdE9wZW4nXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgX2luaXREcm9wcGFibGVCYWNrZ3JvdW5kKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgX2luaXREcm9wcGFibGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBUElcbiAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlT3BlbiAgICAgICA9ICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wZW4gICAgPSAgICFvcGVuO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiAgICAgICA9ICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcGVuO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3VsZEhpZGUgICA9ICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggIWNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLmdldENvbnRhaW5lcigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnByb3BlcnR5RGVmaW5pdGlvbi5lZGl0b3JfcHJvcGVydGllcy5oaWRlV2hlbkVtcHR5ICYmIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLmdldENvbnRhaW5lcigpLmxlbmd0aCA9PSAwOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdldENvbnRhaW5lciA9ICAgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIuZ2V0Q29udGFpbmVyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRDb250ZXh0T3B0aW9ucyAgICA9ICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9ICAgW107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIHByb3BlcnRpZXNDb250ZXh0Lmhhc0NsaXBib2FyZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnUGFzdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKCRpdGVtU2NvcGUsICRldmVudCwgbW9kZWxWYWx1ZSwgdGV4dCwgJGxpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGNvbnRleHQgcGFzdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnBhc3RlKCBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciwgY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIuZ2V0Q29udGFpbmVyKCkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7ICAgIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiJGRlc3Ryb3lcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCBldmVudCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggb3Blbl90aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCggb3Blbl90aW1lciApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5fdGltZXIgICAgPSAgIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUFJJVkFURVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0RHJvcHBhYmxlKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZHJvcHBhYmxlICA9ICAgJCgkZWxlbWVudC5maW5kKCAnLnByb3AtY29udGFpbmVyJylbMF0pO1xuICAgICAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLmRyb3BwYWJsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkcm9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhICAgID0gICB1aS5kcmFnZ2FibGUuZGF0YSgnY29udm9EcmFnZ2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBkcm9wIGV2ZW50JywgZXZlbnQsICd1aScsIHVpLCAnZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGRhdGEuaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIGFscmVhZHkgaGFuZGxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGF0YS50eXBlID09ICdkZWZpbml0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBuZXcgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnREZWZpbml0aW9uLCAndG8gY29udGFpbmVyJywgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5wcm9wZXJ0eU5hbWVdLCAnaW4gY29tcG9uZW50JywgJHNjb3BlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmFkZE5ld0NvbXBvbmVudCggXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb21wb25lbnREZWZpbml0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICggZGF0YS50eXBlID09ICdjb21wb25lbnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvd29ya3NDb21wb25lbnRzQ29udGFpbmVyIG1vdmUgY29tcG9uZW50JywgZGF0YS5jb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5tb3ZlQ29tcG9uZW50KCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb250YWluZXJDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuY29tcG9uZW50KTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0V4cGVjdGVkIHRvIGhhdmUgdHlwZSBbZGVmaW5pdGlvbl0gb3IgW2NvbXBvbmVudF0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmhhbmRsZWQgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdjb252b3dvcmtzQ29tcG9uZW50c0NvbnRhaW5lciBFeHBlY3RlZCB0byBoYXZlIFtjb252b0RyYWdnZWRdIGRhdGEgWycrZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSsnXScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcjogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAhb3Blbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5fdGltZXIgICAgPSAgICR0aW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgQVVUT19PUEVOX1RJTUVPVVQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0OiBmdW5jdGlvbiggZXZlbnQsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIG9wZW5fdGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoIG9wZW5fdGltZXIgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuX3RpbWVyICAgID0gICBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfaW5pdERyb3BwYWJsZUJhY2tncm91bmQoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRkcm9wcGFibGUgID0gICAkKCRlbGVtZW50LmZpbmQoICcucmVhbC1jb250YWluZXInKVswXSk7XG4vLyAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgX2luaXREcm9wcGFibGVCYWNrZ3JvdW5kKCkgJGRyb3BwYWJsZScsICRkcm9wcGFibGUpO1xuLy8gICAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLm9uKCAnZHJhZ292ZXInLCBmdW5jdGlvbiggZXZlbnQpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgX2luaXREcm9wcGFibGVCYWNrZ3JvdW5kKCknKTtcbi8vICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuLy8gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLmRyb3BwYWJsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4vLyAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQgOiAnI3BhdHRlcm4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcjogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZTogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4vLyAgICAgICAgICAgICAgICAgICAgICBvdXQ6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4vLyAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IiwiXG5cbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2NvbnZvd29ya3MtYWRkLWJsb2NrLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UoICRsb2csICR1aWJNb2RhbCkge1xuXG4gICAgdGhpcy5zaG93TW9kYWwgICAgICAgICAgICAgID0gICBzaG93TW9kYWw7XG4gICAgdGhpcy5zaG93U3Vicm91dGluZU1vZGFsICAgID0gICBzaG93U3Vicm91dGluZU1vZGFsO1xuICAgIFxuICAgIGZ1bmN0aW9uIHNob3dNb2RhbCggc2VydmljZSwgdHlwZSwgcHJvcGVydGllc0NvbnRleHQpXG4gICAge1xuICAgICAgICB2YXIgbW9kYWxJbnN0YW5jZSA9ICR1aWJNb2RhbC5vcGVuKHtcbiAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IE1vZGFsSW5zdGFuY2VDdHJsLFxuICAgICAgICAgICAgc2l6ZSA6ICdtZCcsXG4gICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VydmljZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWJyb3V0aW5lVHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0aWVzQ29udGV4dDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHNob3dTdWJyb3V0aW5lTW9kYWwoIHNlcnZpY2UsIHByb3BlcnRpZXNDb250ZXh0LCBzdWJyb3V0aW5lVHlwZSlcbiAgICB7XG4gICAgICAgIHZhciBtb2RhbEluc3RhbmNlID0gJHVpYk1vZGFsLm9wZW4oe1xuICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICAgICAgY29udHJvbGxlcjogTW9kYWxJbnN0YW5jZUN0cmwsXG4gICAgICAgICAgICBzaXplIDogJ21kJyxcbiAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZXJ2aWNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3JlYWRlcic7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWJyb3V0aW5lVHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3Vicm91dGluZVR5cGU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydGllc0NvbnRleHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgXG4gICAgLyogQG5nSW5qZWN0ICovXG4gICAgdmFyIE1vZGFsSW5zdGFuY2VDdHJsID0gZnVuY3Rpb24gKCAkc2NvcGUsICR0aW1lb3V0LCAkdWliTW9kYWxJbnN0YW5jZSwgc2VydmljZSwgdHlwZSwgc3Vicm91dGluZVR5cGUsIHByb3BlcnRpZXNDb250ZXh0KSB7XG5cbiAgICAgICAgJHNjb3BlLnNlcnZpY2UgICAgICAgICAgPSAgIHNlcnZpY2U7XG5cbiAgICAgICAgJHNjb3BlLmJsb2NrICAgICAgICAgICAgPSAgIHtcbiAgICAgICAgICAgICAgICBuYW1lIDogJycsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoIHR5cGUgPT0gJ3VzZXInKSBcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnRpdGxlICAgICAgICAgICAgPSAgICdBZGQgbmV3IHN0ZXAnO1xuICAgICAgICAgICAgJHNjb3BlLmRlc2NyaXB0aW9uICAgICAgPSAgICdDcmVhdGUgYSBuZXcgc3RlcCBpbiByaGUgY29udmVyc2F0aW9uIHdvcmtmbG93Lic7XG4gICAgICAgICAgICAkc2NvcGUuYmxvY2submFtZSAgICAgICA9ICAgJ015IG5ldyBjb252ZXJzYXRpb24gc3RlcCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5jcmVhdGVCbG9jayAgICAgICAgICA9ICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRsb2cud2FybiggJ0NvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UgTW9kYWxJbnN0YW5jZUN0cmwgY3JlYXRlQmxvY2soKSAkc2NvcGUuYmxvY2snLCAkc2NvcGUuYmxvY2spO1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmFkZEJsb2NrKCAkc2NvcGUuYmxvY2submFtZSk7XG4gICAgICAgICAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IFxuICAgICAgICBlbHNlIGlmICggdHlwZSA9PSAncmVhZGVyJykgXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICggc3Vicm91dGluZVR5cGUgPT0gJ3JlYWQnKSBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudGl0bGUgICAgICAgICAgICA9ICAgJ0FkZCBuZXcgcmVhZCBmcmFnbWVudCc7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlc2NyaXB0aW9uICAgICAgPSAgICdDcmVhdGUgbmV3IGZyYWdtZW50IHdoaWNoIGNhbiBiZSBpbnZva2VkIGZyb20gY29udmVyc2F0aW9uIGVsZW1ldHMnO1xuICAgICAgICAgICAgICAgICRzY29wZS5ibG9jay5uYW1lICAgICAgID0gICAnTXkgbmV3IHJlYWQgZnJhZ21lbnQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZUJsb2NrICAgICAgICAgID0gICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cud2FybiggJ0NvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2UgTW9kYWxJbnN0YW5jZUN0cmwgY3JlYXRlQmxvY2soKSAkc2NvcGUuYmxvY2snLCAkc2NvcGUuYmxvY2spO1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5hZGRSZWFkU3Vicm91dGluZSggJHNjb3BlLmJsb2NrLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAkdWliTW9kYWxJbnN0YW5jZS5kaXNtaXNzKCdjYW5jZWwnKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIHN1YnJvdXRpbmVUeXBlID09ICdwcm9jZXNzJylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudGl0bGUgICAgICAgICAgICA9ICAgJ0FkZCBuZXcgcHJvY2VzcyBmcmFnbWVudCc7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlc2NyaXB0aW9uICAgICAgPSAgICdDcmVhdGUgbmV3IGZyYWdtZW50IHdoaWNoIGNhbiBiZSBpbnZva2VkIGZyb20gY29udmVyc2F0aW9uIHByb2Nlc3NvcnMnO1xuICAgICAgICAgICAgICAgICRzY29wZS5ibG9jay5uYW1lICAgICAgID0gICAnTXkgbmV3IHByb2Nlc3MgZnJhZ21lbnQnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5jcmVhdGVCbG9jayAgICAgICAgICA9ICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLndhcm4oICdDb252b3dvcmtzQWRkQmxvY2tTZXJ2aWNlIE1vZGFsSW5zdGFuY2VDdHJsIGNyZWF0ZUJsb2NrKCkgJHNjb3BlLmJsb2NrJywgJHNjb3BlLmJsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuYWRkUHJvY2Vzc1N1YnJvdXRpbmUoICRzY29wZS5ibG9jay5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdVbmV4cGVjdGVkIHN1YnJvdXRpbmVUeXBlIFsnK3N1YnJvdXRpbmVUeXBlKyddJyk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgXG4gICAgICAgIH0gXG4gICAgICAgIGVsc2UgXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ1VuZXhwZWN0ZWQgdHlwZSBbJyt0eXBlKyddJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG5cbiAgICAgICAgJHNjb3BlLmNhbmNlbCAgICAgICAgICAgPSAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICR1aWJNb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICB9O1xufTsiLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2NvbnRleHQtZWxlbWVudHMtY29udGFpbmVyLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lciggJGxvZylcbntcbiAgICB2YXIgQVVUT19PUEVOX1RJTUVPVVQgICA9ICAgMTUwMDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgcmVxdWlyZTogWyAnXmNvbnRleHRFbGVtZW50c0NvbnRhaW5lcicsICdecHJvcGVydGllc0NvbnRleHQnXSxcbiAgICAgICAgc2NvcGU6IHsgJ3NlcnZpY2UnOiAnPScgfSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgICAgICB0aGlzLmdldENvbnRhaW5lciAgICAgICA9ICAgZ2V0Q29udGFpbmVyO1xuICAgICAgICAgICAgdGhpcy5pbmRleE9mICAgICAgICAgICAgPSAgIGluZGV4T2Y7XG4gICAgICAgICAgICB0aGlzLmlzTXVsdGlwbGUgICAgICAgICA9ICAgaXNNdWx0aXBsZTtcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50ICAgICAgID0gICBhZGRDb21wb25lbnQ7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNvbXBvbmVudCAgICA9ICAgcmVtb3ZlQ29tcG9uZW50O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRDb250YWluZXIoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2VydmljZS5jb250ZXh0cztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gaW5kZXhPZiggY29tcG9uZW50KVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRDb250YWluZXIoKS5maW5kSW5kZXgoIGZ1bmN0aW9uKCBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LnByb3BlcnRpZXMuX2NvbXBvbmVudF9pZCA9PT0gY29tcG9uZW50LnByb3BlcnRpZXMuX2NvbXBvbmVudF9pZCA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGlzTXVsdGlwbGUoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBhZGRDb21wb25lbnQoIGNvbXBvbmVudCwgaW5kZXgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCAhaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggICA9ICAgMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBnZXRDb250YWluZXIoKS5zcGxpY2UoIGluZGV4LCAwLCBjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVDb21wb25lbnQoIGNvbXBvbmVudClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5jb250ZXh0cyA9ICAgZ2V0Q29udGFpbmVyKCkuZmlsdGVyKCBmdW5jdGlvbiggY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5wcm9wZXJ0aWVzLmlkICAgICE9PSAgICAgY29tcG9uZW50LnByb3BlcnRpZXMuaWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgJGN0cmxzKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgY29udGV4dEVsZW1lbnRzQ29udGFpbmVyICAgID0gICAkY3RybHNbMF07XG4gICAgICAgICAgICB2YXIgcHJvcGVydGllc0NvbnRleHQgICAgICAgICAgID0gICAkY3RybHNbMV07XG5cbiAgICAgICAgICAgIHZhciBvcGVuICAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBvcGVuX3RpbWVyICA9ICAgbnVsbDtcblxuICAgICAgICAgICAgX2luaXREcm9wcGFibGUoKTtcblxuICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiAgICAgICAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3BlbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS50b2dnbGVPcGVuICAgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgb3BlbiAgICA9ICAgIW9wZW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKFxuICAgICAgICAgICAgICAgIFwiJGRlc3Ryb3lcIixcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiggZXZlbnQgKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggb3Blbl90aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKCBvcGVuX3RpbWVyICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuX3RpbWVyICA9ICAgbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0RHJvcHBhYmxlKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgJGRyb3BwYWJsZSAgPSAgICQoJGVsZW1lbnQuZmluZCggJy5jb250ZXh0LWNvbnRhaW5lcicpWzBdKTtcbiAgICAgICAgICAgICAgICAkZHJvcHBhYmxlLmRyb3BwYWJsZSh7XG4gICAgICAgICAgICAgICAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZHJvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdWkuZHJhZ2dhYmxlLmRhdGEoICdjb252b0RyYWdnZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSAgICA9ICAgdWkuZHJhZ2dhYmxlLmRhdGEoICdjb252b0RyYWdnZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnRleHRFbGVtZW50c0NvbnRhaW5lciBkcm9wcGFibGUgZGF0YScsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGF0YS50eXBlID09ICdkZWZpbml0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuYWRkTmV3Q29tcG9uZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbXBvbmVudERlZmluaXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBkYXRhLnR5cGUgPT0gJ2NvbXBvbmVudCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0Lm1vdmVDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb250YWluZXJDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdFeHBlY3RlZCB0byBoYXZlIHR5cGUgW2RlZmluaXRpb25dIG9yIFtjb21wb25lbnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgdG8gaGF2ZSBbY29udm9EcmFnZ2VkXSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG92ZXI6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggIW9wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuX3RpbWVyICA9ICAgJHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBBVVRPX09QRU5fVElNRU9VVCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG91dDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBvcGVuX3RpbWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKCBvcGVuX3RpbWVyICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3Blbl90aW1lciAgPSAgIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59OyIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vc2VsZWN0YWJsZS1jb21wb25lbnQudG1wbC5odG1sJztcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb250ZXh0RWxlbWVudCggJGxvZywgQ29udm93b3Jrc0FwaSwgJHRpbWVvdXQsICRjb21waWxlKVxue1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7ICdjb250ZXh0RWxlbWVudCcgOiAnPScgfSxcbiAgICAgICAgcmVxdWlyZTogWyAnXnByb3BlcnRpZXNDb250ZXh0JywgJ15jb250ZXh0RWxlbWVudHNDb250YWluZXInXSxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsICRjdHJscykge1xuICAgICAgICAgICAgdmFyICRkcmFnZ2FibGU7XG5cbiAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzQ29udGV4dCAgICAgICAgICAgPSAgICRjdHJsc1swXTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0RWxlbWVudHNDb250YWluZXIgICAgPSAgICRjdHJsc1sxXTtcblxuICAgICAgICAgICAgJHNjb3BlLnNob3dUaXRsZSAgICAgICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLm92ZXIgICAgICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5yZWFkeSAgICAgICAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50VGl0bGUgICAgICAgPSAgIFwiXCI7XG5cbiAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICRzY29wZS5pc1NlbGVjdGVkICAgPSAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3Rpb24oKS5jb21wb25lbnQgPT09ICRzY29wZS5jb250ZXh0RWxlbWVudDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS4kb24oICckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udGV4dEVsZW1lbnQgJGRlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAkZHJhZ2dhYmxlLmRyYWdnYWJsZSh7IGRpc2FibGVkOiB0cnVlIH0pLmRyYWdnYWJsZSggJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCAhJHNjb3BlLmNvbnRleHRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ05vIGVsZW1lbnQgcHJvdmlkZWQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGNsYXNzX25hbWUgID0gICAgICAgJHNjb3BlLmNvbnRleHRFbGVtZW50WydjbGFzcyddO1xuXG4gICAgICAgICAgICAgICAgaWYgKCAhY2xhc3NfbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnRleHRFbGVtZW50IF9pbml0KCkgJHNjb3BlLmNvbnRleHRFbGVtZW50JywgJHNjb3BlLmNvbnRleHRFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTm8gY2xhc3MgaW4gY29tcG9uZW50Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKVsnc2VydmljZV9pZCddLCBjbGFzc19uYW1lKS50aGVuKCBmdW5jdGlvbiggZGVmaW5pdGlvbikge1xuXG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udGV4dEVsZW1lbnQgZGlyZWN0aXZlIGdldENvbXBvbmVudERlZmluaXRpb24oKSB0aGVuIGRlZmluaXRpb24nLCBkZWZpbml0aW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVmaW5pdGlvbiAgICAgICA9ICAgZGVmaW5pdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFRpdGxlICAgPSAgIGRlZmluaXRpb24ubmFtZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoICFkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9pbnRlcmZhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fcHJldmlld19hbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dUaXRsZSAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvciggJ2NvbnRleHRFbGVtZW50IGRlZmluaXRpb25zIGdvdCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ICAgICAgICAgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGdvb2Qgb2xkIHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2luaXRQcmV2aWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfaW5pdERyYWdnYWJsZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2luaXREcm9wcGFibGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9pbml0Q2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0RHJhZ2dhYmxlKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkZHJhZ2dhYmxlICA9ICAgJCgkZWxlbWVudC5maW5kKCAnZGl2LnNlbGVjdGFibGUtY29tcG9uZW50JylbMF0pO1xuXG4gICAgICAgICAgICAgICAgJGRyYWdnYWJsZS5kcmFnZ2FibGUoIHtcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJ0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnREdXJhdGlvbiA6IDUwLFxuICAgICAgICAgICAgICAgICAgICB6SW5kZXg6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXkgOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgIHRvbGVyYW5jZSA6ICdwb2ludGVyJyxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uKCBldmVudCwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuZGF0YSggJ2NvbnZvRHJhZ2dlZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IDogJHNjb3BlLmNvbnRleHRFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckNvbnRyb2xsZXI6IGNvbnRleHRFbGVtZW50c0NvbnRhaW5lclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVpLmhlbHBlci5iaW5kKCBcImNsaWNrLnByZXZlbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihldmVudCkgeyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3VpLmhlbHBlci51bmJpbmQoXCJjbGljay5wcmV2ZW50XCIpO30sIDMwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2luaXREcm9wcGFibGUoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciAkZHJvcHBhYmxlICA9ICAgJCgkZWxlbWVudC5maW5kKCAnZGl2LnNlbGVjdGFibGUtY29tcG9uZW50JylbMF0pO1xuXG4gICAgICAgICAgICAgICAgJGRyb3BwYWJsZS5kcm9wcGFibGUoe1xuICAgICAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRyb3A6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHVpLmRyYWdnYWJsZS5kYXRhKCdjb252b0RyYWdnZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhICAgICAgICA9ICAgdWkuZHJhZ2dhYmxlLmRhdGEoJ2NvbnZvRHJhZ2dlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggICAgICAgPSAgIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lci5pbmRleE9mKCAkc2NvcGUuY29udGV4dEVsZW1lbnQpICsgMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGRhdGEudHlwZSA9PSAnZGVmaW5pdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgbmV3IGNvbXBvbmVudCcsIGRhdGEuY29tcG9uZW50RGVmaW5pdGlvbiwgJ3RvIGNvbnRhaW5lcicsIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lci5nZXRDb250YWluZXIoKSwgJ2luIGNvbXBvbmVudCcsICRzY29wZS5jb250ZXh0RWxlbWVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmFkZE5ld0NvbXBvbmVudChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0RWxlbWVudHNDb250YWluZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb21wb25lbnREZWZpbml0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBkYXRhLnR5cGUgPT0gJ2NvbXBvbmVudCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm93b3Jrc0NvbXBvbmVudHNDb250YWluZXIgbW92ZSBjb21wb25lbnQnLCBkYXRhLmNvbXBvbmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0Lm1vdmVDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb250YWluZXJDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRFbGVtZW50c0NvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbXBvbmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0V4cGVjdGVkIHRvIGhhdmUgdHlwZSBbZGVmaW5pdGlvbl0gb3IgW2NvbXBvbmVudF0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdFeHBlY3RlZCB0byBoYXZlIFtjb252b0RyYWdnZWRdIGRhdGEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdENsaWNrKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgJGRpdiAgICA9ICAgJCgkZWxlbWVudC5maW5kKCAnZGl2LnNlbGVjdGFibGUtY29tcG9uZW50JylbMF0pO1xuICAgICAgICAgICAgICAgICRkaXYuYmluZCggJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAkc2NvcGUuaXNTZWxlY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzQ29udGV4dC5zZXRTZWxlY3RlZENvbXBvbmVudCggJHNjb3BlLmNvbnRleHRFbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVNlbGVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGV4dHMgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLnNlcnZpY2UuY29udGV4dHM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbigpLnNlcnZpY2UuY29udGV4dHMgICA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRzLmZpbHRlciggZnVuY3Rpb24oIGNvbnRleHRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dEVsZW1lbnQgICAhPT0gJHNjb3BlLmNvbnRleHRFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdFByZXZpZXcoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBjb250YWluZXIgICA9ICAgJGVsZW1lbnQuZmluZCggJy5wcmV2aWV3Jyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9wcmV2aWV3X2FuZ3VsYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGh0bWwgICAgICAgID0gICAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5fcHJldmlld19hbmd1bGFyLnRlbXBsYXRlO1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuaHRtbCggaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICRjb21waWxlKCBjb250YWluZXIuY29udGVudHMoKSkoICRzY29wZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLmh0bWwoICcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9ibG9jay1jb21wb25lbnQudG1wbC5odG1sJztcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBibG9ja0NvbXBvbmVudCggJGxvZywgJHRpbWVvdXQsIENvbnZvd29ya3NBcGksIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UsIExvZ2luU2VydmljZSlcbntcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyAnYmxvY2snIDogJz0nLCAnY2FuTW92ZVVwJzogJz0nLCAnY2FuTW92ZURvd24nOiAnPScgfSxcbiAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuICAgICAgICAgICAgdmFyIFVTRVJfUFJFRkVSRU5DRVNfS0VZICAgID0gICAnJztcbiAgICAgICAgICAgIC8vIEFQSVxuICAgICAgICAgICAgJHNjb3BlLm92ZXIgICAgICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5yZWFkeSAgICAgICAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50VGl0bGUgICAgICAgPSAgIFwiXCI7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50TmFtZSAgICAgICAgPSAgIFwiXCI7XG5cbiAgICAgICAgICAgICRzY29wZS5pc1N5c0Jsb2NrICAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuaXNSZWFkQmxvY2sgICAgICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmlzU3lzUHJvY2Vzc29ycyAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5pc1Nlc3Npb25FbmQgICAgICAgICA9ICAgZmFsc2U7XG5cbiAgICAgICAgICAgICRzY29wZS5pc1N5c0Jsb2NrT3BlbiAgICAgICA9ICAgeyB2YWx1ZTogZmFsc2UgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmdldENvbXBvbmVudFRpdGxlICAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoICEkc2NvcGUuZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ0dlbmVyYXRpbmcgdGl0bGUgLi4uJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLm5hbWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZC5pbmRleE9mKCAnX18nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ1N5c3RlbSAtICcgKyAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCArICcnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQuaW5kZXhPZiggJ19yZWFkXycpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuaXNTZWxlY3RlZCAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0aW9uKCkuY29tcG9uZW50ID09PSAkc2NvcGUuYmxvY2s7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUudG9nZ2xlT3BlbiAgID0gICBmdW5jdGlvbiggdHlwZSkge1xuICAgICAgICAgICAgICAgIG9wZW5bdHlwZV0gID0gICAhb3Blblt0eXBlXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5pc09wZW4gICA9ICAgZnVuY3Rpb24oIHR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3Blblt0eXBlXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS4kb24oICckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnYmxvY2tDb21wb25lbnQgJGRlc3Ryb3knKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUubW92ZVVwID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnbW92ZUJsb2NrJywge1xuICAgICAgICAgICAgICAgICAgICBibG9ja0lkOiAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCArICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXI6IC0xXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5tb3ZlRG93biA9IGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ21vdmVCbG9jaycsIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tJZDogJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlyOiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElOSVRcbiAgICAgICAgICAgIHZhciBvcGVuICAgID0gICB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvcnMgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0KClcbiAgICAgICAgICAgIHtcblxuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKClbJ3NlcnZpY2VfaWQnXSwgJ1xcXFxDb252b1xcXFxQY2tnXFxcXENvcmVcXFxcRWxlbWVudHNcXFxcQ29udmVyc2F0aW9uQmxvY2snKS50aGVuKCBmdW5jdGlvbiggZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkLmluZGV4T2YoICdfXycpID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgID0gICAnU3lzdGVtIC0gJyArICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkICsgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNTeXNCbG9jayAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09ICdfX3NlcnZpY2VQcm9jZXNzb3JzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc1N5c1Byb2Nlc3NvcnMgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkID09PSAnX19zZXNzaW9uRW5kJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc1Nlc3Npb25FbmQgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZC5pbmRleE9mKCAnX3JlYWRfJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICRzY29wZS5pc1JlYWRCbG9jayAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgID0gICAnRnJhZ21lbnQgLSAnICsgJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgKyAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRUaXRsZSAgID0gICAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5ibG9ja19pZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnROYW1lICAgID0gICAkc2NvcGUuYmxvY2sucHJvcGVydGllcy5uYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kZWZpbml0aW9uICAgICAgID0gICBkZWZpbml0aW9uO1xuXG4gICAgICAgICAgICAgICAgICAgIExvZ2luU2VydmljZS5nZXRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ2Jsb2NrQ29tcG9uZW50IGdvdCB1c2VyJywgdXNlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBVU0VSX1BSRUZFUkVOQ0VTX0tFWSAgICA9ICAgdXNlci51c2VyX2lkICsgJ18nICsgcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKClbJ3NlcnZpY2VfaWQnXSArICdfJyArICRzY29wZS5ibG9jay5wcm9wZXJ0aWVzWydfY29tcG9uZW50X2lkJ107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdibG9ja0NvbXBvbmVudCBmaW5hbCB1c2VyIHByZWZlcmVuY2VzIGtleScsIFVTRVJfUFJFRkVSRU5DRVNfS0VZKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgVXNlclByZWZlcmVuY2VzU2VydmljZS5nZXREYXRhKFVTRVJfUFJFRkVSRU5DRVNfS0VZKS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc1N5c0Jsb2NrT3Blbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc1N5c0Jsb2NrT3Blbi52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLndhcm4oJ2Jsb2NrQ29tcG9uZW50IGdldFVzZXIoKSByZWplY3RlZCB3aXRoIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2lzU3lzQmxvY2tPcGVuLnZhbHVlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UucmVnaXN0ZXJEYXRhKFVTRVJfUFJFRkVSRU5DRVNfS0VZLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvciggJ2Jsb2NrQ29tcG9uZW50IGdvdCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIH0pLmZpbmFsbHkoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5QXN5bmMoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlYWR5ICAgICAgICAgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBfaW5pdENsaWNrKCk7XG4gICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0Q2xpY2soKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciAkZGl2ICAgID0gICAkKCRlbGVtZW50LmZpbmQoICdkaXYuc2VsZWN0YWJsZS1jb21wb25lbnQnKVswXSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyQ29udHJvbGxlciA9ICAge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVTZWxlY3Rpb246IGZ1bmN0aW9uKCkgeyBwcm9wZXJ0aWVzQ29udGV4dC5yZW1vdmVCbG9jayggJHNjb3BlLmJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQpOyB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICRkaXYuYmluZCggJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmlzU2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQuc2V0U2VsZWN0ZWRDb21wb25lbnQoICRzY29wZS5ibG9jaywgY29udGFpbmVyQ29udHJvbGxlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0IGFuZ3VsYXIgZnJvbSAnYW5ndWxhcic7XG5cbmltcG9ydCBjb252b3dvcmtzVG9vbGJveCBmcm9tICcuL2NvbnZvd29ya3MtdG9vbGJveC5kaXJlY3RpdmUnO1xuaW1wb3J0IGNvbnZvd29ya3NUb29sYm94Q29tcG9uZW50IGZyb20gJy4vY29udm93b3Jrcy10b29sYm94LWNvbXBvbmVudC5kaXJlY3RpdmUnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gIC5tb2R1bGUoJ2NvbnZvLmVkaXRvci50b29sYm94JywgW10pXG4gIC5kaXJlY3RpdmUoJ2NvbnZvd29ya3NUb29sYm94JywgY29udm93b3Jrc1Rvb2xib3gpXG4gIC5kaXJlY3RpdmUoJ2NvbnZvd29ya3NUb29sYm94Q29tcG9uZW50JywgY29udm93b3Jrc1Rvb2xib3hDb21wb25lbnQpXG4gIC5uYW1lO1xuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9jb252b3dvcmtzLXRvb2xib3gudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udm93b3Jrc1Rvb2xib3goICRsb2csIENvbnZvd29ya3NBcGksIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICdkZWZpbml0aW9ucycgOiAnPScsXG4gICAgICAgICAgICAnYXZhaWxhYmxlUGFja2FnZXMnOiAnPScsXG4gICAgICAgICAgICAnc2VydmljZScgOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dClcbiAgICAgICAge1xuICAgICAgICAgICAgJGxvZy5sb2coICdjb252b3dvcmtzVG9vbGJveCBfaW5pdCgpICRzY29wZS5kZWZpbml0aW9ucycsICRzY29wZS5kZWZpbml0aW9ucywgJHNjb3BlLmF2YWlsYWJsZVBhY2thZ2VzKTtcblxuICAgICAgICAgICAgdmFyIGNvcmUgICAgICAgICAgICA9ICAgWydjb252by1jb3JlJywgJ2FtYXpvbicsICdnb29nbGUtbmxwJ107XG4gICAgICAgICAgICAkc2NvcGUub3BlbiAgICAgICAgID0gICB7fTtcblxuICAgICAgICAgICAgJHNjb3BlLmdyb3VwZWREZWZpbml0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICBpZiAoICEkc2NvcGUuc2VydmljZS5wYWNrYWdlcykge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzID0gICBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2luaXRHcm91cGVkRGVmaW5pdGlvbnMoKTtcblxuICAgICAgICAgICAgVXNlclByZWZlcmVuY2VzU2VydmljZS5nZXREYXRhKCAnb3BlblRvb2xib3hlcycpLnRoZW4oIGZ1bmN0aW9uKCBvcGVuVG9vbGJveGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBvcGVuVG9vbGJveGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5vcGVuICAgID0gICBvcGVuVG9vbGJveGVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAnb3BlbicsIGZ1bmN0aW9uKCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UucmVnaXN0ZXJEYXRhKCAnb3BlblRvb2xib3hlcycsIHZhbHVlKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkZWZpbml0aW9ucycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lcyA9IHZhbHVlLm1hcChmdW5jdGlvbiAocCkgeyByZXR1cm4gcC5uYW1lc3BhY2UgfSk7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ1RyaWdnZXJpbmcgZ3JvdXBlZCBkZWZpbml0aW9ucyByZWZyZXNoIHdpdGggcG9zc2libGUgdmFsdWVzJywgbmFtZXMpO1xuICAgICAgICAgICAgICAgIF9pbml0R3JvdXBlZERlZmluaXRpb25zKCk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiAgICAgICA9ICAgZnVuY3Rpb24oIG5hbWVzcGFjZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoIG5hbWVzcGFjZSBpbiAkc2NvcGUub3Blbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLm9wZW5bbmFtZXNwYWNlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIChjb3JlLmluZGV4T2YobmFtZXNwYWNlKSA+IC0xKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS50b2dnbGVPcGVuICAgPSAgIGZ1bmN0aW9uKCBuYW1lc3BhY2UpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm9wZW5bbmFtZXNwYWNlXSAgPSAgICEkc2NvcGUuaXNPcGVuKCBuYW1lc3BhY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuaXNFbmFibGVkICAgID0gICBmdW5jdGlvbiggbmFtZXNwYWNlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2VydmljZS5wYWNrYWdlcy5pbmNsdWRlcyhuYW1lc3BhY2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gZm9yICggdmFyIGk9MDsgaTwkc2NvcGUuc2VydmljZS5wYWNrYWdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vICAgICBpZiAoICRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzW2ldID09IG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUudG9nZ2xlRW5hYmxlZCA9IGZ1bmN0aW9uKG5hbWVzcGFjZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlzRW5hYmxlZChuYW1lc3BhY2UpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gJHNjb3BlLnNlcnZpY2UucGFja2FnZXMgPSAgICRzY29wZS5zZXJ2aWNlLnBhY2thZ2VzLmZpbHRlciggZnVuY3Rpb24oZSkgeyByZXR1cm4gZSAhPT0gbmFtZXNwYWNlIH0pXG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkucmVtb3ZlU2VydmljZVBhY2thZ2UoJHNjb3BlLnNlcnZpY2VbJ3NlcnZpY2VfaWQnXSwgbmFtZXNwYWNlKS50aGVuKGZ1bmN0aW9uKHBhY2thZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc1Rvb2xib3ggcmVtb3ZlUGFja2FnZSBbJyArIG5hbWVzcGFjZSArICddIGRvbmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnJlbG9hZFNlcnZpY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldENvbXBvbmVudERlZmluaXRpb25zKHBhY2thZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5vcGVuW25hbWVzcGFjZV0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcignQ29udm93b3Jrc1Rvb2xib3ggcmVtb3ZlUGFja2FnZSByZWplY3RlZCBmb3IgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuYWRkU2VydmljZVBhY2thZ2UoJHNjb3BlLnNlcnZpY2VbJ3NlcnZpY2VfaWQnXSwgbmFtZXNwYWNlKS50aGVuKGZ1bmN0aW9uKHBhY2thZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc1Rvb2xib3ggYWRkUGFja2FnZSBbJyArIG5hbWVzcGFjZSArICddIGRvbmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnJlbG9hZFNlcnZpY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldENvbXBvbmVudERlZmluaXRpb25zKHBhY2thZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcignQ29udm93b3Jrc1Rvb2xib3ggYWRkUGFja2FnZSByZWplY3RlZCBmb3IgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdEdyb3VwZWREZWZpbml0aW9ucygpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmdyb3VwZWREZWZpbml0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiAkc2NvcGUuZGVmaW5pdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJHNjb3BlLmRlZmluaXRpb25zW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWVzcGFjZSA9ICRzY29wZS5kZWZpbml0aW9uc1tpXS5uYW1lc3BhY2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuZ3JvdXBlZERlZmluaXRpb25zW25hbWVzcGFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5ncm91cGVkRGVmaW5pdGlvbnNbbmFtZXNwYWNlXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiBpbiAkc2NvcGUuZGVmaW5pdGlvbnNbaV0uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNtcHQgPSAkc2NvcGUuZGVmaW5pdGlvbnNbaV0uY29tcG9uZW50c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncnAgPSBfdXBwZXJjYXNlV29yZChjbXB0Wydjb21wb25lbnRfcHJvcGVydGllcyddWydfd29ya2Zsb3cnXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmdyb3VwZWREZWZpbml0aW9uc1tuYW1lc3BhY2VdW2dycF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ3JvdXBlZERlZmluaXRpb25zW25hbWVzcGFjZV1bZ3JwXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNtcHQubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd4IScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmdyb3VwZWREZWZpbml0aW9uc1tuYW1lc3BhY2VdW2dycF0ucHVzaChjbXB0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX3VwcGVyY2FzZVdvcmQod29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9jb252b3dvcmtzLXRvb2xib3gtY29tcG9uZW50LnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnZvd29ya3NUb29sYm94Q29tcG9uZW50KCAkbG9nLCAkY29tcGlsZSlcbntcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBcbiAgICAgICAgICAgICdjb21wb25lbnREZWZpbml0aW9uJyA6ICc9J1xuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlIDogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzQ29udGV4dCkge1xuXG4gICAgICAgICAgICBfaW5pdERyYWdnYWJsZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUuaXNEZXByZWNhdGVkID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5jb21wb25lbnREZWZpbml0aW9uLm5hbWUuaW5kZXhPZignWCEnKSA9PT0gMCB8fCAkc2NvcGUuY29tcG9uZW50RGVmaW5pdGlvbi5uYW1lLmluZGV4T2YoJ3ghJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZnVuY3Rpb24gX2luaXREcmFnZ2FibGUoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciAkZHJhZ2dhYmxlICA9ICAgJGVsZW1lbnQuZmluZCggJy50b29sYm94LWNvbXBvbmVudCcpO1xuICAgICAgICAgICAgICAgICRkcmFnZ2FibGUuZHJhZ2dhYmxlKCB7IFxuICAgICAgICAgICAgICAgICAgICByZXZlcnQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICAgICAgekluZGV4OiAxMDAsIFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLCBcbiAgICAgICAgICAgICAgICAgICAgaGVscGVyOiAnY2xvbmUnLFxuICAgICAgICAgICAgICAgICAgICB0b2xlcmFuY2UgOiAncG9pbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIHJlZnJlc2hQb3NpdGlvbnM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmRhdGEoICdjb252b0RyYWdnZWQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdkZWZpbml0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnREZWZpbml0aW9uIDogJHNjb3BlLmNvbXBvbmVudERlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vc3lzdGVtLWludGVudC1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3lzdGVtSW50ZW50RWRpdG9yKCAkbG9nKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogJz0nLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5RGVmaW5pdGlvbjogJz0nLFxuICAgICAgICAgICAgICAgIGtleTogJz0nLFxuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICc9J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJ3N5c3RlbUludGVudEVkaXRvciBsaW5rJyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbHVlICAgID0gICBfZGVzZXJpYWxpemUoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAndmFsdWUnLCBmdW5jdGlvbiAoIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLmtleV0gPSAgIF9zZXJpYWxpemUoIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoICdzeXN0ZW1JbnRlbnRFZGl0b3IgY2hhbmdlZCB2YWx1ZSBmb3Iga2V5JywgJHNjb3BlLmtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoICggZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoICdzeXN0ZW1JbnRlbnRFZGl0b3IgY29tcG9uZW50IHZhbHVlIGNoYW5nZWQgZm9yIGtleScsICRzY29wZS5rZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5rZXldO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbHVlICAgID0gICBfZGVzZXJpYWxpemUoIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VyaWFsaXplKCB2YWwpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5zcGxpdCgnLCcpLm1hcCggZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfZGVzZXJpYWxpemUoIHZhbClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggYW5ndWxhci5pc0FycmF5KCB2YWwpKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwuZmlsdGVyKGZ1bmN0aW9uIChlbCkge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLnRyaW0oKSAhPSAnJztcbi8vICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5qb2luKCAnLCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9OyIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vcHJvcGVydGllcy1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcHJvcGVydGllc0VkaXRvciggJGxvZywgQ29udm93b3Jrc0FwaSkge1xuICAgIHJldHVybiAge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICByZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0JyxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgY29tcG9uZW50OiAnPScsXG4gICAgICAgICAgICBkZWZpbml0aW9uOiAnPScsXG4gICAgICAgICAgICBzZXJ2aWNlOiAnPScsXG4gICAgICAgICAgICBoZWxwOiAnPT8nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uICggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgd2F0Y2hlcnMgICAgPSAgIFtdO1xuICAgICAgICAgICAgJHNjb3BlLmhlbHAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLnRhYkluZGV4ID0geyBhY3RpdmU6IFwiYlwiIH07XG5cbiAgICAgICAgICAgIF9zZXR1cEJsb2NrSWRzKCk7XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRCbG9ja0lkICAgPSAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBibG9ja19pZCAgICA9ICAgbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5ibG9ja19pZCkge1xuICAgICAgICAgICAgICAgICAgICBibG9ja19pZCAgICA9ICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCkge1xuICAgICAgICAgICAgICAgICAgICBibG9ja19pZCAgICA9ICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja19pZDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRDb21wb25lbnROYW1lID0gICBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5uYW1lICsgJyAoJyskc2NvcGUuZGVmaW5pdGlvbi5uYW1lKycpJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5ibG9ja19pZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkICsgJyAoJyskc2NvcGUuZGVmaW5pdGlvbi5uYW1lKycpJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkICsgJyAoJyskc2NvcGUuZGVmaW5pdGlvbi5uYW1lKycpJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmRlZmluaXRpb24ubmFtZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRDb21wb25lbnREZXNjcmlwdGlvbiAgPSAgIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGJsb2NrX2lkICAgID0gICAkc2NvcGUuZ2V0QmxvY2tJZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCBibG9ja19pZCA9PT0gJ19fc2VydmljZVByb2Nlc3NvcnMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnU3lzdGVtIGJsb2NrIHdoaWNoIGNvbnRhaW5zIG9ubHkgcHJvY2Vzc29ycy4gVGhpcyBwcm9jZXNzb3JzIHdpbGwgYmUgY29uc2lkZXJlZCBvbiBhbnkgYWN0aXZlIHN0ZXAgcHJvY2VzcyBwaGFzZS4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggYmxvY2tfaWQgPT09ICdfX3Nlc3Npb25TdGFydCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdTeXN0ZW0gYmxvY2sgdGhhdCBleGVjdXRlcyBvbmx5IHdoZW4gdGhlIG5ldyBzZXNzaW9uIGhhcyBzdGFydGVkLiBJZiB5b3UgbGVhdmUgaXQgZW1wdHksIHRoZSBmaXJzdCByZWd1bGFyIHN0ZXAgd2lsbCBiZSB1c2VkLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCBibG9ja19pZCA9PT0gJ19fc2Vzc2lvbkVuZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdUaGlzIHN0ZXAgaXMgY2FsbGVkIHdoZW4gc2Vzc2lvbiBlbmRzLiBZb3UgY2FuIG5vdCBvdXRwdXQgYW55dGhpbmcgaGVyZSwgYnV0IHlvdSBtaWdodCBkbyBjbGVhbnVwIG9yIHN0YXRpc3RpY3MgaGVyZS4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggYmxvY2tfaWQgPT09ICdfX21lZGlhQ29udHJvbHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnU2VydmVzIGZvciBoYW5kbGluZyBtZWRpYSBwbGF5aW5nIHJlcXVlc3RzICh0aGV5IGFyZSBzZXNzaW9ubGVzcyknO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuZGVmaW5pdGlvbi5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja0NvbXBvbmVudEhlbHAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoICRzY29wZS5oZWxwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5kaXNwbGF5RWRpdG9yICAgID0gICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISEkc2NvcGUuY29tcG9uZW50ICYmIE9iamVjdC5rZXlzKCAkc2NvcGUuY29tcG9uZW50KS5sZW5ndGggPiAwO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmNsb3NlRWRpdG9yICAgICAgPSAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsICk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUucmVtb3ZlQ29tcG9uZW50ICA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnJlbW92ZUNvbXBvbmVudCgpO1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnNldFNlbGVjdGVkQ29tcG9uZW50KCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5pc1N5c3RlbUJsb2NrICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkICYmIF9pc1N5c3RlbSggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLmJsb2NrX2lkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5pc09iamVjdCAgICAgICAgID0gICBmdW5jdGlvbiggdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICggdmFsICE9PSBudWxsKSAmJiAoICFBcnJheS5pc0FycmF5KCB2YWwpKSAmJiAoIHZhbCBpbnN0YW5jZW9mIE9iamVjdCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUucmVtb3ZlVXR0ZXJhbmNlICA9ICAgZnVuY3Rpb24oIGkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMuc3BsaWNlKCBpLCAxKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5hZGRVdHRlcmFuY2UgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCAhJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMgID0gICBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLnV0dGVyYW5jZXMucHVzaCggXCJOZXcgdXR0ZXJhbmNlXCIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmFkZE9rU3BlY2lmaWNVdHRlcmFuY2UgICA9ICAgZnVuY3Rpb24oIG5hbWUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCAhJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzLm9rX3NwZWNpZmljW25hbWVdLnByb3BlcnRpZXMudXR0ZXJhbmNlcykge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMub2tfc3BlY2lmaWNbbmFtZV0ucHJvcGVydGllcy51dHRlcmFuY2VzID0gICBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMub2tfc3BlY2lmaWNbbmFtZV0ucHJvcGVydGllcy51dHRlcmFuY2VzLnB1c2goIFwiTmV3IHV0dGVyYW5jZVwiKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5yZW1vdmVPa1NwZWNpZmljVXR0ZXJhbmNlICAgID0gICBmdW5jdGlvbiggbmFtZSwgaSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMub2tfc3BlY2lmaWNbbmFtZV0ucHJvcGVydGllcy51dHRlcmFuY2VzLnNwbGljZSggaSwgMSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUubWF5YmVJbnQgICAgICAgICAgICAgICAgICAgICA9ICAgZnVuY3Rpb24oIHZhbHVlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSAgIHZhbHVlICogMTtcblxuICAgICAgICAgICAgICAgIGlmICggaXNOYU4oIHJldCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcblxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAnc2VydmljZS5ibG9ja3MnLCBfc2V0dXBCbG9ja0lkcywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goICdjb21wb25lbnQucHJvcGVydGllcy5fY29tcG9uZW50X2lkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5oZWxwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUudGFiSW5kZXggPSB7IGFjdGl2ZTogXCJiXCIgfTtcbiAgICAgICAgICAgICAgICBfZ2V0Q29tcG9uZW50SGVscCgkc2NvcGUuY29tcG9uZW50LmNsYXNzKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAnY29tcG9uZW50JywgZnVuY3Rpb24gKG5ld1ZhbCkge1xuICAgICAgICAgICAgICAgIGlmICggIW5ld1ZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCAncHJvcGVydGllc0VkaXRvciBibG9jayBxdWlja2ZpeCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgX3NldHVwUGFyYW1CdWZmZXIoKTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgaW4gcHJvcGVydHkgZWRpdG9ycyB0aGVtc2VsZlxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCggJHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMsIGZ1bmN0aW9uKCBkZWZpbml0aW9uLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5sb2coICdwcm9wZXJ0aWVzRWRpdG9yICR3YXRjaC5jb21wb25lbnQgZWFjaCAlbyBkZWZpbml0aW9uICVvJywga2V5LCBkZWZpbml0aW9uKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIGRlZmluaXRpb24uZWRpdG9yX3R5cGUgPT0gJ3NlcnZpY2VfY29tcG9uZW50cycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgga2V5LmluZGV4T2YoICdfJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggISRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIGtleSA9PT0gJ29rX3NwZWNpZmljJyB8fCBrZXkgPT09ICdub2tfc3BlY2lmaWMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKCBkZWZpbml0aW9uLnZhbHVlVHlwZSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoICEhZGVmaW5pdGlvbi5lZGl0b3JfcHJvcGVydGllcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSAgICA9ICAgX2FzQXJyYXkoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldLCAnc3RyaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gICAgPSAgIFwiXCIgKyAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldICAgID0gICBfY2FzdFRvQm9vbCggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldICAgID0gICBfYXNBcnJheSggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0sICdvdGhlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoICEhZGVmaW5pdGlvbi5lZGl0b3JfcHJvcGVydGllcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSAgICA9ICAgX2FzQXJyYXkoICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1trZXldLCAnbnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gICAgPSAgIHBhcnNlSW50KCAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ1Vua25vd24gdmFsdWUgdHlwZSBbJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLnZhbHVlVHlwZSArICddIGZvciBbJytrZXkrJ10gYW5kIHZhbHVlIFsnKyAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSArJ10nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9zZXR1cEJsb2NrSWRzKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvY2Vzc1N1YnJvdXRpbmVzICAgPSAgICRzY29wZS5zZXJ2aWNlLmZyYWdtZW50cy5maWx0ZXIoIGZ1bmN0aW9uKCBmcmFnbWVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQuY2xhc3MgPT09ICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXFByb2Nlc3NvcnNcXFxcUHJvY2Vzc29yRnJhZ21lbnQnO1xuICAgICAgICAgICAgICAgIH0pLm1hcCggZnVuY3Rpb24oIGZyYWdtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGlkIDogZnJhZ21lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCwgbmFtZSA6IF9maXhOYW1lKCBmcmFnbWVudC5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkLCBmcmFnbWVudC5wcm9wZXJ0aWVzLm5hbWUpfTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5yZWFkU3Vicm91dGluZXMgID0gICAkc2NvcGUuc2VydmljZS5mcmFnbWVudHMuZmlsdGVyKCBmdW5jdGlvbiggZnJhZ21lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZyYWdtZW50LmNsYXNzID09PSAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxFbGVtZW50c1xcXFxFbGVtZW50c0ZyYWdtZW50JztcbiAgICAgICAgICAgICAgICB9KS5tYXAoIGZ1bmN0aW9uKCBmcmFnbWVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBpZCA6IGZyYWdtZW50LnByb3BlcnRpZXMuZnJhZ21lbnRfaWQsIG5hbWUgOiBfZml4TmFtZSggZnJhZ21lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCwgZnJhZ21lbnQucHJvcGVydGllcy5uYW1lKX07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlckJsb2NrcyAgID0gICAkc2NvcGUuc2VydmljZS5ibG9ja3MuZmlsdGVyKCBmdW5jdGlvbiggYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQuaW5kZXhPZignX18nKSAhPT0gMDtcbiAgICAgICAgICAgICAgICB9KS5tYXAoIGZ1bmN0aW9uKCBibG9jaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBpZCA6IGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQsIG5hbWUgOiBfZml4TmFtZSggYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCwgYmxvY2sucHJvcGVydGllcy5uYW1lKX07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9maXhOYW1lKCBpZCwgbmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICggbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJRDogJyArIGlkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBQYXJhbUJ1ZmZlcigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCB3YXRjaGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCggd2F0Y2hlcnMsIGZ1bmN0aW9uKCB3YXRjaGVyKSB7IHdhdGNoZXIoKTsgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2F0Y2hlcnMgICAgPSAgIFtdO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnBhcmFtQnVmZmVyICA9ICAge307XG5cbiAgICAgICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluICRzY29wZS5kZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAkc2NvcGUuZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmVkaXRvcl90eXBlICE9PSAncGFyYW1zJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgcXVpY2tmaXgsIG5lZWRzIHRvIGJlIGhhbmRsZWQgcHJvcGVybHkuXG4gICAgICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLmRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS52YWx1ZVR5cGUgIT09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkICA9ICAgX2tleVRvSWRlbnRpZmllcigga2V5KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucGFyYW1CdWZmZXJbaWRdID0gICBbXTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNba2V5XSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnBhcmFtQnVmZmVyW2lkXS5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2tleSc6IHByb3AsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ZhbHVlJzogJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1bcHJvcF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmtleVRvSWRlbnRpZmllciAgPSAgIF9rZXlUb0lkZW50aWZpZXI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlkZW50aWZpZXJUb0tleSAgPSAgIF9pZGVudGlmaWVyVG9LZXk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucmVtb3ZlUGFyYW1QYWlyICA9ICAgZnVuY3Rpb24oIGlkLCBpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnBhcmFtQnVmZmVyW2lkXS5zcGxpY2UoIGksIDEpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkUGFyYW1QYWlyICAgICA9ICAgZnVuY3Rpb24oIGlkKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld19pZHggPSAgICRzY29wZS5wYXJhbUJ1ZmZlcltpZF0ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5wYXJhbUJ1ZmZlcltpZF0ucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2tleSc6ICduZXdfdmFsdWVfJyArIG5ld19pZHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAndmFsdWUnOiAndGVtcF92YWx1ZSdcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGkgICA9ICAgLTE7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIHJlYWxseSBzdWJvcHRpbWFsLCBidXQgaXQgd29ya3MuIEZpeCBsYXRlci5cbiAgICAgICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluICRzY29wZS5wYXJhbUJ1ZmZlcilcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHdhdGNoZXJzWysraV0gICA9ICAgJHNjb3BlLiR3YXRjaCggJ3BhcmFtQnVmZmVyLicra2V5LCBmdW5jdGlvbiAoIG5ld1ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIGlkIGluICRzY29wZS5wYXJhbUJ1ZmZlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcF9uYW1lICAgPSAgIF9pZGVudGlmaWVyVG9LZXkoIGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3X3Byb3BzICAgPSAgIHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIGkgaW4gJHNjb3BlLnBhcmFtQnVmZmVyW2lkXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWlyICAgID0gICAkc2NvcGUucGFyYW1CdWZmZXJbaWRdW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdfa2V5ID0gICBfY2xlYW5LZXkoIHBhaXIua2V5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdfcHJvcHNbbmV3X2tleV0gPSAgIHBhaXIudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzW3Byb3BfbmFtZV0gID0gICBuZXdfcHJvcHM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVVRJTFxuICAgICAgICAgICAgZnVuY3Rpb24gX2NsZWFuS2V5KCBrZXkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCBrZXkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAndGVtcCc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmFyIGNsZWFuZWQgID0gICBrZXkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBrZXkucmVwbGFjZSggL1xccytcXC4vZywgJ18nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2lzU3lzdGVtKCBibG9ja0lkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrSWQuaW5kZXhPZiggJ19fJykgPj0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2lzUmVhZCggYmxvY2tJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja0lkLmluZGV4T2YoICdfcmVhZF8nKSA+PSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfY2FzdFRvQm9vbCggdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIHZhbHVlID09PSAnZmFsc2UnKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIHZhbHVlID09PSAndHJ1ZScpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuICEhdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9hc0FycmF5KCB2YWx1ZSwgcHJldlR5cGUpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNFZGl0b3IgX2FzQXJyYXkgdmFsdWUnLCB2YWx1ZSwgJ3ByZXZUeXBlJywgcHJldlR5cGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCAhcHJldlR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRXhwZWN0ZWQgYSB0eXBlIHRvIHdvcmsgd2l0aCwgZ290ICcgKyBwcmV2VHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCAhdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggQXJyYXkuaXNBcnJheSggdmFsdWUpKSB7IC8vIEFscmVhZHkgYW4gYXJyYXksIGNhc3QgdmFsdWVzIGp1c3QgdG8gYmUgc3VyZVxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKCBwcmV2VHlwZSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnb3RoZXInOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCggZnVuY3Rpb24oIHZhbCkgeyByZXR1cm4gdmFsLnNwbGl0KCAnLCcpLm1hcCggZnVuY3Rpb24oIHBpZWNlKSB7IHJldHVybiAoXCJcIiArIHBpZWNlKS50cmltKCk7IH0pOyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVkdWNlKCBmdW5jdGlvbiggYSwgYikgeyByZXR1cm4gYS5jb25jYXQoIGIpOyB9LCBbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoICdVbnN1cHBvcnRlZCB0eXBlIFsnICsgcHJldlR5cGUgKyAnXScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3dpdGNoICggcHJldlR5cGUpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdwcm9wZXJ0aWVzRWRpdG9yIF9hc0FycmF5IHByZXZUeXBlIGlzIHN0cmluZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNwbGl0QXJyYXkgID0gICB2YWx1ZS5zcGxpdCggJywnKS5tYXAoIGZ1bmN0aW9uKCBzKSB7IHJldHVybiAoXCJcIiArIHMpLnRyaW0oKTsgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJvcGVydGllc0VkaXRvciBfYXNBcnJheSByZXR1cm5pbmcnLCBzcGxpdEFycmF5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNwbGl0QXJyYXk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbnVtYmVycyAgICAgPSAgIHZhbHVlLnNwbGl0KCAvXFxzLC9nKS5tYXAoIGZ1bmN0aW9uKCBuKSB7IHJldHVybiBwYXJzZUludCggbiwgMTApIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNFZGl0b3IgX2FzQXJyYXkgcmV0dXJuaW5nJywgbnVtYmVycyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXJzO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdvdGhlcic6IC8vIFRPRE86IHRlbXBvcmFyeVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnVW5zdXBwb3J0ZWQgdHlwZSBbJyArIHByZXZUeXBlICsgJ10nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9nZXRDb21wb25lbnRIZWxwKGNvbXBvbmVudENsYXNzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbigkc2NvcGUuc2VydmljZVsnc2VydmljZV9pZCddLCBjb21wb25lbnRDbGFzcykudGhlbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmhlbHAgPT09IG51bGwgJiYgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faGVscCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMuX2hlbHAudHlwZSA9PT0gJ2ZpbGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRQYWNrYWdlQ29tcG9uZW50SGVscCgkc2NvcGUuY29tcG9uZW50Lm5hbWVzcGFjZSwgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faGVscC5maWxlbmFtZSkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGVscCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdwcm9wZXJ0aWVzRWRpdG9yIGdldENvbXBvbmVudEhlbHAoKSByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzLl9oZWxwLnR5cGUgPT09ICdodG1sJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5oZWxwID0gZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllcy5faGVscC50ZW1wbGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKCdjb21wb25lbnQgZ290IHJlYXNvbicsIHJlYXNvbilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAvLyBQQVJBTVMgVVRJTFxuICAgICAgICAgICAgZnVuY3Rpb24gX2tleVRvSWRlbnRpZmllcigga2V5KVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJCRfJytrZXkrJ19wYnVmZmVyJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2lkZW50aWZpZXJUb0tleSggaWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHJlZ2V4ICAgPSAgIC9cXCRcXCRfKFxcdyspX3BidWZmZXIvZztcblxuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gICByZWdleC5leGVjKCBpZCk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hlc1sxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2ludGVudC11dHRlcmFuY2UtZWRpdG9yLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGludGVudFV0dGVyYW5jZUVkaXRvciggJGxvZykge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb21wb25lbnQ6ICc9JyxcbiAgICAgICAgICAgIHByb3BlcnR5RGVmaW5pdGlvbjogJz0nLFxuICAgICAgICAgICAga2V5OiAnPScsXG4gICAgICAgICAgICBzZXJ2aWNlOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcbiAgICAgICAgICAgICRsb2cuZGVidWcoICdpbnRlbnRVdHRlcmFuY2VFZGl0b3IgbGluaycpO1xuICAgICAgICAgICAgJHNjb3BlLnZhbHVlICAgID0gICBKU09OLnN0cmluZ2lmeSggJHNjb3BlLmNvbXBvbmVudC5wcm9wZXJ0aWVzWyRzY29wZS5rZXldLCBudWxsLCAyKTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goICd2YWx1ZScsIGZ1bmN0aW9uICggdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLmtleV0gPSAgIEpTT04ucGFyc2UoIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5kZWJ1ZyggJ2ludGVudFV0dGVyYW5jZUVkaXRvciBjaGFuZ2VkIHZhbHVlIGZvciBrZXknLCAkc2NvcGUua2V5KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoICggZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vICRsb2cuZGVidWcoICdpbnRlbnRVdHRlcmFuY2VFZGl0b3IgY29tcG9uZW50IHZhbHVlIGNoYW5nZWQgZm9yIGtleScsICRzY29wZS5rZXkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50LnByb3BlcnRpZXNbJHNjb3BlLmtleV07XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbHVlICAgID0gICBKU09OLnN0cmluZ2lmeSggdmFsdWUsIG51bGwsIDIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07IiwiaW1wb3J0IGFuZ3VsYXIgZnJvbSAnYW5ndWxhcic7XG5cbmltcG9ydCBwcm9wZXJ0aWVzRWRpdG9yIGZyb20gJy4vcHJvcGVydGllcy1lZGl0b3IuZGlyZWN0aXZlJztcblxuaW1wb3J0IGNvbnZvSW50ZW50RWRpdG9yIGZyb20gJy4vY29udm8taW50ZW50LWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IGludGVudFV0dGVyYW5jZUVkaXRvciBmcm9tICcuL2ludGVudC11dHRlcmFuY2UtZWRpdG9yLmRpcmVjdGl2ZSc7XG5pbXBvcnQgc3lzdGVtSW50ZW50RWRpdG9yIGZyb20gJy4vc3lzdGVtLWludGVudC1lZGl0b3IuZGlyZWN0aXZlJztcblxuZXhwb3J0IGRlZmF1bHQgYW5ndWxhclxuICAubW9kdWxlKCdjb252by5lZGl0b3IucHJvcHMnLCBbXSlcbiAgLmRpcmVjdGl2ZSgncHJvcGVydGllc0VkaXRvcicsIHByb3BlcnRpZXNFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ2NvbnZvSW50ZW50RWRpdG9yJywgY29udm9JbnRlbnRFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ2ludGVudFV0dGVyYW5jZUVkaXRvcicsIGludGVudFV0dGVyYW5jZUVkaXRvcilcbiAgLmRpcmVjdGl2ZSgnc3lzdGVtSW50ZW50RWRpdG9yJywgc3lzdGVtSW50ZW50RWRpdG9yKVxuICAubmFtZTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vY29udm8taW50ZW50LWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb252b0ludGVudEVkaXRvciggJGxvZykge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb21wb25lbnQ6ICc9JyxcbiAgICAgICAgICAgIHByb3BlcnR5RGVmaW5pdGlvbjogJz0nLFxuICAgICAgICAgICAga2V5OiAnPScsXG4gICAgICAgICAgICBzZXJ2aWNlOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcbiAgICAgICAgICAgICRsb2cuZGVidWcoICdjb252b0ludGVudEVkaXRvciBsaW5rJyk7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5pbnRlbnRzICAgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmdldENvbnZvSW50ZW50cygpO1xuICAgICAgICAgICAgJHNjb3BlLnNsb3RQcmV2aWV3cyA9ICAge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRsb2cuZGVidWcoICdjb252b0ludGVudEVkaXRvciAkc2NvcGUuaW50ZW50cycsICRzY29wZS5pbnRlbnRzLCAkc2NvcGUuc2VydmljZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQucHJvcGVydGllc1skc2NvcGUua2V5XTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3Igc2VsZWN0ZWQgaW50ZW50IGNoYW5nZWQnLCB2YWwpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zbG90UHJldmlld3MgPSB7fTtcblxuICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW50ZW50ID0gJHNjb3BlLmludGVudHMuZmlsdGVyKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpLm5hbWUgPT09IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfSlbMF07XG5cbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbnZvSW50ZW50RWRpdG9yICR3YXRjaCBnb3QgbWF0Y2hlZCBpbnRlbnQnLCBpbnRlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnRlbnQudXR0ZXJhbmNlcylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZW50LnV0dGVyYW5jZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh1dHRlcmFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5sb2coJ2NvbnZvSW50ZW50RWRpdG9yIG1hcHBpbmcgdXR0ZXJhbmNlIG1vZGVscycsIHV0dGVyYW5jZS5tb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1dHRlcmFuY2UubW9kZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmxhdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAkbG9nLmxvZygnY29udm9JbnRlbnRFZGl0b3IgZmlsdGVyaW5nIG1vZGVscyB3aXRoIHR5cGVzJywgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9kZWwuaGFzT3duUHJvcGVydHkoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5sb2coJ2NvbnZvSW50ZW50RWRpdG9yIG1hcHBpbmcgbW9kZWwgdHlwZXMgYW5kIHZhbHVlcycsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNsb3RWYWx1ZSA9IG1vZGVsWydzbG90X3ZhbHVlJ10gfHwgbW9kZWwudHlwZS5yZXBsYWNlKCdAJywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2xvdFR5cGUgPSBtb2RlbC50eXBlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLnNsb3RQcmV2aWV3c1tzbG90VmFsdWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2xvdFByZXZpZXdzW3Nsb3RWYWx1ZV0gPSBzbG90VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59OyIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vcHJldmlldy12YXJpYWJsZXMtZWRpdG9yLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHByZXZpZXdWYXJpYWJsZXNFZGl0b3IoICRsb2cpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuICAgICAgICAgICAgLy8gUVVJQ0tGSVhcbiAgICAgICAgICAgIGlmICggISRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UucHJldmlld192YXJpYWJsZXMgICAgPSAgIHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfaW5pdCgpO1xuXG4gICAgICAgICAgICAkc2NvcGUuYWRkUHJldmlld1ZhcmlhYmxlc1BhaXIgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRfZ3JlYXRlc3RfaW5kZXggID0gICAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyLmxlbmd0aCAtIDEgPCAwPyAwIDogJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlci5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgdmFyIG5ld19wYWlyICAgID0gICB7ICdrZXknOiAndG1wX2tleV8nICsgY3VycmVudF9ncmVhdGVzdF9pbmRleCwgJ3ZhbHVlJzogJ3RtcF92YWx1ZScgfTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5wcmV2aWV3X3ZhcmlhYmxlc19idWZmZXIucHVzaCggbmV3X3BhaXIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLnJlbW92ZVByZXZpZXdWYXJpYWJsZXNQYWlyICA9ICAgZnVuY3Rpb24oIGkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlci5zcGxpY2UoIGksIDEpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gSU5JVFxuICAgICAgICAgICAgZnVuY3Rpb24gX2luaXQoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpO1xuICAgICAgICAgICAgICAgIF9zZXR1cFNlcnZpY2VXYXRjaCgpO1xuICAgICAgICAgICAgICAgIF9zZXR1cEJ1ZmZlcldhdGNoKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBSSVZBVEVcbiAgICAgICAgICAgIGZ1bmN0aW9uIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlciA9ICAgW107XG5cbiAgICAgICAgICAgICAgICBmb3IgKCB2YXIga2V5IGluICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5wcmV2aWV3X3ZhcmlhYmxlc19idWZmZXIucHVzaCggeyAna2V5Jzoga2V5LCAndmFsdWUnOiAkc2NvcGUuc2VydmljZS5wcmV2aWV3X3ZhcmlhYmxlc1trZXldIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJldmlld1ZhcmlhYmxlc0VkaXRvciBfc2V0dXBWYXJpYWJsZXNCdWZmZXIoKSBkb25lLCBidWZmZXInLCAkc2NvcGUucHJldmlld192YXJpYWJsZXNfYnVmZmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX3NldHVwU2VydmljZVdhdGNoKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdzZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zZXR1cFZhcmlhYmxlc0J1ZmZlcigpO1xuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfc2V0dXBCdWZmZXJXYXRjaCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggJ3ByZXZpZXdfdmFyaWFibGVzX2J1ZmZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUVVJQ0tGSVhcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhT2JqZWN0LmtleXMoICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzICAgID0gICBbXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzICAgID0gICB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoIHZhciBpIGluICRzY29wZS5wcmV2aWV3X3ZhcmlhYmxlc19idWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWlyICAgICAgICA9ICAgJHNjb3BlLnByZXZpZXdfdmFyaWFibGVzX2J1ZmZlcltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzYWZlX2tleSAgICA9ICAgX3Nhbml0aXplS2V5KCBwYWlyLmtleSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLnByZXZpZXdfdmFyaWFibGVzW3NhZmVfa2V5XSAgPSAgIHBhaXIudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gX3Nhbml0aXplS2V5KCBrZXkpXG57XG4gICAgcmV0dXJuIGtleS5yZXBsYWNlKCAvXFxzezIsfVxcLi0vLCAnXycpO1xufSIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vcHJldmlldy1wYW5lbC50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwcmV2aWV3UGFuZWwoJGxvZywgQ29udm93b3Jrc0FwaSwgQWxlcnRTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHNlcnZpY2U6ICc9J1xuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlOiAnXnByb3BlcnRpZXNDb250ZXh0JyxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgICRsb2cubG9nKCdwcmV2aWV3UGFuZWwgbGluaycpO1xuXG4gICAgICAgICAgICAkc2NvcGUucmVhZHkgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5wcmV2aWV3ID0ge307XG5cbiAgICAgICAgICAgICRzY29wZS5nZW5lcmF0ZVRleHQgPSBmdW5jdGlvbiAoIHRleHQpIHtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gXCI8c3BlYWs+PHA+XCIgKyB0ZXh0ICsgXCI8L3A+PC9zcGVhaz5cIjtcblxuICAgICAgICAgICAgICAgIF9jb3B5VG9DbGlwYm9hcmQodGV4dCk7XG4gICAgICAgICAgICAgICAgQWxlcnRTZXJ2aWNlLmFkZEluZm8oXCJDb3BpZWQgW1wiICsgdGV4dCArIFwiXVwiICsgXCIgdG8gY2xpcGJvYXJkLlwiKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF9pbml0KCk7XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRVc2VyTWVzc2FnZUdyb3VwcyA9IGZ1bmN0aW9uKG1lc3NhZ2VzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBncm91cHMgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gbWVzc2FnZXMpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kLmluY2x1ZGVzKG1lc3NhZ2VzW2ldLmludGVudCkpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kLnB1c2gobWVzc2FnZXNbaV0uaW50ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlbnQ6IG1lc3NhZ2VzW2ldLmludGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBtZXNzYWdlcy5maWx0ZXIoZnVuY3Rpb24gKG1zZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbXNnLmludGVudCA9PT0gbWVzc2FnZXNbaV0uaW50ZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLm1hcChmdW5jdGlvbiAobXNnKSB7IHJldHVybiBtc2cudGV4dCB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdCgpIHtcbiAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldFNlcnZpY2VQcmV2aWV3KCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQpLnRoZW4oZnVuY3Rpb24gKHByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnByZXZpZXcgPSBwcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcigncHJldmlld1BhbmVsIGNvdWxkIG5vdCBnZXQgc2VydmljZSBwcmV2aWV3LCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfY29weVRvQ2xpcGJvYXJkKHRleHQpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IGVsZW1lbnRcbiAgICAgICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgICAgICAgICAgICAgIC8vIFNldCB2YWx1ZSAoc3RyaW5nIHRvIGJlIGNvcGllZClcbiAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHRleHQ7XG4gICAgICAgICAgICAgICAgLy8gU2V0IG5vbi1lZGl0YWJsZSB0byBhdm9pZCBmb2N1cyBhbmQgbW92ZSBvdXRzaWRlIG9mIHZpZXdcbiAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgICAgIGVsLnN0eWxlID0ge3Bvc2l0aW9uOiAnYWJzb2x1dGUnLCBsZWZ0OiAnLTk5OTlweCd9O1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgICAgICAgIC8vIFNlbGVjdCB0ZXh0IGluc2lkZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgZWwuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gQ29weSB0ZXh0IHRvIGNsaXBib2FyZFxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRlbXBvcmFyeSBlbGVtZW50XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59OyIsImltcG9ydCBhbmd1bGFyIGZyb20gJ2FuZ3VsYXInO1xuXG5pbXBvcnQgcHJldmlld1BhbmVsIGZyb20gJy4vcHJldmlldy1wYW5lbC5kaXJlY3RpdmUnO1xuaW1wb3J0IHByZXZpZXdWYXJpYWJsZXNFZGl0b3IgZnJvbSAnLi9wcmV2aWV3LXZhcmlhYmxlcy1lZGl0b3IuZGlyZWN0aXZlJztcblxuZXhwb3J0IGRlZmF1bHQgYW5ndWxhclxuICAubW9kdWxlKCdjb252by5lZGl0b3IucHJldmlldycsIFtdKVxuICAuZGlyZWN0aXZlKCdwcmV2aWV3UGFuZWwnLCBwcmV2aWV3UGFuZWwpXG4gIC5kaXJlY3RpdmUoJ3ByZXZpZXdWYXJpYWJsZXNFZGl0b3InLCBwcmV2aWV3VmFyaWFibGVzRWRpdG9yKVxuICAubmFtZTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vaW50ZW50LWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbnRlbnRFZGl0b3IoICRsb2csICRyb290U2NvcGUsICR3aW5kb3cpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAkbG9nLmRlYnVnKCAnaW50ZW50RWRpdG9yIGxpbmsnKTtcbiAgICAgICAgICAgICRzY29wZS52YWx1ZSAgICA9ICAgSlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmludGVudHMsIG51bGwsIDIpO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yICAgID0gICBmYWxzZTtcblxuICAgICAgICAgICAgdmFyIG9wZW4gPSBbXTtcblxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEludGVudCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcGVuW2luZGV4XSkge1xuICAgICAgICAgICAgICAgICAgICBvcGVuW2luZGV4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvcGVuW2luZGV4XSA9ICFvcGVuW2luZGV4XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmlzSW50ZW50U2VsZWN0ZWQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcGVuW2luZGV4XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmRlbGV0ZUludGVudCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGludGVudE5hbWUgPSAkc2NvcGUuc2VydmljZS5pbnRlbnRzW2luZGV4XS5uYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKCR3aW5kb3cuY29uZmlybShcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgXCIgKyBpbnRlbnROYW1lICsgXCI/XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmludGVudHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5hZGRJbnRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0aW5kZXggPSAkc2NvcGUuc2VydmljZS5pbnRlbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5pbnRlbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXdJbnRlbnRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3VzdG9tXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidXR0ZXJhbmNlc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyYXdcIjogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1vZGVsXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0XCI6IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldGluZGV4O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCdKc29uRXJyb3InLCBmdW5jdGlvbihldmVudCwgYXJncykge1xuICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGFyZ3M7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggJ3ZhbHVlJywgZnVuY3Rpb24gKCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmludGVudHMgID0gICBKU09OLnBhcnNlKCB2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiAkc2NvcGUuc2VydmljZS5pbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5zZXJ2aWNlLmludGVudHNbaV0ubmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmludGVudHNbaV0ubmFtZSA9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UuaW50ZW50c1tpXS5uYW1lID0gXCJOYW1lbGVzc0ludGVudFwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoICggZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vICRsb2cuZGVidWcoICdpbnRlbnRFZGl0b3IgY29tcG9uZW50IHZhbHVlIGNoYW5nZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNlcnZpY2UuaW50ZW50cztcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudmFsdWUgICAgPSAgIEpTT04uc3RyaW5naWZ5KCAkc2NvcGUuc2VydmljZS5pbnRlbnRzLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0IGFuZ3VsYXIgZnJvbSAnYW5ndWxhcic7XG5cbmltcG9ydCBlbnRpdHlFZGl0b3IgZnJvbSAnLi9lbnRpdHktZWRpdG9yLmRpcmVjdGl2ZSc7XG5pbXBvcnQgaW50ZW50RWRpdG9yIGZyb20gJy4vaW50ZW50LWVkaXRvci5kaXJlY3RpdmUnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gIC5tb2R1bGUoJ2NvbnZvLmVkaXRvci5pbnRlbnRzJywgW10pXG4gIC5kaXJlY3RpdmUoJ2VudGl0eUVkaXRvcicsIGVudGl0eUVkaXRvcilcbiAgLmRpcmVjdGl2ZSgnaW50ZW50RWRpdG9yJywgaW50ZW50RWRpdG9yKVxuICAubmFtZTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vZW50aXR5LWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBlbnRpdHlFZGl0b3IoICRsb2csICR3aW5kb3cpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAkbG9nLmRlYnVnKCAnZW50aXR5RWRpdG9yIGxpbmsnKTtcbiAgICAgICAgICAgICRzY29wZS52YWx1ZSAgICA9ICAgSlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLCBudWxsLCAyKTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBvcGVuID0gW107XG5cbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RFbnRpdHkgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICghb3BlbltpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlbltpbmRleF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9wZW5baW5kZXhdID0gIW9wZW5baW5kZXhdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuaXNFbnRpdHlTZWxlY3RlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wZW5baW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUuZGVsZXRlRW50aXR5ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXR5TmFtZSA9ICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzW2luZGV4XS5uYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkd2luZG93LmNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIFwiICsgZW50aXR5TmFtZSArIFwiP1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuYWRkRW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldGluZGV4ID0gJHNjb3BlLnNlcnZpY2UuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXdFbnRpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZXNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInN5bm9ueW1zXCIgOiBbXCJcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldGluZGV4O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCdKc29uRXJyb3InLCBmdW5jdGlvbihldmVudCwgYXJncykge1xuICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGFyZ3M7XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCAndmFsdWUnLCBmdW5jdGlvbiAoIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UuZW50aXRpZXMgPSAgIEpTT04ucGFyc2UoIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiAkc2NvcGUuc2VydmljZS5lbnRpdGllcyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2UuZW50aXRpZXNbaV0ubmFtZSA9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5zZXJ2aWNlLmVudGl0aWVzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5lbnRpdGllc1tpXS5uYW1lID0gXCJOYW1lbGVzc0VudGl0eVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoIGVycikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyAkbG9nLmRlYnVnKCAnZW50aXR5RWRpdG9yIGNvbXBvbmVudCB2YWx1ZSBjaGFuZ2VkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS52YWx1ZSAgICA9ICAgSlNPTi5zdHJpbmdpZnkoICRzY29wZS5zZXJ2aWNlLmVudGl0aWVzLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59IiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi92ZXJzaW9ucy1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdmVyc2lvbnNFZGl0b3IoICRsb2csICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTClcbntcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcblxuICAgICAgICAgICAgJGxvZy5sb2coICd2ZXJzaW9uc0VkaXRvciBsaW5rJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS52ZXJzaW9ucyA9ICAgW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCAnU2VydmljZVJlbGVhc2VzVXBkYXRlZCcsIGZ1bmN0aW9uICggZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgX2xvYWQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfbG9hZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlVmVyc2lvbnMoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQpLnRoZW4oIGZ1bmN0aW9uICggdmVyc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZlcnNpb25zID0gICB2ZXJzaW9ucztcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3ZlcnNpb25zRWRpdG9yIGdldFNlcnZpY2VWZXJzaW9ucyByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufTsiLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3JlbGVhc2VzLWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWxlYXNlc0VkaXRvciggJGxvZywgJHEsICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwpXG57XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHJlcXVpcmU6ICdecHJvcGVydGllc0NvbnRleHQnLFxuICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCAkc2NvcGUpIHtcblxuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG4gICAgICAgICAgICAkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGxpbmsnKTtcblxuICAgICAgICAgICAgJHNjb3BlLnJlbGVhc2VzICAgICA9ICAgW107XG4gICAgICAgICAgICB2YXIgUFJPTU9URV9PUFRJT05TID0gICB7fTtcbiAgICAgICAgICAgIHZhciBJTVBPUlRfV09SS0ZMT1dfT1BUSU9OUyA9ICAge307XG4gICAgICAgICAgICB2YXIgU1VCTUlUX09QVElPTlMgID0gICB7fTtcblxuICAgICAgICAgICAgJHNjb3BlLmdldFJlbGVhc2VVcmwgICAgPSAgIGZ1bmN0aW9uICggcmVsZWFzZSkge1xuXG4gICAgICAgICAgICAvLyAgaHR0cDovL2NvbnZvLXByb3RvLmxva2FsLmNvbS9yZXN0X3B1YmxpYy9jb252by92MS9zZXJ2aWNlLXJ1bi93ZWJjaGF0L2EvdHJpYmVzLWFzY2VuZFxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcnVuLycgKyByZWxlYXNlWydwbGF0Zm9ybV9pZCddICsgJy8nXG4gICAgICAgICAgICAgICAgKyByZWxlYXNlWydhbGlhcyddICsgJy8nICsgcmVsZWFzZVsnc2VydmljZV9pZCddO1xuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0UHJvbW90ZU9wdGlvbnMgICAgPSAgIGZ1bmN0aW9uICggcmVsZWFzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQUk9NT1RFX09QVElPTlNbIF9nZXRSZWxlYXNlS2V5KCByZWxlYXNlKV07XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICRzY29wZS5wcm9tb3RlUmVsZWFzZSAgID0gICBmdW5jdGlvbiAoIHJvdywgdHlwZSwgc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIHByb21vdGVSZWxlYXNlIHR5cGUnLCB0eXBlLCAncm93Jywgcm93KTtcbiAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLnByb21vdGVSZWxlYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd1sncmVsZWFzZV9pZCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlKS50aGVuKCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2xvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VSZWxlYXNlc1VwZGF0ZWQnKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIHByb21vdGVSZWxlYXNlIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0U3VibWl0T3B0aW9ucyA9ICAgZnVuY3Rpb24gKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFNVQk1JVF9PUFRJT05TWyBfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSldO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdFJlbGVhc2UgICAgPSAgIGZ1bmN0aW9uICggcm93LCB0eXBlLCBzdGFnZSkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3Igc3VibWl0UmVsZWFzZSB0eXBlJywgdHlwZSwgJ3JvdycsIHJvdyk7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5jcmVhdGVSZWxlYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd1sncGxhdGZvcm1faWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFnZSkudGhlbiggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9sb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlUmVsZWFzZXNVcGRhdGVkJyk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdyZWxlYXNlc0VkaXRvciBzdWJtaXRSZWxlYXNlIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICRzY29wZS5nZXRJbXBvcnRXb3JrZmxvdyAgICA9ICAgZnVuY3Rpb24gKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElNUE9SVF9XT1JLRkxPV19PUFRJT05TWyBfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSldO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmltcG9ydFdvcmtmbG93UmVsZWFzZSAgICA9ICAgZnVuY3Rpb24gKCByb3csIHJlbGVhc2VJZCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3IgaW1wb3J0V29ya2Zsb3dSZWxlYXNlIHJlbGVhc2VJZCcsIHJlbGVhc2VJZCk7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5pbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd1sndmVyc2lvbl9pZCddKS50aGVuKCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2xvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VSZWxlYXNlc1VwZGF0ZWQnKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIGltcG9ydFdvcmtmbG93UmVsZWFzZSByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0X3JlbGVhc2UoIHBsYXRmb3JtSWQsIHR5cGUsIHN0YWdlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8JHNjb3BlLnJlbGVhc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxlYXNlID0gICAkc2NvcGUucmVsZWFzZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICggcmVsZWFzZVsndHlwZSddID09PSB0eXBlICYmIHJlbGVhc2VbJ3N0YWdlJ10gPT09IHN0YWdlICYmIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09IHBsYXRmb3JtSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3IgZ2V0X3JlbGVhc2UgZm91bmQgcGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQsICd0eXBlJywgdHlwZSwgJ3N0YWdlJywgc3RhZ2UsIHJlbGVhc2VbJ3JlbGVhc2VfaWQnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZVsncmVsZWFzZV9pZCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGxvZy5sb2coICdyZWxlYXNlc0VkaXRvciBnZXRfcmVsZWFzZSBub3QgZm91bmQgcGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQsICd0eXBlJywgdHlwZSwgJ3N0YWdlJywgc3RhZ2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbiggJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgZnVuY3Rpb24gKCBldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBfbG9hZCgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIF9sb2FkKCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9sb2FkKCkge1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0U2VydmljZVJlbGVhc2VzKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkKS50aGVuKCBmdW5jdGlvbiAoIHJlbGVhc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3IgcmVsZWFzZXMgbG9hZGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5yZWxlYXNlcyA9ICAgcmVsZWFzZXM7XG4gICAgICAgICAgICAgICAgICAgIF9pbml0T3B0aW9ucygpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncmVsZWFzZXNFZGl0b3IgZ2V0U2VydmljZVJlbGVhc2VzIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2luaXRPcHRpb25zKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3JlbGVhc2VzRWRpdG9yIF9pbml0T3B0aW9ucycpO1xuXG4gICAgICAgICAgICAgICAgUFJPTU9URV9PUFRJT05TID0gICB7fTtcbiAgICAgICAgICAgICAgICBJTVBPUlRfV09SS0ZMT1dfT1BUSU9OUyA9ICAge307XG4gICAgICAgICAgICAgICAgU1VCTUlUX09QVElPTlMgID0gICB7fTtcblxuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlcyAgICA9ICAgJHNjb3BlLmdldERldmVsb3BtZW50KCk7XG4gICAgICAgICAgICAgICAgZm9yICggdmFyIGk9MDsgaTxyZWxlYXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsZWFzZSA9ICAgcmVsZWFzZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgICAgID0gICBfZ2V0UmVsZWFzZUtleSggcmVsZWFzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSAgIF9nZXRTdWJtaXRPcHRpb25zKCByZWxlYXNlKTtcbiAgICAgICAgICAgICAgICAgICAgU1VCTUlUX09QVElPTlNba2V5XSA9ICAgb3B0aW9ucztcblxuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9ICAgX2dldFdvcmtmbG93T3B0aW9ucyggcmVsZWFzZSk7XG4gICAgICAgICAgICAgICAgICAgIElNUE9SVF9XT1JLRkxPV19PUFRJT05TW2tleV0gICAgPSAgIG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VzICAgID0gICAkc2NvcGUuZ2V0VGVzdCgpO1xuICAgICAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8cmVsZWFzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2UgPSAgIHJlbGVhc2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ICAgICA9ICAgX2dldFJlbGVhc2VLZXkoIHJlbGVhc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gICBfZ2V0UHJvbW90ZU9wdGlvbnMoIHJlbGVhc2UpO1xuICAgICAgICAgICAgICAgICAgICBQUk9NT1RFX09QVElPTlNba2V5XSAgICA9ICAgb3B0aW9ucztcblxuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9ICAgX2dldFdvcmtmbG93T3B0aW9ucyggcmVsZWFzZSk7XG4gICAgICAgICAgICAgICAgICAgIElNUE9SVF9XT1JLRkxPV19PUFRJT05TW2tleV0gICAgPSAgIG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VzICAgID0gICAkc2NvcGUuZ2V0UHJvZHVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8cmVsZWFzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2UgPSAgIHJlbGVhc2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ICAgICA9ICAgX2dldFJlbGVhc2VLZXkoIHJlbGVhc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gICBfZ2V0UHJvbW90ZU9wdGlvbnMoIHJlbGVhc2UpO1xuICAgICAgICAgICAgICAgICAgICBQUk9NT1RFX09QVElPTlNba2V5XSAgICA9ICAgb3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9nZXRSZWxlYXNlS2V5KCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlbGVhc2VbJ3JlbGVhc2VfaWQnXSA/IHJlbGVhc2VbJ3JlbGVhc2VfaWQnXSA6IHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gKyAnXycgKyByZWxlYXNlWyd0eXBlJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9nZXRTdWJtaXRPcHRpb25zKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSAgIFtdO1xuXG4gICAgICAgICAgICAgICAgaWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAnYW1hem9uJykge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ1N1Ym1pdCB0byByZXZpZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlIDogJ3JldmlldycsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdkaWFsb2dmbG93Jykge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ1N1Ym1pdCB0byByZXZpZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlIDogJ3JldmlldycsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ1N1Ym1pdCB0byBhbHBoYSB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAndGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFnZSA6ICdhbHBoYScsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdjb252b19jaGF0Jykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsZWFzZV9pZCAgPSAgIGdldF9yZWxlYXNlKCAnY29udm9fY2hhdCcsICdwcm9kdWN0aW9uJywgJ3JlbGVhc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnU3VibWl0IGFzIHJlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAncHJvZHVjdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiAncmVsZWFzZScsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2ZhY2Vib29rX21lc3NlbmdlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VfaWQgID0gICBnZXRfcmVsZWFzZSggJ2ZhY2Vib29rX21lc3NlbmdlcicsICdwcm9kdWN0aW9uJywgJ3JlbGVhc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnU3VibWl0IGFzIHJlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAncHJvZHVjdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiAncmVsZWFzZScsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ3ZpYmVyJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsZWFzZV9pZCAgPSAgIGdldF9yZWxlYXNlKCAndmliZXInLCAncHJvZHVjdGlvbicsICdyZWxlYXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggIXJlbGVhc2VfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ1N1Ym1pdCBhcyByZWxlYXNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlIDogJ3JlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2dldFByb21vdGVPcHRpb25zKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSAgIFtdO1xuICAgICAgICAgICAgICAgIGlmICggcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2FtYXpvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCByZWxlYXNlWydzdGFnZSddID09PSAncmV2aWV3Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnUHJvbW90ZSB0byByZWxlYXNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlIDogJ3JlbGVhc2UnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdkaWFsb2dmbG93Jykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHJlbGVhc2VbJ3R5cGUnXSA9PT0gJ3Byb2R1Y3Rpb24nICYmIHJlbGVhc2VbJ3N0YWdlJ10gPT09ICdyZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZSA6ICdQcm9tb3RlIHRvIHJlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAncHJvZHVjdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiAncmVsZWFzZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCByZWxlYXNlWyd0eXBlJ10gPT09ICd0ZXN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnUHJvbW90ZSB0byByZXZpZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAncHJvZHVjdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiAncmV2aWV3J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9nZXRXb3JrZmxvd09wdGlvbnMoIHJlbGVhc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9ICAgW107XG5cbiAgICAgICAgICAgICAgICBpZiAoIHJlbGVhc2VbJ3BsYXRmb3JtX2lkJ10gPT09ICdhbWF6b24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxlYXNlX2lkICA9ICAgZ2V0X3JlbGVhc2UoICdhbWF6b24nLCAncHJvZHVjdGlvbicsICdyZWxlYXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnSW1wb3J0IHRvIHJlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25faWQgOiByZWxlYXNlWyd2ZXJzaW9uX2lkJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZV9pZCA6IHJlbGVhc2VfaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VfaWQgID0gICBnZXRfcmVsZWFzZSggJ2FtYXpvbicsICdwcm9kdWN0aW9uJywgJ3JldmlldycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHJlbGVhc2VfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ0ltcG9ydCB0byByZXZpZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25faWQgOiByZWxlYXNlWyd2ZXJzaW9uX2lkJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZV9pZCA6IHJlbGVhc2VfaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICggcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2RpYWxvZ2Zsb3cnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxlYXNlX2lkICA9ICAgZ2V0X3JlbGVhc2UoICdkaWFsb2dmbG93JywgJ3Byb2R1Y3Rpb24nLCAncmVsZWFzZScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHJlbGVhc2VfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ0ltcG9ydCB0byByZWxlYXNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uX2lkIDogcmVsZWFzZVsndmVyc2lvbl9pZCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VfaWQgOiByZWxlYXNlX2lkXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxlYXNlX2lkICA9ICAgZ2V0X3JlbGVhc2UoICdkaWFsb2dmbG93JywgJ3Byb2R1Y3Rpb24nLCAncmV2aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnSW1wb3J0IHRvIHJldmlldycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbl9pZCA6IHJlbGVhc2VbJ3ZlcnNpb25faWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlX2lkIDogcmVsZWFzZV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VfaWQgID0gICBnZXRfcmVsZWFzZSggJ2RpYWxvZ2Zsb3cnLCAndGVzdCcsICdhbHBoYScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHJlbGVhc2VfaWQgJiYgcmVsZWFzZVsndHlwZSddICE9PSAndGVzdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlIDogJ0ltcG9ydCB0byBhbHBoYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbl9pZCA6IHJlbGVhc2VbJ3ZlcnNpb25faWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlX2lkIDogcmVsZWFzZV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAnY29udm9fY2hhdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VfaWQgID0gICBnZXRfcmVsZWFzZSggJ2NvbnZvX2NoYXQnLCAncHJvZHVjdGlvbicsICdyZWxlYXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggcmVsZWFzZV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgOiAnSW1wb3J0IHRvIHJlbGVhc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25faWQgOiByZWxlYXNlWyd2ZXJzaW9uX2lkJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZV9pZCA6IHJlbGVhc2VfaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICggcmVsZWFzZVsncGxhdGZvcm1faWQnXSA9PT0gJ2ZhY2Vib29rX21lc3NlbmdlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VfaWQgID0gICBnZXRfcmVsZWFzZSggJ2ZhY2Vib29rX21lc3NlbmdlcicsICdwcm9kdWN0aW9uJywgJ3JlbGVhc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCByZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZSA6ICdJbXBvcnQgdG8gcmVsZWFzZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbl9pZCA6IHJlbGVhc2VbJ3ZlcnNpb25faWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlX2lkIDogcmVsZWFzZV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCByZWxlYXNlWydwbGF0Zm9ybV9pZCddID09PSAndmliZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxlYXNlX2lkICA9ICAgZ2V0X3JlbGVhc2UoICd2aWJlcicsICdwcm9kdWN0aW9uJywgJ3JlbGVhc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCByZWxlYXNlX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZSA6ICdJbXBvcnQgdG8gcmVsZWFzZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbl9pZCA6IHJlbGVhc2VbJ3ZlcnNpb25faWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlX2lkIDogcmVsZWFzZV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICAgICAgICB9O1xuXG5cblxuICAgICAgICAgICAgLy8gR1JJRCBEQVRBXG4gICAgICAgICAgICAkc2NvcGUuZ2V0UHJvZHVjdGlvbiAgICA9ICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlcyA9ICRzY29wZS5yZWxlYXNlcy5maWx0ZXIoIGZ1bmN0aW9uKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWxlYXNlLnR5cGUgPT09ICdwcm9kdWN0aW9uJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZXM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0VGVzdCAgICAgICAgICA9ICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlcyA9ICRzY29wZS5yZWxlYXNlcy5maWx0ZXIoIGZ1bmN0aW9uKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZS50eXBlICAgPT09ICd0ZXN0JztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZXM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0RGV2ZWxvcG1lbnQgICA9ICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlcyA9ICRzY29wZS5yZWxlYXNlcy5maWx0ZXIoIGZ1bmN0aW9uKCByZWxlYXNlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZS50eXBlICAgPT09ICdkZXZlbG9wJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZXM7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vbWlzYy1wYW5lbC50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtaXNjUGFuZWwoICRsb2csIENvbnZvd29ya3NBcGksIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTClcbntcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oICRzY29wZSkge1xuXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcywgcHJvcGVydGllc0NvbnRleHQpIHtcblxuICAgICAgICAgICAgJHNjb3BlLnVwbG9hZE9wdGlvbnMgICAgPSAgIHtcbiAgICAgICAgICAgICAgICBrZWVwX3ZhcnMgOiB0cnVlLFxuICAgICAgICAgICAgICAgIGtlZXBfY29uZmlncyA6IHRydWUsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUudXBsb2FkU3VibWl0dGVkICA9ICAgZnVuY3Rpb24oIGZpbGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJ21pc2NQYW5lbCB1cGxvYWRTdWJtaXR0ZWQoKSBmaWxlJywgZmlsZSwgJyRzY29wZS51cGxvYWRPcHRpb25zJywgJHNjb3BlLnVwbG9hZE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBsb2FkU2VydmljZURhdGEoIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS51cGxvYWRPcHRpb25zLmtlZXBfdmFycywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS51cGxvYWRPcHRpb25zLmtlZXBfY29uZmlncykudGhlbiggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHVwbG9hZFN1Ym1pdHRlZCgpIE9LJyk7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDb250ZXh0LnJlbG9hZFNlcnZpY2UoKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHVwbG9hZFN1Ym1pdHRlZCgpIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5kb3dubG9hZCAgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIGRvd25sb2FkKCknKTtcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gICBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtaW1wLWV4cC9leHBvcnQvJyArICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQ7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyggJ21pc2NQYW5lbCByZWRpcmVjdGluZyB0byBbJyt1cmwrJ10nKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5ocmVmICA9ICAgdXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUuZG93bmxvYWRQbGF0Zm9ybSAgPSAgIGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoICdtaXNjUGFuZWwgZG93bmxvYWRQbGF0Zm9ybSgpJywgcGxhdGZvcm1JZCk7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9ICAgQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLWltcC1leHAvZXhwb3J0LycgKyAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkICsgJy8nICsgcGxhdGZvcm1JZDtcbiAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCAnbWlzY1BhbmVsIHJlZGlyZWN0aW5nIHRvIFsnK3VybCsnXScpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmxvY2F0aW9uLmhyZWYgID0gICB1cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn07IiwiaW1wb3J0IGFuZ3VsYXIgZnJvbSAnYW5ndWxhcic7XG5cbmltcG9ydCBjb25maWdBbWF6b25FZGl0b3IgZnJvbSAnLi9jb25maWctYW1hem9uLWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IGNvbmZpZ0NvbnZvQ2hhdEVkaXRvciBmcm9tICcuL2NvbmZpZy1jb252by1jaGF0LWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IGNvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3IgZnJvbSAnLi9jb25maWctZGlhbG9nZmxvdy1lZGl0b3IuZGlyZWN0aXZlJztcbmltcG9ydCBjb25maWdNZXNzZW5nZXJFZGl0b3IgZnJvbSAnLi9jb25maWctbWVzc2VuZ2VyLWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IGNvbmZpZ1ZpYmVyRWRpdG9yIGZyb20gJy4vY29uZmlnLXZpYmVyLWVkaXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IGNvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yIGZyb20gJy4vY29uZmlnLXNlcnZpY2UtbWV0YS1lZGl0b3IuZGlyZWN0aXZlJztcbmltcG9ydCBtaXNjUGFuZWwgZnJvbSAnLi9taXNjLXBhbmVsLmRpcmVjdGl2ZSc7XG5pbXBvcnQgcmVsZWFzZXNFZGl0b3IgZnJvbSAnLi9yZWxlYXNlcy1lZGl0b3IuZGlyZWN0aXZlJztcbmltcG9ydCB2ZXJzaW9uc0VkaXRvciBmcm9tICcuL3ZlcnNpb25zLWVkaXRvci5kaXJlY3RpdmUnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gIC5tb2R1bGUoJ2NvbnZvLmVkaXRvci5jb25maWcnLCBbXSlcbiAgLmRpcmVjdGl2ZSgnY29uZmlnQW1hem9uRWRpdG9yJywgY29uZmlnQW1hem9uRWRpdG9yKVxuICAuZGlyZWN0aXZlKCdjb25maWdDb252b0NoYXRFZGl0b3InLCBjb25maWdDb252b0NoYXRFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ2NvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3InLCBjb25maWdEaWFsb2dmbG93RWRpdG9yKVxuICAuZGlyZWN0aXZlKCdjb25maWdNZXNzZW5nZXJFZGl0b3InLCBjb25maWdNZXNzZW5nZXJFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ2NvbmZpZ1ZpYmVyRWRpdG9yJywgY29uZmlnVmliZXJFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ2NvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yJywgY29uZmlnU2VydmljZU1ldGFFZGl0b3IpXG4gIC5kaXJlY3RpdmUoJ21pc2NQYW5lbCcsIG1pc2NQYW5lbClcbiAgLmRpcmVjdGl2ZSgncmVsZWFzZXNFZGl0b3InLCByZWxlYXNlc0VkaXRvcilcbiAgLmRpcmVjdGl2ZSgndmVyc2lvbnNFZGl0b3InLCB2ZXJzaW9uc0VkaXRvcilcbiAgLm5hbWU7XG4iLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2NvbmZpZy12aWJlci1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZmlnQ29udm9DaGF0RWRpdG9yKCRsb2csICRxLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBMb2dpblNlcnZpY2UsIFBST1RPX1ZJQkVSX1dFQkhPT0tfRVZFTlRfVFlQRVMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGNvbnRyb2xsZXIgKCRzY29wZSkge1xuXG4gICAgICAgIH0sXG4gICAgICAgIGxpbmsgKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7XG5cbiAgICAgICAgICAgIGxldCB1c2VyICAgID0gICBudWxsO1xuXG4gICAgICAgICAgICBMb2dpblNlcnZpY2UuZ2V0VXNlcigpLnRoZW4oIGZ1bmN0aW9uICggdSkge1xuICAgICAgICAgICAgICAgIHVzZXIgPSB1O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgICAgZGVsZWdhdGVObHA6IG51bGwsXG4gICAgICAgICAgICAgICAgYWNjb3VudF9pZDogbnVsbCxcbiAgICAgICAgICAgICAgICBhdXRoX3Rva2VuOiBudWxsLFxuICAgICAgICAgICAgICAgIGV2ZW50X3R5cGVzOiBbXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmV2ZW50X3R5cGVzID0gUFJPVE9fVklCRVJfV0VCSE9PS19FVkVOVF9UWVBFUztcblxuICAgICAgICAgICAgbGV0IGNvbmZpZ0JhayAgID0gICBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgbGV0IGlzX25ldyAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgbGV0IGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgIGxldCBoYXNfc3RhcnRlZCA9ICAgZmFsc2U7XG5cblxuICAgICAgICAgICAgX2xvYWQoKTtcblxuICAgICAgICAgICAgJHNjb3BlLmdldEludGVudE5scHMgICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnZGlhbG9nZmxvdyddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuaXNOZXcgICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzX25ldztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmhpZGVBbGwgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhaGFzX3N0YXJ0ZWQgJiYgaXNfbmV3O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuc3RhcnQgICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaGFzX3N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGhhc19zdGFydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAkc2NvcGUuZ2V0Q29uZmlnVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2h0dHBzOi8vcGFydG5lcnMudmliZXIuY29tL2FjY291bnQvJyArICRzY29wZS5jb25maWcuYWNjb3VudF9pZCArICcvaW5mbydcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3VwZGF0ZVNlbGVjdGVkV2ViaG9va0V2ZW50cygpO1xuICAgICAgICAgICAgICAgIGlmICggaXNfbmV3KSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAndmliZXInLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgY3JlYXRlKCkgJHNjb3BlLmNvbmZpZycsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ldyAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIGNyZWF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNyZWF0ZSBjb25maWcgZm9yIENvbnZvLiAkeyAgcmVzcG9uc2UuZGF0YS5tZXNzYWdlfWApXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAndmliZXInLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgdXBkYXRlKCkgJHNjb3BlLmNvbmZpZycsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIHVwZGF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnJlZ2lzdGVyQ2hhbmdlID0gZnVuY3Rpb24od2ViaG9va0V2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50TmFtZSA9IHdlYmhvb2tFdmVudC5ldmVudC5uYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpc0V2ZW50RW5hYmxlZCA9ICF3ZWJob29rRXZlbnQuZXZlbnQuY2hlY2tlZDtcblxuICAgICAgICAgICAgICAgIGlmIChpc0V2ZW50RW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmV2ZW50X3R5cGVzLnB1c2goZXZlbnROYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmV2ZW50X3R5cGVzID0gX2FycmF5UmVtb3ZlKCRzY29wZS5jb25maWcuZXZlbnRfdHlwZXMsIGV2ZW50TmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5nZXRXZWJob29rRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5yZXZlcnRDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGFuZ3VsYXIuY29weShjb25maWdCYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZENoYW5nZSA9ICFhbmd1bGFyLmVxdWFscyggY29uZmlnQmFrLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmllbGRDaGFuZ2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRXZWJob29rRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBhcnJheSB3aXRoIHZhbHVlcyBmcm9tIGNvbmZpZ1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuY29uZmlnLmV2ZW50X3R5cGVzICYmICRzY29wZS5jb25maWcuZXZlbnRfdHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICRzY29wZS5ldmVudF90eXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5jb25maWcuZXZlbnRfdHlwZXMuaW5jbHVkZXMoJHNjb3BlLmV2ZW50X3R5cGVzW2ldLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50X3R5cGVzW2ldLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV2ViaG9vayBFdmVudCB0eXBlczogXCIgKyAkc2NvcGUuZXZlbnRfdHlwZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuZXZlbnRfdHlwZXM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfdXBkYXRlU2VsZWN0ZWRXZWJob29rRXZlbnRzKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcuZXZlbnRfdHlwZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICRzY29wZS5ldmVudF90eXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmV2ZW50X3R5cGVzW2ldLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3ZWJob29rRXZlbnROYW1lID0gJHNjb3BlLmV2ZW50X3R5cGVzW2ldLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmV2ZW50X3R5cGVzLnB1c2god2ViaG9va0V2ZW50TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9hcnJheVJlbW92ZShhcnIsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uKGVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZSAhPT0gdmFsdWU7XG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICd2aWJlcicpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgIGlzX25ldyAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgbG9hZFBsYXRmb3JtQ29uZmlnKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCByZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICAgICAgPSAgIHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2NvbmZpZy1zZXJ2aWNlLW1ldGEtZWRpdG9yLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yKCRsb2csIExvZ2luU2VydmljZSwgQ29udm93b3Jrc0FwaSlcbntcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuICAgICAgICAgICAgJGxvZy5sb2coJ2NvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yIGxpbmtlZCcpO1xuXG4gICAgICAgICAgICB2YXIgdXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIExvZ2luU2VydmljZS5nZXRVc2VyKCkudGhlbihmdW5jdGlvbiAodSkge1xuICAgICAgICAgICAgICAgIHVzZXIgPSB1O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICcnLFxuICAgICAgICAgICAgICAgIG93bmVyOiAnJyxcbiAgICAgICAgICAgICAgICBhZG1pbnM6IFsnJ11cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF9sb2FkKCk7XG5cbiAgICAgICAgICAgIHZhciBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICB2YXIgaXNfZXJyb3IgPSAgZmFsc2U7XG5cbiAgICAgICAgICAgICRzY29wZS5yZXZlcnRDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGFuZ3VsYXIuY29weShjb25maWdCYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhYW5ndWxhci5lcXVhbHMoY29uZmlnQmFrLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBkYXRlU2VydmljZU1ldGEoJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXRhID0gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdjb25maWdTZXJ2aWNlTWV0YUVkaXRvciB1cGRhdGVDb25maWcoKSBnb3QgbmV3IG1ldGEnLCBtZXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbWV0YVsnbmFtZSddIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IG1ldGFbJ2Rlc2NyaXB0aW9uJ10gfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBvd25lcjogbWV0YVsnb3duZXInXSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkbWluczogbWV0YVsnYWRtaW5zJ10gfHwgWycnXVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCdjb25maWdTZXJ2aWNlTWV0YUVkaXRvciB1cGRhdGVDb25maWcgZmFpbGVkIGZvciByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfbG9hZCgpIHtcbiAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldFNlcnZpY2VNZXRhKCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQpLnRoZW4oZnVuY3Rpb24gKG1ldGEpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbmZpZ1NlcnZpY2VNZXRhRWRpdG9yIGdvdCBzZXJ2aWNlIG1ldGEnLCBtZXRhKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG1ldGFbJ25hbWUnXSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBtZXRhWydkZXNjcmlwdGlvbiddIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3duZXI6IG1ldGFbJ293bmVyJ10gfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBhZG1pbnM6IG1ldGFbJ2FkbWlucyddIHx8IFsnJ11cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSgkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cud2FybignY29uZmlnU2VydmljZU1ldGFFZGl0b3IgZ2V0U2VydmljZU1ldGEgZmFpbGVkIGZvciByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59IiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9jb25maWctbWVzc2VuZ2VyLWVkaXRvci50bXBsLmh0bWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb25maWdDb252b0NoYXRFZGl0b3IoJGxvZywgJHEsICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIExvZ2luU2VydmljZSwgUFJPVE9fRkFDRUJPT0tfTUVTU0VOR0VSX1dFQkhPT0tfRVZFTlRTKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHsgc2VydmljZTogJz0nIH0sXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBjb250cm9sbGVyICgkc2NvcGUpIHtcblxuICAgICAgICB9LFxuICAgICAgICBsaW5rICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXG4gICAgICAgICAgICBsZXQgdXNlciAgICA9ICAgbnVsbDtcblxuICAgICAgICAgICAgTG9naW5TZXJ2aWNlLmdldFVzZXIoKS50aGVuKCBmdW5jdGlvbiAoIHUpIHtcbiAgICAgICAgICAgICAgICB1c2VyID0gdTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuY29uZmlnID0ge1xuICAgICAgICAgICAgICAgIGRlbGVnYXRlTmxwOiBudWxsLFxuICAgICAgICAgICAgICAgIHBhZ2VfaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgcGFnZV9hY2Nlc3NfdG9rZW46IG51bGwsXG4gICAgICAgICAgICAgICAgYXBwX2lkOiBudWxsLFxuICAgICAgICAgICAgICAgIGFwcF9zZWNyZXQ6IG51bGwsXG4gICAgICAgICAgICAgICAgd2ViaG9va192ZXJpZnlfdG9rZW46IG51bGwsXG4gICAgICAgICAgICAgICAgd2ViaG9va19ldmVudHM6IFtdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUud2ViaG9va19ldmVudHMgPSBQUk9UT19GQUNFQk9PS19NRVNTRU5HRVJfV0VCSE9PS19FVkVOVFM7XG5cbiAgICAgICAgICAgIGxldCBjb25maWdCYWsgICA9ICAgYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgIGxldCBpc19uZXcgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgIGxldCBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICBsZXQgaGFzX3N0YXJ0ZWQgPSAgIGZhbHNlO1xuXG5cbiAgICAgICAgICAgIF9sb2FkKCk7XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRJbnRlbnRObHBzICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbJ2RpYWxvZ2Zsb3cnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmlzTmV3ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc19uZXc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5oaWRlQWxsICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWhhc19zdGFydGVkICYmIGlzX25ldztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnN0YXJ0ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGhhc19zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBoYXNfc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgJHNjb3BlLmdldENvbmZpZ1VybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICdodHRwczovL2RldmVsb3BlcnMuZmFjZWJvb2suY29tL2FwcHMvJyArICRzY29wZS5jb25maWcuYXBwX2lkICsgJy9tZXNzZW5nZXIvc2V0dGluZ3MvJ1xuICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfdXBkYXRlU2VsZWN0ZWRXZWJob29rRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgaWYgKCBpc19uZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5jcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdmYWNlYm9va19tZXNzZW5nZXInLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgY3JlYXRlKCkgJHNjb3BlLmNvbmZpZycsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ldyAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIGNyZWF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNyZWF0ZSBjb25maWcgZm9yIENvbnZvLiAkeyAgcmVzcG9uc2UuZGF0YS5tZXNzYWdlfWApXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnZmFjZWJvb2tfbWVzc2VuZ2VyJywgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIHVwZGF0ZSgpICRzY29wZS5jb25maWcnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciB1cGRhdGUoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5yZWdpc3RlckNoYW5nZSA9IGZ1bmN0aW9uKHdlYmhvb2tFdmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBldmVudE5hbWUgPSB3ZWJob29rRXZlbnQuZXZlbnQubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgaXNFdmVudEVuYWJsZWQgPSAhd2ViaG9va0V2ZW50LmV2ZW50LmNoZWNrZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNFdmVudEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy53ZWJob29rX2V2ZW50cy5wdXNoKGV2ZW50TmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy53ZWJob29rX2V2ZW50cyA9IF9hcnJheVJlbW92ZSgkc2NvcGUuY29uZmlnLndlYmhvb2tfZXZlbnRzLCBldmVudE5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0V2ViaG9va0V2ZW50cygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUucmV2ZXJ0Q29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBhbmd1bGFyLmNvcHkoY29uZmlnQmFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmlzQ29uZmlnQ2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRDaGFuZ2UgPSAhYW5ndWxhci5lcXVhbHMoIGNvbmZpZ0JhaywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkQ2hhbmdlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0V2ViaG9va0V2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgYXJyYXkgd2l0aCB2YWx1ZXMgZnJvbSBjb25maWdcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmNvbmZpZy53ZWJob29rX2V2ZW50cyAmJiAkc2NvcGUuY29uZmlnLndlYmhvb2tfZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkc2NvcGUud2ViaG9va19ldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuY29uZmlnLndlYmhvb2tfZXZlbnRzLmluY2x1ZGVzKCRzY29wZS53ZWJob29rX2V2ZW50c1tpXS5uYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWJob29rX2V2ZW50c1tpXS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLndlYmhvb2tfZXZlbnRzO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gX3VwZGF0ZVNlbGVjdGVkV2ViaG9va0V2ZW50cygpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLndlYmhvb2tfZXZlbnRzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkc2NvcGUud2ViaG9va19ldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS53ZWJob29rX2V2ZW50c1tpXS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2ViaG9va0V2ZW50TmFtZSA9ICRzY29wZS53ZWJob29rX2V2ZW50c1tpXS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy53ZWJob29rX2V2ZW50cy5wdXNoKHdlYmhvb2tFdmVudE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfYXJyYXlSZW1vdmUoYXJyLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbihlbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGUgIT09IHZhbHVlO1xuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2xvYWQoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnZmFjZWJvb2tfbWVzc2VuZ2VyJykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciBsb2FkUGxhdGZvcm1Db25maWcoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19uZXcgICAgICA9ICAgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vY29uZmlnLWRpYWxvZ2Zsb3ctZWRpdG9yLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3IoJGxvZywgJHEsICRyb290U2NvcGUsIENvbnZvd29ya3NBcGksIExvZ2luU2VydmljZSwgUFJPVE9fRElBTE9HRkxPV19MQU5HVUFHRVMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cmlidXRlcykge1xuXG4gICAgICAgICAgICAgICAgdmFyIHVzZXIgICAgPSAgIG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgTG9naW5TZXJ2aWNlLmdldFVzZXIoKS50aGVuKCBmdW5jdGlvbiAoIHUpIHtcbiAgICAgICAgICAgICAgICAgICAgdXNlciA9IHU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZTogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3RJZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZUFjY291bnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBhdmF0YXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRfbG9jYWxlOiAnZW4nLFxuICAgICAgICAgICAgICAgICAgICBzdXBwb3J0ZWRfbG9jYWxlczogWydlbiddXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5sYW5ndWFnZXMgPSBQUk9UT19ESUFMT0dGTE9XX0xBTkdVQUdFUztcblxuICAgICAgICAgICAgICAgIHZhciBjb25maWdCYWsgICA9ICAgYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICB2YXIgaXNfbmV3ICAgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgaGFzX3N0YXJ0ZWQgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBsb2dsaW5lICAgICA9ICAgJyc7XG5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBfbG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHByZXBhcmVkVXBsb2FkID0gbnVsbDtcbiAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNNZWRpYUl0ZW1JZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjb25maWcuZGVmYXVsdF9sb2NhbGUnLCBmdW5jdGlvbihuZXdEZWZhdWx0TG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdEZWZhdWx0TG9jYWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdjb25maWdEaWFsb2dmbG93RWRpdG9yICR3YXRjaCBjb25maWcuZGVmYXVsdF9sb2NhbGUgbmV3IHZhbHVlJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmRlZmF1bHRfbG9jYWxlID0gbmV3RGVmYXVsdExvY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcuc3VwcG9ydGVkX2xvY2FsZXMgPSBbJHNjb3BlLmNvbmZpZy5kZWZhdWx0X2xvY2FsZV1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5pc05ldyAgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzX25ldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLmhpZGVBbGwgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWhhc19zdGFydGVkICYmIGlzX25ldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXJ0ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBoYXNfc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0Q29uZmlnVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnaHR0cHM6Ly9jb25zb2xlLmFjdGlvbnMuZ29vZ2xlLmNvbS9wcm9qZWN0LycgKyAkc2NvcGUuY29uZmlnLnByb2plY3RJZCArICcvZGlyZWN0b3J5aW5mb3JtYXRpb24vJ1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3IgdXBkYXRlKCkgJHNjb3BlLmNvbmZpZycsICRzY29wZS5jb25maWcpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXliZVVwbG9hZCA9IHByZXBhcmVkVXBsb2FkID9cbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBsb2FkTWVkaWEoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGlhbG9nZmxvdy5hdmF0YXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXBhcmVkVXBsb2FkLmZpbGUpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgJHEud2hlbihtYXliZVVwbG9hZCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzICYmIHJlcy5tZWRpYUl0ZW1JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcuYXZhdGFyID0gcmVzLm1lZGlhSXRlbUlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXBhcmVkVXBsb2FkID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzX25ldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb252b3dvcmtzQXBpLmNyZWF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RpYWxvZ2Zsb3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2xpbmUgPSAnY29uZmlnRGlhbG9nZmxvd0VkaXRvciBjcmVhdGUoKSByZXNwb25zZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ldyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0RpYWxvZ2Zsb3dFZGl0b3IgY3JlYXRlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjcmVhdGUgY29uZmlnIGZvciBEaWFsb2dmbG93LiBcIiArIHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nbGluZSA9ICdjb25maWdEaWFsb2dmbG93RWRpdG9yIHVwZGF0ZSgpIHJlc3BvbnNlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb252b3dvcmtzQXBpLnVwZGF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkaWFsb2dmbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcobG9nbGluZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucmV2ZXJ0Q29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJlcGFyZWRVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXBhcmVkVXBsb2FkID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lZGlhSXRlbUlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c01lZGlhSXRlbUlkID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBhbmd1bGFyLmNvcHkoY29uZmlnQmFrKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUub25GaWxlVXBsb2FkID0gZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbmZpZ3VyYXRpb25zRWRpdG9yIG9uRmlsZVVwbG9hZCBmaWxlJywgZmlsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJlcGFyZWRVcGxvYWQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNNZWRpYUl0ZW1JZCA9ICRzY29wZS5jb25maWcuYXZhdGFyO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnLmF2YXRhciA9ICd0bXBfdXBsb2FkX3JlYWR5JztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0TWVkaWEgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtZWRpYUl0ZW1JZCA9ICRzY29wZS5jb25maWdbdHlwZV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtZWRpYUl0ZW1JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lZGlhSXRlbUlkID09PSAndG1wX3VwbG9hZF9yZWFkeScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhSXRlbUlkID0gcHJldmlvdXNNZWRpYUl0ZW1JZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4vLyAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdDb25maWd1cmF0aW9uc0VkaXRvciBnZXRNZWRpYSgnLCB0eXBlLCAnKSBtZWRpYUl0ZW1JZCcsIG1lZGlhSXRlbUlkKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udm93b3Jrc0FwaS5kb3dubG9hZE1lZGlhKCRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsIG1lZGlhSXRlbUlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWFuZ3VsYXIuZXF1YWxzKCBjb25maWdCYWssICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldFNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJ2RpYWxvZ2Zsb3cnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19uZXcgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnRGlhbG9nZmxvd0VkaXRvciBsb2FkUGxhdGZvcm1Db25maWcoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCByZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ldyAgICAgID0gICB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9jb25maWctY29udm8tY2hhdC1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZmlnQ29udm9DaGF0RWRpdG9yKCRsb2csICRxLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBMb2dpblNlcnZpY2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogeyBzZXJ2aWNlOiAnPScgfSxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzKSB7XG5cbiAgICAgICAgICAgIHZhciB1c2VyICAgID0gICBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBMb2dpblNlcnZpY2UuZ2V0VXNlcigpLnRoZW4oIGZ1bmN0aW9uICggdSkge1xuICAgICAgICAgICAgICAgIHVzZXIgPSB1O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgICAgZGVsZWdhdGVObHA6IG51bGxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBjb25maWdCYWsgICA9ICAgYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgIHZhciBpc19uZXcgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICB2YXIgaGFzX3N0YXJ0ZWQgPSAgIGZhbHNlO1xuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9sb2FkKCk7XG5cbiAgICAgICAgICAgICRzY29wZS5nZXRJbnRlbnRObHBzICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbJ2RpYWxvZ2Zsb3cnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLmlzTmV3ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc19uZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5oaWRlQWxsICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWhhc19zdGFydGVkICYmIGlzX25ldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLnN0YXJ0ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGhhc19zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBoYXNfc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICggaXNfbmV3KSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnY29udm9fY2hhdCcsICRzY29wZS5jb25maWcpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciBjcmVhdGUoKSAkc2NvcGUuY29uZmlnJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdDb252b0NoYXRFZGl0b3IgY3JlYXRlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNyZWF0ZSBjb25maWcgZm9yIENvbnZvLiBcIiArIHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS51cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdjb252b19jaGF0JywgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIHVwZGF0ZSgpICRzY29wZS5jb25maWcnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0JhayA9IGFuZ3VsYXIuY29weSggJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ1NlcnZpY2VDb25maWdVcGRhdGVkJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0NvbnZvQ2hhdEVkaXRvciB1cGRhdGUoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAkc2NvcGUucmV2ZXJ0Q29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBhbmd1bGFyLmNvcHkoY29uZmlnQmFrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAkc2NvcGUuaXNDb25maWdDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhYW5ndWxhci5lcXVhbHMoIGNvbmZpZ0JhaywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZ1bmN0aW9uIF9sb2FkKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldFNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggJHNjb3BlLnNlcnZpY2Uuc2VydmljZV9pZCwgJ2NvbnZvX2NoYXQnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICBpc19uZXcgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICggcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQ29udm9DaGF0RWRpdG9yIGxvYWRQbGF0Zm9ybUNvbmZpZygpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCByZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICAgICAgPSAgIHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjs7ICAgIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIlxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vY29uZmlnLWFtYXpvbi1lZGl0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZmlnQW1hem9uRWRpdG9yKCRsb2csICRxLCAkcm9vdFNjb3BlLCBDb252b3dvcmtzQXBpLCBMb2dpblNlcnZpY2UsIFBST1RPX0FNQVpPTl9MQU5HVUFHRVMsIFBST1RPX0FNQVpPTl9BTExfRU5HTElTSCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7IHNlcnZpY2U6ICc9JyB9LFxuICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMpIHtcblxuICAgICAgICAgICAgdmFyIHVzZXIgICAgPSAgIG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIExvZ2luU2VydmljZS5nZXRVc2VyKCkudGhlbiggZnVuY3Rpb24gKCB1KSB7XG4gICAgICAgICAgICAgICAgdXNlciA9IHU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBtb2RlOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICBpbnZvY2F0aW9uOiAkc2NvcGUuc2VydmljZS5uYW1lLFxuICAgICAgICAgICAgICAgIGFwcF9pZDogbnVsbCxcbiAgICAgICAgICAgICAgICBkZWZhdWx0X2xvY2FsZTogJ2VuLVVTJyxcbiAgICAgICAgICAgICAgICBzdXBwb3J0ZWRfbG9jYWxlczogWydlbi1VUyddLFxuICAgICAgICAgICAgICAgIHByb3BhZ2F0ZV90b19hbGxfZW5nbGlzaDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYXV0b19kaXNwbGF5OiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmxhbmd1YWdlcyA9IFBST1RPX0FNQVpPTl9MQU5HVUFHRVM7XG5cbiAgICAgICAgICAgIHZhciBjb25maWdCYWsgICA9ICAgYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgIHZhciBpc19uZXcgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICB2YXIgaGFzX3N0YXJ0ZWQgPSAgIGZhbHNlO1xuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9sb2FkKCk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NvbmZpZy5hdXRvX2Rpc3BsYXknLCBmdW5jdGlvbihuZXdWYWwpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbmZpZ0FtYXpvbkVkaXRvciAkd2F0Y2ggY29uZmlnLmF1dG9fZGlzcGxheSBuZXcgdmFsdWUnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy5hdXRvX2Rpc3BsYXkgPSBuZXdWYWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NvbmZpZy5wcm9wYWdhdGVfdG9fYWxsX2VuZ2xpc2gnLCBmdW5jdGlvbihpc0FsbEVuZ2xpc2gpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBbGxFbmdsaXNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbmZpZ0FtYXpvbkVkaXRvciAkd2F0Y2ggY29uZmlnLnByb3BhZ2F0ZV90b19hbGxfZW5nbGlzaCBuZXcgdmFsdWUnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy5wcm9wYWdhdGVfdG9fYWxsX2VuZ2xpc2ggPSBpc0FsbEVuZ2xpc2g7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQWxsRW5nbGlzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy5zdXBwb3J0ZWRfbG9jYWxlcyA9IFBST1RPX0FNQVpPTl9BTExfRU5HTElTSFxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy5zdXBwb3J0ZWRfbG9jYWxlcyA9IFskc2NvcGUuY29uZmlnLmRlZmF1bHRfbG9jYWxlXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NvbmZpZy5kZWZhdWx0X2xvY2FsZScsIGZ1bmN0aW9uKG5ld0RlZmF1bHRMb2NhbGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGVmYXVsdExvY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdjb25maWdBbWF6b25FZGl0b3IgJHdhdGNoIGNvbmZpZy5kZWZhdWx0X2xvY2FsZSBuZXcgdmFsdWUnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZy5kZWZhdWx0X2xvY2FsZSA9IG5ld0RlZmF1bHRMb2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbmZpZy5wcm9wYWdhdGVfdG9fYWxsX2VuZ2xpc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb25maWcuc3VwcG9ydGVkX2xvY2FsZXMgPSBbJHNjb3BlLmNvbmZpZy5kZWZhdWx0X2xvY2FsZV1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuZ2V0Q29uZmlnVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdodHRwczovL2RldmVsb3Blci5hbWF6b24uY29tL2FsZXhhL2NvbnNvbGUvYXNrL3B1Ymxpc2gvYWxleGFwdWJsaXNoaW5nLycgKyAkc2NvcGUuY29uZmlnLmFwcF9pZCArICcvZGV2ZWxvcG1lbnQvZW5fVVMvc2tpbGwtaW5mbydcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmlzTW9kZVZhbGlkICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISggJHNjb3BlLmNvbmZpZy5tb2RlID09PSAnYXV0bycgJiYgIXVzZXIuYW1hem9uX2FjY291bnRfbGlua2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLmlzTmV3ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc19uZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5oaWRlQWxsICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWhhc19zdGFydGVkICYmIGlzX25ldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHNjb3BlLnN0YXJ0ICAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGhhc19zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBoYXNfc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0FtYXpvbkVkaXRvciB1cGRhdGUoKSAkc2NvcGUuY29uZmlnJywgJHNjb3BlLmNvbmZpZyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCBpc19uZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5jcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoICRzY29wZS5zZXJ2aWNlLnNlcnZpY2VfaWQsICdhbWF6b24nLCAkc2NvcGUuY29uZmlnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWdCYWsgPSBhbmd1bGFyLmNvcHkoICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICAgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsICRzY29wZS5jb25maWcpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdjb25maWdBbWF6b25FZGl0b3IgY3JlYXRlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNyZWF0ZSBjb25maWcgZm9yIEFtYXpvbi4gXCIgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkudXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnYW1hem9uJywgJHNjb3BlLmNvbmZpZykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZUNvbmZpZ1VwZGF0ZWQnLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnY29uZmlnQW1hem9uRWRpdG9yIHVwZGF0ZSgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfZXJyb3IgICAgPSAgIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICRzY29wZS5yZXZlcnRDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IGFuZ3VsYXIuY29weShjb25maWdCYWspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICRzY29wZS5pc0NvbmZpZ0NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFhbmd1bGFyLmVxdWFscyggY29uZmlnQmFrLCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZnVuY3Rpb24gX2xvYWQoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnKCAkc2NvcGUuc2VydmljZS5zZXJ2aWNlX2lkLCAnYW1hem9uJykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnQmFrID0gYW5ndWxhci5jb3B5KCAkc2NvcGUuY29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgaXNfbmV3ICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2NvbmZpZ0FtYXpvbkVkaXRvciBsb2FkUGxhdGZvcm1Db25maWcoKSByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICggcmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX25ldyAgICAgID0gICB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47OyAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpc19lcnJvciAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgYW5ndWxhciBmcm9tICdhbmd1bGFyJztcblxuaW1wb3J0IE1vZGFsSW5zdGFuY2VDdHJsIGZyb20gJy4vY29udm93b3Jrcy1hZGQtc2VydmljZS5jb250cm9sbGVyJztcbmltcG9ydCBDb252b3dvcmtzTWFpbkNvbnRyb2xsZXIgZnJvbSAnLi9jb252b3dvcmtzLW1haW4uY29udHJvbGxlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGFuZ3VsYXJcbiAgLm1vZHVsZSgnY29udm8uc2VydmljZXMnLCBbJ2NvbnZvLmNvbW1vbiddKVxuICAuY29udHJvbGxlciggJ0NvbnZvd29ya3NNYWluQ29udHJvbGxlcicsIENvbnZvd29ya3NNYWluQ29udHJvbGxlcilcbiAgLmNvbnRyb2xsZXIoICdNb2RhbEluc3RhbmNlQ3RybCcsIE1vZGFsSW5zdGFuY2VDdHJsKVxuLy8gIC5zZXJ2aWNlKCdDb252b0NoYXRBcGknLCBDb252b0NoYXRBcGkpXG4gIC5uYW1lO1xuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9jb252b3dvcmtzLWFkZC1zZXJ2aWNlLnRtcGwuaHRtbCc7XG5pbXBvcnQgTW9kYWxJbnN0YW5jZUN0cmwgZnJvbSAnLi9jb252b3dvcmtzLWFkZC1zZXJ2aWNlLmNvbnRyb2xsZXInO1xuXG5Db252b3dvcmtzTWFpbkNvbnRyb2xsZXIuJGluamVjdCA9IFsgJyRsb2cnLCAnJHNjb3BlJywgJyR1aWJNb2RhbCcsICdDb252b3dvcmtzQXBpJ107XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbnZvd29ya3NNYWluQ29udHJvbGxlciggJGxvZywgJHNjb3BlLCAkdWliTW9kYWwsIENvbnZvd29ya3NBcGkpXG57XG4gICAgXG4gICAgJGxvZy5kZWJ1ZyggJ0NvbnZvd29ya3NNYWluQ29udHJvbGxlciBpbml0Jyk7XG4gICAgXG4gICAgLy8gQVBJXG4gICAgJHNjb3BlLnJlYWR5ICAgICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAkc2NvcGUuYXZhaWxhYmxlU2VydmljZXMgICAgPSAgIFtdO1xuXG4gICAgJHNjb3BlLmNyZWF0ZVNlcnZpY2UgICAgICAgID0gICBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICAkdWliTW9kYWwub3Blbih7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBNb2RhbEluc3RhbmNlQ3RybCxcbiAgICAgICAgICAgIHNpemUgOiAnbWQnLFxuICAgICAgICAgICAgcmVzb2x2ZTogeyBDb252b3dvcmtzQXBpOiBmdW5jdGlvbigpIHsgcmV0dXJuIENvbnZvd29ya3NBcGk7IH19XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICBcbiAgICAkc2NvcGUuc2F2ZUNoYW5nZXMgICAgICAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgJHNjb3BlLnNhdmVEaXNhYmxlZCAgICAgICAgID0gICBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgICRzY29wZS5yZXZlcnRDbGlja2VkICAgICAgICA9ICAgZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgXG4gICAgfTtcbiAgICBcbiAgICAkc2NvcGUucmV2ZXJ0RGlzYWJsZWQgICAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgJHNjb3BlLnB1Ymxpc2hlZE9uID0gZnVuY3Rpb24oc2VydmljZSkge1xuICAgICAgICB2YXIgcHVibGlzaGVkID0gW107XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNlcnZpY2UudmVyc2lvbnMsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBpZiAoIXB1Ymxpc2hlZC5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgcHVibGlzaGVkLnB1c2goX2NsZWFuS2V5KGtleSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcHVibGlzaGVkO1xuICAgIH1cbiAgICBcbiAgICBfaW5pdCgpO1xuXG4gICAgLy8gSU5JVFxuICAgIGZ1bmN0aW9uIF9pbml0KClcbiAgICB7XG4gICAgICAgIENvbnZvd29ya3NBcGkuZ2V0QWxsU2VydmljZXMoKS50aGVuKCBmdW5jdGlvbiggc2VydmljZXMpIHtcbiAgICAgICAgICAgICRzY29wZS5hdmFpbGFibGVTZXJ2aWNlcyAgICA9ICAgc2VydmljZXM7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICRsb2cud2FybiggJ0NvbnZvd29ya3NNYWluQ29udHJvbGxlciBmZXRjaGluZyBhbGwgc2VydmljZXMgZmFpbGVkIGJlY2F1c2Ugb2YnLCByZWFzb24pO1xuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoIHJlYXNvbi5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICB9KS5maW5hbGx5KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5yZWFkeSAgICA9ICAgdHJ1ZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfY2xlYW5LZXkoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkuc3BsaXQoJ18nKS5tYXAoZnVuY3Rpb24gKHdvcmQpIHsgcmV0dXJuIHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7IH0pLmpvaW4oJyAnKTtcbiAgICB9XG59XG4iLCJcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWxJbnN0YW5jZUN0cmwoICRzY29wZSwgJHVpYk1vZGFsSW5zdGFuY2UsICRsb2NhdGlvbiwgQ29udm93b3Jrc0FwaSlcbntcbiAgICAkc2NvcGUubmV3X3NlcnZpY2UgID0gICB7XG4gICAgICAgIFwibmFtZVwiIDogXCJcIixcbiAgICAgICAgXCJ0ZW1wbGF0ZV9pZFwiIDogXCJjb252by1jb3JlLmJsYW5rXCJcbiAgICB9O1xuXG4gICAgJHNjb3BlLnRlbXBsYXRlcyAgICA9ICAgW107XG4gICAgXG4gICAgQ29udm93b3Jrc0FwaS5nZXRUZW1wbGF0ZXMoKS50aGVuKCBmdW5jdGlvbiAoIGFsbCkge1xuICAgICAgICAkc2NvcGUudGVtcGxhdGVzICAgID0gICBhbGw7XG4gICAgfSk7XG4gICAgXG4gICAgJHNjb3BlLmNyZWF0ZSAgICAgICA9ICAgZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgQ29udm93b3Jrc0FwaS5jcmVhdGVTZXJ2aWNlKCAkc2NvcGUubmV3X3NlcnZpY2UubmFtZSwgJHNjb3BlLm5ld19zZXJ2aWNlLnRlbXBsYXRlX2lkKS50aGVuKCBmdW5jdGlvbiggZGF0YSkge1xuICAgICAgICAgICAgdmFyIGlkICA9ICAgZGF0YVsnc2VydmljZV9pZCddO1xuXG4gICAgICAgICAgICAkdWliTW9kYWxJbnN0YW5jZS5kaXNtaXNzKCAnY2FuY2VsJyk7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aCggJ2NvbnZvd29ya3MtZWRpdG9yLycgKyBpZCk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgICA9ICAgZnVuY3Rpb24oKSB7ICR1aWJNb2RhbEluc3RhbmNlLmRpc21pc3MoICdjYW5jZWwnKTsgfVxufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwcm9wZXJ0aWVzQ29udGV4dCggJGxvZywgJHJvb3RTY29wZSwgQ29udm93b3Jrc0FwaSwgQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZSwgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSwgQWxlcnRTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgcmVxdWlyZTogJ15wcm9wZXJ0aWVzQ29udGV4dCcsXG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiggJHNjb3BlKSB7XG5cbiAgICAgICAgICAgIC8vIFBVQkxJQyBBUElcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnMgICAgPSAgIGdldENvbXBvbmVudERlZmluaXRpb25zO1xuICAgICAgICAgICAgdGhpcy5zZXRDb21wb25lbnREZWZpbml0aW9ucyAgICA9ICAgc2V0Q29tcG9uZW50RGVmaW5pdGlvbnM7XG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudERlZmluaXRpb24gICAgID0gICBnZXRDb21wb25lbnREZWZpbml0aW9uO1xuICAgICAgICAgICAgdGhpcy5pc0xvYWRlZCAgICAgICAgICAgICAgICAgICA9ICAgaXNMb2FkZWQ7XG4gICAgICAgICAgICB0aGlzLmdldENvbnZvSW50ZW50cyAgICAgICAgICAgID0gICBnZXRDb252b0ludGVudHM7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0U2VsZWN0ZWRDb21wb25lbnQgICAgICAgPSAgIHNldFNlbGVjdGVkQ29tcG9uZW50O1xuICAgICAgICAgICAgdGhpcy5nZXRTZWxlY3Rpb24gICAgICAgICAgICAgICA9ICAgZ2V0U2VsZWN0aW9uO1xuICAgICAgICAgICAgdGhpcy5nZXRTZWxlY3RlZFNlcnZpY2UgICAgICAgICA9ICAgZ2V0U2VsZWN0ZWRTZXJ2aWNlO1xuXG4gICAgICAgICAgICB0aGlzLmlzU2VydmljZUNoYW5nZWQgICAgICAgICAgID0gICBpc1NlcnZpY2VDaGFuZ2VkO1xuICAgICAgICAgICAgdGhpcy5yZXZlcnRDaGFuZ2VzICAgICAgICAgICAgICA9ICAgcmV2ZXJ0Q2hhbmdlcztcbiAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXMgICAgICAgICAgICAgICAgPSAgIHNhdmVDaGFuZ2VzO1xuXG4gICAgICAgICAgICB0aGlzLmdldEF2YWlsYWJsZVBhY2thZ2VzICAgICAgID0gICBnZXRBdmFpbGFibGVQYWNrYWdlcztcblxuICAgICAgICAgICAgdGhpcy5maW5kQmxvY2sgICAgICAgICAgICAgICAgICA9ICAgZmluZEJsb2NrO1xuICAgICAgICAgICAgdGhpcy5maW5kU3Vicm91dGluZSAgICAgICAgICAgICA9ICAgZmluZFN1YnJvdXRpbmU7XG5cbiAgICAgICAgICAgIHRoaXMuYWRkQmxvY2sgICAgICAgICAgICAgICAgICAgPSAgIGFkZEJsb2NrO1xuICAgICAgICAgICAgdGhpcy5hZGRQcm9jZXNzU3Vicm91dGluZSAgICAgICA9ICAgYWRkUHJvY2Vzc1N1YnJvdXRpbmU7XG4gICAgICAgICAgICB0aGlzLmFkZFJlYWRTdWJyb3V0aW5lICAgICAgICAgID0gICBhZGRSZWFkU3Vicm91dGluZTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQmxvY2sgICAgICAgICAgICAgICAgPSAgIHJlbW92ZUJsb2NrO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVTdWJyb3V0aW5lICAgICAgICAgICA9ICAgcmVtb3ZlU3Vicm91dGluZTtcblxuICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQgICAgICAgICAgICA9ICAgcmVtb3ZlQ29tcG9uZW50O1xuXG4gICAgICAgICAgICB0aGlzLmFkZE5ld0NvbXBvbmVudCAgICAgICAgICAgID0gICBhZGROZXdDb21wb25lbnQ7XG4gICAgICAgICAgICB0aGlzLm1vdmVDb21wb25lbnQgICAgICAgICAgICAgID0gICBtb3ZlQ29tcG9uZW50O1xuXG4gICAgICAgICAgICB0aGlzLnJlbG9hZFNlcnZpY2UgICAgICAgICAgICAgID0gICByZWxvYWRTZXJ2aWNlO1xuXG5cbiAgICAgICAgICAgIC8vIERFRklOSVRJT05cbiAgICAgICAgICAgIGlmICggISRzY29wZS5zZXJ2aWNlSWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdObyBzZXJ2aWNlSWQgaW4gc2NvcGUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNlcnZpY2VfaWQgICAgICAgICAgPSAgICRzY29wZS5zZXJ2aWNlSWQ7XG4gICAgICAgICAgICB2YXIgcmVhZHkgICAgICAgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICB2YXIgZGVmaW5pdGlvbnMgICAgICAgICA9ICAgW107XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxfc2VydmljZSAgICA9ICAgbnVsbDtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVfcGFja2FnZXMgID0gICBbXTtcbiAgICAgICAgICAgIHZhciBzZWxlY3Rpb24gICAgICAgICAgID0gICB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uIDogbnVsbCxcbiAgICAgICAgICAgICAgICBzZXJ2aWNlIDogbnVsbCxcbiAgICAgICAgICAgICAgICBjb250YWluZXJDb250cm9sbGVyIDogbnVsbFxuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICBfaW5pdCgpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRBdmFpbGFibGVQYWNrYWdlcygpLnRoZW4oZnVuY3Rpb24oYXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZV9wYWNrYWdlcyA9IGF2YWlsYWJsZTtcblxuICAgICAgICAgICAgICAgICAgICBDb252b3dvcmtzQXBpLmdldENvbXBvbmVudERlZmluaXRpb25zKHNlcnZpY2VfaWQpLnRoZW4oIGZ1bmN0aW9uKCBkZWZzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgZGVmaW5pdGlvbnMgcHJlLWxvYWRlZC4gTm93IHdpbGwgc3RhcnQuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9ucyAgICAgPSAgIGRlZnM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0U2VydmljZUJ5SWQoIHNlcnZpY2VfaWQpLnRoZW4oIGZ1bmN0aW9uKCBzZXJ2aWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdwcm9wZXJ0aWVzQ29udGV4dCBjb250cm9sbGVyIGdvdCBzZXJ2aWNlJywgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uLnNlcnZpY2UgICA9ICAgc2VydmljZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbF9zZXJ2aWNlICAgID0gICBhbmd1bGFyLmNvcHkoIHNlbGVjdGlvbi5zZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkeSAgICAgICAgICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdwcm9wZXJ0aWVzQ29udGV4dCBjb250cm9sbGVyIHNlcnZpY2UgZ290IHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoICdwcm9wZXJ0aWVzQ29udGV4dCBjb250cm9sbGVyIGRlZmluaXRpb25zIGdvdCByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmhhc0NsaXBib2FyZCAgICAgICA9ICAgaGFzQ2xpcGJvYXJkO1xuICAgICAgICAgICAgdGhpcy5jdXQgICAgICAgID0gICBjdXQ7XG4gICAgICAgICAgICB0aGlzLmNvcHkgICAgICAgPSAgIGNvcHk7XG4gICAgICAgICAgICB0aGlzLnBhc3RlICAgICAgPSAgIHBhc3RlO1xuICAgICAgICAgICAgdGhpcy5pc0N1dCAgICAgID0gICBpc0N1dDtcblxuICAgICAgICAgICAgdmFyIGNsaXBib2FyZCAgID0gICBudWxsO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBoYXNDbGlwYm9hcmQoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWNsaXBib2FyZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY3V0KCBjb250YWluZXIsIGNvbXBvbmVudClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmQgICA9ICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNfY3V0IDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCA6IGNvbXBvbmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lciA6IGNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb3B5KCBjb21wb25lbnQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkICAgPSAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzX2N1dCA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IDogY29tcG9uZW50LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHBhc3RlKCBjb250YWluZXJDb250cm9sbGVyLCBpbmRleClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoICFjbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggY2xpcGJvYXJkLmlzX2N1dCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IHBhc3RlIGN1dCcpO1xuICAgICAgICAgICAgICAgICAgICAvLyBmdW5jdGlvbiBtb3ZlQ29tcG9uZW50KCBvbGRDb250YWluZXJDb250cm9sbGVyLCBjb250YWluZXJDb250cm9sbGVyLCBjb21wb25lbnQsIGluZGV4KVxuICAgICAgICAgICAgICAgICAgICBtb3ZlQ29tcG9uZW50KCBjbGlwYm9hcmQuY29udGFpbmVyLCBjb250YWluZXJDb250cm9sbGVyLCBjbGlwYm9hcmQuY29tcG9uZW50LCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZC5pc19jdXQgICAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmQuY29udGFpbmVyID0gICBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgcGFzdGUgY29weScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckNvbnRyb2xsZXIuYWRkQ29tcG9uZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UuY29weUNvbXBvbmVudCggZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIGNsaXBib2FyZC5jb21wb25lbnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGlzQ3V0KCBjb21wb25lbnQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsaXBib2FyZCAmJiBjbGlwYm9hcmQuaXNfY3V0ICYmIGNsaXBib2FyZC5jb21wb25lbnQgPT09IGNvbXBvbmVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0Q29udm9JbnRlbnRzKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgaW50ZW50cyA9ICAgW107XG5cbiAgICAgICAgICAgICAgICAvLyBTRVJWSUNFXG4gICAgICAgICAgICAgICAgZm9yICggdmFyIGk9MDsgaSA8IHNlbGVjdGlvbi5zZXJ2aWNlLmludGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZW50cy5wdXNoKCBzZWxlY3Rpb24uc2VydmljZS5pbnRlbnRzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTWVNURU1cbiAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaT0wOyBpPGRlZmluaXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwY2tnICAgID0gICBkZWZpbml0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhcGNrZy5pbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaj0wOyBqPHBja2cuaW50ZW50cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZW50cy5wdXNoKCBwY2tnLmludGVudHNbal0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVudHM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEF2YWlsYWJsZVBhY2thZ2VzKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZhaWxhYmxlX3BhY2thZ2VzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRDb21wb25lbnREZWZpbml0aW9ucygpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmluaXRpb25zO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzZXRDb21wb25lbnREZWZpbml0aW9ucyhkZWZzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdzZXR0aW5nIGRlZnMnLCBkZWZzKTtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9ucyA9IGRlZnM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldENvbXBvbmVudERlZmluaXRpb24oc2VydmljZUlkLCBjbGFzc05hbWUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkZWZpbml0aW9ucy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwY2tnID0gZGVmaW5pdGlvbnNbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBwY2tnLmNvbXBvbmVudHMubGVuZ3RoOyBqKyspXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb21wID0gcGNrZy5jb21wb25lbnRzW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcFsndHlwZSddID09PSBjbGFzc05hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRGVmaW5pdGlvbiBbJytjbGFzc05hbWUrJ10gbm90IGZvdW5kJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGlzTG9hZGVkKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWFkeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU0VMRUNUSU9OXG4gICAgICAgICAgICBmdW5jdGlvbiBzZXRTZWxlY3RlZENvbXBvbmVudCggY29tcG9uZW50LCBjb250YWluZXJDb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCAhY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5jb21wb25lbnQgICAgID0gICBudWxsO1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb24uZGVmaW5pdGlvbiAgICA9ICAgbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggIWNvbnRhaW5lckNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uLmNvbnRhaW5lckNvbnRyb2xsZXIgICA9ICAgbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24uY29udGFpbmVyQ29udHJvbGxlciAgID0gICBjb250YWluZXJDb250cm9sbGVyO1xuICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5kZWZpbml0aW9uICAgICAgICAgICAgPSAgIGdldENvbXBvbmVudERlZmluaXRpb24oc2VsZWN0aW9uLnNlcnZpY2VbJ3NlcnZpY2VfaWQnXSwgY29tcG9uZW50WydjbGFzcyddKTtcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24uY29tcG9uZW50ICAgICAgICAgICAgID0gICBjb21wb25lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldFNlbGVjdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTRVJWSUNFXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZFNlcnZpY2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCAhc2VsZWN0aW9uLnNlcnZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTm8gc2VsZWN0ZWQgc2VydmljZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uLnNlcnZpY2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGlzU2VydmljZUNoYW5nZWQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFhbmd1bGFyLmVxdWFscyggb3JpZ2luYWxfc2VydmljZSwgc2VsZWN0aW9uLnNlcnZpY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiByZXZlcnRDaGFuZ2VzKCkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSggb3JpZ2luYWxfc2VydmljZSwgc2VsZWN0aW9uLnNlcnZpY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzYXZlQ2hhbmdlcygpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2F2ZUNoYW5nZXMoKScpO1xuXG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS51cGRhdGVTZXJ2aWNlKCBzZXJ2aWNlX2lkLCBzZWxlY3Rpb24uc2VydmljZSkudGhlbiggZnVuY3Rpb24oIHJlcykge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2F2ZUNoYW5nZXMoKSBkb25lJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSggc2VsZWN0aW9uLnNlcnZpY2UsIHJlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxfc2VydmljZSAgICA9ICAgYW5ndWxhci5jb3B5KCBzZWxlY3Rpb24uc2VydmljZSk7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnU2VydmljZVdvcmtmbG93VXBkYXRlZCcsIHNlbGVjdGlvbi5zZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICAgICAgQWxlcnRTZXJ2aWNlLmFkZFN1Y2VzcyggJ1NlcnZpY2Ugd29ya2Zsb3cgc2F2ZWQnKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgY29udHJvbGxlciBzYXZlQ2hhbmdlcygpIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCTE9DS1NcbiAgICAgICAgICAgIGZ1bmN0aW9uIGFkZEJsb2NrKCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZS5jcmVhdGVCbG9jayggZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIG5hbWUpLnRoZW4oIGZ1bmN0aW9uICggYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkuYmxvY2tzLnB1c2goIGJsb2NrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gYWRkUmVhZFN1YnJvdXRpbmUoIG5hbWUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZS5jcmVhdGVSZWFkU3Vicm91dGluZSggZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIG5hbWUpLnRoZW4oIGZ1bmN0aW9uICggYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkuZnJhZ21lbnRzLnB1c2goIGJsb2NrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gYWRkUHJvY2Vzc1N1YnJvdXRpbmUoIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlLmNyZWF0ZVByb2Nlc3NTdWJyb3V0aW5lKCBnZXRTZWxlY3RlZFNlcnZpY2UoKSwgbmFtZSkudGhlbiggZnVuY3Rpb24gKCBibG9jaykge1xuICAgICAgICAgICAgICAgICAgICBnZXRTZWxlY3RlZFNlcnZpY2UoKS5mcmFnbWVudHMucHVzaCggYmxvY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVCbG9jayggYmxvY2tJZCkge1xuXG4gICAgICAgICAgICAgICAgZm9yICggdmFyIGk9MDsgaTxzZWxlY3Rpb24uc2VydmljZS5ibG9ja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJsb2NrICAgPSAgIHNlbGVjdGlvbi5zZXJ2aWNlLmJsb2Nrc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCBibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkID09IGJsb2NrSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5zZXJ2aWNlLmJsb2Nrcy5zcGxpY2UoIGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0NvdWxkIG5vdCBmaW5kIGJsb2NrIFsnK2Jsb2NrSWQrJ10nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlU3Vicm91dGluZSggZnJhZ21lbnRJZCkge1xuXG4gICAgICAgICAgICAgICAgZm9yICggdmFyIGk9MDsgaTxzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYWdtZW50ICAgID0gICBzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICggZnJhZ21lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PSBmcmFnbWVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHMuc3BsaWNlKCBpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdDb3VsZCBub3QgZmluZCBmcmFnbWVudCBbJytmcmFnbWVudElkKyddJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCAhc2VsZWN0aW9uLmNvbnRhaW5lckNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCAncHJvcGVydGllc0NvbnRleHQgZGlyZWN0aXZlIHJlbW92ZUNvbXBvbmVudCgpIG5vIGNvbnRhaW5lckNvbnRyb2xsZXInKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24uY29udGFpbmVyQ29udHJvbGxlci5yZW1vdmVTZWxlY3Rpb24oIHNlbGVjdGlvbi5jb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBmaW5kQmxvY2soIGJsb2NrSWQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaT0wOyBpPHNlbGVjdGlvbi5zZXJ2aWNlLmJsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmxvY2sgICA9ICAgc2VsZWN0aW9uLnNlcnZpY2UuYmxvY2tzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQgPT0gYmxvY2tJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0Jsb2NrIFsnK2Jsb2NrSWQrJ10gbm90IGZvdW5kJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGZpbmRTdWJyb3V0aW5lKCBmcmFnbWVudElkKSB7XG4gICAgICAgICAgICAgICAgZm9yICggdmFyIGk9MDsgaTxzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYWdtZW50ICAgID0gICBzZWxlY3Rpb24uc2VydmljZS5mcmFnbWVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICggZnJhZ21lbnQucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PSBmcmFnbWVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRnJhZ21lbnQgWycrZnJhZ21lbnRJZCsnXSBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT1RIRVIgQ09NUE9ORU5UU1xuICAgICAgICAgICAgZnVuY3Rpb24gYWRkTmV3Q29tcG9uZW50KCBjb250YWluZXJDb250cm9sbGVyLCBjb21wb25lbnREZWZpbml0aW9uLCBpbmRleClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoICFpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAgID0gICAwO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjb21wb25lbnQgICA9ICAgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZS5jcmVhdGVDb21wb25lbnQoIGdldFNlbGVjdGVkU2VydmljZSgpLCBjb21wb25lbnREZWZpbml0aW9uKTtcbiAgICAgICAgICAgICAgICBjb250YWluZXJDb250cm9sbGVyLmFkZENvbXBvbmVudCggY29tcG9uZW50LCBpbmRleCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBtb3ZlQ29tcG9uZW50KCBvbGRDb250YWluZXJDb250cm9sbGVyLCBjb250YWluZXJDb250cm9sbGVyLCBjb21wb25lbnQsIGluZGV4KSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoICFpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAgID0gICAwO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9sZENvbnRhaW5lckNvbnRyb2xsZXIucmVtb3ZlQ29tcG9uZW50KCBjb21wb25lbnQpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lckNvbnRyb2xsZXIuYWRkQ29tcG9uZW50KCBjb21wb25lbnQsIGluZGV4KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlbG9hZFNlcnZpY2UoKSB7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRTZXJ2aWNlQnlJZCggc2VydmljZV9pZCkudGhlbiggZnVuY3Rpb24oIHNlcnZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdwcm9wZXJ0aWVzQ29udGV4dCBjb250cm9sbGVyIGdvdCBzZXJ2aWNlJywgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5zZXJ2aWNlICAgPSAgIHNlcnZpY2U7XG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsX3NlcnZpY2UgICAgPSAgIGFuZ3VsYXIuY29weSggc2VsZWN0aW9uLnNlcnZpY2UpO1xuICAgICAgICAgICAgICAgICAgICByZWFkeSAgICAgICAgICAgICAgID0gICB0cnVlO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCByZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvciggJ3Byb3BlcnRpZXNDb250ZXh0IGNvbnRyb2xsZXIgc2VydmljZSBnb3QgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbmsgOiBmdW5jdGlvbiggJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJpYnV0ZXMsIHByb3BlcnRpZXNDb250ZXh0KSB7XG5cbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGxpbmsnKTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9pbml0KClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAncHJvcGVydGllc0NvbnRleHQgX2luaXQoKSBzZXJ2aWNlJywgcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9kZXN0cm95KClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNTZXJ2aWNlQ2hhbmdlZCAgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmlzU2VydmljZUNoYW5nZWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNhdmVDaGFuZ2VzICAgICAgICAgID0gICBwcm9wZXJ0aWVzQ29udGV4dC5zYXZlQ2hhbmdlcztcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U2VsZWN0aW9uICAgICAgICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGlvbjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5yZXZlcnRDbGlja2VkICAgICAgICA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdwcm9wZXJ0aWVzQ29udGV4dCByZXZlcnRDbGlja2VkKCknKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NvbnRleHQucmV2ZXJ0Q2hhbmdlcygpO1xuICAgICAgICAgICAgICAgICAgICBfZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBfaW5pdCgpO1xuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgICRzY29wZS5hZGROZXdCbG9jayAgICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGFkZE5ld0Jsb2NrKCknKTtcbiAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZS5zaG93TW9kYWwoIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpLCAndXNlcicsIHByb3BlcnRpZXNDb250ZXh0KVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd05ld1JlYWRTdWJyb3V0aW5lICAgICAgICA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy53YXJuKCAncHJvcGVydGllc0NvbnRleHQgc2hvd05ld1JlYWRTdWJyb3V0aW5lKCknKTtcbiAgICAgICAgICAgICAgICAgICAgQ29udm93b3Jrc0FkZEJsb2NrU2VydmljZS5zaG93U3Vicm91dGluZU1vZGFsKCBwcm9wZXJ0aWVzQ29udGV4dC5nZXRTZWxlY3RlZFNlcnZpY2UoKSwgcHJvcGVydGllc0NvbnRleHQsICdyZWFkJylcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dOZXdQcm9jZXNzU3Vicm91dGluZSAgICAgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cud2FybiggJ3Byb3BlcnRpZXNDb250ZXh0IHNob3dOZXdQcm9jZXNzU3Vicm91dGluZSgpJyk7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBZGRCbG9ja1NlcnZpY2Uuc2hvd1N1YnJvdXRpbmVNb2RhbCggcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCksIHByb3BlcnRpZXNDb250ZXh0LCAncHJvY2VzcycpXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vICRzY29wZS5yZW1vdmVCbG9jayAgICAgICA9ICAgZnVuY3Rpb24oIGJsb2NrSWQpXG4gICAgICAgICAgICAgICAgLy8ge1xuICAgICAgICAgICAgICAgIC8vICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IHJlbW92ZUJsb2NrKCkgYmxvY2tJZCcsIGJsb2NrSWQpO1xuICAgICAgICAgICAgICAgIC8vIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNSZWFkeSAgICAgICAgICA9ICAgcHJvcGVydGllc0NvbnRleHQuaXNMb2FkZWQ7XG4vLyAgICAgICAgICAgICAgJHNjb3BlLmlzUmVhZHkgICAgICAgICAgPSAgIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ3Byb3BlcnRpZXNDb250ZXh0IGlzUmVhZHkoKScpO1xuLy8gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuLy8gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICRzY29wZS5nZXRTdWJyb3V0aW5lcyAgID0gICBmdW5jdGlvbigpIHsgcmV0dXJuIF9maWx0ZXJTdWJyb3V0aW5lcyggcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCkpOyB9O1xuICAgICAgICAgICAgICAgICRzY29wZS5nZXRCbG9ja3MgICAgICAgID0gICBmdW5jdGlvbigpIHsgcmV0dXJuIF9maWx0ZXJCbG9ja3MoIHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpKTsgfTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0RGVmaW5pdGlvbnMgICA9ICAgcHJvcGVydGllc0NvbnRleHQuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnM7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNldERlZmluaXRpb25zICAgPSAgIHByb3BlcnRpZXNDb250ZXh0LnNldENvbXBvbmVudERlZmluaXRpb25zO1xuICAgICAgICAgICAgICAgICRzY29wZS5nZXRBdmFpbGFibGVQYWNrYWdlcyA9IHByb3BlcnRpZXNDb250ZXh0LmdldEF2YWlsYWJsZVBhY2thZ2VzO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNhbkJsb2NrTW92ZVVwID0gZnVuY3Rpb24oYmxvY2tJZClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9ICRzY29wZS5nZXRCbG9ja3MoKS5maW5kSW5kZXgoZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09IGJsb2NrSWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbmRleCA+IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNhbkJsb2NrTW92ZURvd24gPSBmdW5jdGlvbihibG9ja0lkKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJsb2NrcyA9ICRzY29wZS5nZXRCbG9ja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gYmxvY2tzLmZpbmRJbmRleChmdW5jdGlvbiAoYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gYmxvY2tJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4IDwgYmxvY2tzLmxlbmd0aCAtIDQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmNhbkZyYWdtZW50TW92ZVVwID0gZnVuY3Rpb24oZnJhZ21lbnRJZClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9ICRzY29wZS5nZXRTdWJyb3V0aW5lcygpLmZpbmRJbmRleChmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PT0gZnJhZ21lbnRJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4ID4gMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5jYW5GcmFnbWVudE1vdmVEb3duID0gZnVuY3Rpb24oZnJhZ21lbnRJZClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgYmxvY2tzID0gJHNjb3BlLmdldFN1YnJvdXRpbmVzKCk7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gYmxvY2tzLmZpbmRJbmRleChmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkID09PSBmcmFnbWVudElkO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4IDwgYmxvY2tzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgJHNjb3BlLiRvbignbW92ZUJsb2NrJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0Jsb2NrJywgZGF0YSwgJ3dhbnRzIHRvIGdvJywgKGRhdGEuZGlyID09PSAxID8gJ2Rvd24nIDogJ3VwJykpO1xuICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlID0gcHJvcGVydGllc0NvbnRleHQuZ2V0U2VsZWN0ZWRTZXJ2aWNlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEluZGV4ID0gc2VydmljZS5ibG9ja3MuZmluZEluZGV4KGZ1bmN0aW9uIChiKSB7IHJldHVybiBiLnByb3BlcnRpZXMuYmxvY2tfaWQgPT09IGRhdGEuYmxvY2tJZDsgfSk7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldEluZGV4ID0gY3VycmVudEluZGV4ICsgZGF0YS5kaXI7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0Jsb2NrJywgZGF0YS5ibG9ja0lkLCAnaXMgY3VycmVudGx5IGF0IGluZGV4JywgY3VycmVudEluZGV4LCAnLCB3aWxsIHRyeSBtb3ZpbmcgaXQgdG8nLCB0YXJnZXRJbmRleCk7XG5cbiAgICAgICAgICAgICAgICBbc2VydmljZS5ibG9ja3NbY3VycmVudEluZGV4XSwgc2VydmljZS5ibG9ja3NbdGFyZ2V0SW5kZXhdXSA9IFtzZXJ2aWNlLmJsb2Nrc1t0YXJnZXRJbmRleF0sIHNlcnZpY2UuYmxvY2tzW2N1cnJlbnRJbmRleF1dO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kb24oJ21vdmVGcmFnbWVudCcsIGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdGcmFnbWVudCcsIGRhdGEsICd3YW50cyB0byBnbycsIChkYXRhLmRpciA9PT0gMSA/ICdkb3duJyA6ICd1cCcpKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZSA9IHByb3BlcnRpZXNDb250ZXh0LmdldFNlbGVjdGVkU2VydmljZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IHNlcnZpY2UuZnJhZ21lbnRzLmZpbmRJbmRleChmdW5jdGlvbiAoZikgeyByZXR1cm4gZi5wcm9wZXJ0aWVzLmZyYWdtZW50X2lkID09PSBkYXRhLmZyYWdtZW50SWQ7IH0pO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRJbmRleCA9IGN1cnJlbnRJbmRleCArIGRhdGEuZGlyO1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdCbG9jaycsIGRhdGEuZnJhZ21lbnRJZCwgJ2lzIGN1cnJlbnRseSBhdCBpbmRleCcsIGN1cnJlbnRJbmRleCwgJywgd2lsbCB0cnkgbW92aW5nIGl0IHRvJywgdGFyZ2V0SW5kZXgpO1xuXG4gICAgICAgICAgICAgICAgW3NlcnZpY2UuZnJhZ21lbnRzW2N1cnJlbnRJbmRleF0sIHNlcnZpY2UuZnJhZ21lbnRzW3RhcmdldEluZGV4XV0gPSBbc2VydmljZS5mcmFnbWVudHNbdGFyZ2V0SW5kZXhdLCBzZXJ2aWNlLmZyYWdtZW50c1tjdXJyZW50SW5kZXhdXTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCBwcm9wZXJ0aWVzQ29udGV4dC5pc0xvYWRlZCwgZnVuY3Rpb24oIHZhbCkge1xuICAgICAgICAgICAgICAgIGlmICggdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIF9pbml0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgX2Rlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gX2ZpbHRlckJsb2Nrcyggc2VydmljZSlcbntcbiAgICB2YXIgdXNlcl9ibG9ja3MgICAgID0gICBzZXJ2aWNlLmJsb2Nrcy5maWx0ZXIoIGZ1bmN0aW9uKCBibG9jaykgeyByZXR1cm4gIV9pc1N5c3RlbSggYmxvY2sucHJvcGVydGllcy5ibG9ja19pZCk7ICAgIH0pO1xuICAgIHZhciBzeXN0ZW1fYmxvY2tzICAgPSAgIHNlcnZpY2UuYmxvY2tzLmZpbHRlciggZnVuY3Rpb24oIGJsb2NrKSB7IHJldHVybiBfaXNTeXN0ZW0oIGJsb2NrLnByb3BlcnRpZXMuYmxvY2tfaWQpOyB9KTtcblxuICAgIHZhciBzZXNzaW9uX3N0YXJ0X2Jsb2NrICAgICAgICAgPSAgIHN5c3RlbV9ibG9ja3MuZmluZCggZnVuY3Rpb24oIGIpIHsgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2Vzc2lvblN0YXJ0JzsgfSk7XG4gICAgdmFyIHNlcnZpY2VfcHJvY2Vzc29yc19ibG9jayAgICA9ICAgc3lzdGVtX2Jsb2Nrcy5maW5kKCBmdW5jdGlvbiggYikgeyByZXR1cm4gYi5wcm9wZXJ0aWVzLmJsb2NrX2lkID09PSAnX19zZXJ2aWNlUHJvY2Vzc29ycyc7IH0pO1xuICAgIHZhciBzZXNzaW9uX2VuZF9ibG9jayAgICAgICAgICAgPSAgIHN5c3RlbV9ibG9ja3MuZmluZCggZnVuY3Rpb24oIGIpIHsgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fc2Vzc2lvbkVuZCc7IH0pO1xuICAgIHZhciBtZWRpYV9jb250cm9sc19ibG9jayAgICAgICAgPSAgIHN5c3RlbV9ibG9ja3MuZmluZCggZnVuY3Rpb24oIGIpIHsgcmV0dXJuIGIucHJvcGVydGllcy5ibG9ja19pZCA9PT0gJ19fbWVkaWFDb250cm9scyc7IH0pO1xuXG4gICAgdmFyIHNvcnRlZCAgPSAgIHVzZXJfYmxvY2tzO1xuXG4gICAgc29ydGVkLnVuc2hpZnQoIHNlc3Npb25fc3RhcnRfYmxvY2spO1xuICAgIHNvcnRlZC5wdXNoKCBtZWRpYV9jb250cm9sc19ibG9jayk7XG4gICAgc29ydGVkLnB1c2goIHNlcnZpY2VfcHJvY2Vzc29yc19ibG9jayk7XG4gICAgc29ydGVkLnB1c2goIHNlc3Npb25fZW5kX2Jsb2NrKTtcblxuICAgIHJldHVybiBzb3J0ZWQ7XG59XG5cbmZ1bmN0aW9uIF9maWx0ZXJTdWJyb3V0aW5lcyggc2VydmljZSlcbntcbiAgICByZXR1cm4gc2VydmljZS5mcmFnbWVudHM7XG59XG5cbmZ1bmN0aW9uIF9pc1N5c3RlbSggYmxvY2tJZCkge1xuICAgIGlmICggYmxvY2tJZCkge1xuICAgICAgICByZXR1cm4gYmxvY2tJZC5pbmRleE9mKCAnX18nKSA+PSAwO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG4iLCJpbXBvcnQgYW5ndWxhciBmcm9tICdhbmd1bGFyJztcblxuaW1wb3J0IGNvbnZvRWRpdG9yQ29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBjb252b0VkaXRvclRvb2xib3ggZnJvbSAnLi90b29sYm94JztcbmltcG9ydCBjb252b0VkaXRvclByZXZpZXcgZnJvbSAnLi9wcmV2aWV3JztcbmltcG9ydCBjb252b0VkaXRvckludGVudHMgZnJvbSAnLi9pbnRlbnRzJztcbmltcG9ydCBjb252b0VkaXRvcldvcmtmbG93IGZyb20gJy4vd29ya2Zsb3cnO1xuaW1wb3J0IGNvbnZvRWRpdG9yUHJvcHMgZnJvbSAnLi9wcm9wcyc7XG5cbmltcG9ydCBDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciBmcm9tICcuL2NvbnZvd29ya3MtZWRpdG9yLmNvbnRyb2xsZXInO1xuaW1wb3J0IHByb3BlcnRpZXNDb250ZXh0IGZyb20gJy4vcHJvcGVydGllcy1jb250ZXh0LmRpcmVjdGl2ZSc7XG5pbXBvcnQgQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBmcm9tICcuL2NvbnZvLWNvbXBvbmVudC1mYWN0b3J5LnNlcnZpY2UnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gIC5tb2R1bGUoJ2NvbnZvLmVkaXRvcicsIFtjb252b0VkaXRvckNvbmZpZywgY29udm9FZGl0b3JUb29sYm94LCBjb252b0VkaXRvclByZXZpZXcsIGNvbnZvRWRpdG9ySW50ZW50cywgY29udm9FZGl0b3JXb3JrZmxvdywgY29udm9FZGl0b3JQcm9wc10pXG4gIC5jb250cm9sbGVyKCdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlcicsIENvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyKVxuICAuZGlyZWN0aXZlKCdwcm9wZXJ0aWVzQ29udGV4dCcsIHByb3BlcnRpZXNDb250ZXh0KVxuICAuc2VydmljZSgnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZScsIENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UpXG4gIC5uYW1lO1xuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciggJGxvZywgJHNjb3BlLCAkcm9vdFNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgQ29udm93b3Jrc0FwaSwgQWxlcnRTZXJ2aWNlKSB7XG5cbiAgICAgICAgdmFyIHJhbmRvbV9zbHVnICAgICAgICAgPSAgIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDApO1xuICAgICAgICB2YXIgZGV2aWNlX2lkICAgICAgICAgICA9ICAgJ2FkbWluLWNoYXQtJyArIHJhbmRvbV9zbHVnO1xuXG4gICAgICAgIHZhciBwbGF0Zm9ybV9pbmZvICAgICAgID0gICB7fVxuXG4gICAgICAgICRzY29wZS5zZXJ2aWNlSWQgICAgICAgID0gICAkcm91dGVQYXJhbXMuc2VydmljZV9pZDtcbiAgICAgICAgdmFyIHNlYXJjaCAgICAgICAgICAgICAgPSAgICRsb2NhdGlvbi5zZWFyY2goKTtcbiAgICAgICAgdmFyIHRhYl9zZWxlY3RlZF8xICAgICAgID0gIHNlYXJjaC50YWIxID8gc2VhcmNoLnRhYjEgOiAnd29ya2Zsb3cnO1xuICAgICAgICB2YXIgdGFiX3NlbGVjdGVkXzIgICAgICAgPSAgc2VhcmNoLnRhYjIgPyBzZWFyY2gudGFiMiA6J3N0ZXBzJztcblxuICAgICAgICAkc2NvcGUudGFiSW5mbzEgICAgICAgICAgPSAgIHsgYWN0aXZlOiB0YWJfc2VsZWN0ZWRfMX07XG4gICAgICAgICRzY29wZS50YWJJbmZvMiAgICAgICAgICA9ICAgeyBhY3RpdmU6IHRhYl9zZWxlY3RlZF8yfTtcblxuICAgICAgICAkc2NvcGUuZGVsZWdhdGVObHAgICAgICA9ICAgbnVsbDtcbiAgICAgICAgJHNjb3BlLmRlbGVnYXRlT3B0aW9ucyAgPSAgIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0FtYXpvbicsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdhbWF6b24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGxhYmVsOiAnRGlhbG9nZmxvdycsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdkaWFsb2dmbG93J1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG5cbiAgICAgICAgX2xvYWQoKTtcblxuICAgICAgICAkc2NvcGUudGFiMVNlbGVjdCAgICAgICA9ICAgZnVuY3Rpb24oICR0YWIpIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgdGFiMVNlbGVjdCAkdGFiJywgJHRhYik7XG4gICAgICAgICAgICBfdXBkYXRlVXJsKCAkdGFiLCAnc3RlcHMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS50YWIyU2VsZWN0ICAgICAgID0gICBmdW5jdGlvbiggJHRhYikge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciB0YWIyU2VsZWN0ICR0YWInLCAkdGFiKTtcbiAgICAgICAgICAgIGlmICggJHNjb3BlLnRhYkluZm8xLmFjdGl2ZSA9PSAnd29ya2Zsb3cnKSB7XG4gICAgICAgICAgICAgICAgX3VwZGF0ZVVybCggJ3dvcmtmbG93JywgJHRhYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBfdXBkYXRlVXJsKCB0YWIxLCB0YWIyKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyIF91cGRhdGVVcmwgdGFiMVNlbGVjdCB0YWJzJywgdGFiMSwgdGFiMik7XG4gICAgICAgICAgICBpZiAoIHRhYjEgPT0gJ3dvcmtmbG93Jykge1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goICd0YWIxJywgdGFiMSk7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCggJ3RhYjInLCB0YWIyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCggJ3RhYjEnLCB0YWIxKTtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCAndGFiMicsIG51bGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9jYXRpb24ucmVwbGFjZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldERldmljZUlkICAgICAgPSAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRldmljZV9pZDtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oICdTZXJ2aWNlQ29uZmlnVXBkYXRlZCcsIGZ1bmN0aW9uICggZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICBfbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbiggJ1NlcnZpY2VXb3JrZmxvd1VwZGF0ZWQnLCBmdW5jdGlvbiAoIGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgX2xvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oICdTZXJ2aWNlUmVsZWFzZXNVcGRhdGVkJywgZnVuY3Rpb24gKCBldnQsIGRhdGEpIHtcbiAgICAgICAgICAgIF9sb2FkKCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgJHNjb3BlLmlzUGxhdGZvcm1Qcm9wYWdhdGVBbGxvd2VkICAgICAgID0gICBmdW5jdGlvbiggcGxhdGZvcm1JZCkge1xuICAgICAgICAgICAgaWYgKCAhcGxhdGZvcm1faW5mb1twbGF0Zm9ybUlkXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwbGF0Zm9ybV9pbmZvW3BsYXRmb3JtSWRdWydhbGxvd2VkJ107XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuaXNQbGF0Zm9ybVByb3BhZ2F0ZUF2YWlsYWJsZSAgICAgPSAgIGZ1bmN0aW9uKCBwbGF0Zm9ybUlkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmICggIXBsYXRmb3JtX2luZm9bcGxhdGZvcm1JZF0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGxhdGZvcm1faW5mb1twbGF0Zm9ybUlkXVsnYXZhaWxhYmxlJ107XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUucHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzICAgICA9ICAgZnVuY3Rpb24oIHBsYXRmb3JtSWQpIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgcHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzKCkgcGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXG4gICAgICAgICAgICBpZiAocGxhdGZvcm1JZCA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVQbGF0Zm9ybXMgPSBPYmplY3Qua2V5cyhwbGF0Zm9ybV9pbmZvKTtcbiAgICAgICAgICAgICAgICBhdmFpbGFibGVQbGF0Zm9ybXMuZm9yRWFjaChmdW5jdGlvbihhdmFpbGFibGVQbGF0Zm9ybUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnZvd29ya3NBcGkucHJvcGFnYXRlU2VydmljZVBsYXRmb3JtKCAkc2NvcGUuc2VydmljZUlkLCBhdmFpbGFibGVQbGF0Zm9ybUlkKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF0Zm9ybV9pbmZvW2F2YWlsYWJsZVBsYXRmb3JtSWRdID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFsZXJ0U2VydmljZS5hZGRTdWNlc3MoICdTZXJ2aWNlIHByb3BhZ2F0aW9uIHRvICcrYXZhaWxhYmxlUGxhdGZvcm1JZCsnIGRvbmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzRWRpdG9yQ29udHJvbGxlciBwcm9wYWdhdGVQbGF0Zm9ybUNoYW5nZXMoKSByZWFzb24nLCByZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHBsYXRmb3JtSWQgKyBcIiBwcm9wYWdhdGlvbiBlcnJvcjogXCIgKyByZWFzb24uZGF0YS5tZXNzYWdlICsgXCIgRXJyb3IgZGV0YWlsczogXCIgKyByZWFzb24uZGF0YS5kZXRhaWxzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgQ29udm93b3Jrc0FwaS5wcm9wYWdhdGVTZXJ2aWNlUGxhdGZvcm0oICRzY29wZS5zZXJ2aWNlSWQsIHBsYXRmb3JtSWQpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1faW5mb1twbGF0Zm9ybUlkXSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIEFsZXJ0U2VydmljZS5hZGRTdWNlc3MoICdTZXJ2aWNlIHByb3BhZ2F0aW9uIHRvICcrcGxhdGZvcm1JZCsnIGRvbmUnKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgcHJvcGFnYXRlUGxhdGZvcm1DaGFuZ2VzKCkgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHBsYXRmb3JtSWQgKyBcIiBwcm9wYWdhdGlvbiBlcnJvcjogXCIgKyByZWFzb24uZGF0YS5tZXNzYWdlICsgXCIgRXJyb3IgZGV0YWlsczogXCIgKyByZWFzb24uZGF0YS5kZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBfbG9hZCgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0UHJvcGFnYXRlSW5mbyggJHNjb3BlLnNlcnZpY2VJZCwgJ2FtYXpvbicpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybV9pbmZvWydhbWF6b24nXSA9IGRhdGE7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UgKyAgXCIgSW4gb3JkZXIgdG8gYmUgYWJsZSB0byBwcm9wYWdhdGUgY2hhbmdlcyBmb3IgYW1hem9uXCIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0UHJvcGFnYXRlSW5mbyggJHNjb3BlLnNlcnZpY2VJZCwgJ2RpYWxvZ2Zsb3cnKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcGxhdGZvcm1faW5mb1snZGlhbG9nZmxvdyddID0gZGF0YTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVhc29uLmRhdGEubWVzc2FnZSArICBcIiBJbiBvcmRlciB0byBiZSBhYmxlIHRvIHByb3BhZ2F0ZSBjaGFuZ2VzIGZvciBkaWFsb2dmbG93XCIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0UHJvcGFnYXRlSW5mbyggJHNjb3BlLnNlcnZpY2VJZCwgJ2ZhY2Vib29rX21lc3NlbmdlcicpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybV9pbmZvWydmYWNlYm9va19tZXNzZW5nZXInXSA9IGRhdGE7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlYXNvbi5kYXRhLm1lc3NhZ2UgKyAgXCIgSW4gb3JkZXIgdG8gYmUgYWJsZSB0byBwcm9wYWdhdGUgY2hhbmdlcyBmb3IgRmFjZWJvb2sgTWVzc2VuZ2VyXCIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENvbnZvd29ya3NBcGkuZ2V0UHJvcGFnYXRlSW5mbyggJHNjb3BlLnNlcnZpY2VJZCwgJ3ZpYmVyJykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHBsYXRmb3JtX2luZm9bJ3ZpYmVyJ10gPSBkYXRhO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZWFzb24uZGF0YS5tZXNzYWdlICsgIFwiIEluIG9yZGVyIHRvIGJlIGFibGUgdG8gcHJvcGFnYXRlIGNoYW5nZXMgZm9yIFZpYmVyXCIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4vLyAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgIF9pbml0VGFicygpO1xuLy8gICAgICB9LCAyICogMTAwMCk7XG5cbiAgICAgICAgZnVuY3Rpb24gX2luaXRUYWJzKClcbiAgICAgICAge1xuICAgICAgICAgICAgJCggJyN0YWJfc3RlcHMnKS5kcm9wcGFibGUoe1xuICAgICAgICAgICAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbiggZXZlbnQsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0VkaXRvckNvbnRyb2xsZXIgdGFiX3N0ZXBzIG92ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnRhYkluZm8uYWN0aXZlICAgPSAgICdzdGVwcyc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICQoICcjdGFiX3N1YnJvdXRpbmVzJykuZHJvcHBhYmxlKHtcbiAgICAgICAgICAgICAgICBncmVlZHk6IHRydWUsXG4gICAgICAgICAgICAgICAgb3ZlcjogZnVuY3Rpb24oIGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NFZGl0b3JDb250cm9sbGVyIHRhYl9zdWJyb3V0aW5lcyBvdmVyJyk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS50YWJJbmZvLmFjdGl2ZSAgID0gICAnc3Vicm91dGluZXMnO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UoICRsb2csICRxLCBDb252b3dvcmtzQXBpKSB7XG5cbiAgICB0aGlzLmdlbmVyYXRlVW5pcXVlSWQgICAgICAgICAgID0gICBnZW5lcmF0ZVVuaXF1ZUlkO1xuICAgIHRoaXMuY3JlYXRlQ29tcG9uZW50ICAgICAgICAgICAgPSAgIGNyZWF0ZUNvbXBvbmVudDtcbiAgICB0aGlzLmNvcHlDb21wb25lbnQgICAgICAgICAgICAgID0gICBjb3B5Q29tcG9uZW50O1xuXG4gICAgdGhpcy5jcmVhdGVCbG9jayAgICAgICAgICAgICAgICA9ICAgY3JlYXRlQmxvY2s7XG4gICAgdGhpcy5jcmVhdGVSZWFkU3Vicm91dGluZSAgICAgICA9ICAgY3JlYXRlUmVhZFN1YnJvdXRpbmU7XG4gICAgdGhpcy5jcmVhdGVQcm9jZXNzU3Vicm91dGluZSAgICA9ICAgY3JlYXRlUHJvY2Vzc1N1YnJvdXRpbmU7XG5cblxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlVW5pcXVlSWQoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggOCk7XG4gICAgICAgIHJlc3VsdCArPSAnLSc7XG4gICAgICAgIHJlc3VsdCArPSBtYWtlaWQoIDQpO1xuICAgICAgICByZXN1bHQgKz0gJy0nO1xuICAgICAgICByZXN1bHQgKz0gbWFrZWlkKCA0KTtcbiAgICAgICAgcmVzdWx0ICs9ICctJztcbiAgICAgICAgcmVzdWx0ICs9IG1ha2VpZCggNCk7XG4gICAgICAgIHJlc3VsdCArPSAnLSc7XG4gICAgICAgIHJlc3VsdCArPSBtYWtlaWQoIDEyKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0LnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZWlkKCBsZW5ndGgpIHtcbiAgICAgICAgICAgdmFyIHJlc3VsdCAgICAgICAgICAgPSAnJztcbiAgICAgICAgICAgdmFyIGNoYXJhY3RlcnMgICAgICAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuICAgICAgICAgICB2YXIgY2hhcmFjdGVyc0xlbmd0aCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKyApIHtcbiAgICAgICAgICAgICAgcmVzdWx0ICs9IGNoYXJhY3RlcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNMZW5ndGgpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHlDb21wb25lbnQoIHNlcnZpY2UsIGNvbXBvbmVudFRvQ29weSlcbiAgICB7XG4gICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjb3B5Q29tcG9uZW50IGNvbXBvbmVudFRvQ29weScsIGNvbXBvbmVudFRvQ29weSk7XG5cbiAgICAgICAgdmFyIGNvbXBvbmVudCAgID0gICBhbmd1bGFyLmNvcHkoIGNvbXBvbmVudFRvQ29weSk7XG4gICAgICAgIF9yZWdlbmVyYXRlQ29tcG9uZW50SWRzKCBjb21wb25lbnQpO1xuICAgICAgICByZXR1cm4gY29tcG9uZW50O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9yZWdlbmVyYXRlQ29tcG9uZW50SWRzKCBjb21wb25lbnQpXG4gICAge1xuICAgICAgICBjb21wb25lbnQucHJvcGVydGllcy5fY29tcG9uZW50X2lkICA9ICAgZ2VuZXJhdGVVbmlxdWVJZCgpO1xuXG4gICAgICAgIGZvciAoIHZhciBrZXkgaW4gY29tcG9uZW50LnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmICggYW5ndWxhci5pc0FycmF5KCBjb21wb25lbnQucHJvcGVydGllc1trZXldKSkge1xuICAgICAgICAgICAgICAgIGZvciAoIHZhciBpPTA7IGk8Y29tcG9uZW50LnByb3BlcnRpZXNba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1baV1bJ2NsYXNzJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yZWdlbmVyYXRlQ29tcG9uZW50SWRzKCBjb21wb25lbnQucHJvcGVydGllc1trZXldW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCBjb21wb25lbnQucHJvcGVydGllc1trZXldICYmIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV1bJ2NsYXNzJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgX3JlZ2VuZXJhdGVDb21wb25lbnRJZHMoIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudCggc2VydmljZSwgZGVmaW5pdGlvbiwgbmFtZSlcbiAgICB7XG4gICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBjcmVhdGluZyBkZWZpbml0aW9uLnR5cGUnLCBkZWZpbml0aW9uLnR5cGUsICduYW1lJywgbmFtZSk7XG4gICAgICAgIHZhciBjb21wb25lbnQgICAgICAgPSAgIHtcbiAgICAgICAgICAgICAgICBjbGFzcyA6IGRlZmluaXRpb24udHlwZSxcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2UgOiBkZWZpbml0aW9uLm5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzIDoge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmb3IgKCB2YXIga2V5IGluIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBjcmVhdGVDb21wb25lbnQoKSBjaGVja2luZyBwcm9wZXJ0eScsIGtleSk7XG5cbiAgICAgICAgICAgIGlmICggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmVkaXRvcl90eXBlID09PSAnYmxvY2tfaWQnIHx8XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmVkaXRvcl90eXBlID09PSAncHJvY2Vzc19mcmFnbWVudCcgfHxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgPT09ICdyZWFkX2ZyYWdtZW50Jykge1xuICAgICAgICAgICAgICAgIC8vIGJsb2NrX2lkIC0gcHJlZGVmaW5lZCBiZWhhdmlvdXJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldID0gX2dlbmVyYXRlQmxvY2tJZCggc2VydmljZSwgbmFtZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZWRpdG9yX3R5cGUgPT09ICdzZXJ2aWNlX2NvbXBvbmVudHMnKSB7XG5cbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgc2VydmljZV9jb21wb25lbnRzIGVkaXRvcicpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCB0eXBlb2YgZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIG5vIGRlZmF1bHQgdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCAhZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgZW1wdHkgZGVmYXVsdCB2YWx1ZScsIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldICAgICAgID0gICBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5lZGl0b3JfcHJvcGVydGllcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgbXVsdGlwbGUgY29tcG9uZW50cycpO1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldICAgPSAgIFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaT0wOyBpPGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZCAgICAgICAgICAgICAgICAgICAgICAgPSAgIGFuZ3VsYXIuY29weSggZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5wcm9wZXJ0aWVzLl9jb21wb25lbnRfaWQgID0gICBnZW5lcmF0ZVVuaXF1ZUlkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldW2NvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0ubGVuZ3RoXSAgICAgICA9ICAgY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgc2luZ2xlIGNvbXBvbmVudCcpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGQgICAgICAgICAgICAgICAgICAgICAgID0gICBhbmd1bGFyLmNvcHkoIGRlZmluaXRpb24uY29tcG9uZW50X3Byb3BlcnRpZXNba2V5XS5kZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5wcm9wZXJ0aWVzLl9jb21wb25lbnRfaWQgID0gICBnZW5lcmF0ZVVuaXF1ZUlkKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wZXJ0aWVzW2tleV0gICAgICAgPSAgIGNoaWxkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGtleS5pbmRleE9mKCAnXycpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gc3lzdGVtIHByb3BzIC0ganVzdCBjb3B5IHRoZSBjb21wb25lbnQgaWQgLSBwcmVkZWZpbmVkIGJlaGF2aW91clxuICAgICAgICAgICAgICAgIGlmIChrZXkgPT09ICdfY29tcG9uZW50X2lkJykge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldID0gZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb25lbnQucHJvcGVydGllc1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHR5cGVvZiBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIC8vIHVzZSBkZWZhdWx0IHZhbHVlXG4gICAgICAgICAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIGNyZWF0ZUNvbXBvbmVudCgpIGRlZmF1bHQgdmFsdWUnLCBkZWZpbml0aW9uLmNvbXBvbmVudF9wcm9wZXJ0aWVzW2tleV0uZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcGVydGllc1trZXldID0gZGVmaW5pdGlvbi5jb21wb25lbnRfcHJvcGVydGllc1trZXldLmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggbmFtZSkge1xuICAgICAgICAgICAgY29tcG9uZW50LnByb3BlcnRpZXMubmFtZSAgID0gICBuYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tcG9uZW50LnByb3BlcnRpZXNbJ19jb21wb25lbnRfaWQnXSA9IGdlbmVyYXRlVW5pcXVlSWQoKTtcblxuICAgICAgICAkbG9nLmxvZyggJ0NvbnZvQ29tcG9uZW50RmFjdG9yeVNlcnZpY2UgY3JlYXRlQ29tcG9uZW50KCkgY3JlYXRlZCBjb21wb25lbnQnLCBjb21wb25lbnQpO1xuXG4gICAgICAgIHJldHVybiBjb21wb25lbnQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlQmxvY2soIHNlcnZpY2UsIG5hbWUpXG4gICAge1xuICAgICAgICB2YXIgZGVmZXJyZWQgICAgPSAgICRxLmRlZmVyKCk7XG5cbiAgICAgICAgQ29udm93b3Jrc0FwaS5nZXRDb21wb25lbnREZWZpbml0aW9uKCBzZXJ2aWNlWydzZXJ2aWNlX2lkJ10sICdcXFxcQ29udm9cXFxcUGNrZ1xcXFxDb3JlXFxcXEVsZW1lbnRzXFxcXENvbnZlcnNhdGlvbkJsb2NrJykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24sICduYW1lJywgbmFtZSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCBjcmVhdGVDb21wb25lbnQoIHNlcnZpY2UsIGRlZmluaXRpb24sIG5hbWUpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCByZWFzb24pO1xuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVJlYWRTdWJyb3V0aW5lKCBzZXJ2aWNlLCBuYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGRlZmVycmVkICAgID0gICAkcS5kZWZlcigpO1xuXG4gICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggc2VydmljZVsnc2VydmljZV9pZCddLCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxFbGVtZW50c1xcXFxFbGVtZW50c0ZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24sICduYW1lJywgbmFtZSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCBjcmVhdGVDb21wb25lbnQoIHNlcnZpY2UsIGRlZmluaXRpb24sIG5hbWUpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCByZWFzb24pO1xuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVByb2Nlc3NTdWJyb3V0aW5lKCBzZXJ2aWNlLCBuYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGRlZmVycmVkICAgID0gICAkcS5kZWZlcigpO1xuXG4gICAgICAgIENvbnZvd29ya3NBcGkuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbiggc2VydmljZVsnc2VydmljZV9pZCddLCAnXFxcXENvbnZvXFxcXFBja2dcXFxcQ29yZVxcXFxQcm9jZXNzb3JzXFxcXFByb2Nlc3NvckZyYWdtZW50JykudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm9Db21wb25lbnRGYWN0b3J5U2VydmljZSBnb3QgZGVmaW5pdGlvbicsIGRlZmluaXRpb24sICduYW1lJywgbmFtZSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCBjcmVhdGVDb21wb25lbnQoIHNlcnZpY2UsIGRlZmluaXRpb24sIG5hbWUpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCByZWFzb24pO1xuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cblxuXG5cbiAgICAvLyBQUklWQVRFIFVUSUxcblxuICAgIGZ1bmN0aW9uIF9maW5kQmxvY2soIHNlcnZpY2UsIGJsb2NrSWQpIHtcbiAgICAgICAgZm9yICggdmFyIGk9MDsgaTxzZXJ2aWNlLmJsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJsb2NrICAgPSAgIHNlcnZpY2UuYmxvY2tzW2ldO1xuICAgICAgICAgICAgaWYgKCBibG9jay5wcm9wZXJ0aWVzLmJsb2NrX2lkID09PSBibG9ja0lkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoIHZhciBpPTA7IGk8c2VydmljZS5mcmFnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBibG9jayAgID0gICBzZXJ2aWNlLmZyYWdtZW50c1tpXTtcbiAgICAgICAgICAgIGlmICggYmxvY2sucHJvcGVydGllcy5mcmFnbWVudF9pZCA9PT0gYmxvY2tJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZUJsb2NrSWQoIHNlcnZpY2UsIG5hbWUpIHtcblxuICAgICAgICBpZiAoICFuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBibG9ja19pZCAgICA9ICAgbmFtZS5yZXBsYWNlKC9bXkEtWjAtOV0rL2lnLCBcIl9cIik7XG4gICAgICAgIHZhciBibG9jayAgICAgICA9ICAgX2ZpbmRCbG9jayggc2VydmljZSwgYmxvY2tfaWQpO1xuXG4gICAgICAgIGlmICggYmxvY2spIHtcbiAgICAgICAgICAgIHZhciBwYXJzZV9pbmZvICA9ICAgX3BhcnNlTnVtZXJpY1N1ZmZpeCggYmxvY2tfaWQpO1xuXG4gICAgICAgICAgICBpZiAoIHBhcnNlX2luZm8ubnVtKSB7XG4gICAgICAgICAgICAgICAgYmxvY2tfaWQgICAgPSAgIHBhcnNlX2luZm8uYmFzZSArICdfJyArIChwYXJzZV9pbmZvLm51bSArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBibG9ja19pZCAgICArPSAgJ18xJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIF9nZW5lcmF0ZUJsb2NrSWQoIHNlcnZpY2UsIGJsb2NrX2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBibG9ja19pZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcGFyc2VOdW1lcmljU3VmZml4KCBzdHIpIHtcbiAgICAgICAgdmFyIGluZGV4ICAgPSAgIHN0ci5sYXN0SW5kZXhPZiggJ18nKTtcbiAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIF9wYXJzZU51bWVyaWNTdWZmaXggc3RyJywgc3RyLCAnaW5kZXgnLCBpbmRleCk7XG4gICAgICAgIGlmICggaW5kZXggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBudW0gOiAwLFxuICAgICAgICAgICAgICAgIGJhc2UgOiBzdHJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgJGxvZy5sb2coICdDb252b0NvbXBvbmVudEZhY3RvcnlTZXJ2aWNlIF9wYXJzZU51bWVyaWNTdWZmaXggc3RyLnN1YnN0ciggMCwgaW5kZXgpJywgc3RyLnN1YnN0ciggMCwgaW5kZXgpLFxuICAgICAgICAgICAgICAgICdwYXJzZUludCggc3RyLnN1YnN0ciggaW5kZXggKyAxKSknLCBwYXJzZUludCggc3RyLnN1YnN0ciggaW5kZXggKyAxKSksICdzdHIuc3Vic3RyKCBpbmRleCArIDEpJywgc3RyLnN1YnN0ciggaW5kZXggKyAxKSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBudW0gOiBwYXJzZUludCggc3RyLnN1YnN0ciggaW5kZXggKyAxKSkgfHwgMCxcbiAgICAgICAgICAgIGJhc2UgOiBzdHIuc3Vic3RyKCAwLCBpbmRleClcbiAgICAgICAgfTtcbiAgICB9XG59O1xuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlKCAkcSwgbG9jYWxTdG9yYWdlU2VydmljZSlcbntcbiAgICB0aGlzLnJlZ2lzdGVyRGF0YSAgICAgICA9ICAgcmVnaXN0ZXJEYXRhO1xuICAgIHRoaXMuZ2V0RGF0YSAgICAgICAgICAgID0gICBnZXREYXRhO1xuICAgIFxuICAgIGZ1bmN0aW9uIGdldERhdGEoIGtleSlcbiAgICB7XG4gICAgICAgIHZhciBkZWZlcnJlZCAgICA9ICAgJHEuZGVmZXIoKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoIGtleSkpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhKCBrZXksIGRhdGEpXG4gICAge1xuICAgICAgICBsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldCgga2V5LCBkYXRhKVxuICAgIH1cbn07XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRleHRBcnJheSggJGxvZykge1xuICAgIFxuICAgICRsb2cubG9nKCd0ZXh0QXJyYXkgaW5pdCcpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyaWJ1dGVzLCBuZ01vZGVsKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBpbnRvKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0LnNwbGl0KCcsJykubWFwKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnRyaW0oKSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gb3V0KGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5qb2luKCcsICcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZ01vZGVsLiRwYXJzZXJzLnB1c2goaW50byk7XG4gICAgICAgICAgICBuZ01vZGVsLiRmb3JtYXR0ZXJzLnB1c2gob3V0KTtcbiAgICAgICAgfVxuICAgIH07XG59IiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9sb2FkaW5nLnRtcGwuaHRtbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxvYWRpbmdJbmRpY2F0b3IoICRodHRwLCAkbG9nKSB7XG4gICAgXG4gICAgJGxvZy5sb2coJ2xvYWRpbmdJbmRpY2F0b3IgaW5pdCcpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlIDogdGVtcGxhdGUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxtLCBhdHRycykge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgJGxvZy5sb2coICdsb2FkaW5nSW5kaWNhdG9yIGxpbmsnLCBlbG0pO1xuXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucGVuZGluZ1JlcXVlc3RzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsbS5maW5kKCdkaXYuc2stY3ViZS1ncmlkJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsbS5maW5kKCdkaXYuc2stY3ViZS1ncmlkJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYWxlcnRJbmRpY2F0b3IoICRsb2cpIHtcbiAgICBcbiAgICAkbG9nLmxvZygnanNvblRleHQgaW5pdCcpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBuZ01vZGVsKSBcbiAgICAgICAge1xuICAgICAgICAgICAgZnVuY3Rpb24gaW50byhpbnB1dCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRlbWl0KCdKc29uRXJyb3InLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGlucHV0KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cud2FybignRXJyb3IgcGFyc2luZyBKU09OOicsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRlbWl0KCdKc29uRXJyb3InLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZnVuY3Rpb24gb3V0KGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5nTW9kZWwuJHBhcnNlcnMucHVzaChpbnRvKTtcbiAgICAgICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMucHVzaChvdXQpO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsImltcG9ydCBhbmd1bGFyIGZyb20gJ2FuZ3VsYXInO1xuaW1wb3J0ICdhbmd1bGFyLWxvY2FsLXN0b3JhZ2UnO1xuXG5pbXBvcnQgeyBwcm9wc0ZpbHRlciwgcGVyY2VudCwgcHJldHR5SnNvbiwgYWRtRGF0ZSwgdW5zYWZlLCBrZXlzfSBmcm9tICcuL2ZpbHRlcnMnO1xuaW1wb3J0IGFsZXJ0SW5kaWNhdG9yIGZyb20gJy4vYWxlcnQtaW5kaWNhdG9yLmRpcmVjdGl2ZSc7XG5pbXBvcnQgQWxlcnRTZXJ2aWNlIGZyb20gJy4vYWxlcnQtc2VydmljZSc7XG5pbXBvcnQgVXNlclByZWZlcmVuY2VzU2VydmljZSBmcm9tICcuL3VzZXItcHJlZmVyZW5jZXMuc2VydmljZSc7XG5pbXBvcnQgRGVmZXJyZWRzU3RhY2tTZXJ2aWNlIGZyb20gJy4vZGVmZXJyZWRzLXN0YWNrLnNlcnZpY2UnO1xuaW1wb3J0IENvbnZvd29ya3NBcGkgZnJvbSAnLi9jb252b3dvcmtzLWFwaSc7XG5cbmltcG9ydCBqc29uVGV4dCBmcm9tICcuL2pzb24tdGV4dC5kaXJlY3RpdmUnO1xuaW1wb3J0IGxvYWRpbmdJbmRpY2F0b3IgZnJvbSAnLi9sb2FkaW5nLmRpcmVjdGl2ZSc7XG5pbXBvcnQgdGV4dEFycmF5IGZyb20gJy4vdGV4dC1hcnJheS5kaXJlY3RpdmUnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gIC5tb2R1bGUoJ2NvbnZvLmNvbW1vbicsIFsnTG9jYWxTdG9yYWdlTW9kdWxlJ10pXG4gIC5maWx0ZXIoJ3Byb3BzRmlsdGVyJywgcHJvcHNGaWx0ZXIpXG4gIC5maWx0ZXIoJ3BlcmNlbnQnLCBwZXJjZW50KVxuICAuZmlsdGVyKCdwcmV0dHlKc29uJywgcHJldHR5SnNvbilcbiAgLmZpbHRlcignYWRtRGF0ZScsIGFkbURhdGUpXG4gIC5maWx0ZXIoJ3Vuc2FmZScsIHVuc2FmZSlcbiAgLmZpbHRlcigna2V5cycsIGtleXMpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0SW5kaWNhdG9yJywgYWxlcnRJbmRpY2F0b3IpXG4gIC5kaXJlY3RpdmUoJ2pzb25UZXh0JywganNvblRleHQpXG4gIC5kaXJlY3RpdmUoJ2xvYWRpbmdJbmRpY2F0b3InLCBsb2FkaW5nSW5kaWNhdG9yKVxuICAuZGlyZWN0aXZlKCd0ZXh0QXJyYXknLCB0ZXh0QXJyYXkpXG4gIC5mYWN0b3J5KCdBbGVydFNlcnZpY2UnLCBBbGVydFNlcnZpY2UpXG4gIC5zZXJ2aWNlKCdEZWZlcnJlZHNTdGFja1NlcnZpY2UnLCBEZWZlcnJlZHNTdGFja1NlcnZpY2UpXG4gIC5zZXJ2aWNlKCdVc2VyUHJlZmVyZW5jZXNTZXJ2aWNlJywgVXNlclByZWZlcmVuY2VzU2VydmljZSlcbiAgLnNlcnZpY2UoJ0NvbnZvd29ya3NBcGknLCBDb252b3dvcmtzQXBpKVxuICAubmFtZTtcbiIsIlxuZXhwb3J0IGZ1bmN0aW9uIHByb3BzRmlsdGVyKCkge1xuICByZXR1cm4gZnVuY3Rpb24oIGl0ZW1zLCBwcm9wcykge1xuICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgXG4gICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICB2YXIgaGFzdGV4dCA9ICAgZmFsc2U7XG4gICAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtTWF0Y2hlcyA9IGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IGtleXNbaV07XG4gICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHByb3BzW3Byb3BdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIGlmICh0ZXh0KVxuICAgICAgICAgICAgICAgICAgICAgIGhhc3RleHQgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChpdGVtW3Byb3BdICYmIChpdGVtW3Byb3BdLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRleHQpICE9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbU1hdGNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1NYXRjaGVzKSB7XG4gICAgICAgICAgICAgICAgICBvdXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFoYXN0ZXh0KVxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIExldCB0aGUgb3V0cHV0IGJlIHRoZSBpbnB1dCB1bnRvdWNoZWRcbiAgICAgICAgICBvdXQgPSBpdGVtcztcbiAgICAgICAgfVxuICAgIFxuICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBlcmNlbnQoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlICsgJyAlJztcbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJldHR5SnNvbigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSggdmFsdWUsIG51bGwsIDIpO1xuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZG1EYXRlKCAkZmlsdGVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICggc3RyRGF0ZSwgZm9ybWF0KSB7XG4gICAgICAgIGlmICggYW5ndWxhci5pc051bWJlciggc3RyRGF0ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAkZmlsdGVyKCdkYXRlJykoIG5ldyBEYXRlKCBzdHJEYXRlICogMTAwMCksIGZvcm1hdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRmaWx0ZXIoJ2RhdGUnKSggRGF0ZS5wYXJzZSggc3RyRGF0ZSksIGZvcm1hdCk7XG4gICAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuc2FmZSggJHNjZSkge1xuICAgIHJldHVybiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgcmV0dXJuICRzY2UudHJ1c3RBc0h0bWwodmFsKTtcbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5cygpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gICAgfTtcbn1cbiIsIlxuXG5cbmZ1bmN0aW9uIERlZmVycmVkc1N0YWNrKClcbntcbiAgICB0aGlzLmdyb3VwcyAgICAgICAgID0gICB7fTtcbiAgICB0aGlzLnJlc291bHV0aW9ucyAgID0gICB7fTtcbn1cblxuXG5EZWZlcnJlZHNTdGFjay5wcm90b3R5cGUucmVnaXN0ZXJlZCA9IGZ1bmN0aW9uKCBrZXkpXG57XG4gICAgdmFyIGRlZmVycmVkcyAgID0gICB0aGlzLl9nZXRHcm91cCgga2V5KTtcbiAgICBpZiAoZGVmZXJyZWRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5EZWZlcnJlZHNTdGFjay5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbigga2V5LCBkZWZlcnJlZClcbntcbiAgICBpZiAoa2V5IGluIHRoaXMucmVzb3VsdXRpb25zKVxuICAgIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggdGhpcy5yZXNvdWx1dGlvbnNba2V5XSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlc291bHV0aW9uc1trZXldO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHZhciBkZWZlcnJlZHMgICA9ICAgdGhpcy5fZ2V0R3JvdXAoIGtleSk7XG4gICAgZGVmZXJyZWRzLnB1c2goIGRlZmVycmVkKTtcbn1cblxuRGVmZXJyZWRzU3RhY2sucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbigga2V5LCByZXN1bHQpXG57XG4gICAgdmFyIGRlZmVycmVkcyAgID0gICB0aGlzLl9nZXRHcm91cCgga2V5KTtcbiAgICBcbiAgICBpZiAoZGVmZXJyZWRzLmxlbmd0aCA9PSAwKVxuICAgIHtcbiAgICAgICAgdGhpcy5yZXNvdWx1dGlvbnNba2V5XSAgPSAgIHJlc3VsdDtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZGVmZXJyZWQ7XG4gICAgd2hpbGUgKGRlZmVycmVkID0gZGVmZXJyZWRzLnNoaWZ0KCkpIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggcmVzdWx0KTtcbiAgICB9XG59XG5cbkRlZmVycmVkc1N0YWNrLnByb3RvdHlwZS5yZWplY3QgPSBmdW5jdGlvbigga2V5LCByZWFzb24pXG57XG4gICAgdmFyIGRlZmVycmVkcyAgID0gICB0aGlzLl9nZXRHcm91cCgga2V5KTtcbiAgICB2YXIgZGVmZXJyZWQ7XG4gICAgd2hpbGUgKGRlZmVycmVkID0gZGVmZXJyZWRzLnNoaWZ0KCkpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCByZWFzb24pO1xuICAgIH1cbn1cblxuRGVmZXJyZWRzU3RhY2sucHJvdG90eXBlLnJlamVjdEFsbCA9IGZ1bmN0aW9uKClcbntcbiAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5ncm91cHMpXG4gICAgICAgIHRoaXMucmVqZWN0KCBrZXksIG51bGwpO1xufVxuXG5EZWZlcnJlZHNTdGFjay5wcm90b3R5cGUuX2dldEdyb3VwID0gZnVuY3Rpb24oIGtleSlcbntcbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCggdGhpcy5ncm91cHNba2V5XSkpXG4gICAgICAgIHRoaXMuZ3JvdXBzW2tleV0gPSBbXTtcbiAgICByZXR1cm4gdGhpcy5ncm91cHNba2V5XTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBEZWZlcnJlZHNTdGFja1NlcnZpY2UoICRsb2cpXG57XG4gICAgdGhpcy5nZXROZXcgICAgID0gICBnZXROZXc7XG4gICAgICAgIFxuICAgIGZ1bmN0aW9uIGdldE5ldygpXG4gICAge1xuICAgICAgICByZXR1cm4gbmV3IERlZmVycmVkc1N0YWNrKCk7XG4gICAgfVxufTtcbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ29udm93b3Jrc0FwaSggJGxvZywgJGh0dHAsICRxLCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwsIENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwpIHtcblxuXG4gICAgICAgICRsb2cubG9nKFwiQ29udm93b3Jrc0FwaSBpbml0XCIpO1xuXG4gICAgICAgIHZhciBkZWZpbml0aW9ucyAgICAgPSAgIG51bGw7XG5cbiAgICAgICAgLy8gSU5URVJGQUNFXG5cbiAgICAgICAgLy8gL2NvbnZvLWRlZmluaXRpb25zXG4gICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnMgICAgPSAgIGdldENvbXBvbmVudERlZmluaXRpb25zO1xuICAgICAgICB0aGlzLmdldENvbXBvbmVudERlZmluaXRpb24gICAgID0gICBnZXRDb21wb25lbnREZWZpbml0aW9uO1xuICAgICAgICB0aGlzLmdldFRlbXBsYXRlcyAgICAgICAgICAgICAgID0gICBnZXRUZW1wbGF0ZXM7XG5cbiAgICAgICAgLy8gL3NlcnZpY2UtcGFja2FnZXNcbiAgICAgICAgdGhpcy5nZXRBdmFpbGFibGVQYWNrYWdlcyAgICAgICA9ICAgZ2V0QXZhaWxhYmxlUGFja2FnZXM7XG4gICAgICAgIHRoaXMuYWRkU2VydmljZVBhY2thZ2UgICAgICAgICAgPSAgIGFkZFNlcnZpY2VQYWNrYWdlO1xuICAgICAgICB0aGlzLnJlbW92ZVNlcnZpY2VQYWNrYWdlICAgICAgID0gICByZW1vdmVTZXJ2aWNlUGFja2FnZTtcblxuICAgICAgICAvLyAvc2VydmljZXNcbiAgICAgICAgdGhpcy5nZXRBbGxTZXJ2aWNlcyAgICAgICAgICAgICA9ICAgZ2V0QWxsU2VydmljZXM7XG5cbiAgICAgICAgLy8gL3NlcnZpY2VzL3tzZXJ2aWNlSWR9XG4gICAgICAgIHRoaXMuZ2V0U2VydmljZUJ5SWQgICAgICAgICAgICAgPSAgIGdldFNlcnZpY2VCeUlkO1xuICAgICAgICB0aGlzLmdldFNlcnZpY2VNZXRhICAgICAgICAgICAgID0gICBnZXRTZXJ2aWNlTWV0YTtcbiAgICAgICAgdGhpcy5jcmVhdGVTZXJ2aWNlICAgICAgICAgICAgICA9ICAgY3JlYXRlU2VydmljZTtcbiAgICAgICAgdGhpcy51cGRhdGVTZXJ2aWNlICAgICAgICAgICAgICA9ICAgdXBkYXRlU2VydmljZTtcblxuICAgICAgICAvLyAvc2VydmljZXMve3NlcnZpY2VJZH0vbWV0YVxuICAgICAgICB0aGlzLnVwZGF0ZVNlcnZpY2VNZXRhICAgICAgICAgID0gICB1cGRhdGVTZXJ2aWNlTWV0YTtcblxuICAgICAgICAvLyAvc2VydmljZXMve3NlcnZpY2VJZH0vcHJldmlld1xuICAgICAgICB0aGlzLmdldFNlcnZpY2VQcmV2aWV3ICAgICAgICAgID0gICBnZXRTZXJ2aWNlUHJldmlldztcblxuICAgICAgICAvLyAvc2VydmljZS1ydW4ve3NlcnZpY2VJZH1cbiAgICAgICAgdGhpcy5zZW5kTWVzc2FnZSAgICAgICAgICAgICAgICA9ICAgc2VuZE1lc3NhZ2U7XG5cbiAgICAgICAgLy8gL3NlcnZpY2UtaW1wLWV4cC9pbXBvcnQve3NlcnZpY2VJZH1cbiAgICAgICAgdGhpcy51cGxvYWRTZXJ2aWNlRGF0YSAgICAgICAgICA9ICAgdXBsb2FkU2VydmljZURhdGE7XG5cbiAgICAgICAgLy8gL3NlcnZpY2UtcGxhdGZmb3JtLWNvbmZpZy97c2VydmljZUlkfVxuICAgICAgICB0aGlzLmxvYWRQbGF0Zm9ybUNvbmZpZyAgICAgICAgID0gICBsb2FkUGxhdGZvcm1Db25maWc7XG4gICAgICAgIHRoaXMuZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnICAgPSAgIGdldFNlcnZpY2VQbGF0Zm9ybUNvbmZpZztcbiAgICAgICAgdGhpcy5jcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcgICA9ICAgY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnO1xuICAgICAgICB0aGlzLnVwZGF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyAgID0gICB1cGRhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWc7XG4gICAgICAgIHRoaXMucHJvcGFnYXRlU2VydmljZVBsYXRmb3JtICAgPSAgIHByb3BhZ2F0ZVNlcnZpY2VQbGF0Zm9ybTtcbiAgICAgICAgdGhpcy5nZXRQcm9wYWdhdGVJbmZvICAgICAgICAgICA9ICAgZ2V0UHJvcGFnYXRlSW5mbztcblxuICAgICAgICAvLyBwdWJsaXNoLXNlcnZpY2Uve3BsYXRmb3JtSWR9L3tzZXJ2aWNlSWR9XG4gICAgICAgIHRoaXMuZ2V0UHVibGlzaEluZm9ybWF0aW9uICAgICAgPSAgIGdldFB1Ymxpc2hJbmZvcm1hdGlvbjtcblxuICAgICAgICB0aGlzLmdldFNlcnZpY2VWZXJzaW9ucyAgICAgICAgID0gICBnZXRTZXJ2aWNlVmVyc2lvbnM7XG4gICAgICAgIHRoaXMuZ2V0U2VydmljZVJlbGVhc2VzICAgICAgICAgPSAgIGdldFNlcnZpY2VSZWxlYXNlcztcbiAgICAgICAgdGhpcy5jcmVhdGVSZWxlYXNlICAgICAgICAgICAgICA9ICAgY3JlYXRlUmVsZWFzZTtcbiAgICAgICAgdGhpcy5wcm9tb3RlUmVsZWFzZSAgICAgICAgICAgICA9ICAgcHJvbW90ZVJlbGVhc2U7XG4gICAgICAgIHRoaXMuaW1wb3J0V29ya2Zsb3dJbnRvUmVsZWFzZSAgPSAgIGltcG9ydFdvcmtmbG93SW50b1JlbGVhc2U7XG5cbiAgICAgICAgLy8gbWVkaWEve3NlcnZpY2VJZH1cbiAgICAgICAgdGhpcy51cGxvYWRNZWRpYSA9IHVwbG9hZE1lZGlhO1xuICAgICAgICB0aGlzLmRvd25sb2FkTWVkaWEgPSBkb3dubG9hZE1lZGlhO1xuXG4gICAgICAgIC8vIHBhY2thZ2UtaGVscC97cGFja2FnZUlkfS97ZmlsZW5hbWV9XG4gICAgICAgIHRoaXMuZ2V0UGFja2FnZUNvbXBvbmVudEhlbHAgPSBnZXRQYWNrYWdlQ29tcG9uZW50SGVscDtcblxuICAgICAgICB0aGlzLnJlcXVlc3RBdXRoVXJsID0gcmVxdWVzdEF1dGhVcmw7XG5cbiB0aGlzLmdldFBsYXRmb3JtQ29uZmlndXJhdGlvbiA9IGdldFBsYXRmb3JtQ29uZmlndXJhdGlvbjtcbiAgICAgICAgdGhpcy51cGRhdGVQbGF0Zm9ybUNvbmZpZ3VyYXRpb24gPSB1cGRhdGVQbGF0Zm9ybUNvbmZpZ3VyYXRpb247XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0UGxhdGZvcm1Db25maWd1cmF0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy91c2VyLXBsYXRmb3JtLWNvbmZpZydcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKFwiQ29udm93b3Jrc0FwaSBnZXRQbGF0Zm9ybUNvbmZpZ3VyYXRpb24oKSByZXNcIiwgcmVzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlUGxhdGZvcm1Db25maWd1cmF0aW9uKGNvbmZpZylcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwdXQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy91c2VyLXBsYXRmb3JtLWNvbmZpZycsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhOiBjb25maWdcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKFwiQ29udm93b3Jrc0FwaSB1cGRhdGVQbGF0Zm9ybUNvbmZpZygpIHJlc1wiLCByZXMpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIHJlcXVlc3RBdXRoVXJsKHVzZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICB1cmw6IENPTlZPX1BVQkxJQ19BUElfQkFTRV9VUkwgKyAnL2FkbWluLWF1dGgvYW1hem9uP3VzZXJuYW1lPScgKyB1c2VyLmVtYWlsXG4gICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnR290IHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIFRFTVBMQVRFU1xuLy8gICAgICAgICBmdW5jdGlvbiBnZXRUZW1wbGF0ZXMoc2VydmljZUlkKSB7XG4vLyAgICAgICAgICAgICB2YXIgZCAgID0gICAkcS5kZWZlcigpO1xuLy9cbi8vICAgICAgICAgICAgIGdldENvbXBvbmVudERlZmluaXRpb25zKHNlcnZpY2VJZCkudGhlbiggZnVuY3Rpb24oIGRlZmluaXRpb25zKSB7XG4vLyAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlcyAgID0gICBbXTtcbi8vICAgICAgICAgICAgICAgICBmb3IgKCB2YXIgaT0wOyBpPGRlZmluaXRpb25zLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHZhciBwY2tnICAgID0gICBkZWZpbml0aW9uc1tpXTtcbi8vICAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIGo9MDsgajxwY2tnLnRlbXBsYXRlcy5sZW5ndGg7IGorKykge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2goIHBja2cudGVtcGxhdGVzW2pdKTtcbi8vICAgICAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKCB0ZW1wbGF0ZXMpO1xuLy9cbi8vIC8vICAgICAgICAgICAgICBkLnJlamVjdCggJ0NvbXBvbmVudCBbJytjbGFzc05hbWUrJ10gbm90IGZvdW5kJyk7XG4vLyAgICAgICAgICAgICB9KTtcbi8vXG4vLyAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuLy8gICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VGVtcGxhdGVzKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy90ZW1wbGF0ZXMnXG4gICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREVGSU5JVElPTlNcbiAgICAgICAgZnVuY3Rpb24gZ2V0Q29tcG9uZW50RGVmaW5pdGlvbnMoc2VydmljZUlkKSB7XG4gICAgICAgICAgICBpZiAoICEhZGVmaW5pdGlvbnMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGQgICA9ICAgJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgIGQucmVzb2x2ZSggZGVmaW5pdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wYWNrYWdlcy8nICsgc2VydmljZUlkXG4gICAgICAgICAgICAgICAgfSkudGhlbiggZnVuY3Rpb24gKCByZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbnMgPSAgIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmaW5pdGlvbnM7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRDb21wb25lbnREZWZpbml0aW9uKCBzZXJ2aWNlSWQsIGNsYXNzTmFtZSkge1xuLy8gICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldENvbXBvbmVudERlZmluaXRpb24oJXMpJywgY2xhc3NOYW1lKTtcbi8vICAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIGdldENvbXBvbmVudERlZmluaXRpb24oKScsIHNlcnZpY2VJZCwgY2xhc3NOYW1lKTtcblxuICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICBnZXRDb21wb25lbnREZWZpbml0aW9ucyhzZXJ2aWNlSWQpLnRoZW4oZnVuY3Rpb24oZGVmaW5pdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAvLyAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRDb21wb25lbnREZWZpbml0aW9uKCkgZGVmaW5pdGlvbnMnLCBkZWZpbml0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRlZmluaXRpb25zLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBja2cgPSBkZWZpbml0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0Q29tcG9uZW50RGVmaW5pdGlvbigpIGN1cnJlbnRseSBvbiBwYWNrYWdlJywgcGNrZ1snbmFtZXNwYWNlJ10pO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHBja2cuY29tcG9uZW50cy5sZW5ndGg7IGorKylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXAgPSBwY2tnLmNvbXBvbmVudHNbal07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICRsb2cubG9nKCdDb252b3dvcmtzQXBpIGdldENvbXBvbmVudERlZmluaXRpb24oKSBjdXJyZW50IGNvbXBvbmVudCcsIGNvbXBbJ3R5cGUnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcFsndHlwZSddID09PSBjbGFzc05hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0Q29tcG9uZW50RGVmaW5pdGlvbigpIGZvdW5kIGNvbXBvbmVudCcsIGNvbXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb21wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wWydjb21wb25lbnRfcHJvcGVydGllcyddWydfY2xhc3NfYWxpYXNlcyddICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcFsnY29tcG9uZW50X3Byb3BlcnRpZXMnXVsnX2NsYXNzX2FsaWFzZXMnXS5pbmNsdWRlcyhjbGFzc05hbWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb21wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkLnJlamVjdCggJ0NvbXBvbmVudCBbJytjbGFzc05hbWUrJ10gbm90IGZvdW5kJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBBQ0tBR0VTXG4gICAgICAgIGZ1bmN0aW9uIGdldEF2YWlsYWJsZVBhY2thZ2VzKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy91c2VyLXBhY2thZ2VzJ1xuICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkU2VydmljZVBhY2thZ2Uoc2VydmljZUlkLCBwYWNrYWdlSWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIGFkZFNlcnZpY2VQYWNrYWdlKCknLCBzZXJ2aWNlSWQsIHBhY2thZ2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgdXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcGFja2FnZXMvJyArIHNlcnZpY2VJZCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7ICdwYWNrYWdlX2lkJzogcGFja2FnZUlkIH1cbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgYWRkU2VydmljZVBhY2thZ2UoKSB0aGVuJywgcmVzLmRhdGEpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlU2VydmljZVBhY2thZ2Uoc2VydmljZUlkLCBwYWNrYWdlSWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIHJlbW92ZVNlcnZpY2VQYWNrYWdlKCknLCBzZXJ2aWNlSWQsIHBhY2thZ2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICB1cmw6IENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wYWNrYWdlcy8nICsgc2VydmljZUlkLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgJ3BhY2thZ2VfaWQnOiBwYWNrYWdlSWQgfVxuICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSByZW1vdmVTZXJ2aWNlUGFja2FnZSgpIHRoZW4nLCByZXMuZGF0YSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEFsbFNlcnZpY2VzKCkge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldEFsbFNlcnZpY2VzKCknKTtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlcydcbiAgICAgICAgICAgIH0pLnRoZW4oIGZ1bmN0aW9uICggcmVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNlcnZpY2VCeUlkKCBzZXJ2aWNlSWQpIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlQnlJZCglcyknLCBzZXJ2aWNlSWQpO1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlcy8nICsgc2VydmljZUlkXG4gICAgICAgICAgICB9KS50aGVuKCBmdW5jdGlvbiAoIHJlcykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2VydmljZU1ldGEoIHNlcnZpY2VJZCkge1xuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldFNlcnZpY2VNZXRhKCVzKScsIHNlcnZpY2VJZCk7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgdXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2VzLycgKyBzZXJ2aWNlSWQgKyAnL21ldGEnXG4gICAgICAgICAgICB9KS50aGVuKCBmdW5jdGlvbiAoIHJlcykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlU2VydmljZSggc2VydmljZU5hbWUsIHRlbXBsYXRlSWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICAgICAgdXJsOiBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2VzJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7ICdzZXJ2aWNlX25hbWUnIDogc2VydmljZU5hbWUsICd0ZW1wbGF0ZV9pZCcgOiB0ZW1wbGF0ZUlkIH1cbiAgICAgICAgICAgIH0pLnRoZW4oIGZ1bmN0aW9uICggcmVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTZXJ2aWNlKCBzZXJ2aWNlSWQsIHNlcnZpY2UpIHtcbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBwb3N0U2VydmljZSgpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZXMvJyArIHNlcnZpY2VJZCwgc2VydmljZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTZXJ2aWNlTWV0YSggc2VydmljZUlkLCBtZXRhKSB7XG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgdXBkYXRlU2VydmljZU1ldGEoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdtZXRhJywgbWV0YSk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZXMvJyArIHNlcnZpY2VJZCArICcvbWV0YScsIG1ldGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2VydmljZVByZXZpZXcoc2VydmljZUlkKSB7XG4gICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlUHJldmllcygpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgICAgIC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZXMvJyArIHNlcnZpY2VJZCArICcvcHJldmlldycpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbmRNZXNzYWdlKCBzZXJ2aWNlSWQsIGRldmljZUlkLCB0ZXh0LCBpc0xhdW5jaCwgdmFyaWFudCwgZGVsZWdhdGVObHApXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICggIXZhcmlhbnQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gICAnZGV2ZWxvcCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgICAgICB1cmw6IENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS10ZXN0LycgKyBzZXJ2aWNlSWQsXG4gICAgICAgICAgICAgICAgZGF0YSA6IHsgZGV2aWNlX2lkIDogZGV2aWNlSWQsIHRleHQgOiB0ZXh0LCBsdW5jaCA6IGlzTGF1bmNoLCBwbGF0Zm9ybV9pZDogZGVsZWdhdGVObHAgfVxuICAgICAgICAgICAgfSkudGhlbiggZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIHNlbmRNZXNzYWdlIHJlc3BvbnNlLmRhdGEnLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkU2VydmljZURhdGEoIHNlcnZpY2VJZCwgZmlsZSwga2VlcFZhcnMsIGtlZXBDb25maWdzKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgdXBsb2FkU2VydmljZURhdGEoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdmaWxlJywgZmlsZSk7XG4gICAgICAgICAgICB2YXIgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgICAgIGZkLmFwcGVuZChcInNlcnZpY2VfZGVmaW5pdGlvblwiLCBmaWxlKTtcbiAgICAgICAgICAgIGZkLmFwcGVuZChcImtlZXBfdmFyc1wiLCBrZWVwVmFycyk7XG4gICAgICAgICAgICBmZC5hcHBlbmQoXCJrZWVwX2NvbmZpZ3NcIiwga2VlcENvbmZpZ3MpO1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHBcbiAgICAgICAgICAgIC5wb3N0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtaW1wLWV4cC9pbXBvcnQvJyArIHNlcnZpY2VJZCwgZmQsIHsgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiB1bmRlZmluZWQgfX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgdXBsb2FkU2VydmljZURhdGEoKSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9hZFBsYXRmb3JtQ29uZmlnKCBzZXJ2aWNlSWQpIHtcblxuICAgICAgICAgICAgaWYgKCAhc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBsb2FkUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHBcbiAgICAgICAgICAgIC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wbGF0Zm9ybS1jb25maWcvJyArIHNlcnZpY2VJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBsb2FkUGxhdGZvcm1Db25maWcoKSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2VydmljZVBsYXRmb3JtQ29uZmlnKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQpIHtcblxuICAgICAgICAgICAgaWYgKCAhc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdwbGF0Zm9ybUlkJywgcGxhdGZvcm1JZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXBsYXRmb3JtLWNvbmZpZy8nICsgc2VydmljZUlkICsnLycrcGxhdGZvcm1JZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQsIGRhdGEpIHtcblxuICAgICAgICAgICAgaWYgKCAhc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBjcmVhdGVTZXJ2aWNlUGxhdGZvcm1Db25maWcoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdwbGF0Zm9ybUlkJywgcGxhdGZvcm1JZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLnBvc3QoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wbGF0Zm9ybS1jb25maWcvJyArIHNlcnZpY2VJZCArJy8nK3BsYXRmb3JtSWQsIGRhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgY3JlYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCkgcmVzJywgcmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVNlcnZpY2VQbGF0Zm9ybUNvbmZpZyggc2VydmljZUlkLCBwbGF0Zm9ybUlkLCBkYXRhKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgdXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCkgc2VydmljZUlkJywgc2VydmljZUlkLCAncGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHBcbiAgICAgICAgICAgIC5wdXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wbGF0Zm9ybS1jb25maWcvJyArIHNlcnZpY2VJZCArJy8nK3BsYXRmb3JtSWQsIGRhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgdXBkYXRlU2VydmljZVBsYXRmb3JtQ29uZmlnKCkgcmVzJywgcmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByb3BhZ2F0ZVNlcnZpY2VQbGF0Zm9ybSggc2VydmljZUlkLCBwbGF0Zm9ybUlkKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgcHJvcGFnYXRlU2VydmljZVBsYXRmb3JtKCkgc2VydmljZUlkJywgc2VydmljZUlkLCAncGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHBcbiAgICAgICAgICAgIC5wb3N0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcGxhdGZvcm0tcHJvcGFnYXRlLycgKyBzZXJ2aWNlSWQgKycvJytwbGF0Zm9ybUlkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIHByb3BhZ2F0ZVNlcnZpY2VQbGF0Zm9ybSgpIHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRQcm9wYWdhdGVJbmZvKCBzZXJ2aWNlSWQsIHBsYXRmb3JtSWQpIHtcblxuICAgICAgICAgICAgaWYgKCAhc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBnZXRQcm9wYWdhdGVJbmZvKCkgc2VydmljZUlkJywgc2VydmljZUlkLCAncGxhdGZvcm1JZCcsIHBsYXRmb3JtSWQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHBcbiAgICAgICAgICAgIC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1wbGF0Zm9ybS1wcm9wYWdhdGUvJyArIHNlcnZpY2VJZCArJy8nK3BsYXRmb3JtSWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0UHJvcGFnYXRlSW5mbygpIHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRQdWJsaXNoSW5mb3JtYXRpb24oIHNlcnZpY2VJZCkge1xuXG4gICAgICAgICAgICBpZiAoICFzZXJ2aWNlSWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdNaXNzaW5nIHNlcnZpY2UgaWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldFB1Ymxpc2hJbmZvcm1hdGlvbigpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXB1Ymxpc2gvJyArIHNlcnZpY2VJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRQdWJsaXNoSW5mb3JtYXRpb24oKSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBnZXRTZXJ2aWNlVmVyc2lvbnMoIHNlcnZpY2VJZCkge1xuXG4gICAgICAgICAgICBpZiAoICFzZXJ2aWNlSWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdNaXNzaW5nIHNlcnZpY2UgaWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJGxvZy5sb2coICdDb252b3dvcmtzQXBpIGdldFNlcnZpY2VWZXJzaW9ucygpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLmdldCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXZlcnNpb25zLycgKyBzZXJ2aWNlSWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVZlcnNpb25zKCkgcmVzJywgcmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVJlbGVhc2UoIHNlcnZpY2VJZCwgcGxhdGZvcm1JZCwgdHlwZSwgc3RhZ2UpIHtcblxuICAgICAgICAgICAgaWYgKCAhc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnTWlzc2luZyBzZXJ2aWNlIGlkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRsb2cubG9nKCAnQ29udm93b3Jrc0FwaSBjcmVhdGVSZWxlYXNlKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblxuICAgICAgICAgICAgdmFyIGRhdGEgICAgPSAgIHtcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1faWQgOiBwbGF0Zm9ybUlkLFxuICAgICAgICAgICAgICAgICAgICB0eXBlIDogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiBzdGFnZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwXG4gICAgICAgICAgICAucG9zdCggQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9zZXJ2aWNlLXJlbGVhc2VzLycgKyBzZXJ2aWNlSWQsIGRhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvd29ya3NBcGkgY3JlYXRlUmVsZWFzZSgpIHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9tb3RlUmVsZWFzZSggc2VydmljZUlkLCByZWxlYXNlSWQsIHR5cGUsIHN0YWdlKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgcHJvbW90ZVJlbGVhc2UoKSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQpO1xuXG4gICAgICAgICAgICB2YXIgZGF0YSAgICA9ICAge1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlX2lkIDogcmVsZWFzZUlkLFxuICAgICAgICAgICAgICAgICAgICB0eXBlIDogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgc3RhZ2UgOiBzdGFnZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwXG4gICAgICAgICAgICAucHV0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcmVsZWFzZXMvJyArIHNlcnZpY2VJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBwcm9tb3RlUmVsZWFzZSgpIHJlcycsIHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKCBzZXJ2aWNlSWQsIHJlbGVhc2VJZCwgdmVyc2lvbklkKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgaW1wb3J0V29ya2Zsb3dJbnRvUmVsZWFzZSgpIHNlcnZpY2VJZCcsIHNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLnBvc3QoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1yZWxlYXNlcy8nICsgc2VydmljZUlkICsgJy8nICsgcmVsZWFzZUlkICsgJy9pbXBvcnQtd29ya2Zsb3cvJyArIHZlcnNpb25JZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBpbXBvcnRXb3JrZmxvd0ludG9SZWxlYXNlKCkgcmVzJywgcmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNlcnZpY2VSZWxlYXNlcyggc2VydmljZUlkKSB7XG5cbiAgICAgICAgICAgIGlmICggIXNlcnZpY2VJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ01pc3Npbmcgc2VydmljZSBpZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZyggJ0NvbnZvd29ya3NBcGkgZ2V0U2VydmljZVJlbGVhc2VzKCkgc2VydmljZUlkJywgc2VydmljZUlkKTtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwXG4gICAgICAgICAgICAuZ2V0KCBDT05WT19BRE1JTl9BUElfQkFTRV9VUkwgKyAnL3NlcnZpY2UtcmVsZWFzZXMvJyArIHNlcnZpY2VJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSBnZXRTZXJ2aWNlUmVsZWFzZXMoKSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiB1cGxvYWRNZWRpYShzZXJ2aWNlSWQsIGtpbmQsIGZpbGUpIHtcbiAgICAgICAgICAgIGlmICghc2VydmljZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBzZXJ2aWNlIElEXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSB1cGxvYWRNZWRpYSBzZXJ2aWNlSWQnLCBzZXJ2aWNlSWQsICdraW5kJywga2luZCwgJ2ZpbGUnLCBmaWxlKTtcblxuICAgICAgICAgICAgdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgICAgICBmZC5hcHBlbmQoa2luZCwgZmlsZSk7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgLnBvc3QoXG4gICAgICAgICAgICAgICAgQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9tZWRpYS8nICsgc2VydmljZUlkLFxuICAgICAgICAgICAgICAgIGZkLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogdW5kZWZpbmVkIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnQ29udm93b3Jrc0FwaSB1cGxvYWRNZWRpYSByZXMnLCByZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZG93bmxvYWRNZWRpYShzZXJ2aWNlSWQsIG1lZGlhSXRlbUlkKSB7XG4gICAgICAgICAgICByZXR1cm4gQ09OVk9fQURNSU5fQVBJX0JBU0VfVVJMICsgJy9tZWRpYS8nICsgc2VydmljZUlkICsgJy8nICsgbWVkaWFJdGVtSWQgKyAnL2Rvd25sb2FkJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFBhY2thZ2VDb21wb25lbnRIZWxwKHBhY2thZ2VJZCwgZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cFxuICAgICAgICAgICAgICAgIC5nZXQoIENPTlZPX0FETUlOX0FQSV9CQVNFX1VSTCArICcvcGFja2FnZS1oZWxwLycgKyBwYWNrYWdlSWQgKyAnLycgKyBmaWxlbmFtZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdDb252b3dvcmtzQXBpIGdldFBhY2thZ2VDb21wb25lbnRIZWxwKCkgcmVzJywgcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBbGVydFNlcnZpY2UoICRsb2csICR0aW1lb3V0KVxue1xuICAgIHZhciBEVVJBVElPTiAgICA9ICAgNTAwMDtcbiAgICB2YXIgICAgIGFsZXJ0c1NlcnZpY2UgICA9ICAge307XG4gICAgXG4gICAgYWxlcnRzU2VydmljZS5hbGVydHMgICAgPSAgIFtdO1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuZ2V0QWxlcnRzID0gICBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gYWxlcnRzU2VydmljZS5hbGVydHM7XG4gICAgfTtcbiAgICBcbiAgICBhbGVydHNTZXJ2aWNlLmFkZFN1Y2VzcyA9ICAgZnVuY3Rpb24oIG1zZylcbiAgICB7XG4gICAgICAgIGFsZXJ0c1NlcnZpY2UuX2FkZEFsZXJ0KCB7IG1zZyA6IG1zZywgdHlwZSA6ICdzdWNjZXNzJ30sIERVUkFUSU9OKTtcbiAgICB9O1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuYWRkRGFuZ2VyID0gICBmdW5jdGlvbiggbXNnKVxuICAgIHtcbiAgICAgICAgYWxlcnRzU2VydmljZS5fYWRkQWxlcnQoIHsgbXNnIDogbXNnLCB0eXBlIDogJ2Rhbmdlcid9LCBEVVJBVElPTik7XG4gICAgfTtcbiAgICBcbiAgICBhbGVydHNTZXJ2aWNlLmFkZEluZm8gICA9ICAgZnVuY3Rpb24oIG1zZylcbiAgICB7XG4gICAgICAgIGFsZXJ0c1NlcnZpY2UuX2FkZEFsZXJ0KCB7IG1zZyA6IG1zZywgdHlwZSA6ICdpbmZvJ30sIERVUkFUSU9OKTtcbiAgICB9O1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuYWRkV2FybmluZyAgICA9ICAgZnVuY3Rpb24oIG1zZylcbiAgICB7XG4gICAgICAgIGFsZXJ0c1NlcnZpY2UuX2FkZEFsZXJ0KCB7IG1zZyA6IG1zZywgdHlwZSA6ICd3YXJuaW5nJ30sIERVUkFUSU9OKTtcbiAgICB9O1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuX2FkZEFsZXJ0ID0gICBmdW5jdGlvbiggYWxlcnQsIHRpbWVvdXQpXG4gICAge1xuICAgICAgICBhbGVydHNTZXJ2aWNlLmFsZXJ0cy5wdXNoKCBhbGVydCk7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFsZXJ0c1NlcnZpY2UuY2xvc2VBbGVydE9iaiggYWxlcnQpO1xuICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICB9O1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuY2xvc2VBbGVydCAgICA9ICAgZnVuY3Rpb24oIGluZGV4KVxuICAgIHtcbiAgICAgICAgYWxlcnRzU2VydmljZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICAgIFxuICAgIGFsZXJ0c1NlcnZpY2UuY2xvc2VBbGVydE9iaiA9ICAgZnVuY3Rpb24oIGFsZXJ0KVxuICAgIHtcbiAgICAgICAgdmFyIGluZGV4ICAgPSAgIGFsZXJ0c1NlcnZpY2UuYWxlcnRzLmluZGV4T2YoIGFsZXJ0KTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpXG4gICAgICAgICAgICBhbGVydHNTZXJ2aWNlLmNsb3NlQWxlcnQoIGluZGV4KTtcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBhbGVydHNTZXJ2aWNlO1xufTtcblxuIiwiXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9hbGVydC1pbmRpY2F0b3IudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYWxlcnRJbmRpY2F0b3IoIEFsZXJ0U2VydmljZSwgJGxvZykge1xuICAgIFxuICAgICRsb2cubG9nKCdhbGVydEluZGljYXRvciBpbml0Jyk7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGUgOiB0ZW1wbGF0ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKCAkc2NvcGUsICRlbGVtKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRsb2cubG9nKCAnYWxlcnRJbmRpY2F0b3IgbGluaycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkc2NvcGUuZ2V0QWxlcnRzICAgICA9ICAgQWxlcnRTZXJ2aWNlLmdldEFsZXJ0cztcbiAgICAgICAgICAgICRzY29wZS5jbG9zZUFsZXJ0ICAgID0gICBBbGVydFNlcnZpY2UuY2xvc2VBbGVydDtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJpbXBvcnQgYW5ndWxhciBmcm9tICdhbmd1bGFyJztcblxuaW1wb3J0ICcuL2NvbnZvLWNoYXQuY3NzJztcblxuaW1wb3J0IENvbnZvQ2hhdEFwaSBmcm9tICcuL2NvbnZvLWNoYXQtYXBpJztcbmltcG9ydCBjb252b0NoYXRib3ggZnJvbSAnLi9jaGF0Ym94LmRpcmVjdGl2ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGFuZ3VsYXJcbiAgLm1vZHVsZSgnY29udm8uY2hhdCcsIFtdKVxuICAuZGlyZWN0aXZlKCdjb252b0NoYXRib3gnLCBjb252b0NoYXRib3gpXG4gIC5zZXJ2aWNlKCdDb252b0NoYXRBcGknLCBDb252b0NoYXRBcGkpXG4gIC5uYW1lO1xuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDb252b0NoYXRBcGkoICRsb2csICRodHRwLCAkcSwgQ09OVk9fUFVCTElDX0FQSV9CQVNFX1VSTClcbntcbiAgICB0aGlzLnNlbmRNZXNzYWdlID0gc2VuZE1lc3NhZ2U7XG5cbiAgICBmdW5jdGlvbiBzZW5kTWVzc2FnZSggc2VydmljZUlkLCBkZXZpY2VJZCwgdGV4dCwgaXNMYXVuY2gsIHZhcmlhbnQpXG4gICAge1xuICAgICAgICBpZiAoICF2YXJpYW50KSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gICAnZGV2ZWxvcCc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHVybDogQ09OVk9fUFVCTElDX0FQSV9CQVNFX1VSTCArICcvc2VydmljZS1ydW4vd2ViY2hhdC8nICsgdmFyaWFudCArICcvJyArIHNlcnZpY2VJZCxcbiAgICAgICAgICAgIGRhdGEgOiB7IGRldmljZV9pZCA6IGRldmljZUlkLCB0ZXh0IDogdGV4dCwgbHVuY2ggOiBpc0xhdW5jaH1cbiAgICAgICAgfSkudGhlbiggZnVuY3Rpb24gKCByZXNwb25zZSkge1xuICAgICAgICAgICAgJGxvZy5sb2coJ0NvbnZvQ2hhdEFwaSBzZW5kTWVzc2FnZSByZXNwb25zZS5kYXRhJywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL2NoYXRib3gudG1wbC5odG1sJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udm9DaGF0Ym94KCAkbG9nLCAkcSwgJHRpbWVvdXQsIENvbnZvd29ya3NBcGksIENvbnZvQ2hhdEFwaSwgVXNlclByZWZlcmVuY2VzU2VydmljZSkge1xuICAgIFxuICAgICRsb2cubG9nKCdjb252b0NoYXRib3ggaW5pdCcpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlIDogdGVtcGxhdGUsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBkZXZpY2VJZCA6ICc9JyxcbiAgICAgICAgICAgIHNlcnZpY2VJZCA6ICc9JyxcbiAgICAgICAgICAgIGNvbGxhcHNlZCA6ICc9JyxcbiAgICAgICAgICAgIG1vZGUgOiAnPScsXG4gICAgICAgICAgICBuYW1lIDogJz0/JyxcbiAgICAgICAgICAgIHZhcmlhbnQgOiAnPT8nLFxuICAgICAgICAgICAgZGVsZWdhdGVObHAgOiAnPT8nLFxuICAgICAgICAgICAgdG9nZ2xlRGVidWcgOiAnPT8nLFxuICAgICAgICAgICAgZXhjZXB0aW9uIDogJz0/JyxcbiAgICAgICAgICAgIHZhcmlhYmxlcyA6ICc9PydcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oICRzY29wZSwgJGVsZW0sICRhdHRycylcbiAgICAgICAge1xuICAgICAgICAgICAgJGxvZy5sb2coICdjb252b0NoYXRib3ggbGluayAkc2NvcGUuZGV2aWNlSWQnLCAkc2NvcGUuZGV2aWNlSWQsICckc2NvcGUuc2VydmljZUlkJywgJHNjb3BlLnNlcnZpY2VJZCk7XG5cbiAgICAgICAgICAgIC8vICRzY29wZS5jb2xsYXBzZWQgICAgPSAgIHRydWU7XG5cbiAgICAgICAgICAgICRzY29wZS50b2dnbGVEZWJ1ZyAgPSAgIGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgICAgICA9ICAgJyc7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZXMgICAgID0gICBbXTtcblxuICAgICAgICAgICAgdmFyIHNlbmRpbmcgICAgICAgICA9ICAgZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBSRVBST01QVF9USU1FT1VUICAgID0gICAyMCAqIDEwMDA7XG4gICAgICAgICAgICB2YXIgU0VRVUVOQ0VfVElNRU9VVCAgICA9ICAgMiAqIDEwMDA7XG4gICAgICAgICAgICB2YXIgcmVwcm9tcHRfdGltZW91dCAgICA9ICAgbnVsbDtcbiAgICAgICAgICAgIHZhciBzZXF1ZW5jZV90aW1lb3V0ICAgID0gICBudWxsO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkZWxlZ2F0ZU5scCcsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbnZvQ2hhdGJveCAkd2F0Y2ggZGVsZWdhdGVObHAgb2xkIHZhbHVlJywgb2xkVmFsLCAnbmV3IHZhbHVlJywgbmV3VmFsKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIW5ld1ZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRzY29wZS5yZXNldENoYXQoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCd0b2dnbGVEZWJ1ZycsIGZ1bmN0aW9uKG5ld1ZhbCkge1xuXG4gICAgICAgICAgICAgICAgVXNlclByZWZlcmVuY2VzU2VydmljZS5yZWdpc3RlckRhdGEoICd0b2dnbGVEZWJ1ZycsIG5ld1ZhbCk7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ2NvbnZvQ2hhdGJveCAkd2F0Y2ggdG9nZ2xlRGVidWcgbmV3IHZhbHVlJywgbmV3VmFsKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlRGVidWcgPSBuZXdWYWw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgX2luaXQoKTtcblxuICAgICAgICAgICAgdmFyIGlucHV0ICAgICAgICAgICA9ICAgJGVsZW0uZmluZCggJ2lucHV0W3R5cGU9dGV4dF0nKVswXTtcbiAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IGxpbmsgaW5wdXQnLCBpbnB1dCk7XG5cblxuICAgICAgICAgICAgJHNjb3BlLmZvcm1TdWJtaXRlZCA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IGZvcm1TdWJtaXRlZCgpJywgJHNjb3BlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHZhciBtc2cgICAgICAgICAgICAgPSAgICRzY29wZS5tZXNzYWdlO1xuXG4gICAgICAgICAgICAgICAgc2VuZGluZyAgICAgICAgICAgICA9ICAgdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoIG1zZykge1xuICAgICAgICAgICAgICAgICAgICBfYXBwZW5kQnJlYWsoKTtcbiAgICAgICAgICAgICAgICAgICAgX2FwcGVuZFVzZXJNZXNzYWdlKCBtc2cpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9jYW5jZWxNc2dzKCk7XG5cbiAgICAgICAgICAgICAgICBfZ2V0QXBpKCkuc2VuZE1lc3NhZ2UoICRzY29wZS5zZXJ2aWNlSWQsICRzY29wZS5kZXZpY2VJZCwgbXNnLCBmYWxzZSwgJHNjb3BlLnZhcmlhbnQsICRzY29wZS5kZWxlZ2F0ZU5scCkudGhlbiggZnVuY3Rpb24oIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IGZvcm1TdWJtaXRlZCgpIHNlbmRNZXNzYWdlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5tZXNzYWdlICAgICAgPSAgICcnO1xuICAgICAgICAgICAgICAgICAgICBfcmVhZFJlc3BvbnNlKCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBmb3JtU3VibWl0ZWQoKSBzZW5kTWVzc2FnZSgpIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IGZvcm1TdWJtaXRlZCgpIHNlbmRNZXNzYWdlKCkgZmluYWxseScpO1xuICAgICAgICAgICAgICAgICAgICBzZW5kaW5nICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLnJlc2V0Q2hhdCAgICA9ICAgZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IHJlc2V0Q2hhdCgpJyk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubWVzc2FnZXMgICAgID0gICBbXTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWVzc2FnZSAgICAgID0gICAnJztcblxuICAgICAgICAgICAgICAgIF9jYW5jZWxNc2dzKCk7XG4gICAgICAgICAgICAgICAgc2VuZGluZyAgICAgICAgICAgICA9ICAgdHJ1ZTtcblxuICAgICAgICAgICAgICAgIF9nZXRBcGkoKS5zZW5kTWVzc2FnZSggJHNjb3BlLnNlcnZpY2VJZCwgJHNjb3BlLmRldmljZUlkLCAnJywgdHJ1ZSwgJHNjb3BlLnZhcmlhbnQsICRzY29wZS5kZWxlZ2F0ZU5scCkudGhlbiggZnVuY3Rpb24oIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IHJlc2V0Q2hhdCgpIHNlbmRNZXNzYWdlKCkgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIF9yZWFkUmVzcG9uc2UoIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiggcmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IHJlc2V0Q2hhdCgpIHNlbmRNZXNzYWdlKCkgcmVhc29uJywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICB9KS5maW5hbGx5KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b0NoYXRib3ggcmVzZXRDaGF0KCkgc2VuZE1lc3NhZ2UoKSBmaW5hbGx5Jyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRpbmcgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzY29wZS5mb3JtRGlzYWJsZWQgPSAgIGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VuZGluZyB8fCAkc2NvcGUubWVzc2FnZS50cmltKCkgPT0gJyc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuaXNTZW5kaW5nICAgID0gICBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbmRpbmc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfaW5pdCgpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b0NoYXRib3ggX2luaXQoKScpO1xuICAgICAgICAgICAgICAgIHNlbmRpbmcgICAgICAgICAgICAgPSAgIHRydWU7XG5cbiAgICAgICAgICAgICAgICBfZ2V0QXBpKCkuc2VuZE1lc3NhZ2UoICRzY29wZS5zZXJ2aWNlSWQsICRzY29wZS5kZXZpY2VJZCwgJycsIHRydWUsICRzY29wZS52YXJpYW50LCAkc2NvcGUuZGVsZWdhdGVObHApLnRoZW4oIGZ1bmN0aW9uKCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfaW5pdCgpIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBfcmVhZFJlc3BvbnNlKCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oIHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfaW5pdCgpIHJlYXNvbicsIHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfSkuZmluYWxseSggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IF9pbml0KCkgZmluYWxseScpO1xuICAgICAgICAgICAgICAgICAgICBzZW5kaW5nICAgICAgICAgICAgID0gICBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIFVzZXJQcmVmZXJlbmNlc1NlcnZpY2UuZ2V0RGF0YSggJ3RvZ2dsZURlYnVnJykudGhlbiggZnVuY3Rpb24oIHRvZ2dsZURlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCAnY29udm9DaGF0Ym94IGdldERhdGEoKSB0b2dnbGVEZWJ1ZycsIHRvZ2dsZURlYnVnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvZ2dsZURlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlRGVidWcgPSB0b2dnbGVEZWJ1ZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfcmVhZFJlc3BvbnNlKCBkYXRhKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIF9hcHBlbmRCcmVhaygpO1xuICAgICAgICAgICAgICAgIF9hcHBlbmRTZXF1ZW5jZSggZGF0YS50ZXh0X3Jlc3BvbnNlcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV4Y2VwdGlvbiA9IGRhdGEuZXhjZXB0aW9uO1xuICAgICAgICAgICAgICAgICRzY29wZS52YXJpYWJsZXMgPSBkYXRhLnZhcmlhYmxlcztcbiAgICAgICAgICAgICAgICBpZiAoIGRhdGEudGV4dF9yZXByb21wdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcHJvbXB0X3RpbWVvdXQgICAgPSAgICR0aW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hcHBlbmRCcmVhaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FwcGVuZFNlcXVlbmNlKCBkYXRhLnRleHRfcmVwcm9tcHRzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgUkVQUk9NUFRfVElNRU9VVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBfYXBwZW5kU2VxdWVuY2UoIG1zZ3MsIGltbWVkaWF0ZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoIGltbWVkaWF0ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbXNnID0gICBtc2dzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIF9hcHBlbmRDb252b1Jlc3BvbnNlKCBbbXNnXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCBtc2dzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZXF1ZW5jZV90aW1lb3V0ICAgID0gICAkdGltZW91dCggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbXNnID0gICBtc2dzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXBwZW5kQ29udm9SZXNwb25zZSggW21zZ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBtc2dzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hcHBlbmRTZXF1ZW5jZSggbXNncywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBTRVFVRU5DRV9USU1FT1VUKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2NhbmNlbE1zZ3MoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCggcmVwcm9tcHRfdGltZW91dCApO1xuICAgICAgICAgICAgICAgIHJlcHJvbXB0X3RpbWVvdXQgICAgPSAgIG51bGw7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKCBzZXF1ZW5jZV90aW1lb3V0ICk7XG4gICAgICAgICAgICAgICAgc2VxdWVuY2VfdGltZW91dCAgICA9ICAgbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2FwcGVuZEJyZWFrKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWVzc2FnZXMucHVzaCgge1xuICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ2JyZWFrJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2FwcGVuZENvbnZvUmVzcG9uc2UoIG1zZ3MpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfYXBwZW5kQ29udm9SZXNwb25zZSgpJywgbXNncyk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7aTxtc2dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5tZXNzYWdlcy5wdXNoKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0IDogbXNnc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZSA6ICdjb252bycsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmF0YXI6ICdpbWcvcGJ0b3VyLWF2YXRhci1wYi5wbmcnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gX2FwcGVuZFVzZXJNZXNzYWdlKCBtc2cpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBfYXBwZW5kVXNlck1lc3NhZ2UoKScsIG1zZyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLnB1c2goIHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA6IG1zZyxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlIDogJ3VzZXInLFxuICAgICAgICAgICAgICAgICAgICBhdmF0YXI6ICdpbWcvcGJ0b3VyLWF2YXRhci1tZS5wbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIF9nZXRBcGkoKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmICggJHNjb3BlLm1vZGUgPT0gJ3B1YmxpYycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnZvQ2hhdEFwaTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCAkc2NvcGUubW9kZSA9PSAnYWRtaW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBDb252b3dvcmtzQXBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ1Vua25vd24gbW9kZSBbJyskc2NvcGUubW9kZSsnXScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQU5JTUFURSBTQ1JPTExcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCAnbWVzc2FnZXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCAkd2F0Y2hDb2xsZWN0aW9uKCknKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b0NoYXRib3ggcXVldWUoKScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGxpc3QgICAgICAgICAgID0gICAkZWxlbS5maW5kKCAnI2NoYXQtcGFuZWwtYm9keScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsSGVpZ2h0ICAgID0gICAkbGlzdC5wcm9wKCAnc2Nyb2xsSGVpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgICRsaXN0LmFuaW1hdGUoIHsgc2Nyb2xsVG9wIDogc2Nyb2xsSGVpZ2h0fSwgNTAwKTtcbiAgICAgICAgICAgICAgICB9LDEwKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGT0NVU1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5pc1NlbmRpbmcoKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCBzZW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coICdjb252b0NoYXRib3ggJHdhdGNoKCkgc2VuZGluZycsIHNlbmRpbmcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZyggJ2NvbnZvQ2hhdGJveCBpbnB1dC5mb2N1cygpJyk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSwxMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbiIsImltcG9ydCBhcHBNb2R1bGUgZnJvbSAnLi9hcHAubW9kdWxlJztcblxuaW1wb3J0ICdhbmd1bGFyLWxvY2FsLXN0b3JhZ2UnO1xuXG5pbXBvcnQgJy4vYXBwLnJvdXRlJztcblxuaW1wb3J0ICcuL3N0eWxlLmNzcyc7XG5cbi8vaW1wb3J0ICdhbmd1bGFyLXJvdXRlJztcbi8vaW1wb3J0ICdhbmd1bGFyLWFuaW1hdGUnO1xuLy9pbXBvcnQgJ2FuZ3VsYXItYm9vdHN0cmFwLWNvbnRleHRtZW51Jztcbi8vaW1wb3J0ICdhbmd1bGFyLWNvb2tpZXMnO1xuLy9pbXBvcnQgJ2FuZ3VsYXItc2FuaXRpemUnO1xuLy9pbXBvcnQgJ2FuZ3VsYXJqcy11aS1ib290c3RyYXAnO1xuLy9pbXBvcnQgJ25nLWZpbGUtdXBsb2FkJztcblxuXG5leHBvcnQgZGVmYXVsdCBhcHBNb2R1bGVcbiAgICAuY29uZmlnKCBmdW5jdGlvbiAoIGxvY2FsU3RvcmFnZVNlcnZpY2VQcm92aWRlcikge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZVByb3ZpZGVyXG4gICAgICAgIC5zZXRQcmVmaXgoICdjb252b0FkbWluJylcbi8vICAgICAgLnNldFN0b3JhZ2VUeXBlKCAnc2Vzc2lvblN0b3JhZ2UnKVxuICAgICAgICAuc2V0Tm90aWZ5KCB0cnVlLCB0cnVlKVxuICAgIH0pXG4gICAgLm5hbWU7XG4iLCJpbXBvcnQgYW5ndWxhciBmcm9tICdhbmd1bGFyJztcblxuaW1wb3J0ICdhbmd1bGFyLWxvY2FsLXN0b3JhZ2UnO1xuXG5pbXBvcnQgJ2FuZ3VsYXItcm91dGUnO1xuaW1wb3J0ICdhbmd1bGFyLWFuaW1hdGUnO1xuaW1wb3J0ICdhbmd1bGFyLWJvb3RzdHJhcC1jb250ZXh0bWVudSc7XG5pbXBvcnQgJ2FuZ3VsYXItY29va2llcyc7XG5pbXBvcnQgJ2FuZ3VsYXItc2FuaXRpemUnO1xuaW1wb3J0ICdhbmd1bGFyanMtdWktYm9vdHN0cmFwJztcbmltcG9ydCAnbmctZmlsZS11cGxvYWQnO1xuXG5pbXBvcnQgY29udm9Db21tb24gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IGNvbnZvQ2hhdCBmcm9tICcuL2NoYXRib3gnO1xuaW1wb3J0IGNvbnZvRWRpdG9yIGZyb20gJy4vZWRpdG9yJztcbmltcG9ydCBjb252b1NlcnZpY2VzIGZyb20gJy4vc2VydmljZXMnO1xuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyXG4gICAgLm1vZHVsZSgnY29udm8nLCBbIFxuICAgICAgICBjb252b0NvbW1vbixcbiAgICAgICAgY29udm9DaGF0LFxuICAgICAgICBjb252b0VkaXRvcixcbiAgICAgICAgY29udm9TZXJ2aWNlcyxcbiAgICAgICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXG4gICAgICAgICd1aS5ib290c3RyYXAnLCAndWkuYm9vdHN0cmFwLmNvbnRleHRNZW51JyxcbiAgICAgICAgJ25nU2FuaXRpemUnLCAnbmdSb3V0ZScsICduZ0FuaW1hdGUnLCAnbmdDb29raWVzJywgXG4gICAgICAgICduZ0ZpbGVVcGxvYWQnXG4gICAgXSk7XG4iXX0=
