
export default function OAuthLoginController( $scope, $log, $location, ConvoProtoApi, OAuthApi)
{
    $log.log('OAuthLoginController');

    $scope.loading = true;
    $scope.users = [];

    $scope.query = $location.search();

    $scope.buildLoginUrl = function(user) {
        var query = $location.search();

        var url = OAuthApi.buildLoginUrl(query, user);

        $log.log('Got final login url', url);

        return url;
    }

    _init();

    function _init()
    {
        ConvoProtoApi.getUsers().then(function (users) {
            $log.log('OAuthLoginController got users', users);
            $scope.users = users;
            $scope.loading = false;
        });
    }
};

