
import template from './config-service-meta-editor.tmpl.html';

export default function configServiceMetaEditor($log, LoginService, ConvoworksApi)
{
    return {
        restrict: 'E',
        scope: { service: '=' },
        template: template,
        link: function($scope, $element, $attributes) {
            $log.log('configServiceMetaEditor linked');

            var user = null;

            LoginService.getUser().then(function (u) {
                user = u;
            });

            $scope.config = {
                name: '',
                description: '',
                owner: '',
                admins: ['']
            };

            _load();

            var configBak = angular.copy($scope.config);
            var is_error =  false;

            $scope.revertConfig = function () {
                $scope.config = angular.copy(configBak);
            }

            $scope.isConfigChanged = function () {
                return !angular.equals(configBak, $scope.config);
            }

            $scope.updateConfig = function() {
                ConvoworksApi.updateServiceMeta($scope.service.service_id, $scope.config).then(function (res) {
                    var meta = res.data;
                    $log.log('configServiceMetaEditor updateConfig() got new meta', meta);

                    $scope.config = {
                        name: meta['name'] || '',
                        description: meta['description'] || '',
                        owner: meta['owner'] || '',
                        admins: meta['admins'] || ['']
                    }

                    configBak = angular.copy($scope.config);
                    is_error = false;
                }, function (reason) {
                    $log.warn('configServiceMetaEditor updateConfig failed for reason', reason);
                    is_error = true;
                    throw new Error(reason.data.message)
                });
            }

            function _load() {
                ConvoworksApi.getServiceMeta($scope.service.service_id).then(function (meta) {
                    $log.log('configServiceMetaEditor got service meta', meta);
                    $scope.config = {
                        name: meta['name'] || '',
                        description: meta['description'] || '',
                        owner: meta['owner'] || '',
                        admins: meta['admins'] || ['']
                    }

                    configBak = angular.copy($scope.config);
                    is_error = false;
                }, function (reason) {
                    $log.warn('configServiceMetaEditor getServiceMeta failed for reason', reason);
                    is_error = true;
                });
            }
        }
    }
}