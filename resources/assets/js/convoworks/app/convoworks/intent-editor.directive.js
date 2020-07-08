(function() {
    angular
        .module( 'convo.editor')
        .directive( 'intentEditor', intentEditor);

    function intentEditor( $log, $rootScope, $window)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            templateUrl: 'app/convoworks/intent-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes) {
            	$log.debug( 'intentEditor link');
				$scope.value	=	JSON.stringify( $scope.service.intents, null, 2);
				$scope.error	=	false;
				
				var open = [];

				$scope.selectIntent = function(index) {
					if (!open[index]) {
						open[index] = true;
						return;
					}
					
					open[index] = !open[index];
				}

				$scope.isIntentSelected = function(index) {
					return open[index];
				}
				
				$scope.deleteIntent = function(index) {
					var intentName = $scope.service.intents[index].name;
					
					if ($window.confirm("Are you sure you want to delete " + intentName + "?")) {
						selected = null;
						$scope.service.intents.splice(index, 1);
					}
				}

				$scope.addIntent = function() {
					var retindex = $scope.service.intents.length;
					$scope.service.intents.push({
						"name": "NewIntent",
						"type": "custom",
						"utterances": [
							{
								"raw": "",
								"model": [
									{
										"text": ""
									}
								]
							}
						]
					});

					return retindex;
				}

				$scope.$on('JsonError', function(event, args) {
					$scope.error = args;
				});

				$scope.$watch( 'value', function ( value) {
					try {
						$scope.service.intents	=	JSON.parse( value);

						for (var i in $scope.service.intents) {
							if (!$scope.service.intents[i].name ||
								$scope.service.intents[i].name == "") {
								$scope.service.intents[i].name = "NamelessIntent";
							}
						}

						$scope.error	=	false;
					} catch ( err) {
						$scope.error	=	true;
					}
				});
				
				$scope.$watch( function () {
					// $log.debug( 'intentEditor component value changed');
					return $scope.service.intents;
				}, function ( value) {
					$scope.value	=	JSON.stringify( $scope.service.intents, null, 2);
					$scope.error	=	false;
				});
            }
        }
    }

})();