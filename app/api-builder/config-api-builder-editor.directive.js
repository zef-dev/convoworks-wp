import template from './config-api-builder-editor.tmpl.html';

/* @ngInject */
export default function configApiBuilderEditor($log, $q, $rootScope, ConvoworksApi, LoginService, AlertService) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function ($scope) {
            'ngInject';
        },
        link: function ($scope, $element, $attributes) {

            $scope.config = {
                special_role: 'api-handler',
                time_created: 0,
                time_updated: 0
            };

            var configBak   =   angular.copy( $scope.config);
            var is_new      =   true;

            _load();

            $scope.isNew    = function () {
                return is_new;
            }

            $scope.updateConfig = function () {

                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo-api-builder', $scope.config).then(function (data) {
                        $log.debug('configApiBuilderEditor create() $scope.config', $scope.config);
                        is_new          =   false;
                        configBak       =   data;
                        $scope.config   =   angular.copy( configBak);
                        AlertService.addSuccess(`API Builder configuration for ${$scope.service.service_id} created successfully.`);
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-api-builder', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configApiBuilderEditor create() response', response);
                        throw new Error(`Can't create config for API Builder. ${response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo-api-builder', $scope.config).then(function (data) {
                        $log.debug('configApiBuilderEditor update() $scope.config', $scope.config);
                        configBak       =   data;
                        $scope.config   =   angular.copy( configBak);
                        AlertService.addSuccess('API Builder config updated');
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-api-builder', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configApiBuilderEditor update() response', response);
                        throw new Error(`Can't update config for API Builder. ${response.data.message}`);
                    });
                }
            }

            $scope.deleteConfig = function () {
                if ( !confirm( 'Do you really want to disable API Builder?')) {
                    return;
                }
                ConvoworksApi.deleteServicePlatformConfig( $scope.service.service_id, 'convo-api-builder').then(function (data) {
                    $log.debug('configApiBuilderEditor deleteConfig() $scope.config');
                    
                    $scope.config = {
                        time_created: 0,
                        time_updated: 0
                    };
        
                    configBak   =   angular.copy( $scope.config);
                    is_new      =   true;
                    
                    AlertService.addSuccess('API Builder config deleted');
                    $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-api-builder', platform_config: $scope.config});
                }, function ( response) {
                    $log.debug('configApiBuilderEditor deleteConfig() response', response);
                    throw new Error(`Can't delete config for API Builder. ${response.data.message}`);
                });
            }

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                return !angular.equals( configBak, $scope.config);
            }

            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo-api-builder').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                }, function ( response) {
                    $log.debug('configApiBuilderEditor loadPlatformConfig() response', response);

                    if ( response.status === 404) {
                        is_new      =   true
                        return;
                    }
                });
            }
        }
    }
}
