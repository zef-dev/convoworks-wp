/* @ngInject */
export default function ConvoChatApi( $log, $http, CONVO_PUBLIC_API_BASE_URL)
{
    this.sendMessage = sendMessage;

    function sendMessage( serviceId, deviceId, sessionId, text, isLaunch, variant)
    {
        if ( !variant) {
            variant =   'develop';
        }

        return $http({
            method: "post",
            url: CONVO_PUBLIC_API_BASE_URL + '/service-run/convo_chat/' + variant + '/' + serviceId,
            data : { device_id : deviceId, session_id : sessionId, text : text, launch : isLaunch}
        }).then( function ( response) {
            $log.log('ConvoChatApi sendMessage response.data', response.data);
            return response.data;
        });
    }
};
