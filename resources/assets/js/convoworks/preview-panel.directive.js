(function() {
    "use strict";

    angular
        .module('adomee.admin')
        .directive('previewPanel', previewPanel);

    /* @ngInject */
    function previewPanel($log, ConvoworksApi) {
        return {
            restrict: 'E',
            scope: {
                service: '='
            },
            require: '^propertiesContext',
            templateUrl: 'app/convoworks/preview-panel.tmpl.html',
            link: function ($scope, $element, $attributes) {
                $log.log('previewPanel link');

                $scope.ready = false;
                $scope.preview = {};

                _init();

                $scope.getUserMessageGroups = function(messages)
                {
                    var found = [];
                    var groups = [];

                    for (var i in messages)
                    {
                        if (!found.includes(messages[i].intent))
                        {
                            found.push(messages[i].intent);
                            groups.push({
                                intent: messages[i].intent,
                                text: messages.filter(function (msg) {
                                    return msg.intent === messages[i].intent;
                                }).map(function (msg) { return msg.text })
                            });
                        }
                    }

                    return groups;
                }

                function _init() {
                    ConvoworksApi.getServicePreview($scope.service.service_id).then(function (preview) {
                        $scope.preview = preview;
                        $scope.ready = true;
                    }, function (reason) {
                        $log.error('previewPanel could not get service preview, reason', reason);
                    });
                }
            }
        }
    }
})();