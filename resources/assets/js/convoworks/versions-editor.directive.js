(function() {
    angular
        .module( 'adomee.admin')
        .directive( 'versionsEditor', versionsEditor);

        /* @ngInject */
    function versionsEditor( $log, $rootScope, ConvoworksApi, CONVO_ADMIN_API_BASE_URL)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/versions-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes, propertiesContext) {

            	$log.log( 'versionsEditor link');
            	
            	$scope.versions	=	[];
            	
            	$rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
                    _load();
                });
            	
            	_load();
            	
            	function _load()
            	{
            		ConvoworksApi.getServiceVersions( $scope.service.service_id).then( function ( versions) {
                		$scope.versions	=	versions;
                	}, function ( reason) {
                		$log.log( 'versionsEditor getServiceVersions reason', reason);
                	});            		
            	}
            	
            	
            }
        }
    }

})();