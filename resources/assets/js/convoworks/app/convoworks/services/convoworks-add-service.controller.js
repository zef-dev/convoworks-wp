

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
