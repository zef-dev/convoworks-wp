
import template from './config-viber-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_VIBER_WEBHOOK_EVENT_TYPES) {
    return {
        restrict: 'E',
        scope: { service: '=' },
        template,
        controller ($scope) {

        },
        link ($scope, $element, $attributes) {

            let user    =   null;

            LoginService.getUser().then( function ( u) {
                user = u;
            });

            $scope.config = {
                delegateNlp: null,
                account_id: null,
                auth_token: null,
                event_types: []
            };

            $scope.event_types = PROTO_VIBER_WEBHOOK_EVENT_TYPES;

            let configBak   =   angular.copy( $scope.config);
            let is_new      =   true;
            let is_error    =   false;
            let has_started =   false;


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

          $scope.getConfigUrl = function() {
            return 'https://partners.viber.com/account/' + $scope.config.account_id + '/info'
          }

            $scope.updateConfig = function () {
                _updateSelectedWebhookEvents();
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'viber', $scope.config).then(function (data) {
                        $log.debug('configConvoChatEditor create() $scope.config', $scope.config);
                        configBak = angular.copy( $scope.config);
                        is_new      =   false;
                        is_error    =   false;
                        $rootScope.$broadcast('ServiceConfigUpdated', $scope.config);
                    }, function ( response) {
                        $log.debug('configConvoChatEditor create() response', response);
                        is_error    =   true;
                        throw new Error(`Can't create config for Convo. ${  response.data.message}`)
                    });
                } else {
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'viber', $scope.config).then(function (data) {
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

            $scope.registerChange = function(webhookEvent) {
                var eventName = webhookEvent.event.name;
                var isEventEnabled = !webhookEvent.event.checked;

                if (isEventEnabled) {
                    $scope.config.event_types.push(eventName);
                } else {
                    $scope.config.event_types = _arrayRemove($scope.config.event_types, eventName);
                }
                $scope.getWebhookEvents();
            }

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                var fieldChange = !angular.equals( configBak, $scope.config);
                return fieldChange;
            }

            $scope.getWebhookEvents = function () {
                // update array with values from config
                if ($scope.config.event_types && $scope.config.event_types.length > 0) {
                    for (var i = 0; i < $scope.event_types.length; i++) {
                        if ($scope.config.event_types.includes($scope.event_types[i].name)) {
                            $scope.event_types[i].checked = true;
                        }
                    }
                }
                console.log("Webhook Event types: " + $scope.event_types);
                return $scope.event_types;
            };

            function _updateSelectedWebhookEvents() {
                $scope.config.event_types = [];
                for (var i = 0; i < $scope.event_types.length; i++) {
                    if ($scope.event_types[i].checked) {
                        var webhookEventName = $scope.event_types[i].name;
                        $scope.config.event_types.push(webhookEventName);
                    }
                }
            }

            function _arrayRemove(arr, value) {
                 return arr.filter(function(ele) {
                     return ele !== value;
                 });
            }

            function _load()
            {
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'viber').then(function (data) {
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
