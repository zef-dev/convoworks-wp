(function() {

	'use strict';
	
	angular
		.module('adomee.admin')
		.service('AdmDeferredsStackService', AdmDeferredsStackService);
	
	/* @ngInject */
	function AdmDeferredsStackService( $log)
	{
		
		this.getNew		=	getNew;
    	
        function getNew()
        {
        	return new AdmDeferredsStack();
        }
	}
	

	function AdmDeferredsStack()
	{
		this.groups			=	{};
		this.resoulutions	=	{};
	}
	
	
	AdmDeferredsStack.prototype.registered = function( key)
	{
		var deferreds	=	this._getGroup( key);
		if (deferreds.length) {
			return true;
		}
		return false;
	}
	
	AdmDeferredsStack.prototype.register = function( key, deferred)
	{
		if (key in this.resoulutions)
		{
			deferred.resolve( this.resoulutions[key]);
			delete this.resoulutions[key];
			return;
		}
		
		var deferreds	=	this._getGroup( key);
		deferreds.push( deferred);
	}
	
	AdmDeferredsStack.prototype.resolve = function( key, result)
	{
		var deferreds	=	this._getGroup( key);
		
		if (deferreds.length == 0)
		{
			this.resoulutions[key]	=	result;
			return;
		}
		
		var deferred;
		while (deferred = deferreds.shift()) {
			deferred.resolve( result);
		}
	}
	
	AdmDeferredsStack.prototype.reject = function( key, reason)
	{
		var deferreds	=	this._getGroup( key);
		var deferred;
		while (deferred = deferreds.shift()) {
			deferred.reject( reason);
		}
	}
	
	AdmDeferredsStack.prototype.rejectAll = function()
	{
		for (var key in this.groups)
			this.reject( key, null);
	}
	
	AdmDeferredsStack.prototype._getGroup = function( key)
	{
		if (angular.isUndefined( this.groups[key]))
			this.groups[key] = [];
		return this.groups[key];
	}

})();