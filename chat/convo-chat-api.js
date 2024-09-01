/* @ngInject */
export default function ConvoChatApi( $log, $http, CONVO_PUBLIC_API_BASE_URL)
{
    this.sendMessage = sendMessage;

    function sendMessage( serviceId, installationId, deviceId, sessionId, text, isLaunch, variant, timezone )
    {
        if ( !variant) {
            variant =   'develop';
        }

        return $http({
            method: "post",
            url: CONVO_PUBLIC_API_BASE_URL + '/service-run/convo_chat/' + variant + '/' + serviceId,
            data : { installation_id : installationId, device_id : deviceId, session_id : sessionId, text : text, launch : isLaunch, timezone : timezone}
        }).then( function ( response) {
            $log.log('ConvoChatApi sendMessage response.data', response.data);
            return response.data;
        });
    }
};
