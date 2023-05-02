import template from './chatbox.tmpl.html';

/* @ngInject */
export default function convoChatbox($log, $timeout, $window, ConvoChatApi, ConvoChatPersister) {

    $log.log('convoChatbox init');

    return {
        restrict: 'E',
        template: template,
        scope: {
            deviceId: '=',
            serviceId: '=',
            sessionId: '=',
            installationId: '=',
            name: '=?',
            variant: '=?'
        },
        link: function ($scope, $elem, $attrs) 
        {
            $log.log('convoChatbox link $scope.deviceId', $scope.deviceId, '$scope.serviceId', $scope.serviceId);

            var REPROMPT_TIMEOUT = 20 * 1000;
            var SEQUENCE_TIMEOUT = 2 * 1000;
            
            var sending = true;
            var initialized = false;
            var reprompt_timeout = null;
            var sequence_timeout = null;
            var persister = ConvoChatPersister.createPersister( $scope.serviceId, $scope.sessionId);


            $scope.message = '';
            $scope.messages = [];
            $scope.collapsed = !persister.isOpen( false);
            
            $log.log('convoChatbox link() $scope.collapsed', $scope.collapsed, '$scope.sessionId', $scope.sessionId);

            if ( !$scope.collapsed) {
                _init();
            }

            var input = $elem.find('input[type=text]')[0];
            $log.log('convoChatbox link input', input);

            $window.onfocus = function(){
                $log.log('convoChatbox onfocus');
                $scope.$apply( function () {
                    $scope.messages = persister.getMessages();
                });
            }

            $scope.formSubmitted = function () {
                $log.log('convoChatbox formSubmitted()', $scope.message);
                var msg = {
                    text: $scope.message,
                    source: 'user'
                };

                sending = true;
                
                _appendBreak();
                _appendUserMessage(msg);
                _cancelMsgs();

                ConvoChatApi.sendMessage($scope.serviceId, $scope.installationId, $scope.deviceId, $scope.sessionId, $scope.message, false, $scope.variant).then(function (response) {
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
                persister.setClosed();
            };

            $scope.open = function () {
                $scope.collapsed = false;
                persister.setOpen();
            };

            function _init() 
            {
                $log.log('convoChatbox _init()');
                initialized = true;
                
                if ( persister.sessionStarted()) {
                    var messages = persister.getMessages();
                    $log.log('convoChatbox _init() session exists messages', messages);
                    $scope.messages = messages;
                    sending = false;
                } else {
                    ConvoChatApi.sendMessage($scope.serviceId, $scope.installationId, $scope.deviceId, $scope.sessionId, '', true, $scope.variant).then(function (response) {
                        $log.log('convoChatbox _init() response', response);
                        persister.startSession()
                        _readResponse(response);
                    }, function (reason) {
                        $log.error('convoChatbox _init() reason', reason);
                    }).finally(function () {
                        $log.log('convoChatbox _init() finally');
                        sending = false;
                    });
                }
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
                    _appendConvoResponse([{
                        text: msg,
                        source: 'convo'
                    }]);
                }

                if (msgs.length) {
                    sequence_timeout = $timeout(function () {
                        var msg = msgs.shift();
                        _appendConvoResponse([{
                            text: msg,
                            source: 'convo'
                        }]);
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
                persister.setMessages( $scope.messages);
            }

            function _appendConvoResponse(msgs) {
                $log.log('convoChatbox _appendConvoResponse()', msgs);

                for (var i = 0; i < msgs.length; i++) {
                    $scope.messages.push( msgs[i]);
                }
                persister.setMessages( $scope.messages);
            }

            function _appendUserMessage(msg) {
                $log.log('convoChatbox _appendUserMessage()', msg);
                $scope.messages.push( msg);
                persister.setMessages( $scope.messages);
            }

            // POSTPONED INIT
            $scope.$watch('collapsed', function ( val) {
                $log.log('convoChatbox $watch collapsed');
                if ( !val && !initialized) {
                    _init();
                }
            });

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

