
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