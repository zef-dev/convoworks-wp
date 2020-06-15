

        <script src="bower_components/jquery/dist/jquery.js"></script>
        <script src="bower_components/jquery-ui/jquery-ui.js"></script>
        <script src="bower_components/angular/angular.js"></script>
        
        <script src="bower_components/angular-route/angular-route.js"></script>
        <script src="bower_components/angular-sanitize/angular-sanitize.js"></script>
        <script src="bower_components/angular-animate/angular-animate.js"></script>
        <script src="bower_components/angular-cookies/angular-cookies.js"></script>
        <script src="bower_components/angular-bootstrap/ui-bootstrap.js"></script>
        <script src="bower_components/angular-bootstrap/ui-bootstrap-tpls.js"></script>
        <script src="bower_components/ui-select/dist/select.js"></script>
        <script src="bower_components/ngSticky/dist/sticky.min.js"></script>
        <script src="bower_components/ng-click-select/ng-click-select.js"></script>

        <script type="text/javascript" src="bower_components/ng-dialog/js/ngDialog.min.js"></script>
        <script type="text/javascript" src="bower_components/ng-sortable/dist/ng-sortable.min.js"></script>

        <script src="bower_components/angular-local-storage/dist/angular-local-storage.min.js"></script>

        <script src="bower_components/ng-file-upload/ng-file-upload.js"></script>
        <script src="bower_components/json-formatter/dist/json-formatter.min.js"></script>
        <script src="bower_components/angular-dragdrop/src/angular-dragdrop.js"></script>
		
		<script>
        angular.module('adomee.admin', ['ngRoute', 'ngAnimate', 'ngCookies', 'ngSanitize', 'ngClickSelect',
            'ui.bootstrap', 'ui.select', 
            'LocalStorageModule', 'ngFileUpload', 'as.sortable', 'ngDialog',
            'sticky', 'jsonFormatter']);
        </script>
        

        <script src="app/main-controller.js?v=<?php echo CONVO_VERSION ?>"></script>
        <script src="app/navigation-directive.js?v=<?php echo CONVO_VERSION ?>"></script>

        <script src="app/alexa/alexa-api.js?v=<?php echo CONVO_VERSION ?>"></script>        

		<script src="app/home/home.controller.js?v=<?php CONVO_VERSION?>"></script>
        <script src="app/proto/convo-proto-api.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/proto/login-service.js?v=<?php echo CONVO_VERSION?>"></script>
        
        <script src="app/convoworks/chatbox/convo-chat-api.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/chatbox/chatbox.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        
        <script src="app/proto/users.api.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/proto/oauth.api.js?v=<?php echo CONVO_VERSION?>"></script>
        
        <script src="app/oauth/oauth-login.controller.js?v=<?php echo CONVO_VERSION?>"></script>

        <script src="app/proto/platform-configuration.api.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/configuration/platform-configuration.controller.js?v=<?php echo CONVO_VERSION?>"></script>

        <script src="app/convoworks/convoworks-api.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convo-component-factory.service.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-main.controller.js?v=<?php CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-editor.controller.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/properties-context.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/block-component.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/subroutine-component.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/selectable-component.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/properties-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-toolbox.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-components-container.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-toolbox-component.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-trash.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/convoworks-add-block.service.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/context-elements-container.directive.js?v=<?php echo CONVO_VERSION?>"></script>
		<script src="app/convoworks/context-element.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/variables-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/intent-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/entity-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/releases-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/versions-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/config-amazon-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/config-dialogflow-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/config-convo-chat-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/misc-panel.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/preview-panel.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/editors/intent-utterance-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/editors/system-intent-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/convoworks/editors/convo-intent-editor.directive.js?v=<?php echo CONVO_VERSION?>"></script>


        <script src="app/nav/navbar.directive.js?v=<?php echo CONVO_VERSION?>"></script>

        <script src="app/util/alert-controller.js?v=<?php echo CONVO_VERSION?>"></script>
        <script src="app/util/alert-service.js?v=<?php echo CONVO_VERSION?>"></script>

		<script src="app/util/user-preferences.service.js?v=<?php echo CONVO_VERSION?>"></script>
		<script src="app/util/deferreds-stack.service.js?v=<?php echo CONVO_VERSION?>"></script>







		
		

    <script type="text/javascript">

    angular.module('adomee.admin').constant( 'OR_JS_MK_VERSION', '<?php echo CONVO_VERSION ?>');

    angular.module('adomee.admin').constant( 'CONVO_BASE_URL', '<?php echo CONVO_BASE_URL ?>');

    angular.module('adomee.admin').constant( 'CONVO_PUBLIC_API_BASE_URL', 'rest_public/convo/v1');
    angular.module('adomee.admin').constant( 'CONVO_ADMIN_API_BASE_URL', 'rest_admin/convo/v1');
    angular.module('adomee.admin').constant( 'PROTO_ADMIN_API_BASE_URL', 'rest_admin/proto/v1');
    angular.module('adomee.admin').constant( 'PROTO_PUBLIC_API_BASE_URL', 'rest_public/proto/v1');

    angular.module('adomee.admin').constant( 'WP_NONCE', <?php echo defined('CONVO_WP_NONCE') ? CONVO_WP_NONCE : null ?>);
	</script>
