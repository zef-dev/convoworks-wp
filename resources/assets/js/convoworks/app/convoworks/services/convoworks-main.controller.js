
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
