(function() {
    "use strict";

    angular
        .module('convo.editor')
        .directive('previewPanel', previewPanel);

    /* @ngInject */
    function previewPanel($log, ConvoworksApi, AlertService) {
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

                $scope.generateText = function ( text) {
                    text = "<speak><p>" + text + "</p></speak>";

                    _copyToClipboard(text);
                    AlertService.addInfo("Copied [" + text + "]" + " to clipboard.");
                };

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

                function _copyToClipboard(text) {
                    // Create new element
                    var el = document.createElement('textarea');
                    // Set value (string to be copied)
                    el.value = text;
                    // Set non-editable to avoid focus and move outside of view
                    el.setAttribute('readonly', '');
                    el.style = {position: 'absolute', left: '-9999px'};
                    document.body.appendChild(el);
                    // Select text inside element
                    el.select();
                    // Copy text to clipboard
                    document.execCommand('copy');
                    // Remove temporary element
                    document.body.removeChild(el);
                }
            }
        }
    }
})();