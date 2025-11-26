/* @ngInject */
export default function serviceContext( $log, $rootScope, $q, ConvoworksApi,
    ConvoworksAddBlockService, ComponentFactoryService, AlertService, ClipboardService, ProcessRegistrarService, NotificationsService, ComponentDefinitionsHelperService, ServiceContextLoader) {
    return {
        restrict: 'A',
        require: '^serviceContext',
        scope: true,
        controller: function( $scope) {
            'ngInject';
            $log.log( 'serviceContext controller init');

            // PUBLIC API grouped by concern
            var serviceLoadingApi = {
                getComponentDefinitions: getComponentDefinitions,
                getComponentDefinition: getComponentDefinition,
                isLoaded: isLoaded,
                getAvailablePackages: getAvailablePackages,
                getSystemEntities: getSystemEntities,
                reloadService: reloadService
            };

            var intentsAndEntitiesApi = {
                getConvoIntents: getConvoIntents,
                addConvoIntent: addConvoIntent,
                updateConvoIntent: updateConvoIntent,
                removeConvoIntent: removeConvoIntent,
                addConvoEntity: addConvoEntity,
                removeConvoEntity: removeConvoEntity,
                updateConvoEntity: updateConvoEntity
            };

            var selectionApi = {
                setSelectedService: setSelectedService,
                setSelectedComponent: setSelectedComponent,
                setSelectedBlock: setSelectedBlock,
                setSelectedFragment: setSelectedFragment,
                getSelection: getSelection,
                getSelectedService: getSelectedService
            };

            var persistenceApi = {
                isServiceChanged: isServiceChanged,
                revertChanges: revertChanges,
                saveChanges: saveChanges
            };

            var workflowApi = {
                findBlock: findBlock,
                findSubroutine: findSubroutine,
                addBlock: addBlock,
                addProcessSubroutine: addProcessSubroutine,
                addReadSubroutine: addReadSubroutine,
                removeBlock: removeBlock,
                removeSubroutine: removeSubroutine,
                removeComponent: removeComponent,
                addNewComponent: addNewComponent,
                moveComponent: moveComponent,
                paste: paste
            };

            Object.assign(this,
                serviceLoadingApi,
                intentsAndEntitiesApi,
                selectionApi,
                persistenceApi,
                workflowApi
            );


            // DEFINITION
            if ( !$scope.serviceId) {
                throw new Error( 'No serviceId in scope');
            }

            $scope.$watch('serviceId', (val) => {
                if (val) {
                    NotificationsService.setServiceId(val);
                }
            });

            var service_id          =   $scope.serviceId;
            var ready               =   false;
            var definitions         =   [];
            var original_service    =   null;
            var available_packages  =   [];
            var selection           =   {
                component : null,
                definition : null,
                service : null,
                meta: null,
                containerController : null
            };

            $scope.$on('ServiceReleaseDevelopImport', function() {
                reloadService();
            })

            $scope.$on('PackagesUpdated', function () {
                _init();
            })

            _init();

            function _init()
            {
                ServiceContextLoader.loadInitial(service_id).then(function (result) {
                    $log.log('serviceContext controller initial load completed', result);
                    available_packages = result.availablePackages;
                    definitions = result.definitions;
                    selection.service = result.service;
                    original_service = angular.copy(selection.service);
                    selection.meta = result.meta;

                    $rootScope.$broadcast('PackageDefinitionsUpdated'); // todo quickfix
                    ready = true;
                }, function (reason) {
                    $log.error('serviceContext controller initial load failed', reason);
                    throw new Error(reason && reason.data && reason.data.message ? reason.data.message : 'Failed to initialize service context');
                });
            }


            function paste(containerController, index) {
                try {
                    const clipboard = ClipboardService.getClipboard();
                    if (!clipboard) return;

                    if (!selection.service.packages.includes(clipboard.namespace)) {
                        AlertService.addWarning(`You do not have the [${clipboard.namespace}] package enabled. Cannot paste.`);
                        return;
                    }

                    containerController.addComponent(
                        ComponentFactoryService.copyComponent(getSelectedService(), clipboard),
                        index
                    );
                } catch (e) {
                    AlertService.addWarning('Failed to paste: ' + e.message);
                }
            }

            function addConvoEntity( entity) {
                selection.service.entities.push(entity);
                return entity.name;
            }

            function removeConvoEntity(entity) {
                selection.service.entities = selection.service.entities.filter(e => e.name !== entity.name);
            }

            function updateConvoEntity(original, entity) {
                const index = selection.service.entities.findIndex(e => e.name === original.name);
                selection.service.entities[index] = entity;
            }

            function addConvoIntent(intent) {
                selection.service.intents.push(intent);
                return intent.name;
            }

            function updateConvoIntent(original, intent) {
                const index = selection.service.intents.findIndex(i => i.name === original.name);
                selection.service.intents[index] = intent;
            }

            function removeConvoIntent(target) {
                selection.service.intents = selection.service.intents.filter((intent) => {
                    if (intent.name === target.name) {
                        return false;
                    }

                    if (intent.parent_intent && intent.parent_intent === target.name) {
                        return false;
                    }

                    return true;
                });
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

            function getSystemEntities()
            {
                var all =   [];
                for ( var i=0; i<definitions.length; i++) {
                    $log.log( 'serviceContext getSystemEntities definitions[i]', definitions[i]);
                    all =   [...all, ...definitions[i].entities];
                }
                $log.log( 'serviceContext getSystemEntities all', all);
                return all;
            }

            function getComponentDefinitions()
            {
                return definitions;
            }

            function getComponentDefinition( className)
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
            function setSelectedService(service, forceUpdateOriginal = false) {
                selection.service = service;

                if (forceUpdateOriginal) {
                    original_service = angular.copy(selection.service);
                }
            }

            function setSelectedComponent( component, containerController) {
                $log.log( 'serviceContext setSelectedComponent component', component);
                if ( !component) {
                    selection.component     =   null;
                    selection.definition    =   null;
                    return;
                }

                if ( !containerController) {
                    selection.containerController   =   null;
                }

                selection.containerController   =   containerController;
                try {
                    selection.definition        =   getComponentDefinition( component['class']);
                } catch ( err) {
                    $log.error( err);
                    selection.definition    =   {
                        name : err.message,
                        component_properties : {}
                    };
                }
                selection.component             =   component;
            }

            function setSelectedBlock( block)
            {
                var containerController =   {
                    deleteSelectedComponent: function() { removeBlock( block.properties.block_id); }
                };

                setSelectedComponent( block, containerController);
            }

            function setSelectedFragment( block)
            {
                var containerController =   {
                    deleteSelectedComponent: function() { removeSubroutine( block.properties.fragment_id); }
                };

                setSelectedComponent( block, containerController);
            }

            function getSelection() {
                return selection;
            }

            $scope.$on( 'EscKeyPressed', function () {
                if ( selection.component) {
                    setSelectedComponent( null);
                }
            });

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
                // Replace the entire service object so Angular tears down and rebuilds
                // component scopes, avoiding stale drag/drop references after revert.
                selection.service = angular.copy(original_service);
                selection.component = null;
            }

            function saveChanges() {
                $log.log( 'serviceContext controller saveChanges()');
                var d = $q.defer();

                ConvoworksApi.updateService( service_id, selection.service).then( function( res) {
                    $log.log( 'serviceContext controller saveChanges() done');

                    angular.merge( selection.service, res.data);
                    original_service    =   angular.copy( selection.service);
                    $rootScope.$broadcast('ServiceWorkflowUpdated', selection.service);
                    d.resolve(selection.service);
                    AlertService.addSuccess( 'Service workflow saved');
                }, function( reason) {
                    $log.log( 'serviceContext controller saveChanges() reason', reason);
                    d.reject(reason);
                    throw new Error(reason.data.message);
                })

                return d.promise;
            }

            $rootScope.$on('CtrlSPressed', () => {
                if (isServiceChanged()) {
                    saveChanges();
                }
            })

            // BLOCKS
            function addBlock( name, className, role) {
                var d = $q.defer();
                ComponentFactoryService.createBlock( getSelectedService(), name, className, role).then( function ( block) {
                    $log.log( 'serviceContext controller addBlock() block', block);
                    getSelectedService().blocks.push( block);
                    d.resolve( block);
                }, function ( reason) {
                    $log.log( 'serviceContext controller addBlock() reason', reason);
                    d.reject( reason);
                });

                return d.promise;
            }

            function addReadSubroutine( name)
            {
                var d = $q.defer();
                ComponentFactoryService.createReadSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                    d.resolve( block);
                }, function ( reason) {
                    d.reject( reason);
                });
                return d.promise;
            }

            function addProcessSubroutine( name) {
                var d = $q.defer();
                ComponentFactoryService.createProcessSubroutine( getSelectedService(), name).then( function ( block) {
                    getSelectedService().fragments.push( block);
                    d.resolve( block);
                }, function ( reason) {
                    d.reject( reason);
                });
                return d.promise;
            }

            function _findByProp(list, propPath, value) {
                for (var i = 0; i < list.length; i++) {
                    var item = list[i];
                    var nested = item;

                    for (var j = 0; j < propPath.length; j++) {
                        if (!nested) {
                            break;
                        }
                        nested = nested[propPath[j]];
                    }

                    if (nested === value) {
                        return { item: item, index: i };
                    }
                }

                return null;
            }

            function removeBlock( blockId) {
                var result = _findByProp(selection.service.blocks, ['properties', 'block_id'], blockId);

                if (!result) {
                    throw new Error( 'Could not find block ['+blockId+']');
                }

                selection.service.blocks.splice( result.index, 1);
                $scope.$broadcast( 'ComponentRemoved', result.item);
            }

            function removeSubroutine( fragmentId) {
                var result = _findByProp(selection.service.fragments, ['properties', 'fragment_id'], fragmentId);

                if (!result) {
                    throw new Error( 'Could not find fragment ['+fragmentId+']');
                }

                selection.service.fragments.splice( result.index, 1);
                $scope.$broadcast( 'ComponentRemoved', result.item);
            }

            function removeComponent()
            {
                if ( !selection.containerController) {
                    $log.warn( 'serviceContext directive removeComponent() no containerController');
                    return ;
                }

                selection.containerController.deleteSelectedComponent( selection.component);
                $scope.$broadcast( 'ComponentRemoved', selection.component);
            }

            function findBlock( blockId) {
                var result = _findByProp(selection.service.blocks, ['properties', 'block_id'], blockId);

                if (!result) {
                    throw new Error( 'Block ['+blockId+'] not found');
                }

                return result.item;
            }

            function findSubroutine( fragmentId) {
                var result = _findByProp(selection.service.fragments, ['properties', 'fragment_id'], fragmentId);

                if (!result) {
                    throw new Error( 'Fragment ['+fragmentId+'] not found');
                }

                return result.item;
            }

            // OTHER COMPONENTS
            function addNewComponent( containerController, componentDefinition, index)
            {
                if ( !index) {
                    index   =   0;
                }

                var component   =   ComponentFactoryService.createComponent( getSelectedService(), componentDefinition);
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
                ServiceContextLoader.reloadService(service_id).then(function (service) {
                    $log.log('serviceContext controller reloadService() got service', service);
                    selection.service = service;
                    original_service = angular.copy(selection.service);
                    ready = true;
                }, function (reason) {
                    $log.error('serviceContext controller reloadService() failed', reason);
                    throw new Error(reason && reason.data && reason.data.message ? reason.data.message : 'Failed to reload service');
                });
            };

            },
            link : function( $scope, $element, $attributes, serviceContext) {
                $log.log( 'serviceContext link');

                function _init()
                {
                    $log.log( 'serviceContext _init() service', serviceContext.getSelectedService());
                    const definitions = serviceContext.getComponentDefinitions();
                    $scope.availableBlockTypes = ComponentDefinitionsHelperService.toRunnableBlocks(definitions);
                    $scope.availableContexts   = ComponentDefinitionsHelperService.toDatasourceContexts(definitions);
                }

                function _destroy()
                {
                }

                $scope.$on('PackageDefinitionsUpdated', function () {
                    const definitions = serviceContext.getComponentDefinitions();
                    $scope.availableBlockTypes = ComponentDefinitionsHelperService.toRunnableBlocks(definitions);
                    $scope.availableContexts   = ComponentDefinitionsHelperService.toDatasourceContexts(definitions);
                })

                $scope.availableBlockTypes  =   [];
                $scope.availableContexts    =   [];

                $scope.isServiceChanged     =   serviceContext.isServiceChanged;
                $scope.saveChanges          =   serviceContext.saveChanges;
                $scope.setSelectedBlock     =   serviceContext.setSelectedBlock;
                $scope.setSelectedFragment  =   serviceContext.setSelectedFragment;
                $scope.getSelection         =   serviceContext.getSelection;
                $scope.getSelectedService   =   serviceContext.getSelectedService;
                $scope.addNewComponent      =   serviceContext.addNewComponent;

                $scope.hasActiveProcesses   =   ProcessRegistrarService.hasActiveProcesses;

                $scope.revertClicked        =   function()
                {
                    $log.log( 'serviceContext revertClicked()');
                    serviceContext.revertChanges();
                    _destroy();
                    _init();
                };

                $scope.getBlockWorkflow  =   function ( block)
                {
                    try {
                        var definition = serviceContext.getComponentDefinition( block.class);
                        return definition.component_properties._workflow;
                    } catch ( err) {
                        $log.error( err);
                        return null;
                    }
                };


                $scope.addNewBlock      =   function( className, role, defaultName)
                {
                    $log.log( 'serviceContext addNewBlock() className', className, 'role', role);
                    return ConvoworksAddBlockService.showModal( serviceContext.getSelectedService(), 'user', serviceContext, className, role, defaultName);
                };

                $scope.showNewReadSubroutine        =   function()
                {
                    $log.log( 'serviceContext showNewReadSubroutine()');
                    return ConvoworksAddBlockService.showSubroutineModal( serviceContext.getSelectedService(), serviceContext, 'read')
                };

                $scope.showNewProcessSubroutine     =   function()
                {
                    $log.log( 'serviceContext showNewProcessSubroutine()');
                    return ConvoworksAddBlockService.showSubroutineModal( serviceContext.getSelectedService(), serviceContext, 'process')
                };

                $scope.addNewContext    =   function( context)
                {
                    $log.log( 'serviceContext addNewContext() context', context);

                    $rootScope.$broadcast('AddContext', context);
                }

                // $scope.removeBlock       =   function( blockId)
                // {
                //  $log.log( 'serviceContext removeBlock() blockId', blockId);
                // };

                $scope.isReady          =   serviceContext.isLoaded;
//              $scope.isReady          =   function() {
//                  $log.log( 'serviceContext isReady()');
//                  return true
//              };

                //
                $scope.getSubroutines = function() {
                    return serviceContext.getSelectedService().fragments;
                };

                $scope.getBlocks = function() {
                    return serviceContext.getSelectedService().blocks;
                };

                $scope.removeBlock = function (blockId) {
                    return serviceContext.removeBlock(blockId);
                };

                $scope.removeSubroutine = function (subroutineId) {
                    return serviceContext.removeSubroutine(subroutineId);
                };

                function _initAvailableBlockTypes() {
                    // kept for backward-compatibility; delegate to helper
                    var definitions = serviceContext.getComponentDefinitions();
                    $scope.availableBlockTypes = ComponentDefinitionsHelperService.toRunnableBlocks(definitions);
                }

                function _initAvailableContexts() {
                    // kept for backward-compatibility; delegate to helper
                    var definitions = serviceContext.getComponentDefinitions();
                    $scope.availableContexts = ComponentDefinitionsHelperService.toDatasourceContexts(definitions);
                }

                $scope.getDefinitions       =   serviceContext.getComponentDefinitions;
                $scope.getAvailablePackages =   serviceContext.getAvailablePackages;
                $scope.getAvailableContexts =   serviceContext.getAvailableContexts;

                $scope.$watch( serviceContext.isLoaded, function( val) {
                    if ( val) {
                        _init();
                    } else {
                        _destroy();
                    }
                });
        }
    }
}

