(function () {
	'use strict';
	
	angular.module('proto.admin').directive('admNavigation', ['$log', 'ConvoworksApi', '$location', '$q', '$window',
													  function( $log,   ConvoworksApi,   $location,   $q,   $window) {
       	
			$log.log('admNavigation init');

			return {
				templateUrl: 'app/proto/nav/navigation.html',
				restrict: 'E',
				link: function (scope, element, attributes) 
				{
					scope.displayTheta	=	false;
					scope.user			=	null;

					attributes.$observe('user', function (newUser) {
						scope.user = scope.$eval(newUser);
					});

					scope.isAmazonAccountLinked = function()
					{
						return scope.user && scope.user['amazon_account_linked'];
					}
					
					scope.requestAmazonAuth	=	function()
					{
						ConvoworksApi.requestAuthUrl(scope.user).then(function (data) {
							$log.log('Got auth url', data.authUrl);

							$window.location.href = data.authUrl;
						});
					}

					scope.showNav		=	function ()
					{
						return 1;
					};
				  
					scope.isActive		=	function (item)
					{
						var path = $location.path();
						if (path)
							path = path.substr( 1);

						return path.indexOf( item) === 0;
					};
				}
			};
}]);

})();