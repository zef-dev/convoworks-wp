
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
