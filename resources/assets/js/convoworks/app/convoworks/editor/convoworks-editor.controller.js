
export default function ConvoworksEditorController( $log, $scope, $rootScope, $routeParams, $location, ConvoworksApi, AlertService) {

        var random_slug         =   Math.floor( Math.random() * 100000);
        var device_id           =   'admin-chat-' + random_slug;

        var platform_info       =   {}

        $scope.serviceId        =   $routeParams.service_id;
        var search              =   $location.search();
        var tab_selected_1       =  search.tab1 ? search.tab1 : 'workflow';
        var tab_selected_2       =  search.tab2 ? search.tab2 :'steps';

        $scope.tabInfo1          =   { active: tab_selected_1};
        $scope.tabInfo2          =   { active: tab_selected_2};

        $scope.delegateNlp      =   null;
        $scope.delegateOptions  =   [
            {
                label: 'Amazon',
                value: 'amazon'
            },
            {
                label: 'Dialogflow',
                value: 'dialogflow'
            }
        ];


        _load();

        $scope.tab1Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab1Select $tab', $tab);
            _updateUrl( $tab, 'steps');
        }

        $scope.tab2Select       =   function( $tab) {
            $log.log( 'ConvoworksEditorController tab2Select $tab', $tab);
            if ( $scope.tabInfo1.active == 'workflow') {
                _updateUrl( 'workflow', $tab);
            }
        }

        function _updateUrl( tab1, tab2)
        {
            $log.log( 'ConvoworksEditorController _updateUrl tab1Select tabs', tab1, tab2);
            if ( tab1 == 'workflow') {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', tab2);
            } else {
                $location.search( 'tab1', tab1);
                $location.search( 'tab2', null);
            }

            $location.replace();
        }

        $scope.getDeviceId      =   function() {
            return device_id;
        }


        $rootScope.$on( 'ServiceConfigUpdated', function ( evt, data) {
            _load();
        });

        $rootScope.$on( 'ServiceWorkflowUpdated', function ( evt, data) {
            _load();
        });

        $rootScope.$on( 'ServiceReleasesUpdated', function ( evt, data) {
            _load();
        });


        $scope.isPlatformPropagateAllowed       =   function( platformId) {
            if ( !platform_info[platformId]) {
                return false;
            }
            return platform_info[platformId]['allowed'];
        }

        $scope.isPlatformPropagateAvailable     =   function( platformId) {
            return true;
            if ( !platform_info[platformId]) {
                return false;
            }
            return platform_info[platformId]['available'];
        }

        $scope.propagatePlatformChanges     =   function( platformId) {
            $log.log( 'ConvoworksEditorController propagatePlatformChanges() platformId', platformId);

            if (platformId === 'all') {
                const availablePlatforms = Object.keys(platform_info);
                availablePlatforms.forEach(function(availablePlatformId) {
                    ConvoworksApi.propagateServicePlatform( $scope.serviceId, availablePlatformId).then(function (data) {
                        platform_info[availablePlatformId] = data;
                        AlertService.addSucess( 'Service propagation to '+availablePlatformId+' done');
                    }, function( reason) {
                        $log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
                        throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
                    });
                })
            } else {
                ConvoworksApi.propagateServicePlatform( $scope.serviceId, platformId).then(function (data) {
                    platform_info[platformId] = data;
                    AlertService.addSucess( 'Service propagation to '+platformId+' done');
                }, function( reason) {
                    $log.log( 'ConvoworksEditorController propagatePlatformChanges() reason', reason);
                    throw new Error(platformId + " propagation error: " + reason.data.message + " Error details: " + reason.data.details);
                });
            }

        }


        function _load()
        {
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'amazon').then(function (data) {
                platform_info['amazon'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for amazon")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'dialogflow').then(function (data) {
                platform_info['dialogflow'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for dialogflow")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'facebook_messenger').then(function (data) {
                platform_info['facebook_messenger'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for Facebook Messenger")
            });
            ConvoworksApi.getPropagateInfo( $scope.serviceId, 'viber').then(function (data) {
                platform_info['viber'] = data;
            }).catch(function (reason) {
                throw new Error(reason.data.message +  " In order to be able to propagate changes for Viber")
            });
        }

//      setTimeout( function () {
//          _initTabs();
//      }, 2 * 1000);

        function _initTabs()
        {
            $( '#tab_steps').droppable({
                greedy: true,
                over: function( event, ui) {
                    $log.log( 'ConvoworksEditorController tab_steps over');
                    $scope.$apply( function () {
                        $scope.tabInfo.active   =   'steps';
                    });
                },
            });
            $( '#tab_subroutines').droppable({
                greedy: true,
                over: function( event, ui) {
                    $log.log( 'ConvoworksEditorController tab_subroutines over');
                    $scope.$apply( function () {
                        $scope.tabInfo.active   =   'subroutines';
                    });
                },
            });
        }
    }
