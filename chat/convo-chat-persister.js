/* @ngInject */
export default function ConvoChatPersister( $log, $window)
{
    this.isOpen = isOpen;
    this.setOpen = setOpen;
    this.setClosed = setClosed;

    function isOpen( sessionId, defaultOpen)
    {
        var session = _getSessionInformation( sessionId);
        
        $log.log('ConvoChatPersister isOpen() sessionId', sessionId, 'session', session);
        
        if ( 'open' in session) {
            return session['open'];
        }
        return defaultOpen;
    }

    function setOpen( sessionId)
    {
        var session = _getSessionInformation( sessionId);
        session['open'] = true;
        _setSessionInformation( sessionId, session);
    }

    function setClosed( sessionId)
    {
        var session = _getSessionInformation( sessionId);
        session['open'] = false;
        _setSessionInformation( sessionId, session);
    }
    
    function _getSessionInformation( sessionId)
    {
        var session = $window.localStorage.getItem( 'chat_session_' + sessionId);
        if ( typeof( session) === 'undefined' || session === null) {
            $log.log('ConvoChatPersister _getSessionInformation() returning empty sessionId', sessionId, 'session', session);
            return {};
        }
        
        $log.log('ConvoChatPersister _getSessionInformation() sessionId', sessionId, 'session', session);
        
        return JSON.parse(session);
    }
    
    function _setSessionInformation( sessionId, session)
    {
        var value = JSON.stringify( session);
        
        $log.log('ConvoChatPersister _setSessionInformation() saving value sessionId', sessionId, 'value', value);
        
        $window.localStorage.setItem( 'chat_session_' + sessionId, value);
        
        $log.log('ConvoChatPersister _setSessionInformation() sessionId', sessionId, 'session', session);
        
    }
};
