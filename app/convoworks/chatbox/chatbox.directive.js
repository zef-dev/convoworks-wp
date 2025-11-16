import template from './chatbox.tmpl.html';

const showdown = require('showdown');

/* @ngInject */
export default function convoChatbox($log, $timeout, AlertService, ConvoworksApi, $sce) {

    $log.log('convoChatbox init');

    return {
        restrict: 'E',
        template: template,
        scope: {
            allowHtml: '=',
            deviceId: '=',
            serviceId: '=',
            collapsed: '=',
            mode: '=',
            sessionId: '=',
            name: '=',
            variant: '=',
            delegateNlp: '=',
            toggleDebug: '=',
            intent: '=',
            exception: '=',
            variables: '=',
            onChatReset: '&'
        },
        link: function ($scope, $elem, $attrs) {
            $log.log('convoChatbox link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);

            $scope.message = '';
            $scope.messages = [];

            var sending = false;
            var writing = false;

            var REPROMPT_TIMEOUT = 20 * 1000;
            // var SEQUENCE_TIMEOUT = 2 * 1000;
            var SEQUENCE_TIMEOUT = 4 * 100;
            var reprompt_timeout = null;
            var sequence_timeout = null;

            var input = $elem.find('textarea')[0];
            $log.log('convoChatbox link input', input);

            _init();

            function _init() {
                $log.log('convoChatbox _init()');
                _makeRequest('', true);
            }

            function _makeRequest( text, isLaunch) {
                $log.log('convoChatbox _makeRequest()');
                sending = true;
                writing = true;

                return ConvoworksApi
                    .sendMessage($scope.serviceId, $scope.deviceId, $scope.sessionId, text, isLaunch, $scope.variant, $scope.delegateNlp, _handleTextResponse)
                    .then(function (response) {
                        $log.log('convoChatbox _makeRequest() response', response);
                        _readFinalResponse(response);
                    })
                    .catch(function (reason) {
                        $log.error('convoChatbox _makeRequest() Error:', reason);
                        AlertService.addDanger('Something went wrong. Please try again later.');
                    })
                    .finally(function () {
                        $log.log('convoChatbox _makeRequest() finally');
                        sending = false;
                        writing = false;
                    });
            }

            function _handleTextResponse(textResponse) {
                // Handle streamed text responses incrementally
                $log.log('Streaming text response:', textResponse);

                // $scope.$applyAsync( () => {
                 //   writing = false;
                // });

                $timeout(function () {
                    _appendConvoResponse([textResponse]);
                }, 150);
            }

            function _readFinalResponse(response) {
                $log.log('convoChatbox _readFinalResponse()', response);
                $scope.$applyAsync( () => {
                    // Handle the final remaining response
                    if (response.variables || response.intent || response.exception) {
                        writing = false;
                        if (response.variables) {
                            $scope.variables = response.variables;
                        }
                        if (response.intent) {
                            $scope.intent = response.intent;
                        }
                        if (response.exception) {
                            $scope.exception = response.exception;
                        }
                    }
                });
            }

            // APPEND
            function _appendConvoResponse(msgs) {
                $log.log('convoChatbox _appendConvoResponse()', msgs);

                for (var i = 0; i < msgs.length; i++) {
                    if (msgs[i] !== undefined && msgs[i] !== null) {
                        $scope.messages.push({
                            text: msgs[i],
                            source: 'convo',
                            avatar: 'img/pbtour-avatar-pb.png'
                        });
                    }
                }
            }

            function _appendUserMessage(msg) {
                $log.log('convoChatbox _appendUserMessage()', msg);
                $scope.messages.push({
                    text: msg,
                    source: 'user',
                    avatar: 'img/pbtour-avatar-me.png'
                });
            }

            function _appendBreak() {
                $scope.messages.push({
                    type: 'break',
                });
            }

            function _cancelMsgs() {
                $timeout.cancel(reprompt_timeout);
                reprompt_timeout = null;
                $timeout.cancel(sequence_timeout);
                sequence_timeout = null;
            }

            // ACTIONS
            $scope.formSubmitted = function () {
                $log.log('convoChatbox formSubmitted()', $scope.message);
                var msg = $scope.message;
                if (msg) {
                    _appendBreak();
                    _appendUserMessage(msg);
                }

                _cancelMsgs();
                _makeRequest(msg, false).then(()=>{
                    $scope.message = '';
                });
            };

            // Handle keydown in textarea: Enter to submit, Shift+Enter for newline
            $scope.handleTextareaKeydown = function ($event) {
                // Only care about Enter key
                if ($event.key === 'Enter' || $event.keyCode === 13) {
                    if ($event.shiftKey) {
                        // Allow default behavior: insert newline
                        return;
                    }

                    // Prevent newline insertion
                    $event.preventDefault();

                    // Do not submit if form is disabled
                    if ($scope.formDisabled()) {
                        return;
                    }

                    // Trigger form submission
                    $scope.formSubmitted();
                }
            };

            // STATUS
            $scope.formDisabled = function () {
                return sending || $scope.message.trim() == '';
            };

            $scope.isSending = function () {
                return sending;
            };

            $scope.isWriting = function () {
                return writing;
            };

            // OTHER
            $scope.copyMessage = function ( text) {
                $log.log('convoChatbox copyMessage()', text);

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

                AlertService.addInfo('Raw message copied to the clipboard.');
            };

            $scope.applyMarkdown = function ( msg) {

                if ( !$scope.allowHtml) {
                    return $sce.trustAsHtml( msg.text);
                }

                if ( msg.source != 'convo') {
                    return $sce.trustAsHtml( msg.text);
                }
                const converter = new showdown.Converter(
                    {
                        disableForced4SpacesIndentedSublists : true
                    }
                );

                const htmlContent = converter.makeHtml( msg.text);

                return $sce.trustAsHtml( htmlContent);
            };

            // WATCH SESSION CHANGE
            $scope.$watch('sessionId', (newVal, oldVal) => {
                $log.log('convoChatbox sessionId changed from', oldVal, 'to', newVal);
                if (newVal === oldVal) {
                    return;
                }

                $log.log('convoChatbox sessionId - reseting chat');

                $scope.messages = [];
                $scope.message = '';
                _cancelMsgs();
                _makeRequest('', true);
            })

            // ANIMATE SCROLL
            $scope.$watchCollection('messages', function () {
                $log.log('convoChatbox $watchCollection()');
                setTimeout(function () {
                    $log.log('convoChatbox queue()');
                    var $list = $elem.find('#chat-panel-body');
                    var scrollHeight = $list.prop('scrollHeight');
                    $list.animate({ scrollTop: scrollHeight }, 200);
                }, 10);
            });

            // FOCUS
            $scope.$watch(function () {
                return sending;
            }, function (sending) {
                $log.log('convoChatbox $watch() sending', sending);
                if (!sending) {
                    setTimeout(function () {
                        $log.log('convoChatbox input.focus()');
                        input.focus();
                    }, 10);
                }
            });
        }
    };
}
