/* @ngInject */
export default function SystemPlatformsService() {
    this.getSystemPlatforms = getSystemPlatforms;

    function getSystemPlatforms() {
        return [
            {
                platform_id: 'amazon',
                name: 'Amazon',
                display_name: 'Amazon Alexa',
                requires_publish: true,
                icon_class: 'amazon',
                route: 'convoworks-editor-service.configuration-amazon',
                warning_tooltip: 'We do not plan to devlop Alexa related features',
            },
            {
                platform_id: 'viber',
                name: 'Viber',
                display_name: 'Viber',
                requires_publish: true,
                icon_class: 'viber',
                route: 'convoworks-editor-service.configuration-viber',
                warning_tooltip: 'This platform is experimental. Some features may behave unexpectedly and not every aspect may be configurable.',
            },
            {
                platform_id: 'convo_chat',
                name: 'Convo Chat',
                display_name: 'Convo Chat',
                requires_publish: false,
                icon_class: 'convo_chat',
                route: 'convoworks-editor-service.configuration-convo-chat',
            }
        ];
    }
}

