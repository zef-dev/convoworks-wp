/* @ngInject */
export default function TestViewController($log, $scope, $q, $stateParams, ConvoworksApi, UserPreferencesService, StringService) {
    $log.log('TestViewController initialized');

    $scope.serviceId = $stateParams.service_id;

    const DEVICE_KEY = `adminChatDeviceId_${$scope.serviceId}`;
    const SESSION_KEY = `adminChatSessionId_${$scope.serviceId}`;

    let device_id = UserPreferencesService.get(DEVICE_KEY, `admin-chat-${StringService.generateUUIDV4()}`);
    let session_id = UserPreferencesService.get(SESSION_KEY, `admin-chat-sess-${StringService.generateUUIDV4()}`);

    // Persist identifiers so admin chat can continue previous session across reloads
    UserPreferencesService.registerData(DEVICE_KEY, device_id);
    UserPreferencesService.registerData(SESSION_KEY, session_id);

    $scope.allowHtml = UserPreferencesService.get(`allowHtml_`+ $scope.serviceId, true);
    $scope.toggleDebug = UserPreferencesService.get(`toggleDebug_${$scope.serviceId}`, false);

    $scope.delegateNlp = null;
    $scope.delegateOptions = [
        {
            label: '---',
            value: null
        }
    ];

    $scope.onNlpDelegateUpdated = () => {
        $log.log('TestViewController NLP delegate changed', $scope.delegateNlp);

        UserPreferencesService.registerData(`delegateNlp_${$scope.serviceId}`, $scope.delegateNlp);

        $scope.regenerateSessionId();
    }

    $scope.$watch('toggleDebug', function (newVal) {
        UserPreferencesService.registerData(`toggleDebug_${$scope.serviceId}`, newVal);
    });

    $scope.$watch('allowHtml', function (newVal) {
        UserPreferencesService.registerData(`allowHtml_`+$scope.serviceId, newVal);
    });

    $scope.getDelegateOptions = function () {
        return $scope.delegateOptions;
    }

    $scope.initDelegateOptions = function () {
        _initDelegationNlp();
    }

    $scope.regenerateSessionId = () => {
        $log.log('TestViewController regenerating session ID');
        session_id = `admin-chat-sess-${StringService.generateUUIDV4()}`;
        // Store the new session so subsequent reloads continue with it
        UserPreferencesService.registerData(SESSION_KEY, session_id);
    }

    $scope.getDeviceId = function () {
        return device_id;
    }

    $scope.getSessionId = function () {
        return session_id;
    }

    function _initializeOptions() {
        let initial_delegate = null;

        if (UserPreferencesService.isSet(`delegateNlp_${$scope.serviceId}`))
        {
            initial_delegate = UserPreferencesService.get(`delegateNlp_${$scope.serviceId}`, null);
        }
        else
        {
            $log.log('TestViewController no previously set NLP delegate, checking options', $scope.delegateOptions);
            if ($scope.delegateOptions.length > 1)
            {
                initial_delegate = $scope.delegateOptions.find(d => d.value !== null).value;
                $log.log('TestViewController delegateNlp set to', initial_delegate);
            }
        }

        $scope.delegateNlp = initial_delegate;

        $log.log('TestViewController _init() finished');
    }

    function _initDelegationNlp() {
        $scope.delegateOptions = [
            {
                label: '---',
                value: null
            }
        ];

        ConvoworksApi.loadPlatformConfig($scope.serviceId).then(function (config) {
            $log.log('TestViewController got config', config);

            if (config.amazon && config.amazon.mode === "auto") {
                $scope.delegateOptions.push({
                    label: 'Amazon',
                    value: 'amazon'
                })
            }
        }, (reason) => {
            AlertService.addDanger(reason.data.message);
        }).finally(() => {
            _initializeOptions();
        });
    }
}
