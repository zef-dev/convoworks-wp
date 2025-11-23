/* @ngInject */
export default function ServiceEditorController($log, $scope, $rootScope, $stateParams, $state, $transitions, $uibModalStack, UserPreferencesService, $timeout) {

    const available_tabs = ['editor', 'variables', 'intents-entities', 'configuration', 'releases', 'import-export', 'test'];
    const tabs_regex = new RegExp(`\/(?:${available_tabs.map(t => _pregEscape(t)).join('|')})(?=\/|\\\?|$)`, 'g');

    // MODAL FIX
    $rootScope.$watch(() => document.querySelectorAll('.modal').length, val => {
        $log.log('ServiceEditorController watching modals');

        for (let modal of document.querySelectorAll('.modal')) {
            if ($uibModalStack.getTop().value.backdrop !== 'static') {
                modal.addEventListener('mousedown', e => {
                    if (e.which === 1) {
                        $uibModalStack.getTop().key.dismiss()
                    }
                })
                modal.querySelector('.modal-content').addEventListener('mousedown', e => {
                    e.stopPropagation()
                })
            }
        }
        if (val > 0) {
            $uibModalStack.getTop().value.backdrop = 'static'
        }
    });

    $transitions.onStart({}, (transition) => {
        transition.promise.finally(() => {
            window.scrollTo({
                left: 0, top: 0
            })
        })
    })

    $scope.tabsExpanded = UserPreferencesService.get( 'navi_expanded', true);
    $scope.serviceId = $stateParams.service_id;

    $log.log( 'ServiceEditorController $state.current', $state.current);

    $scope.isServiceTabActive = function(tabName) {
        const url = $state.href($state.current.name, $state.params, { absolute: false });
        const matches = [...new Set(url.match(tabs_regex))];

        return matches.includes(`/${tabName}`) && matches.findIndex(t => t === `/${tabName}`) === matches.length - 1;
    }

    $scope.isEditorStateActive = function() {
        return $state.includes('convoworks-editor-service.editor');
    }

    $scope.toggleExpanded       =   function() {
        $scope.tabsExpanded = !$scope.tabsExpanded;
        UserPreferencesService.registerData( 'navi_expanded', $scope.tabsExpanded)
    }

    // Header shrink on scroll
    let scrollTimeout;
    let headerElement = null;
    const SCROLL_THRESHOLD = 50;

    function handleScroll() {
        if (!headerElement) {
            headerElement = document.querySelector('.convoworks .header');
        }
        
        if (!headerElement) return;

        const contentsElement = document.querySelector('.convoworks .view > .contents');
        if (!contentsElement) return;

        const scrollTop = contentsElement.scrollTop || window.scrollY || 0;
        const shouldShrink = scrollTop > SCROLL_THRESHOLD;

        if (shouldShrink && !headerElement.classList.contains('header-scrolled')) {
            headerElement.classList.add('header-scrolled');
        } else if (!shouldShrink && headerElement.classList.contains('header-scrolled')) {
            headerElement.classList.remove('header-scrolled');
        }
    }

    // Set up scroll listener after view is ready
    $timeout(() => {
        const contentsElement = document.querySelector('.convoworks .view > .contents');
        if (contentsElement) {
            contentsElement.addEventListener('scroll', () => {
                if (scrollTimeout) {
                    cancelAnimationFrame(scrollTimeout);
                }
                scrollTimeout = requestAnimationFrame(handleScroll);
            });
        }

        // Also listen to window scroll as fallback
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                cancelAnimationFrame(scrollTimeout);
            }
            scrollTimeout = requestAnimationFrame(handleScroll);
        }, { passive: true });
    }, 100);

    // Cleanup on destroy
    $scope.$on('$destroy', () => {
        if (scrollTimeout) {
            cancelAnimationFrame(scrollTimeout);
        }
    });

    function _pregEscape(str, delimiter) {
        delimiter = delimiter || '\\';
        const regex_chars = [".", "\\", "+", "*", "?", "[", "^", "]", "$", "(", ")", "{", "}", "=", "!", "<", ">", "|", ":", "-", "#"];

        for (let i = 0; i < regex_chars.length; i++) {
            str = str.replaceAll(regex_chars[i], `${delimiter}${regex_chars[i]}`);
        }
        return str;
    }
}

