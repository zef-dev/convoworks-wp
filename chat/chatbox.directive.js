import template from './chatbox.tmpl.html';

const showdown = require('showdown');

/* @ngInject */
export default function convoChatbox($log, $sce, $timeout, $window, $location, ConvoChatApi, ConvoChatPersister) {

    $log.log('convoChatbox init');

    return {
        restrict: 'E',
        template: template,
        scope: {
            serviceId: '=',
            name: '=?',
            variant: '=?'
        },
        link: function ($scope, $elem, $attrs)
        {
            $log.log('convoChatbox link $scope.serviceId', $scope.serviceId);

            var REPROMPT_TIMEOUT = 20 * 1000;
            var SEQUENCE_TIMEOUT = 2 * 1000;

            var sending = true;
            var initialized = false;
            var reprompt_timeout = null;
            var sequence_timeout = null;

            var device_id       =   ConvoChatPersister.getDeviceId();
            var installation_id =   ConvoChatPersister.getInstallationId( $scope.serviceId);
            var persister       =   ConvoChatPersister.createPersister( $scope.serviceId);
            var session_id      =   persister.getCurrentSessionId();
            var timezone        =   Intl.DateTimeFormat().resolvedOptions().timeZone;

            $scope.message = '';
            $scope.messages = [];
            $scope.collapsed = !persister.isOpen( false);

            $log.log('convoChatbox link() $scope.collapsed', $scope.collapsed, 'session_id', session_id);

            if ( !$scope.collapsed) {
                _init();
            }

            var input = $elem.find('input[type=text]')[0];
            $log.log('convoChatbox link input', input);

            $window.onfocus = function(){
                $log.log('convoChatbox onfocus');
                $scope.$apply( function () {
                    $scope.messages = persister.getMessages();
                    $scope.collapsed = !persister.isOpen( false);
                    session_id      =   persister.getCurrentSessionId();
//                    if ( $scope.messages.length) {
//                        initialized = true;
//                        sending = false;
//                    } else {
//                        initialized = false;
//                        sending = true;
//                    }
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

                ConvoChatApi.sendMessage(
                       $scope.serviceId, installation_id, device_id, session_id,
                       $scope.message, false, $scope.variant, timezone).then( function (response) {
                    $log.log('convoChatbox formSubmitted() sendMessage() response', response);
                    $scope.message = '';
                    _readResponse(response);
                }, function (reason) {
                    $log.error('convoChatbox formSubmitted() sendMessage() reason', reason);
                    _handleError( reason);
                }).finally(function () {
                    $log.log('convoChatbox formSubmitted() sendMessage() finally');
                    sending = false;
                });
            };

            $scope.applyMarkdown = function ( msg) {

                if ( msg.source != 'convo') {
                    return $sce.trustAsHtml( msg.text);
                }
                const converter = new showdown.Converter(
                    {
                        disableForced4SpacesIndentedSublists: true,
                        tables: true,
                        strikethrough: true,
                        tasklists: true,
                        simpleLineBreaks: true,
                        openLinksInNewWindow: true
                    }
                );

                const htmlContent = converter.makeHtml( msg.text);

                return $sce.trustAsHtml( htmlContent);
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

            $scope.reset = function () {
                session_id  = persister.startNewSession();
                persister.setClosed();
                $scope.message = '';
                $scope.messages = [];
                $scope.collapsed = true;

                sending = true;
                initialized = false;
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
                    ConvoChatApi.sendMessage(
                        $scope.serviceId, installation_id, device_id, session_id,
                        '', true, $scope.variant, timezone).then(function (response) {
                        $log.log('convoChatbox _init() response', response);
                        persister.startSession()
                        _readResponse(response);
                    }, function (reason) {
                        $log.error('convoChatbox _init() reason', reason);
                        _handleError( reason);
                    }).finally(function () {
                        $log.log('convoChatbox _init() finally');
                        sending = false;
                    });
                }
            }

            function _handleError( reason) {
                if ( reason.status === 403 || reason.data && reason.data.code === "rest_cookie_invalid_nonce") {
                    if ( $window.confirm( "Your chat session needs to be refreshed to continue securely. Click 'OK' to refresh the page. Please note: if you have unsaved text, make sure to copy it before refreshing.")) {
                        sending = true;
                        $window.location.reload();
                    }
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

