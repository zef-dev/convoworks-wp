(function() {
    angular
        .module( 'adomee.admin')
        .directive( 'releasesEditor', releasesEditor);

        /* @ngInject */
    function releasesEditor( $log, $q, $rootScope, ConvoworksApi, CONVO_BASE_URL, CONVO_PUBLIC_API_BASE_URL)
    {
        return {
            restrict: 'E',
            scope: { service: '=' },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/releases-editor.tmpl.html',
            controller: function( $scope) {

            },
            link: function( $scope, $element, $attributes, propertiesContext) {
            	$log.log( 'releasesEditor link');
            	
            	$scope.releases		=	[];
            	var meta			=	{};
            	var PROMOTE_OPTIONS	=	{};
            	var IMPORT_WORKFLOW_OPTIONS	=	{};
            	var SUBMIT_OPTIONS	=	{};
            	
            	$scope.getReleaseUrl	=	function ( release) {
            		
            	//	http://convo-proto.lokal.com/rest_public/convo/v1/service-run/webchat/a/tribes-ascend
            			
            		return CONVO_BASE_URL + '/' + CONVO_PUBLIC_API_BASE_URL + '/service-run/' + release['platform_id'] + '/' 
            		+ release['alias'] + '/' + release['service_id'];
            	};
            	
            	
            	$scope.getPromoteOptions	=	function ( release) {
            		return PROMOTE_OPTIONS[ _getReleaseKey( release)];
            	};
            	

            	$scope.promoteRelease	=	function ( row, type, stage) {
            		$log.log( 'releasesEditor promoteRelease type', type, 'row', row);
                	ConvoworksApi.promoteRelease( 
                			$scope.service.service_id,
                			row['release_id'],
                			type,
                			stage).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor promoteRelease reason', reason);
                	});
            	};
            	
            	$scope.getSubmitOptions	=	function ( release) {
            		return SUBMIT_OPTIONS[ _getReleaseKey( release)];
            	};
            	
            	$scope.submitRelease	=	function ( row, type, stage) {
            		$log.log( 'releasesEditor submitRelease type', type, 'row', row);
                	ConvoworksApi.createRelease( 
                			$scope.service.service_id,
                			row['platform_id'],
                			type,
                			stage).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor submitRelease reason', reason);
                	});
            	};
            	
            	
            	$scope.getImportWorkflow	=	function ( release) {
            		return IMPORT_WORKFLOW_OPTIONS[ _getReleaseKey( release)];
            	};  
            	
            	$scope.importWorkflowRelease	=	function ( row, releaseId) {
            		$log.log( 'releasesEditor importWorkflowRelease releaseId', releaseId);
                	ConvoworksApi.importWorkflowIntoRelease( 
                			$scope.service.service_id,
                			releaseId,
                			row['version_id']).then( function () {
                				_load();
                				$rootScope.$broadcast('ServiceReleasesUpdated');
                	}, function ( reason) {
                		$log.log( 'releasesEditor importWorkflowRelease reason', reason);
                	});
            	};
            	
            	function get_release( platformId, type, stage)
            	{
					for ( var i=0; i<$scope.releases.length; i++) {
						var release	=	$scope.releases[i];
//						$log.log( 'releasesEditor get_release check release', release);
						if ( release['type'] === type && release['stage'] === stage && release['platform_id'] === platformId) {
							$log.log( 'releasesEditor get_release found platformId', platformId, 'type', type, 'stage', stage, release['release_id']);
							return release['release_id'];
						}
					}
					
					$log.log( 'releasesEditor get_release not found platformId', platformId, 'type', type, 'stage', stage);
            		return null;
            	}
            	
            	$rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
                    _load();
                });
            	
            	_load();
            	
            	function _load() {
                	var all	=	[];
            		all.push( ConvoworksApi.getServiceReleases( $scope.service.service_id).then( function ( releases) {
            			$log.log( 'releasesEditor releases loaded');
            			$scope.releases	=	releases;
                	}, function ( reason) {
                		$log.log( 'releasesEditor getServiceReleases reason', reason);
                	}));
            		
            		all.push( ConvoworksApi.getServiceMeta( $scope.service.service_id).then( function ( meta) {
            			$log.log( 'releasesEditor meta loaded');
                		meta	=	meta;
                	}, function ( reason) {
                		$log.log( 'releasesEditor getServiceMeta reason', reason);
                	}));
            		
            		$q.all( all).then( function () {
            			_initOptions();
            		});
            	}
            	
            	function _initOptions()
            	{
            		$log.log( 'releasesEditor _initOptions');
            		
            		PROMOTE_OPTIONS	=	{};
                	IMPORT_WORKFLOW_OPTIONS	=	{};
                	SUBMIT_OPTIONS	=	{};
                	
                	var releases	=	$scope.getDevelopment();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);
                		
                		var options	=	_getSubmitOptions( release);
                		SUBMIT_OPTIONS[key]	=	options;
                		
                		var options	=	_getWorkflowOptions( release);
                		IMPORT_WORKFLOW_OPTIONS[key]	=	options;
                	}
                	
                	var releases	=	$scope.getTest();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);
                		
                		var options	=	_getPromoteOptions( release);
                		PROMOTE_OPTIONS[key]	=	options;
                		
                		var options	=	_getWorkflowOptions( release);
                		IMPORT_WORKFLOW_OPTIONS[key]	=	options;
                	}
                	
                	var releases	=	$scope.getProduction();
                	for ( var i=0; i<releases.length; i++) {
                		var release	=	releases[i];
                		var key		=	_getReleaseKey( release);

                		var options	=	_getPromoteOptions( release);
                		PROMOTE_OPTIONS[key]	=	options;
                	}
            	}
            	
            	function _getReleaseKey( release) {
            		return release['release_id'] ? release['release_id'] : release['platform_id'] + '_' + release['type'];
            	}
            	
            	function _getSubmitOptions( release) {
            		var options	=	[];
            		
            		if ( release['platform_id'] === 'amazon') {
            			options.push( {
        					title : 'Submit to review',
        					type : 'production',
        					stage : 'review',
            			});
            		} else if ( release['platform_id'] === 'dialogflow') {
            			options.push( {
        					title : 'Submit to review',
        					type : 'production',
        					stage : 'review',
            			});
            			options.push( {
            				title : 'Submit to alpha test',
            				type : 'test',
            				stage : 'alpha',
            			});
            		} else if ( release['platform_id'] === 'convo_chat') {
            			var release_id	=	get_release( 'convo_chat', 'production', 'release');
            			if ( !release_id) {
            				options.push( {
            					title : 'Submit as release',
            					type : 'production',
            					stage : 'release',
                			});            				
            			}
            		}
            		
            		return options;
            	}
            	
            	function _getPromoteOptions( release) {
            		var options	=	[];
            		if ( release['platform_id'] === 'amazon') {
            			if ( release['stage'] === 'review') {
                			options.push( {
            					title : 'Promote to release',
            					type : 'production',
            					stage : 'release'
                			});
//                			options.push( {
//                				title : 'Withdraw',
//                			});
            			}
            		} else if ( release['platform_id'] === 'dialogflow') {
            			if ( release['type'] === 'production' && release['stage'] === 'review') {
                			options.push( {
            					title : 'Promote to release',
            					type : 'production',
            					stage : 'release'
                			});
//                			options.push( {
//                				title : 'Withdraw',
//                			});
            			} else if ( release['type'] === 'test') {
                			options.push( {
            					title : 'Promote to review',
            					type : 'production',
            					stage : 'review'
                			});
            			}	
            		}
            		return options;
            	}
            	
            	function _getWorkflowOptions( release) {
            		var options	=	[];
            		
            		if ( release['platform_id'] === 'amazon') {
            			var release_id	=	get_release( 'amazon', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			
            			var release_id	=	get_release( 'amazon', 'production', 'review');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to review',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		} else if ( release['platform_id'] === 'dialogflow') {
            			var release_id	=	get_release( 'dialogflow', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			
            			var release_id	=	get_release( 'dialogflow', 'production', 'review');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to review',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            			var release_id	=	get_release( 'dialogflow', 'test', 'alpha');
            			if ( release_id && release['type'] !== 'test') {
            				options.push( {
            					title : 'Import to alpha',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		} else if ( release['platform_id'] === 'convo_chat') {
            			var release_id	=	get_release( 'convo_chat', 'production', 'release');
            			if ( release_id) {
            				options.push( {
            					title : 'Import to release',
            					version_id : release['version_id'],
            					release_id : release_id
            				});
            			}
            		}
            		return options;
            	};
            	
            	
            	
            	// GRID DATA
            	$scope.getProduction	=	function () {
            		var releases = $scope.releases.filter( function( release) {
            			return release.type	=== 'production';
            		});
            		return releases;
            	};
            	
            	$scope.getTest			=	function () {
            		var releases = $scope.releases.filter( function( release) {
          			  return release.type	=== 'test';
          			});
            		return releases;
            	};
            	
            	$scope.getDevelopment	=	function () {
            		var releases = $scope.releases.filter( function( release) {
          			  return release.type	=== 'develop';
          			});
            		return releases;
            	};
            	
            	

            }
        }
    }

})();