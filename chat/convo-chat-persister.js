/* @ngInject */
export default function ConvoChatPersister( $log, $window)
{
    this.createPersister = createPersister;
    this.getUserId = getUserId;
    this.getInstallationId = getInstallationId;
    this.getDeviceId = getDeviceId;
    
    function getUserId()
    {
        var user_id = $window.localStorage.getItem( 'convo_chat_user_id');
        if ( !user_id) {
            user_id = _generateUUIDV4();
            $window.localStorage.setItem( 'convo_chat_user_id', user_id);
        }
        return user_id;
    }
    
    function getInstallationId( serviceId)
    {
        return getDeviceId() + '_' + serviceId;
    }
    
    function getDeviceId()
    {
        return getUserId();
    }
    
    function _generateUUIDV4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
    
    function createPersister( serviceId, sessionId)
    {
        return new ChatPersister( serviceId, sessionId);
    }
    
    
    function ChatPersister( serviceId)
    {
        this.serviceId = serviceId;
    }
    
    ChatPersister.prototype.getCurrentSessionId = function()
    {
        var key = 'convo_chat_session' + getDeviceId();
        var session_id = $window.localStorage.getItem( key);
        
        if ( !session_id) {
            session_id =  this.startNewSession();
        }
        
        return session_id;
    }    
    
    ChatPersister.prototype.startNewSession = function()
    {
        var key = 'convo_chat_session' + getDeviceId();
        var session_id = _generateUUIDV4();
        $window.localStorage.setItem( key, session_id);
        return session_id;
    }    
    
    ChatPersister.prototype.isOpen = function( defaultOpen)
    {
        var session = this._getSessionInformation();
        
        $log.log('ChatPersister isOpen()', 'session', session);
        
        if ( 'open' in session) {
            return session['open'];
        }
        return defaultOpen;
    }
    
    ChatPersister.prototype.setOpen = function()
    {
        var session = this._getSessionInformation();
        session['open'] = true;
        this._setSessionInformation( session);
    }
    
    ChatPersister.prototype.setClosed = function()
    {
        var session = this._getSessionInformation();
        session['open'] = false;
        this._setSessionInformation( session);
    }
    
    
    ChatPersister.prototype.setMessages = function( messages)
    {
        var session = this._getSessionInformation();
        session['messages'] = messages;
        this._setSessionInformation( session);
    }
    
    ChatPersister.prototype.getMessages = function()
    {
        var session = this._getSessionInformation();
        
        if ( 'messages' in session) {
            return session['messages'];
        }
        return [];
    }
    
    ChatPersister.prototype.sessionStarted = function()
    {
        var session = this._getSessionInformation();
        return session['sessionStarted'];
    }
    
    ChatPersister.prototype.startSession = function()
    {
        var session = this._getSessionInformation();
        session['sessionStarted'] = true;
        this._setSessionInformation( session);
    }
    
    ChatPersister.prototype._getSessionInformation = function()
    {
        var session = $window.localStorage.getItem( this._getSessionKey());
        if ( typeof( session) === 'undefined' || session === null) {
            $log.log('ChatPersister _getSessionInformation() returning empty sessionId', this.getCurrentSessionId(), 'session', session);
            return {
                sessionStarted : false
            };
        }
        
        $log.log('ChatPersister _getSessionInformation() sessionId', this.getCurrentSessionId(), 'session', session);
        
        return JSON.parse(session);
    }
    
    ChatPersister.prototype._setSessionInformation = function( session)
    {
        var value = JSON.stringify( session);
        
        $log.log('ChatPersister _setSessionInformation() saving value sessionId', this.getCurrentSessionId(), 'value', value);
        
        $window.localStorage.setItem( this._getSessionKey(), value);
    }
    
    ChatPersister.prototype._getSessionKey = function()
    {
        return 'chat_session_' + this.serviceId + '_' + this.getCurrentSessionId();
    }   
};


