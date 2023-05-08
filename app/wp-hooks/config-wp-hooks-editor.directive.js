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

            var user    =   null;

            LoginService.getUser().then( function ( u) {
                user = u;
            });

            $scope.config = {
                delegateNlp: null,
                time_created: 0,
                time_updated: 0
            };

            $scope.intentNlps  =   [
                {
                    label: '---',
                    value: null
                }
            ];

            var configBak   =   angular.copy( $scope.config);
            var is_new      =   true;
            var is_error    =   false;

            _load();
            _initIntentNlps();

            $scope.getIntentNlps    = function () {
                return $scope.intentNlps;
            }

            $scope.isNew    = function () {
                return is_new;
            }

            $scope.updateConfig = function () {

                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks', $scope.config).then(function (data) {
                        $log.debug('configWpHooksEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $scope.config.time_created = data.time_created;
                        $scope.config.time_updated = data.time_created;
                        AlertService.addSuccess(`WordPress Hooks configuration for ${$scope.service.service_id} created successfully.`);
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-wp-hooks.hooks', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configWpHooksEditor create() response', response);
                        is_error    =   true;
                        throw new Error(`Can't create config for WordPress Hooks. ${response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks', $scope.config).then(function (data) {
                        $log.debug('configWpHooksEditor update() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_error    =   false;
                        $scope.config.time_created = data.time_created;
                        $scope.config.time_updated = data.time_updated;
                        AlertService.addSuccess('WordPress Hooks config updated');
                        $rootScope.$broadcast('ServiceConfigUpdated', {platform_id: 'convo-wp-hooks.hooks', platform_config: $scope.config});
                    }, function ( response) {
                        $log.debug('configWpHooksEditor update() response', response);
                        is_error    =   true;
                        throw new Error(`Can't update config for WordPress Hooks. ${response.data.message}`);
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
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'convo-wp-hooks.hooks').then(function (data) {
                    $scope.config = data;
                    configBak = angular.copy( $scope.config);
                    is_new  =   false;
                    is_error    =   false;
                }, function ( response) {
                    $log.debug('configWpHooksEditor loadPlatformConfig() response', response);

                    if ( response.status === 404) {
                        is_new      =   true
                        is_error    =   false;
                        return;;
                    }
                    is_error    =   true;
                });
            }

            function _initIntentNlps() {
                $scope.intentNlps  =   [
                    {
                        label: '---',
                        value: null
                    }
                ];

                ConvoworksApi.loadPlatformConfig($scope.service.service_id).then(function (config) {
                    if (config.dialogflow && config.dialogflow.mode === "auto") {
                        $scope.intentNlps.push({
                            label: 'Dialogflow',
                            value: 'dialogflow'
                        });
                    }
                    if (config.dialogflow_es && config.dialogflow_es.mode === "auto") {
                        $scope.intentNlps.push({
                            label: 'Dialogflow ES',
                            value: 'dialogflow_es'
                        });
                    }
                }).catch(function (reason) {
                    throw new Error(reason.data.message)
                });
            }
        }
    }
}
