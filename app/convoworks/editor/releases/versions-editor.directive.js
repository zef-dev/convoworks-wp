import template from './versions-editor.tmpl.html';

/* @ngInject */
export default function versionsEditor( $log, $rootScope, $window, ConvoworksApi, AlertService)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        require: '^propertiesContext',
        template: template,
        controller: function( $scope) {
            'ngInject';
        },
        link: function( $scope, $element, $attributes, propertiesContext) {

            $log.log( 'versionsEditor link');

            $scope.expanded = true;
            $scope.versions = [];

            $scope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
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

            $scope.importToDevelop = function( row)
            {
                if ($window.confirm(`Are you sure you want to import version [${row['version_id']}] into develop?`)) {
                    ConvoworksApi.importWorkflowIntoDevelop(
                        $scope.service.service_id,
                        row['version_id'],
                        row
                    ).then(function () {
                        _load();
                        $rootScope.$broadcast('ServiceReleaseDevelopImport');
                        AlertService.addSuccess( 'Version ['+row['version_id']+'] imported to develop');
                    }, function (reason) {
                        AlertService.addDanger( reason);
                        $log.log('releaseEditor importToDevelop rejected', reason);
                    })
                }
            }
        }
    }
};
