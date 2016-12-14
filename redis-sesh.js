"use strict";

const easyPbkdf2 = require("easy-pbkdf2")();

function RedisSession( redisClient, sessionPrefix, ttl ) {
	this._client = redisClient;
	this._prefix = sessionPrefix + ":";
	this._ttl = ttl;
}

RedisSession.prototype = {
	"set": function(userId, callback){
		const self = this;
		const ttl = this._ttl;
		const client = this._client;

		return easyPbkdf2.random( 32, function( buf ) {
			const sessionId = buf.toString( "base64" );
			const prefixed = self._prefix + sessionId;
			const multi = client.multi();

			multi.setnx(prefixed, userId);

			if ( ttl ) {
				multi.expire(prefixed, ttl);
			}
			multi.exec(function(err, replies){
				// we swallow the case where a call to `expire` doesn't work. Cus what cha gunna do?

				const setNxWorked = (replies ? replies[0] : undefined) === 1;
				// if we don't have any errors but setnx failed then we just had a session collision. just try again.
				if ( !err && !setNxWorked ) {
					self.set(userId, callback);
				}
				else if ( err ) {
					// if we had an error, but we DID set the session id, we need to remove that session id
					if ( setNxWorked ){
						self.die(sessionId, function(){
							callback(err);
						});
					}
					// otherwise, just return the error(s)
					else {
						callback(err);
					}
				}
				else {
					// hey, it worked!
					callback(null, sessionId);
				}
			});
		});
	},
	"get": function(sessionId, callback){
		this._client.get(this._prefix + sessionId, callback);
	},
	"die": function(sessionId, callback){
		this._client.del(this._prefix + sessionId, callback);
	},
	"liv": function(sessionId, callback){
		const ttl = this._ttl;
		if ( !ttl ) return callback(null);
		this._client.expire(this._prefix + sessionId, ttl, callback);
	}
};

module.exports = RedisSession;