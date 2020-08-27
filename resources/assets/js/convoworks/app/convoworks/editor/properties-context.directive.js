
export default function propertiesContext( $log, $rootScope, ConvoworksApi, ConvoworksAddBlockService, ConvoComponentFactoryService, AlertService) {
    return {
        restrict: 'A',
        require: '^propertiesContext',
        scope: true,
        controller: function( $scope) {

            // PUBLIC API
            this.getComponentDefinitions    =   getComponentDefinitions;
            this.setComponentDefinitions    =   setComponentDefinitions;
            this.getComponentDefinition     =   getComponentDefinition;
            this.isLoaded                   =   isLoaded;
            this.getConvoIntents            =   getConvoIntents;

            this.setSelectedComponent       =   setSelectedComponent;
            this.getSelection               =   getSelection;
            this.getSelectedService         =   getSelectedService;

            this.isServiceChanged           =   isServiceChanged;
            this.revertChanges              =   revertChanges;
            this.saveChanges                =   saveChanges;

            this.getAvailablePackages       =   getAvailablePackages;

            this.findBlock                  =   findBlock;
            this.findSubroutine             =   findSubroutine;

            this.addBlock                   =   addBlock;
            this.addProcessSubroutine       =   addProcessSubroutine;
            this.addReadSubroutine          =   addReadSubroutine;
            this.removeBlock                =   removeBlock;
            this.removeSubroutine           =   removeSubroutine;

            this.removeComponent            =   removeComponent;

            this.addNewComponent            =   addNewComponent;
            this.moveComponent              =   moveComponent;

            this.reloadService              =   reloadService;


            // DEFINITION
            if ( !$scope.serviceId) {
                throw new Error( 'No serviceId in scope');
            }

            var service_id          =   $scope.serviceId;
            var ready               =   false;
            var definitions         =   [];
            var original_service    =   null;
            var available_packages  =   [];
            var selection           =   {
                component : null,
                definition : null,
                service : null,
                containerController : null
            };


            _init();

            function _init()
            {
                ConvoworksApi.getAvailablePackages().then(function(available) {
                    available_packages = available;

                    ConvoworksApi.getComponentDefinitions(service_id).then( function( defs) {
                        $log.log( 'propertiesContext controller definitions pre-loaded. Now will start.');
                        definitions     =   defs;

                        ConvoworksApi.getServiceById( service_id).then( function( service) {
                            $log.log( 'propertiesContext controller got service', service);
                            selection.service   =   service;
                            original_service    =   angular.copy( selection.service);
                            ready               =   true;
                        }, function( reason) {
                            $log.error( 'propertiesContext controller service got reason', reason);
                            throw new Error(reason.data.message);
                        });
                    }, function( reason) {
                        $log.error( 'propertiesContext controller definitions got reason', reason);
                    });
                })
            }

            this.hasClipboard       =   hasClipboard;
            this.cut        =   cut;
            this.copy       =   copy;
            this.paste      =   paste;
            this.isCut      =   isCut;

            var clipboard   =   null;

            function hasClipboard()
            {
                return !!clipboard;
            }

            function cut( container, component)
            {
                clipboard   =   {
                        is_cut : true,
                        component : component,
                        container : container,
                };
            }

            function copy( component)
            {
                clipboard   =   {
                        is_cut : false,
                        component : component,
                };
            }

            function paste( containerController, index)
            {
                if ( !clipboard) {
                    return;
                }

                if ( clipboard.is_cut) {
                    $log.log( 'propertiesContext paste cut');
                    // function moveComponent( oldContainerController, containerController, component, index)
                    moveComponent( clipboard.container, containerController, clipboard.component, index);
                    clipboard.is_cut    =   false;
                    clipboard.container =   null;
                } else {
                    $log.log( 'propertiesContext paste copy');

                    containerController.addComponent(
                            ConvoComponentFactoryService.copyComponent( getSelectedService(), clipboard.component),
                            index);
                }
            }

            function isCut( component)
            {
                return clipboard && clipboard.is_cut && clipboard.component === component;
            }

            function getConvoIntents()
            {
                var intents =   [];

                // SERVICE
                for ( var i=0; i < selection.service.intents.length; i++) {
                    intents.push( selection.service.intents[i]);
                }

                // SYSTEM
                for ( var i=0; i<definitions.length; i++) {
                    var pckg    =   definitions[i];
                    if ( !pckg.intents) {
                        continue;
                    }
                    for ( var j=0; j<pckg.intents.length; j++) {
                        intents.push( pckg.intents[j]);
                    }
                }

                return intents;
            }

            function getAvailablePackages()
            {
                return available_packages;
            }

            function getComponentDefinitions()
            {
                return definitions;
            }

            function setComponentDefinitions(defs)
            {
                $log.log('setting defs', defs);
                definitions = defs;
            }

            function getComponentDefinition(serviceId, className)
            {
                for (var i = 0; i < definitions.length; i++)
                {
                    var pckg = definitions[i];

                    for (var j = 0; j < pckg.components.length; j++)
                    {
                        var comp = pckg.components[j];

                        if (comp['type'] === className)
                        {
                            return comp;
                        }
                    }
                }
                throw new Error( 'Definition ['+className+'] not found');
            }

            function isLoaded() {
                return ready;
            }

            // SELECTION
            function setSelectedComponent( component, containerController) {
                if ( !component) {
                    selection.component     =   null;
                    selection.definition    =   null;
                    return;
                }

                if ( !containerController) {
                    selection.containerController   =   null;
                }

                selection.containerController   =   containerController;
                selection.definition            =   getComponentDefinition(selection.service['service_id'], component['class']);
                selection.component             =   component;
            }

            function getSelection() {
                return selection;
            }

            // SERVICE
            function getSelectedService() {
                if ( !selection.service) {
                    throw new Error( 'No selected service');
                }
                return selection.service;
            }

            function isServiceChanged() {
                return !angular.equals( original_service, selection.service);
            }

            function revertChanges() {
                angular.copy( original_service, selection.service);
            }

            function saveChanges() {
                $log.log( 'propertiesContext controller saveChanges()');

                ConvoworksApi.updateService( service_id, selection.service).then( function( res) {
                    $log.log( 'propertiesContext controller saveChanges() done');

                    angular.merge( selection.service, res.data);
                    original_service    =   angular.copy( selection.service);
                    $rootScope.$broadcast('ServiceWorkflowUpdated', selection.service);
                    AlertService.addSucess( 'Service workflow saved');
                }, function( reason) {
                    $log.log( 'propertiesContext controller saveChanges() reason', reason);
                    throw new Error(reason.data.message);
                })
            }

            // BLOCKS
            function addBlock( name) {
                ConvoComponentFactoryService.createBlock( getSelectedService(), name).then( function ( block) {
                    getSelectedService().blocks.push( block);
                });
            }

            function addReadSubroutine( name)
            {
                ConvoComponentFactoryService.createReadSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                });
            }

            function addProcessSubroutine( name) {
                ConvoComponentFactoryService.createProcessSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                });
            }

            function removeBlock( blockId) {

                for ( var i=0; i<selection.service.blocks.length; i++) {
                    var block   =   selection.service.blocks[i];
                    if ( block.properties.block_id == blockId) {
                        selection.service.blocks.splice( i, 1);
                        return ;
                    }
                }

                throw new Error( 'Could not find block ['+blockId+']');
            }

            function removeSubroutine( fragmentId) {

                for ( var i=0; i<selection.service.fragments.length; i++) {
                    var fragment    =   selection.service.fragments[i];
                    if ( fragment.properties.fragment_id == fragmentId) {
                        selection.service.fragments.splice( i, 1);
                        return ;
                    }
                }

                throw new Error( 'Could not find fragment ['+fragmentId+']');
            }

            function removeComponent()
            {
                if ( !selection.containerController) {
                    $log.warn( 'propertiesContext directive removeComponent() no containerController');
                    return ;
                }

                selection.containerController.removeSelection( selection.component);
            }

            function findBlock( blockId) {
                for ( var i=0; i<selection.service.blocks.length; i++) {
                    var block   =   selection.service.blocks[i];
                    if ( block.properties.block_id == blockId) {
                        return block;
                    }
                }
                throw new Error( 'Block ['+blockId+'] not found');
            }

            function findSubroutine( fragmentId) {
                for ( var i=0; i<selection.service.fragments.length; i++) {
                    var fragment    =   selection.service.fragments[i];
                    if ( fragment.properties.fragment_id == fragmentId) {
                        return fragment;
                    }
                }
                throw new Error( 'Fragment ['+fragmentId+'] not found');
            }

            // OTHER COMPONENTS
            function addNewComponent( containerController, componentDefinition, index)
            {
                if ( !index) {
                    index   =   0;
                }

                var component   =   ConvoComponentFactoryService.createComponent( getSelectedService(), componentDefinition);
                containerController.addComponent( component, index);
            };

            function moveComponent( oldContainerController, containerController, component, index) {

                if ( !index) {
                    index   =   0;
                }

                oldContainerController.removeComponent( component);
                containerController.addComponent( component, index);
            };

            function reloadService() {
                ConvoworksApi.getServiceById( service_id).then( function( service) {
                    $log.log( 'propertiesContext controller got service', service);
                    selection.service   =   service;
                    original_service    =   angular.copy( selection.service);
                    ready               =   true;
                }, function( reason) {
                    $log.error( 'propertiesContext controller service got reason', reason);
                    throw new Error(reason.data.message);
                });
            };

            },
            link : function( $scope, $element, $attributes, propertiesContext) {

                $log.log( 'propertiesContext link');

                function _init()
                {
                    $log.log( 'propertiesContext _init() service', propertiesContext.getSelectedService());
                }

                function _destroy()
                {
                }


                $scope.isServiceChanged     =   propertiesContext.isServiceChanged;
                $scope.saveChanges          =   propertiesContext.saveChanges;
                $scope.getSelection         =   propertiesContext.getSelection;

                $scope.revertClicked        =   function()
                {
                    $log.log( 'propertiesContext revertClicked()');
                    propertiesContext.revertChanges();
                    _destroy();
                    _init();
                };


                $scope.addNewBlock      =   function()
                {
                    $log.log( 'propertiesContext addNewBlock()');
                    ConvoworksAddBlockService.showModal( propertiesContext.getSelectedService(), 'user', propertiesContext)
                };

                $scope.showNewReadSubroutine        =   function()
                {
                    $log.warn( 'propertiesContext showNewReadSubroutine()');
                    ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'read')
                };

                $scope.showNewProcessSubroutine     =   function()
                {
                    $log.warn( 'propertiesContext showNewProcessSubroutine()');
                    ConvoworksAddBlockService.showSubroutineModal( propertiesContext.getSelectedService(), propertiesContext, 'process')
                };

                // $scope.removeBlock       =   function( blockId)
                // {
                //  $log.log( 'propertiesContext removeBlock() blockId', blockId);
                // };

                $scope.isReady          =   propertiesContext.isLoaded;
