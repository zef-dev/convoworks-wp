
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
