import template from './config-wp-hooks-editor.tmpl.html';

/* @ngInject */
export default function configWpHooksEditor($log, $q, $rootScope, ConvoworksApi, LoginService, AlertService) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        controller: function ($scope) {
            'ngInject';
        },
        link: function ($scope, $element, $attributes) {

            $scope.config = {
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
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks', $scope.config).then(function (data) {
                        $log.debug('configWpHooksEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        $scope.config.time_created = data.time_created;
                        $scope.config.time_updated = data.time_created;
                        AlertService.addSuccess(`WordPress Hooks configuration for ${$scope.service.service_id} created successfully.`);
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-wp-hooks.hooks', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configWpHooksEditor create() response', response);
                        throw new Error(`Can't create config for WordPress Hooks. ${response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks', $scope.config).then(function (data) {
                        $log.debug('configWpHooksEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        $scope.config.time_created = data.time_created;
                        $scope.config.time_updated = data.time_updated;
                        AlertService.addSuccess('WordPress Hooks config updated');
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-wp-hooks.hooks', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configWpHooksEditor update() response', response);
                        throw new Error(`Can't update config for WordPress Hooks. ${response.data.message}`);
                    });
                }
            }



            $scope.deleteConfig = function () {
                ConvoworksApi.deleteServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks').then(function (data) {
                    $log.debug('configWpHooksEditor deleteConfig() $scope.config');
                    
                    $scope.config = {
                        time_created: 0,
                        time_updated: 0
                    };
        
                    configBak   =   angular.copy( $scope.config);
                    is_new      =   true;
                    
                    AlertService.addSuccess('WordPress Hooks config deleted');
                    $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-wp-hooks.hooks', platform_config: $scope.config});
                }, function ( response) {
                    $log.debug('configWpHooksEditor deleteConfig() response', response);
                    throw new Error(`Can't delete config for WordPress Hooks. ${response.data.message}`);
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
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                }, function ( response) {
                    $log.debug('configWpHooksEditor loadPlatformConfig() response', response);

                    if ( response.status === 404) {
                        is_new      =   true
                        return;
                    }
                });
            }
        }
    }
}
