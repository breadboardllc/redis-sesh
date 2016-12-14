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
		return easyPbkdf2.random( 21, function( buf ) {
			const sessionId = buf.toString( "base64" );
			const args = [self._prefix + sessionId, userId];
			if ( ttl ) {
				args.push("EX", ttl);
			}
			self._client.setnx( args, function( err, result ) {
				if( !err && result === 0) {
					// holy crap, we just had a session collision, just try again.
					self.set(userId, callback);
					return;
				}
				callback(err, err ? undefined : sessionId);
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
		if ( !ttl ) return callback();
		this._client.expire(this._prefix + sessionId, ttl, callback);
	}
};

module.exports = RedisSession;