/* @ngInject */
export default function WorkflowEditorController($log, $scope, $state, $stateParams,
    $anchorScroll, $transitions, AlertService, StringService, ClipboardService, $timeout, $element) {

    $log.log('WorkflowEditorController init');

    // Scroll sync state for left panel: when the editor is out of view (scrolled up),
    // scrolling up over the left panel should first scroll the page, then the panel.
    let editorRoot = null;
    let leftPanel = null;
    let leftPanelWheelHandler = null;
    let midPanel = null;
    let midPanelWheelHandler = null;
    let rightPanel = null;
    let rightPanelWheelHandler = null;
    let leftPanelScrollAnimationId = null;

    var selection = {
        block : {
            blockId : null,
            componentId : null,
        },
        fragment : {
            fragmentId : null,
            componentId : null,
        },
    };

    var $noTransition   =   $transitions.onSuccess({}, function( $transition){
        $log.log( 'WorkflowEditorController $transition $transition.params()', $transition.params());
        $scope.$applyAsync( function () {
            _resolveParams( $transition.params());
        });
        $anchorScroll();
    });

    $scope.$on( "$destroy", function () {
        $noTransition();

        // Remove wheel listener from left panel when controller is destroyed
        if (leftPanel && leftPanelWheelHandler) {
            leftPanel.removeEventListener('wheel', leftPanelWheelHandler);
            leftPanelWheelHandler = null;
        }

        // Remove wheel listener from mid panel when controller is destroyed
        if (midPanel && midPanelWheelHandler) {
            midPanel.removeEventListener('wheel', midPanelWheelHandler);
            midPanelWheelHandler = null;
        }

        // Remove wheel listener from right panel when controller is destroyed
        if (rightPanel && rightPanelWheelHandler) {
            rightPanel.removeEventListener('wheel', rightPanelWheelHandler);
            rightPanelWheelHandler = null;
        }

        if (leftPanelScrollAnimationId !== null) {
            cancelAnimationFrame(leftPanelScrollAnimationId);
            leftPanelScrollAnimationId = null;
        }
    });

    // Defer DOM access until after template is linked
    $timeout(function setupLeftPanelScrollSync() {
        // Use the controller's root element as the base, then find the internal .editor
        editorRoot = $element[0].querySelector('.editor') || $element[0];
        leftPanel = editorRoot && editorRoot.querySelector('.col-left');
        midPanel = editorRoot && editorRoot.querySelector('.col-mid');
        rightPanel = editorRoot && editorRoot.querySelector('.col-right');

        if (!editorRoot || !leftPanel) {
            $log.warn('WorkflowEditorController: editorRoot or leftPanel not found for scroll sync');
            return;
        }

        // Simple smooth scroll helper for the window
        function smoothWindowScrollBy(deltaY, durationMs) {
            if (!durationMs) {
                window.scrollBy(0, deltaY);
                return;
            }

            const startY = window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
            const targetY = startY + deltaY;
            const startTime = performance.now();

            if (leftPanelScrollAnimationId !== null) {
                cancelAnimationFrame(leftPanelScrollAnimationId);
            }

            const easeOutQuad = t => t * (2 - t);

            const step = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / durationMs);
                const eased = easeOutQuad(t);
                const currentY = startY + (targetY - startY) * eased;
                window.scrollTo(0, currentY);

                if (t < 1) {
                    leftPanelScrollAnimationId = requestAnimationFrame(step);
                } else {
                    leftPanelScrollAnimationId = null;
                }
            };

            leftPanelScrollAnimationId = requestAnimationFrame(step);
        }

        leftPanelWheelHandler = function (event) {
            // We only change behavior when scrolling UP
            if (event.deltaY >= 0) {
                return;
            }

            const editorRect = editorRoot.getBoundingClientRect();
            const scrollTop = window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
            const pageCanScrollUp = scrollTop > 0;

            // If the editor is scrolled off the top, scroll the page first
            if (pageCanScrollUp) {
                event.preventDefault(); // need non-passive listener
                // Make the window scroll a bit smoother instead of one big step
                // Cap the delta so high-resolution wheels / touchpads don't feel jumpy
                const cappedDelta = Math.max(event.deltaY, -120);
                smoothWindowScrollBy(cappedDelta, 150);
            }
            // When page is already at top / editor in view, let the panel handle the scroll normally
        };

        // passive: false so we can call preventDefault()
        leftPanel.addEventListener('wheel', leftPanelWheelHandler, { passive: false });

        // Mid-section scroll sync: same behavior as left panel
        if (!midPanel) {
            $log.warn('WorkflowEditorController: midPanel (.col-mid) not found for scroll sync');
            return;
        }

        midPanelWheelHandler = function (event) {
            // Only modify behavior when scrolling UP
            if (event.deltaY >= 0) {
                return;
            }

            const scrollTop = window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
            const pageCanScrollUp = scrollTop > 0;

            if (pageCanScrollUp) {
                event.preventDefault();
                const cappedDelta = Math.max(event.deltaY, -120);
                smoothWindowScrollBy(cappedDelta, 150);
            }
            // Otherwise, let the mid panel handle the scroll normally
        };

        midPanel.addEventListener('wheel', midPanelWheelHandler, { passive: false });

        // Right-section (properties) scroll sync: same behavior as left/mid
        if (!rightPanel) {
            $log.warn('WorkflowEditorController: rightPanel (.col-right) not found for scroll sync');
            return;
        }

        rightPanelWheelHandler = function (event) {
            // Only modify behavior when scrolling UP
            if (event.deltaY >= 0) {
                return;
            }

            const scrollTop = window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
            const pageCanScrollUp = scrollTop > 0;

            if (pageCanScrollUp) {
                event.preventDefault();
                const cappedDelta = Math.max(event.deltaY, -120);
                smoothWindowScrollBy(cappedDelta, 150);
            }
            // Otherwise, let the internal scrollable containers in the right panel handle it
        };

        rightPanel.addEventListener('wheel', rightPanelWheelHandler, { passive: false });
    }, 0);

    $scope.$on( "ComponentRemoved", function ( e, component) {
        $log.log( 'WorkflowEditorController ComponentRemoved component', component);
        if (!component) {
            $log.warn( 'WorkflowEditorController ComponentRemoved no component');
            return;
        }
        if ( component.properties.block_id && component.properties.block_id === selection['block']['blockId']) {
            var blocks = $scope.getBlocks();
            if ( blocks.length) {
                $state.go( 'convoworks-editor-service.editor', { sb: blocks[0].properties.block_id},
                    { inherit:true, reload:false, notify:true, location:'replace'});
            }

        } else if ( component.properties.fragment_id && component.properties.fragment_id === selection['fragment']['fragmentId']) {
            var fragments = $scope.getSubroutines();
            if ( fragments.length) {
                $state.go( 'convoworks-editor-service.editor', { sb: fragments[0].properties.fragment_id},
                    { inherit:true, reload:false, notify:true, location:'replace'});
            }
        }
    });

    $scope.getContainerContextOptions = function(service)
    {
        const options = [];

        if (_enablePaste()) {
            options.push({
                text: 'Paste',
                click: function ($itemScope, $event, modelValue, text, $li) {
                    _paste(service);
                }
            });
        }

        return options;
    }

    $scope.getStepContextOptions = function (step, removeStepFn)
    {
        const options = [];

        options.push({
            text: 'Cut',
            click: function($itemScope, $event, modelValue, text, $li) {
                const id_to_remove = step.properties.block_id || step.properties.fragment_id;
                ClipboardService.cut( step, () => {
                    removeStepFn(id_to_remove);
                });
            }
        })

        options.push({
            text: 'Copy',
            click: function ($itemScope, $event, modelValue, text, $li) {
                ClipboardService.copy(step);
            }
        })

        options.push({
            text: 'Delete',
            click: function ($itemScope, $event, modelValue, text, $li) {
                const id_to_remove = step.properties.block_id || step.properties.fragment_id;
                removeStepFn(id_to_remove);
            }
        })

        return options;
    }


    function _paste(service)
    {
        const step = ClipboardService.getClipboard();

        if (!step) {
            return;
        }

        if (!_canPaste(service, step)) {
            $log.log('WorkflowEditorController cannot paste');
            return;
        }

        const container = step.properties.block_id ? 'blocks' : 'fragments';

        if (!_isUnique(service[container], step)) {
            step.properties.name = `${step.properties.name} (Copy)`;
            step.properties._component_id = StringService.generateUUIDV4();

            if (container === 'blocks') {
                step.properties.block_id = StringService.generateUUIDV4();
            } else {
                step.properties.fragment_id = StringService.generateUUIDV4();
            }
        }

        service[container].push(step);
    }

    function _enablePaste() {
        if (ClipboardService.hasClipboard()) {
            const clipboard = ClipboardService.getClipboard();
            const mode = $scope.getComponentMode();
            if (mode === 'steps' && clipboard?.properties?.block_id) {
                return true;
            }
            if (mode === 'fragments' && clipboard?.properties?.fragment_id) {
                return true;
            }
        }

        return false;
    }

    function _canPaste(service, step)
    {
        $log.log('WorkflowEditorController _canPaste step', step);
        const r = /"namespace":"(.*?)"/g;
        const cmpstr = JSON.stringify(step);
        const matches = [...cmpstr.matchAll(r)].map(i => i[1] || null).filter(i => i !== null).reduce((previous, current) => {
            if (!previous.includes(current)) previous.push(current);
            return previous;
        }, []);

        $log.log('WorkflowEditorController wants to paste step, matched namespaces', matches, 'service has', service.packages);

        let missing = [];

        for (const p of matches) {
            if (!service.packages.includes(p)) {
                missing.push(p);
            }
        }

        if (missing.length > 0) {
            $log.log('WorkflowEditorController cannot paste, missing packages in service', missing);
            AlertService.addDanger('Cannot paste, the following packages are missing: ' + missing.join(', '));
            return false;
        }

        if (step.properties.role && step.properties.role !== 'conversation_block') {
            $log.log(`WorkflowEditorComponent want to paste block with special role [${step.properties.role}]`);
            for (const block of service.blocks) {
                if (block.properties.role === step.properties.role) {
                    $log.log('WorkflowEditorController cannot paste block, unique role [' + step.properties.role + '] already exists');
                    AlertService.addDanger('Cannot paste block, a block with the role [' + step.properties.role + '] already exists.');
                    return false;
                }
            }
        }

        return true;
    }

    function _isUnique(container, item)
    {
        if (item.properties.block_id)
        {
            return container.filter(b => b.properties.block_id === item.properties.block_id).length === 0;
        }
        else if (item.properties.fragment_id)
        {
            return container.filter(f => f.properties.fragment_id === item.properties.fragment_id).length === 0;
        }

        throw new Error('Item is neither a block nor a fragment.');
    }

    _initBlockDefaults();
    _initFragmentDefaults();
    _resolveParams( $stateParams);

    function _initBlockDefaults()
    {
        var blocks = $scope.getBlocks();
        if ( blocks.length) {
            selection['block']['blockId'] = blocks[0].properties.block_id;
        }
    }

    function _initFragmentDefaults()
    {
        var fragments = $scope.getSubroutines();
        if ( fragments.length) {
            selection['fragment']['fragmentId'] = fragments[0].properties.fragment_id;
        }
    }

    $scope.sortableOptions  =   {
        helper: 'clone',
        containment: "parent"
    };

    function _resolveParams( params)
    {
        if ( params.sv) {
            $scope.componentMode   =   params.sv;
        } else {
            $scope.componentMode   =   'steps';
        }

        if ( params.sb) {
            $log.log( 'WorkflowEditorController _resolveParams params.sb', params.sb);
            if ( $scope.componentMode === 'steps') {
                selection['block']['blockId'] = params.sb;
            } else if ( $scope.componentMode === 'fragments') {
                selection['fragment']['fragmentId'] = params.sb;
            }
        } else {
            $log.log( 'WorkflowEditorController _resolveParams replace in $scope.componentMode', $scope.componentMode);
            if ( $scope.componentMode === 'steps') {
                $state.go( 'convoworks-editor-service.editor', { sb:selection['block']['blockId']},
                    { inherit:true, reload:false, notify:true, location:'replace'});
            } else if ( $scope.componentMode === 'fragments') {
                $state.go( 'convoworks-editor-service.editor', { sb:selection['fragment']['fragmentId']},
                    { inherit:true, reload:false, notify:true, location:'replace'});
            }
        }
    }

    $scope.isRoleAvailable      =   function( role) {
        if ( role === 'conversation_block') {
            return true;
        }
        var blocks  =   $scope.getBlocks();
        for ( var i=0; i<blocks.length; i++) {
            if ( role === blocks[i].properties.role) {
                return false;
            }
        }
        return true;
    }

    $scope.openAddNewBlock      =   function( className, role, defaultName)
    {
        $log.log( 'WorkflowEditorController openAddNewBlock() className', className);

        $scope.addNewBlock( className, role, defaultName).then( function ( block) {
            $log.log( 'WorkflowEditorController openAddNewBlock success block', block);
            $scope.selectBlock( block.properties.block_id);
        }, function ( reason) {
            $log.warn( 'WorkflowEditorController openAddNewBlock reason', reason);
        });
    };
    $scope.selectBlock       =   function( blockId) {
        $log.log( 'WorkflowEditorController selectBlock blockId', blockId);

        if ( $scope.isBlockSelected( blockId)) {
            var block   =   $scope.getSelectedBlock();
            $scope.setSelectedBlock( block);
            return;
        }

        selection['block']  =   {
            blockId : blockId,
            componentId : null,
        };
        $state.go( 'convoworks-editor-service.editor', { sb:blockId}, { inherit:true, reload:false, notify:true, location:true});
    }
    $scope.isBlockSelected       =   function( blockId) {
        return selection['block']['blockId'] === blockId;
    }
    $scope.hasBlocks       =   function() {
        return $scope.getBlocks().length > 0;
    }
    $scope.getSelectedBlock       =   function() {
        var blocks = $scope.getBlocks();
        for ( var i=0; i<blocks.length; i++) {
            if ( blocks[i].properties.block_id === selection['block']['blockId']) {
                return blocks[i];
            }
        }
        if ( blocks.length) {
            return blocks[0];
        }
        throw new Error( 'No selected block');
    }

    $scope.openNewProcessSubroutine      =   function()
    {
        $log.log( 'WorkflowEditorController openNewProcessSubroutine()');
        $scope.showNewProcessSubroutine().then( function ( block) {
            $log.log( 'WorkflowEditorController openNewProcessSubroutine success block', block);
            $scope.selectFragment( block.properties.fragment_id);
        }, function ( reason) {
            $log.warn( 'WorkflowEditorController openNewProcessSubroutine reason', reason);
        });
    };

    $scope.openNewReadSubroutine      =   function()
    {
        $log.log( 'WorkflowEditorController openNewReadSubroutine()');
        $scope.showNewReadSubroutine().then( function ( block) {
            $log.log( 'WorkflowEditorController openNewReadSubroutine success block', block);
            $scope.selectFragment( block.properties.fragment_id);
        }, function ( reason) {
            $log.warn( 'WorkflowEditorController openNewReadSubroutine reason', reason);
        });
    };

    $scope.selectFragment       =   function( fragmentId) {
        $log.log( 'WorkflowEditorController selectFragment fragmentId', fragmentId);
        if ( $scope.isFragmentSelected( fragmentId)) {
            var block   =   $scope.getSelectedFragment();
            $scope.setSelectedFragment( block);
            return;
        }
        selection['fragment']  =   {
            fragmentId : fragmentId,
            componentId : null,
        };
        $state.go( 'convoworks-editor-service.editor', { sb:fragmentId}, { inherit:true, reload:false, notify:true, location:true});
    }
    $scope.isFragmentSelected       =   function( fragmentId) {
        return selection['fragment']['fragmentId'] === fragmentId;
    }
    $scope.getSelectedFragment       =   function() {
        var blocks = $scope.getSubroutines();
        for ( var i=0; i<blocks.length; i++) {
            if ( blocks[i].properties.fragment_id === selection['fragment']['fragmentId']) {
                return blocks[i];
            }
        }
        if ( blocks.length) {
            return blocks[0];
        }
        throw new Error( 'No selected fragment');
    }
    $scope.hasFragments       =   function() {
        return $scope.getSubroutines().length > 0;
    }

    $scope.setComponentMode       =   function( mode, $event) {
        $log.log( 'WorkflowEditorController setComponentMode mode', mode, $event);

        if ( !$event) {
            $log.log( 'WorkflowEditorController just notified. Exiting ...');
            return;
        }

        $scope.componentMode   =   mode;
//        $location.search({ sv : mode, sc:null})
        $state.go( 'convoworks-editor-service.editor', { sv : $scope.componentMode, sb:null}, { inherit:true, reload:false, notify:true, location:true});
    }
    $scope.getComponentMode       =   function() {
        return $scope.componentMode;
    }
}
