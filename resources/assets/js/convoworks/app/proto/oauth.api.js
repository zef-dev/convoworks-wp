(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .service('OAuthApi', OAuthApi);

    /* @ngInject */
    function OAuthApi($log, $http, $httpParamSerializer, PROTO_PUBLIC_API_BASE_URL)
    {
        this.buildLoginUrl = buildLoginUrl;
        this.getAuthToken = getAuthToken;

        function buildLoginUrl(query, user)
        {
            $log.log('OAuthApi buildLoginUrl with user', user, ', query', query);
            query['user_id'] = user.userId;

            var params = $httpParamSerializer(query);

            return PROTO_PUBLIC_API_BASE_URL + '/oauth?' + params;
        }

        function getAuthToken(code)
        {
            $log.log('OAuthApi getAuthToken(', code, ')');

            return $http({
                method: 'POST',
                url: PROTO_PUBLIC_API_BASE_URL + '/token?code=' + code
            }).then(function (res) {
                return res.data;
            });
        }
    }
})();