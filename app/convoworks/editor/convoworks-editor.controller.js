/* @ngInject */
export default function ConvoworksEditorController($log, $scope, $rootScope, $stateParams, $state, $transitions, $uibModalStack, UserPreferencesService) {

    const available_tabs = ['editor', 'variables', 'intents-entities', 'configuration', 'releases', 'import-export', 'test'];
    const tabs_regex = new RegExp(`\/(?:${available_tabs.map(t => _pregEscape(t)).join('|')})(?=\/|\\\?|$)`, 'g');

    // MODAL FIX
    $rootScope.$watch(() => document.querySelectorAll('.modal').length, val => {
        $log.log('ConvoworksEditorController watching modals');

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

    $log.log( 'ConvoworksEditorController $state.current', $state.current);

    $scope.isServiceTabActive = function(tabName) {
        const url = $state.href($state.current.name, $state.params, { absolute: false });
        const matches = [...new Set(url.match(tabs_regex))];

        return matches.includes(`/${tabName}`) && matches.findIndex(t => t === `/${tabName}`) === matches.length - 1;
    }

    $scope.toggleExpanded       =   function() {
        $scope.tabsExpanded = !$scope.tabsExpanded;
        UserPreferencesService.registerData( 'navi_expanded', $scope.tabsExpanded)
    }

    function _pregEscape(str, delimiter) {
        delimiter = delimiter || '\\';
        const regex_chars = [".", "\\", "+", "*", "?", "[", "^", "]", "$", "(", ")", "{", "}", "=", "!", "<", ">", "|", ":", "-", "#"];

        for (let i = 0; i < regex_chars.length; i++) {
            str = str.replaceAll(regex_chars[i], `${delimiter}${regex_chars[i]}`);
        }
        return str;
    }
}
