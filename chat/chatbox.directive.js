import template from './chatbox.tmpl.html';

/* @ngInject */
export default function convoChatbox($log, $timeout, ConvoChatApi, ConvoChatPersister) {

    $log.log('convoChatbox init');

    return {
        restrict: 'E',
        template: template,
        scope: {
            deviceId: '=',
            serviceId: '=',
            sessionId: '=?',
            name: '=?',
            variant: '=?',
            onChatReset: '&?'
        },
        link: function ($scope, $elem, $attrs) {
            $log.log('convoChatbox link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);

            $scope.message = '';
            $scope.messages = [];

            var sending = false;

            var REPROMPT_TIMEOUT = 20 * 1000;
            var SEQUENCE_TIMEOUT = 2 * 1000;
            var reprompt_timeout = null;
            var sequence_timeout = null;

            _init();

            var input = $elem.find('input[type=text]')[0];
            $log.log('convoChatbox link input', input);

            $scope.formSubmitted = function () {
                $log.log('convoChatbox formSubmitted()', $scope.message);
                var msg = $scope.message;

                sending = true;
                if (msg) {
                    _appendBreak();
                    _appendUserMessage(msg);
                }

                _cancelMsgs();

                ConvoChatApi.sendMessage($scope.serviceId, $scope.deviceId, $scope.sessionId, msg, false, $scope.variant).then(function (response) {
                    $log.log('convoChatbox formSubmitted() sendMessage() response', response);
                    $scope.message = '';
                    _readResponse(response);
                }, function (reason) {
                    $log.error('convoChatbox formSubmitted() sendMessage() reason', reason);
                }).finally(function () {
                    $log.log('convoChatbox formSubmitted() sendMessage() finally');
                    sending = false;
                });
            };

            $scope.formDisabled = function () {
                return sending || $scope.message.trim() == '';
            };

            $scope.isSending = function () {
                return sending;
            };

            $scope.close = function () {
                $scope.collapsed = true;
                ConvoChatPersister.setClosed( $scope.sessionId);
                
                $log.log('convoChatbox close() isOpen', ConvoChatPersister.isOpen( $scope.sessionId, false));
            };

            $scope.open = function () {
                $scope.collapsed = false;
                ConvoChatPersister.setOpen( $scope.sessionId);
                
                $log.log('convoChatbox open() isOpen', ConvoChatPersister.isOpen( $scope.sessionId, false));
            };

            function _init() {
                $log.log('convoChatbox _init()');
                sending = true;
                
                $scope.collapsed = !ConvoChatPersister.isOpen( $scope.sessionId, false);
                
                $log.log('convoChatbox _init() $scope.collapsed', $scope.collapsed, '$scope.sessionId', $scope.sessionId);

                ConvoChatApi.sendMessage($scope.serviceId, $scope.deviceId, $scope.sessionId, '', true, $scope.variant).then(function (response) {
                    $log.log('convoChatbox _init() response', response);
                    _readResponse(response);
                }, function (reason) {
                    $log.error('convoChatbox _init() reason', reason);
                }).finally(function () {
                    $log.log('convoChatbox _init() finally');
                    sending = false;
                });
            }

            function _readResponse(data) {
                _appendBreak();
                _appendSequence(data.text_responses, true);

                if (data.text_reprompts.length) {
                    reprompt_timeout = $timeout(function () {
                        _appendBreak();
                        _appendSequence(data.text_reprompts, true);
                    }, REPROMPT_TIMEOUT);
                }
            }

            function _appendSequence(msgs, immediate) {
                if (immediate) {
                    var msg = msgs.shift();
                    _appendConvoResponse([msg]);
                }

                if (msgs.length) {
                    sequence_timeout = $timeout(function () {
                        var msg = msgs.shift();
                        _appendConvoResponse([msg]);
                        if (msgs.length) {
                            _appendSequence(msgs, false);
                        }
                    }, SEQUENCE_TIMEOUT);
                }

            }

            function _cancelMsgs() {
                $timeout.cancel(reprompt_timeout);
                reprompt_timeout = null;
                $timeout.cancel(sequence_timeout);
                sequence_timeout = null;
            }

            function _appendBreak() {
                $scope.messages.push({
                    type: 'break',
                });
            }

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

            // ANIMATE SCROLL
            $scope.$watchCollection('messages', function () {
                $log.log('convoChatbox $watchCollection()');
                setTimeout(function () {
                    $log.log('convoChatbox queue()');
                    var $list = $elem.find('#chat-panel-body');
                    var scrollHeight = $list.prop('scrollHeight');
                    $list.animate({ scrollTop: scrollHeight }, 500);
                }, 10);
            });

            // FOCUS
            $scope.$watch(function () {
                return $scope.isSending();
            }, function (sending) {
                $log.log('convoChatbox $watch() sending', sending);
                setTimeout(function () {
                    $log.log('convoChatbox input.focus()');
                    input.focus();
                }, 10);
            });
        }
    };
}

