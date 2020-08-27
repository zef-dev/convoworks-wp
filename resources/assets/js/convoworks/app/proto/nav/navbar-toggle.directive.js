export default function navbarToggle( $log) {
    return {
        restrict: 'A',
        link: function( $scope, $elem, $attrs)
        {
            $scope.toggleNavbar =   function()
            {
                angular.element( '#navbar-collapse').toggleClass( 'collapse');
            }
        }
    };
}
