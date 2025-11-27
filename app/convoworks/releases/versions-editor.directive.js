import template from './versions-editor.tmpl.html';

/* @ngInject */
export default function versionsEditor( $log, $rootScope, $window, ConvoworksApi, AlertService)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        require: '^serviceContext',
        template: template,
        controller: function( $scope) {
            'ngInject';
        },
        link: function( $scope, $element, $attributes, serviceContext) {

            $log.log( 'versionsEditor link');

            // Load accordion state from localStorage
            const storageKey = 'convoworks_versions_accordion_' + $scope.service.service_id;
            let savedExpanded = true;
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved !== null) {
                    savedExpanded = JSON.parse(saved);
                }
            } catch (e) {
                $log.warn('Failed to load versions accordion state from localStorage', e);
            }

            $scope.expanded = savedExpanded;
            $scope.versions = [];

            // Watch for changes and save to localStorage
            $scope.$watch('expanded', function(newVal) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(newVal));
                } catch (e) {
                    $log.warn('Failed to save versions accordion state to localStorage', e);
                }
            });

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
