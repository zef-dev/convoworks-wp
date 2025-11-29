import template from './subroutine-component.tmpl.html';

/* @ngInject */
export default function subroutineComponent( $log, $timeout, ConvoworksApi)
    {
        return {
            restrict: 'E',
            scope: { 'block' : '='},
            require: '^serviceContext',
            template: template,
            link: function( $scope, $element, $attributes, serviceContext) {

                // API
                $scope.over                 =   false;
                $scope.ready                =   false;
                $scope.previewing           =   false;
                $scope.componentTitle       =   "";
                $scope.componentName        =   "";

                $scope.getComponentTitle    =   function() {
                    if ( !$scope.definition) {
                        return 'Generating title ...';
                    }

                    if ( $scope.block.properties.name) {
                        return $scope.block.properties.name;
                    }

                    return 'Fragment - ' + $scope.block.properties.fragment_id + '';
                };

                $scope.getComponentNamespace = () => $scope.block.namespace;

                $scope.isSelected   =   function() {
                    return serviceContext.getSelection().component === $scope.block;
                };

                $scope.toggleOpen   =   function( type) {
                    open[type]  =   !open[type];
                };

                $scope.isOpen   =   function( type) {
                    return open[type];
                };

                $scope.getService       =   function()
                {
                    return serviceContext.getSelectedService();
                }

                $scope.togglePreviewing =   function()
                {
                    $scope.previewing   =   !$scope.previewing;
                }

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
                var open;

                $scope.$watch( 'block.properties._component_id', function ( b) {
                    _init();
                });

                function _init()
                {
                    $scope.ready                =   false;
                    open    =   {
                        elements : false,
                        processors : false,
                    };
//                  $log.log( 'subroutineComponent _init() got ', '$scope.block.properties.subroutine_id ['+$scope.block.properties.subroutine_id+']', '$scope.block', $scope.block);

                    var serviceId = serviceContext.getSelectedService()['service_id'];
                    $log.log('subroutineComponent going to get definition', serviceId);

                    try {
                        $scope.definition       =   serviceContext.getComponentDefinition( $scope.block.class);
                    } catch ( err) {
                        $log.error( err);
                        $scope.componentTitle   =   err.message;
                        $scope.definition       =   null;
                    }

                    $scope.componentName        =   $scope.block.properties.name;
                    $scope.componentTitle       =   'Fragment - ' + $scope.block.properties.fragment_id + '';

                    if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Elements\\ElementsFragment') {
                        $scope.propertyName         =   'elements';
                    } else if ( $scope.block.class == '\\Convo\\Pckg\\Core\\Processors\\ProcessorFragment') {
                        $scope.propertyName         =   'processors';
                    } else {
                        throw new Error( 'Unexpected subroutine type ['+$scope.block.properties._workflow+']');
                    }

                    $scope.propertyDefinition   =   $scope.definition.component_properties[$scope.propertyName];

                    $scope.$applyAsync( function() {
                        $scope.ready            =   true;
                    });
                }

                $timeout( function() {
                    _initClick();
                }, 100);

                function _initClick()
                {
                    var $div    =   $element.find( 'div.selectable-component')[0];

                    var containerController =   {
                        deleteSelectedComponent: function() { serviceContext.removeSubroutine( $scope.block.properties.fragment_id); }
                    };


                    $($div).bind( 'click', function( event) {
                        $scope.$apply( function () {
                            if ( $scope.isSelected()) {
                                serviceContext.setSelectedComponent( null);
                            } else {
                                serviceContext.setSelectedComponent( $scope.block, containerController);
                            }
                            event.stopPropagation();
                        });
                    });
                }
            }
        }
    };
