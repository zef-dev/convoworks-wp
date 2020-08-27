
export default function ConvoProtoApi( $log, $http, PROTO_ADMIN_API_BASE_URL, PROTO_PUBLIC_API_BASE_URL) {

        // INTERFACE
        this.login      =   login;
        this.logout     =   logout;
        this.getUser    =   getUser;
        this.getUsers    =   getUsers;
        
        function getUsers()
        {
            $log.log('ConvoProtoApi getUsers()');

            return $http({
                method: "GET",
                url: PROTO_PUBLIC_API_BASE_URL + '/users'
            }).then(function (res) {
                return res.data;
            });
        }
        
        
        function getUser()
        {
            $log.log( 'ConvoProtoApi getUser()');
            return $http({
                method: 'get',
                url: PROTO_ADMIN_API_BASE_URL + '/admin-auth/get-user',
            }).then( function ( res) {
                return res.data;
            })
        }

        function login( username, password) {
            $log.log( 'ConvoProtoApi login()');
            return $http({
                method: 'post',
                url: PROTO_ADMIN_API_BASE_URL + '/admin-auth/login',
                data: { 'username' : username, 'password' : password}
            }).then( function ( res) {
                return res.data;
            })
        }
        function logout() {
            $log.log( 'ConvoProtoApi logout()');
            return $http({
                method: 'post',
                url: PROTO_ADMIN_API_BASE_URL + '/admin-auth/logout',
            }).then( function ( res) {
                return res.data;
            })
        }
    }