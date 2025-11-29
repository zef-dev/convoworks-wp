import angular from 'angular';

import configurationView from "./configuration-view.directive";
import configurationMetaView from "./configuration-meta-view.directive";
import configurationPlatformsView from "./configuration-platforms-view.directive";
import configAmazonEditor from './config-amazon-editor.directive';
import configConvoChatEditor from './config-convo-chat-editor.directive';
import configViberEditor from './config-viber-editor.directive';
import configServiceMetaEditor from './config-service-meta-editor.directive';

import './config.scss';

/* @ngInject */
export default angular
    .module('convo.config', [])
    .directive('configurationView', configurationView)
    .directive('configurationMetaView', configurationMetaView)
    .directive('configurationPlatformsView', configurationPlatformsView)
    .directive('configAmazonEditor', configAmazonEditor)
    .directive('configConvoChatEditor', configConvoChatEditor)
    .directive('configViberEditor', configViberEditor)
    .directive('configServiceMetaEditor', configServiceMetaEditor)
    .name;
