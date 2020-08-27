
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