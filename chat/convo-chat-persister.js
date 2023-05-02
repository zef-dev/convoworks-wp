/* @ngInject */
export default function ConvoChatPersister( $log, $window)
{
    this.createPersister = createPersister;
    
    function createPersister( serviceId, sessionId)
    {
        return new ChatPersister( serviceId, sessionId);
    }
    
    
    function ChatPersister( serviceId, sessionId)
    {
        this.serviceId = serviceId;
        this.sessionId = sessionId;
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
            $log.log('ChatPersister _getSessionInformation() returning empty sessionId', this.sessionId, 'session', session);
            return {
                sessionStarted : false
            };
        }
        
        $log.log('ChatPersister _getSessionInformation() sessionId', this.sessionId, 'session', session);
        
        return JSON.parse(session);
    }
    
    ChatPersister.prototype._setSessionInformation = function( session)
    {
        var value = JSON.stringify( session);
        
        $log.log('ChatPersister _setSessionInformation() saving value sessionId', this.sessionId, 'value', value);
        
        $window.localStorage.setItem( this._getSessionKey(), value);
    }
    
    ChatPersister.prototype._getSessionKey = function()
    {
        return 'chat_session_' + this.serviceId + '_' + this.sessionId;
    }   
};


