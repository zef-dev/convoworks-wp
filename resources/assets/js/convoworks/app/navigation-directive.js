(function () {
	'use strict';
	
	angular.module('adomee.admin').directive('admNavigation', ['$log', '$rootScope', 'AlexaApi', 'LoginService', '$location', '$q', '$window',
													  function( $log,   $rootScope,   AlexaApi,   LoginService,   $location,   $q,   $window) {
       	
			$log.log('admNavigation init');

			return {
				templateUrl: 'app/navigation.html',
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
						AlexaApi.requestAuthUrl(scope.user).then(function (data) {
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