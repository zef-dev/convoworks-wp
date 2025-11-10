import template from './externaltest.tmpl.html';

/* @ngInject */
export default function convoExternaltest( $log, $q, $timeout, ConvoworksApi) {

    $log.log('convoExternaltest init');
    var platformConfig = {};
    var platformTestLinks = [];

    return {
        restrict: 'E',
        template : template,
        scope: {
            deviceId : '=',
            serviceId : '=',
            platformTestLinksOut: '=?'
        },
        link: function( $scope)
        {
            $log.log( 'convoExternaltest link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);
            _load();

            function _load()
            {
                platformTestLinks = [];
                var language = 'en-US';
                ConvoworksApi.getServiceMeta($scope.serviceId).then( (meta) => {
                    language = meta['default_locale'].replace("-", "_");

                    ConvoworksApi.loadPlatformConfig($scope.serviceId).then((data) => {
                        $log.log( 'convoExternaltest load ', platformConfig);
                        platformConfig = data;

                        if (platformConfig.amazon) {
                            var appId = platformConfig.amazon.app_id;
                            if (appId && appId !== '') {
                                platformTestLinks.push({
                                    title: 'Amazon',
                                    link: `https://developer.amazon.com/alexa/console/ask/test/${appId}/development/${language}/`
                                });
                            }
                        }
                        if (platformConfig.viber) {
                            var accountId = platformConfig.viber.account_id;
                            if (accountId && accountId !== '') {
                                platformTestLinks.push({
                                    title: 'Viber',
                                    link: `https://partners.viber.com/account/${accountId}/info/`
                                });
                            }
                        }
                    }).catch((reason) => {
                        throw new Error(reason)
                    });
                    }
                )
            }

            $scope.getPlatformTestLinks = () => {
                return platformTestLinks;
            }
        }
    };
}

