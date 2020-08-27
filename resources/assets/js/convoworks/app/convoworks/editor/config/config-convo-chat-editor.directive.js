
import template from './config-convo-chat-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function ($scope) {

        },
        link: function ($scope, $element, $attributes) {

            var user    =   null;
            
            LoginService.getUser().then( function ( u) {
                user = u;
            });
            
            $scope.config = {
                delegateNlp: null
            };

            var configBak   =   angular.copy( $scope.config);
            var is_new      =   true;
            var is_error    =   false;
            var has_started =   false;

            
            _load();

            $scope.getIntentNlps    = function () {
                return ['dialogflow'];
            }
            
            $scope.isNew    = function () {
                return is_new;
            }
            
            $scope.hideAll  = function () {
                return !has_started && is_new;
            }
            
            $scope.start    = function () {
                has_started = true;
            }

            $scope.cancel = function () {
                has_started = false;
            }
            
            $scope.updateConfig = function () {
                
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor create() response', response);
                        is_error    =   true;
                        throw new Error("Can't create config for Convo. " + response.data.message)
                    });                     
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo_chat', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor update() response', response);
                        is_error    =   true;
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
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo_chat').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configConvoChatEditor loadPlatformConfig() response', response);
                    
                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;    
                    }
                    is_error    =   true;
                });
            }
        }
    }
}