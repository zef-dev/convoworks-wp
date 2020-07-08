(function () {
    angular
        .module('convo.editor')
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
					projectId: null,
                    serviceAccount: null,
                    name: null,
                    description: null,
                    avatar: null
                };

                var configBak 	= 	angular.copy( $scope.config);
                var is_new		=	true;
                var is_error	=	false;
                var has_started	=	false;
				var logline		=	'';

                
                _load();

				var preparedUpload = null;
				var previousMediaItemId = null;
                
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

                $scope.getConfigUrl = function() {
                	return 'https://console.actions.google.com/project/' + $scope.config.projectId + '/directoryinformation/'
				}

                $scope.updateConfig = function () {
					$log.debug('configDialogflowEditor update() $scope.config', $scope.config);

					var maybeUpload = preparedUpload ?
						ConvoworksApi.uploadMedia(
							$scope.service.service_id,
							'dialogflow.avatar',
							preparedUpload.file) :
						null;

					$q.when(maybeUpload).then(function (res) {
						if (res && res.mediaItemId) {
							$scope.config.avatar = res.mediaItemId;
							preparedUpload = null;
						}

						if (is_new) {
							return ConvoworksApi.createServicePlatformConfig(
								$scope.service.service_id,
								'dialogflow',
								$scope.config
							).then(function (data) {
								configBak = angular.copy( $scope.config);
								logline = 'configDialogflowEditor create() response';
								is_new = false;
								$rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
							}, function (response) {
								$log.debug('configDialogflowEditor create() response', response);
								is_error	=	true;
								throw new Error("Can't create config for Dialogflow. " + response.data.message)
							});
						}

						logline = 'configDialogflowEditor update() response';
						return ConvoworksApi.updateServicePlatformConfig(
							$scope.service.service_id,
							'dialogflow',
							$scope.config
						);
					}).then(function (data) {
						configBak = angular.copy($scope.config);
						is_error = false;
						$rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
					}, function (response) {
						$log.debug(logline, response);
						is_error = true;
					});
				}

                $scope.revertConfig = function () {
					if (preparedUpload) {
						preparedUpload = null;
					}

					if (previousMediaItemId) {
						previousMediaItemId = null;
					}

                    $scope.config = angular.copy(configBak);
                }

				$scope.onFileUpload = function (file) {
					$log.log('ConfigurationsEditor onFileUpload file', file);

					preparedUpload = {
						file: file
					};

					previousMediaItemId = $scope.config.avatar;
					$scope.config.avatar = 'tmp_upload_ready';
				}

				$scope.getMedia = function(type) {
					var mediaItemId = $scope.config[type];

					if (!mediaItemId) {
						return '';
					}

					if (mediaItemId === 'tmp_upload_ready') {
						mediaItemId = previousMediaItemId;
					}

//					$log.log('ConfigurationsEditor getMedia(', type, ') mediaItemId', mediaItemId);

					return ConvoworksApi.downloadMedia($scope.service.service_id, mediaItemId);
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
                        	return;
                        }
                        is_error	=	true;
                    });
                }
            }
        }
    }

})();