(function () {
    angular
        .module('convo.editor')
        .directive('configAmazonEditor', configAmazonEditor);

    function configAmazonEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/config-amazon-editor.tmpl.html',
            controller: function ($scope) {

            },
            link: function ($scope, $element, $attributes) {

            	var user	=	null;
            	
            	LoginService.getUser().then( function ( u) {
            		user = u;
            	});
            	
                $scope.config = {
                    mode: 'manual',
                    invocation: $scope.service.name,
                    app_id: null,
                    auto_display: false
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;

                
                _load();

                $scope.$watch('config.auto_display', function(newVal) {
                    if (newVal !== undefined) {
                        $log.log('configAmazonEditor $watch config.auto_display new value', $scope.config);
                        $scope.config.auto_display = newVal;
                    }
                });

				$scope.getConfigUrl = function() {
					return 'https://developer.amazon.com/alexa/console/ask/publish/alexapublishing/' + $scope.config.app_id + '/development/en_US/skill-info'
				}

                $scope.isModeValid	= function () {
                	return !( $scope.config.mode === 'auto' && !user.amazon_account_linked);
                }
                
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
                	$log.debug('configAmazonEditor update() $scope.config', $scope.config);
                	
                	if ( is_new) {
                		ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_new		=	false;
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configAmazonEditor create() response', response);
                            is_error	=	true;
                            throw new Error("Can't create config for Amazon. " + response.data.message)
                        });                		
                	} else {
                		ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'amazon', $scope.config).then(function (data) {
                            configBak = angular.copy( $scope.config);
                            is_error	=	false;
                            $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                        }, function ( response) {
                            $log.debug('configAmazonEditor update() response', response);
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
                	ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'amazon').then(function (data) {
                        $scope.config = data;
                        configBak = angular.copy( $scope.config);
                        is_new	=	false;
                        is_error	=	false;
                    }, function ( response) {
                        $log.debug('configAmazonEditor loadPlatformConfig() response', response);
                        
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