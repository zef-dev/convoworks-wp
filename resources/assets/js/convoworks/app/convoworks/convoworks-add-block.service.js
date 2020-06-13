(function() {

	var module = angular.module('adomee.admin');

	module.service( 'ConvoworksAddBlockService', ConvoworksAddBlockService);

	/* @ngInject */
	function ConvoworksAddBlockService( $log, $uibModal) {

		this.showModal				=	showModal;
		this.showSubroutineModal	=	showSubroutineModal;
		
		function showModal( service, type, propertiesContext)
		{
			var modalInstance = $uibModal.open({
				templateUrl: '/app/convoworks/convoworks-add-block.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: {
					service: function () {
						return service;
					},
					type: function () {
						return type;
					},
					subroutineType: function () {
						return null;
					},
					propertiesContext: function () {
						return propertiesContext;
					},
				}
			});
		}


		function showSubroutineModal( service, propertiesContext, subroutineType)
		{
			var modalInstance = $uibModal.open({
				templateUrl: '/app/convoworks/convoworks-add-block.tmpl.html',
				controller: ModalInstanceCtrl,
				size : 'md',
				resolve: {
					service: function () {
						return service;
					},
					type: function () {
						return 'reader';
					},
					subroutineType: function () {
						return subroutineType;
					},
					propertiesContext: function () {
						return propertiesContext;
					},
				}
			});
		}

		
		/* @ngInject */
		var ModalInstanceCtrl = function ( $scope, $timeout, $uibModalInstance, service, type, subroutineType, propertiesContext) {

			$scope.service			=	service;

			$scope.block			=	{
					name : '',
			};
			
			if ( type == 'user') 
			{
				$scope.title			=	'Add new step';
				$scope.description		=	'Create a new step in rhe conversation workflow.';
				$scope.block.name		=	'My new conversation step';
				
				$scope.createBlock 			= 	function () {
					$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
					propertiesContext.addBlock( $scope.block.name);
					$uibModalInstance.dismiss('cancel');
				};
			} 
			else if ( type == 'reader') 
			{
				if ( subroutineType == 'read') 
				{
					$scope.title			=	'Add new read fragment';
					$scope.description		=	'Create new fragment which can be invoked from conversation elemets';
					$scope.block.name		=	'My new read fragment';
				
					$scope.createBlock 			= 	function () {
						$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
						propertiesContext.addReadSubroutine( $scope.block.name);
						$uibModalInstance.dismiss('cancel');
					};
				}
				else if ( subroutineType == 'process')
				{
					$scope.title			=	'Add new process fragment';
					$scope.description		=	'Create new fragment which can be invoked from conversation processors';
					$scope.block.name		=	'My new process fragment';

									
					$scope.createBlock 			= 	function () {
						$log.warn( 'ConvoworksAddBlockService ModalInstanceCtrl createBlock() $scope.block', $scope.block);
						propertiesContext.addProcessSubroutine( $scope.block.name);
						$uibModalInstance.dismiss('cancel');
					};
				}
				else
				{
					throw new Error( 'Unexpected subroutineType ['+subroutineType+']');
				}


				
			} 
			else 
			{
				throw new Error( 'Unexpected type ['+type+']');
			}
			

			$scope.cancel 			= 	function () {
				$uibModalInstance.dismiss('cancel');
			};
			
		};
	};
})();