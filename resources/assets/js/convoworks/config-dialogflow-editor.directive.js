(function () {
    angular
        .module('adomee.admin')
        .directive('configDialogflowEditor', configDialogflowEditor);

    function configDialogflowEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/config-dialogflow-editor.tmpl.html',
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

            	var user	=	null;
            	
            	LoginService.getUser().then( function ( u) {
            		user = u;
            	});
            	
                $scope.config = {
            		mode: 'manual',
                    serviceAccount: null,
                    name: null,
                    description: null,
                    avatar: null
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;

                
                _load();

               
                
                $scope.isNew	= function () {
                	return is_new;
                }
                
                $scope.hideAll	= function () {
                	return !has_started && is_new;
                }
                
                $scope.start	= function () {
                	has_started = true;
                }

                $scope.cancel = function () {
                	has_started = false;
                }
                
                $scope.updateConfig = function () {
                	$log.debug('configDialogflowEditor update() $scope.config', $scope.config);
                	
                	if ( is_new) {
                		ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'dialogflow', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_new		=	false;
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configDialogflowEditor create() response', response);
                            is_error	=	true;
                        });                		
                	} else {
                		ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'dialogflow', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configDialogflowEditor update() response', response);
                            is_error	=	true;
                        });                		
                	}
                }
                
                

                $scope.revertConfig = function () {
                    $scope.config = angular.copy(configBak);
                }
                

                $scope.isConfigChanged = function () {
                    return !angular.equals( configBak, $scope.config);
                }
                
                function _load()
                {
                	ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'dialogflow').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new	=	false;
                        is_error	=	false;
                    }, function ( response) {
                        $log.debug('configDialogflowEditor loadPlatformConfig() response', response);
                        
                        if ( response.status === 404) {
                        	is_new		=	true
                        	is_error	=	false;
                        	return;;	
                        }
                        is_error	=	true;
                    });
                }
                
                
            }
        }
    }

})();