import angular from 'angular';

import configAmazonEditor from './config-amazon-editor.directive';
import configConvoChatEditor from './config-convo-chat-editor.directive';
import configDialogflowEditor from './config-dialogflow-editor.directive';
import configMessengerEditor from './config-messenger-editor.directive';
import configViberEditor from './config-viber-editor.directive';
import configServiceMetaEditor from './config-service-meta-editor.directive';
import miscPanel from './misc-panel.directive';
import releasesEditor from './releases-editor.directive';
import versionsEditor from './versions-editor.directive';

export default angular
  .module('convo.editor.config', [])
  .directive('configAmazonEditor', configAmazonEditor)
  .directive('configConvoChatEditor', configConvoChatEditor)
  .directive('configDialogflowEditor', configDialogflowEditor)
  .directive('configMessengerEditor', configMessengerEditor)
  .directive('configViberEditor', configViberEditor)
  .directive('configServiceMetaEditor', configServiceMetaEditor)
  .directive('miscPanel', miscPanel)
  .directive('releasesEditor', releasesEditor)
  .directive('versionsEditor', versionsEditor)
  .name;
