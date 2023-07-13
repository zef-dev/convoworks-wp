
export default function ( $stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/convoworks-editor');
    
    $stateProvider
        .state('convoworks-editor-service.configuration-wp-hooks', {
            url: '/configuration/wp-hooks',
            views: {
                'serviceTabView': {
                    template: '<config-wp-hooks-editor service="getSelection().service"></config-wp-hooks-editor>'
                }
            }
        }).state('convoworks-editor-service.configuration-api-builder', {
            url: '/configuration/api-builder',
            views: {
                'serviceTabView': {
                    template: '<config-api-builder-editor service="getSelection().service"></config-api-builder-editor>'
                }
            }
        });
};