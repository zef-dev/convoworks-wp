(function() {
    angular
        .module('adomee.admin')
        .service('ConvoworksApi', ConvoworksApi);

    /* @ngInject */
    function ConvoworksApi( $log, $http, $q, CONVO_ADMIN_API_BASE_URL) {

		var definitions		=	null;

		// INTERFACE
		
		// /convo-definitions
        this.getComponentDefinitions    =   getComponentDefinitions;
		this.getComponentDefinition     =   getComponentDefinition;
		this.getTemplates			    =   getTemplates;
		
		// /services
		this.getAllServices             =	getAllServices;
		
		// /services/{serviceId}
        this.getServiceById             =   getServiceById;
        this.getServiceMeta             =   getServiceMeta;
        this.createService              =   createService;
		this.updateService            	=	updateService;
		
		// /services/{serviceId}/preview
		this.getServicePreview			=	getServicePreview;

		// /service-run/{serviceId}
		this.sendMessage                =   sendMessage;

		// /service-imp-exp/import/{serviceId}
		this.uploadServiceData    		=   uploadServiceData;

		// /service-platfform-config/{serviceId}
        this.loadPlatformConfig			=   loadPlatformConfig;
        this.getServicePlatformConfig   =   getServicePlatformConfig;
        this.createServicePlatformConfig   =   createServicePlatformConfig;
        this.updateServicePlatformConfig   =   updateServicePlatformConfig;
        this.propagateServicePlatform	=   propagateServicePlatform;
        
        // publish-service/{platformId}/{serviceId}
        this.getPublishInformation     	=   getPublishInformation;
		
		this.getServiceVersions     	=   getServiceVersions;
		this.getServiceReleases     	=   getServiceReleases;
		this.createRelease     			=   createRelease;
		this.promoteRelease				=   promoteRelease;
		this.importWorkflowIntoRelease	=   importWorkflowIntoRelease;
		
		// media/{serviceId}
		this.uploadMedia = uploadMedia;
		this.downloadMedia = downloadMedia;

		// package-help/{packageId}/{filename}
		this.getPackageComponentHelp = getPackageComponentHelp;

		// TEMPLATES
		function getTemplates() {
			var d	=	$q.defer();
    		
    		getComponentDefinitions().then( function( definitions) {
    			var templates	=	[];
				for ( var i=0; i<definitions.length; i++) {
					var pckg	=	definitions[i];
					for ( var j=0; j<pckg.templates.length; j++) {
						templates.push( pckg.templates[j]);
					}
				}
				
				d.resolve( templates);
				
//				d.reject( 'Component ['+className+'] not found');
			});
    		
    		return d.promise;
		}

		// DEFINITIONS
        function getComponentDefinitions() {
        	if ( !!definitions)
        	{
				var d	=	$q.defer();

				d.resolve( definitions);

				return d.promise;
			}
			else
			{
            	return $http({
					method: 'GET',
					url: CONVO_ADMIN_API_BASE_URL + '/user-packages'
				}).then( function ( res) {
					definitions	=	res.data;
					return definitions;
				});
			}
        }
        
        function getComponentDefinition( className) {
//        	$log.log( 'ConvoworksApi getComponentDefinition(%s)', className);
    		var d	=	$q.defer();
    		
    		getComponentDefinitions().then( function( definitions) {
				for ( var i=0; i<definitions.length; i++) {
					var pckg	=	definitions[i];
					for ( var j=0; j<pckg.components.length; j++) {
						var comp = pckg.components[j];
						if ( comp['type'] === className) {
							d.resolve( comp);
							return comp;
						}
						if (comp['component_properties']['_class_aliases']) {
							var aliases = comp['component_properties']['_class_aliases'];
							for ( var n = 0; n < aliases.length; n++) {
								if (aliases[n] === className) {
									d.resolve( comp);
									return comp;
								}
							}
						}
					}
				}
				d.reject( 'Component ['+className+'] not found');
			});
    		
    		return d.promise;
        }

        function getAllServices() {
        	$log.log( 'ConvoworksApi getAllServices()');

        	return $http({
				method: 'GET',
				url: CONVO_ADMIN_API_BASE_URL + '/services'
			}).then( function ( res) {
				return res.data;
			})
		}

        function getServiceById( serviceId) {
        	$log.log( 'ConvoworksApi getServiceById(%s)', serviceId);
        	return $http({
				method: 'GET',
				url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId
			}).then( function ( res) {
				return res.data;
			});
        }

        function getServiceMeta( serviceId) {
        	$log.log( 'ConvoworksApi getServiceMeta(%s)', serviceId);
        	return $http({
        		method: 'GET',
        		url: CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/meta'
        	}).then( function ( res) {
        		return res.data;
        	});
        }

        function createService( serviceName, templateId)
        {
        	return $http({
		        method: 'post',
		        url: CONVO_ADMIN_API_BASE_URL + '/services',
		        data: { 'service_name' : serviceName, 'template_id' : templateId }
	        }).then( function ( res) {
	        	return res.data;
	        });
        }

        function updateService( serviceId, service) {
        	$log.log( 'ConvoworksApi postService() serviceId', serviceId);

        	return $http.put( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId, service);
		}

		function getServicePreview(serviceId) {
			$log.log('ConvoworksApi getServicePrevies() serviceId', serviceId);

			return $http
				.get( CONVO_ADMIN_API_BASE_URL + '/services/' + serviceId + '/preview')
				.then(function (res) {
					return res.data
				});
		}

		function sendMessage( serviceId, deviceId, text, isLaunch, variant, delegateNlp)
		{
            if ( !variant) {
                variant =   'develop';
            }

			return $http({
				method: "post",
				url: CONVO_ADMIN_API_BASE_URL + '/service-test/' + serviceId,
				data : { device_id : deviceId, text : text, lunch : isLaunch, platform_id: delegateNlp }
			}).then( function ( response) {
				$log.log('AdmConvoWorksApi sendMessage response.data', response.data);
				return response.data;
			});
		}

		function uploadServiceData( serviceId, file, keepVars, keepConfigs) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi uploadServiceData() serviceId', serviceId, 'file', file);
            var fd = new FormData();
            fd.append("service_definition", file);
            fd.append("keep_vars", keepVars);
            fd.append("keep_configs", keepConfigs);
            
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-imp-exp/import/' + serviceId, fd, { headers: {'Content-Type': undefined }})
			.then(function (res) {
				$log.log('ConvoworksApi uploadServiceData() res', res);
				return res.data;
			});	
		}

		function loadPlatformConfig( serviceId) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi loadPlatformConfig() serviceId', serviceId);
            
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi loadPlatformConfig() res', res);
				return res.data;
			});	
		}

		function getServicePlatformConfig( serviceId, platformId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId)
			.then(function (res) {
				$log.log('ConvoworksApi getServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function createServicePlatformConfig( serviceId, platformId, data) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi createServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
			.then(function (res) {
				$log.log('ConvoworksApi createServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function updateServicePlatformConfig( serviceId, platformId, data) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi updateServicePlatformConfig() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.put( CONVO_ADMIN_API_BASE_URL + '/service-platform-config/' + serviceId +'/'+platformId, data)
			.then(function (res) {
				$log.log('ConvoworksApi updateServicePlatformConfig() res', res);
				return res.data;
			});	
		}
		
		function propagateServicePlatform( serviceId, platformId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi propagateServicePlatform() serviceId', serviceId, 'platformId', platformId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-platform-propagate/' + serviceId +'/'+platformId)
			.then(function (res) {
				$log.log('ConvoworksApi propagateServicePlatform() res', res);
				return res.data;
			});	
		}
		
		function getPublishInformation( serviceId) {

			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}

        	$log.log( 'ConvoworksApi getPublishInformation() serviceId', serviceId);
            
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-publish/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getPublishInformation() res', res);
				return res.data;
			});	
        }
        
				
		function getServiceVersions( serviceId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServiceVersions() serviceId', serviceId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-versions/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getServiceVersions() res', res);
				return res.data;
			});	
		}
		
		function createRelease( serviceId, platformId, type, stage) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi createRelease() serviceId', serviceId);
			
			var data	=	{
					platform_id : platformId,
					type : type,
					stage : stage
			};
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
			.then(function (res) {
				$log.log('ConvoworksApi createRelease() res', res);
				return res.data;
			});	
		}
		
		function promoteRelease( serviceId, releaseId, type, stage) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi promoteRelease() serviceId', serviceId);
			
			var data	=	{
					release_id : releaseId,
					type : type,
					stage : stage
			};
			
			return $http
			.put( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId, data)
			.then(function (res) {
				$log.log('ConvoworksApi promoteRelease() res', res);
				return res.data;
			});	
		}
		
		function importWorkflowIntoRelease( serviceId, releaseId, versionId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi importWorkflowIntoRelease() serviceId', serviceId);
			
			return $http
			.post( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId + '/' + releaseId + '/import-workflow/' + versionId)
			.then(function (res) {
				$log.log('ConvoworksApi importWorkflowIntoRelease() res', res);
				return res.data;
			});	
		}
		
		function getServiceReleases( serviceId) {
			
			if ( !serviceId) {
				throw new Error( 'Missing service id');
			}
			
			$log.log( 'ConvoworksApi getServiceReleases() serviceId', serviceId);
			
			return $http
			.get( CONVO_ADMIN_API_BASE_URL + '/service-releases/' + serviceId)
			.then(function (res) {
				$log.log('ConvoworksApi getServiceReleases() res', res);
				return res.data;
			});	
		}
		

		function uploadMedia(serviceId, kind, file) {
			if (!serviceId) {
				throw new Error("Missing service ID");
			}
			
			$log.log('ConvoworksApi uploadMedia serviceId', serviceId, 'kind', kind, 'file', file);

			var fd = new FormData();
			fd.append(kind, file);

			return $http
			.post(
				CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId,
				fd,
				{
					headers: { 'Content-Type': undefined }
				}
			)
			.then(function(res) {
				$log.log('ConvoworksApi uploadMedia res', res);
				return res.data;
			});
		}

		function downloadMedia(serviceId, mediaItemId) {
			return CONVO_ADMIN_API_BASE_URL + '/media/' + serviceId + '/' + mediaItemId + '/download';
		}

		function getPackageComponentHelp(packageId, filename) {
			return $http
				.get( CONVO_ADMIN_API_BASE_URL + '/package-help/' + packageId + '/' + filename)
				.then(function (res) {
					$log.log('ConvoworksApi getPackageComponentHelp() res', res);
					return res.data;
				});
		}
    }
})();