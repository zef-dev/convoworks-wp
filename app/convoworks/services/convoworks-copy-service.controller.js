/* @ngInject */
export default function ConvoworksCopyServiceController($scope, $log, $uibModalInstance, $state, $timeout, $document, AlertService, ConvoworksApi, serviceId, serviceName)
{
    $scope.serviceName = serviceName;
    $scope.newServiceName = '';
    $scope.copying = false;

    // Focus on input after modal opens
    $timeout(() => {
        const input = $document.find('#newServiceName');
        if (input.length) {
            input.focus();
        }
    }, 150);

    $scope.submitDisabled = function() {
        if ($scope.copying) {
            return true;
        }
        if (!$scope.newServiceName) {
            return true;
        }
        return $scope.newServiceName.trim().length === 0 || $scope.newServiceName.trim().length > 50;
    }

    $scope.copy = function()
    {
        if ($scope.submitDisabled()) {
            return;
        }

        $scope.copying = true;

        ConvoworksApi.copyService(serviceId, $scope.newServiceName.trim()).then(function(newService) {
            $log.log('ConvoworksCopyServiceController copy() success', newService);

            // Close modal first
            $uibModalInstance.close(newService);

            // Navigate to the new service after a short delay to ensure modal is closed
            $timeout(() => {
                if (newService && newService.service_id) {
                    $state.go('convoworks-editor-service.editor', { service_id: newService.service_id });
                }
            }, 100);

            AlertService.addSuccess('Service copied successfully.');
        }, function (reason) {
            $log.error('ConvoworksCopyServiceController copy() failed', reason);
            $scope.copying = false;
            const errorMessage = (reason.data && reason.data.message) || 'Failed to copy service.';
            AlertService.addDanger(errorMessage);
        });
    };

    $scope.cancel = function()
    {
        $uibModalInstance.dismiss('cancel');
    }
}

