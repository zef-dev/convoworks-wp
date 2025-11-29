import angular from 'angular';

import TestViewController from './test-view.controller';
import convoTestChatbox from './chatbox';

import './test.scss';

/* @ngInject */
export default angular
    .module('convo.test', [
        convoTestChatbox
    ])
    .controller('TestViewController', TestViewController)
    .name;