//              $scope.isReady          =   function() {
//                  $log.log( 'propertiesContext isReady()');
//                  return true
//              };

                //
                $scope.getSubroutines   =   function() { return _filterSubroutines( propertiesContext.getSelectedService()); };
                $scope.getBlocks        =   function() { return _filterBlocks( propertiesContext.getSelectedService()); };
                $scope.getDefinitions   =   propertiesContext.getComponentDefinitions;
                $scope.setDefinitions   =   propertiesContext.setComponentDefinitions;
                $scope.getAvailablePackages = propertiesContext.getAvailablePackages;

                $scope.canBlockMoveUp = function(blockId)
                {
                    var index = $scope.getBlocks().findIndex(function (b) {
                        return b.properties.block_id === blockId;
                    });

                    return index > 1;
                }

                $scope.canBlockMoveDown = function(blockId)
                {
                    var blocks = $scope.getBlocks();
                    var index = blocks.findIndex(function (b) {
                        return b.properties.block_id === blockId;
                    });

                    return index < blocks.length - 4;
                }

                $scope.canFragmentMoveUp = function(fragmentId)
                {
                    var index = $scope.getSubroutines().findIndex(function (s) {
                        return s.properties.fragment_id === fragmentId;
                    });

                    return index > 0;
                }

            $scope.canFragmentMoveDown = function(fragmentId)
            {
                var blocks = $scope.getSubroutines();
                var index = blocks.findIndex(function (s) {
                    return s.properties.fragment_id === fragmentId;
                });

                return index < blocks.length - 1;
            }


            $scope.$on('moveBlock', function (event, data) {
                $log.log('Block', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
                var service = propertiesContext.getSelectedService();

                var currentIndex = service.blocks.findIndex(function (b) { return b.properties.block_id === data.blockId; });
                var targetIndex = currentIndex + data.dir;
                $log.log('Block', data.blockId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

                [service.blocks[currentIndex], service.blocks[targetIndex]] = [service.blocks[targetIndex], service.blocks[currentIndex]];
            });

            $scope.$on('moveFragment', function (event, data) {
                $log.log('Fragment', data, 'wants to go', (data.dir === 1 ? 'down' : 'up'));
                var service = propertiesContext.getSelectedService();

                var currentIndex = service.fragments.findIndex(function (f) { return f.properties.fragment_id === data.fragmentId; });
                var targetIndex = currentIndex + data.dir;
                $log.log('Block', data.fragmentId, 'is currently at index', currentIndex, ', will try moving it to', targetIndex);

                [service.fragments[currentIndex], service.fragments[targetIndex]] = [service.fragments[targetIndex], service.fragments[currentIndex]];
            });

            $scope.$watch( propertiesContext.isLoaded, function( val) {
                if ( val) {
                    _init();
                } else {
                    _destroy();
                }
            });
        }
    }
}

function _filterBlocks( service)
{
    var user_blocks     =   service.blocks.filter( function( block) { return !_isSystem( block.properties.block_id);    });
    var system_blocks   =   service.blocks.filter( function( block) { return _isSystem( block.properties.block_id); });

    var session_start_block         =   system_blocks.find( function( b) { return b.properties.block_id === '__sessionStart'; });
    var service_processors_block    =   system_blocks.find( function( b) { return b.properties.block_id === '__serviceProcessors'; });
    var session_end_block           =   system_blocks.find( function( b) { return b.properties.block_id === '__sessionEnd'; });
    var media_controls_block        =   system_blocks.find( function( b) { return b.properties.block_id === '__mediaControls'; });

    var sorted  =   user_blocks;

    sorted.unshift( session_start_block);
    sorted.push( media_controls_block);
    sorted.push( service_processors_block);
    sorted.push( session_end_block);

    return sorted;
}

function _filterSubroutines( service)
{
    return service.fragments;
}

function _isSystem( blockId) {
    if ( blockId) {
        return blockId.indexOf( '__') >= 0;
    }
    return false;
}
