
import template from './config-messenger-editor.tmpl.html';

export default function configConvoChatEditor($log, $q, $rootScope, ConvoworksApi, LoginService, PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS) {
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
                page_id: null,
                page_access_token: null,
                app_id: null,
                app_secret: null,
                webhook_verify_token: null,
                webhook_events: []
            };

            $scope.webhook_events = PROTO_FACEBOOK_MESSENGER_WEBHOOK_EVENTS;

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
            return 'https://developers.facebook.com/apps/' + $scope.config.app_id + '/messenger/settings/'
          }

            $scope.updateConfig = function () {
                _updateSelectedWebhookEvents();
                if ( is_new) {
                    ConvoworksApi.createServicePlatformConfig( $scope.service.service_id, 'facebook_messenger', $scope.config).then(function (data) {
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
                    ConvoworksApi.updateServicePlatformConfig( $scope.service.service_id, 'facebook_messenger', $scope.config).then(function (data) {
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
                    $scope.config.webhook_events.push(eventName);
                } else {
                    $scope.config.webhook_events = _arrayRemove($scope.config.webhook_events, eventName);
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
                if ($scope.config.webhook_events && $scope.config.webhook_events.length > 0) {
                    for (var i = 0; i < $scope.webhook_events.length; i++) {
                        if ($scope.config.webhook_events.includes($scope.webhook_events[i].name)) {
                            $scope.webhook_events[i].checked = true;
                        }
                    }
                }
                return $scope.webhook_events;
            };

            function _updateSelectedWebhookEvents() {
                $scope.config.webhook_events = [];
                for (var i = 0; i < $scope.webhook_events.length; i++) {
                    if ($scope.webhook_events[i].checked) {
                        var webhookEventName = $scope.webhook_events[i].name;
                        $scope.config.webhook_events.push(webhookEventName);
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
                ConvoworksApi.getServicePlatformConfig( $scope.service.service_id, 'facebook_messenger').then(function (data) {
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
