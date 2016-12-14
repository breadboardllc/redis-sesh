"use strict";

const easyPbkdf2 = require("easy-pbkdf2")();

function RedisSession( redisClient, sessionPrefix, ttl ) {
	this._client = redisClient;
	this._prefix = sessionPrefix + ":";
	this._ttl = ttl;
}

RedisSession.prototype = {
	"set": function(userId, callback){
		const ttl = this._ttl;
		return easyPbkdf2.random( 21, function( buf ) {
			const sessionId = buf.toString( "hex" );
			const args = [this._prefix + sessionId, userId];
			if ( ttl ) {
				args.push("EX", ttl);
			}
			this._client.set( args, function( err ) {
				callback(err, err ? undefined : sessionId);
			});
		});
	},
	"get": function(sessionId, callback){
		this._client.get(this.prefix + sessionId, callback);
	},
	"die": function(sessionId, callback){
		this._client.del(this._prefix + sessionId, callback);
	},
	"liv": function(sessionId, callback){
		const ttl = this._ttl;
		if ( ttl ) return callback();
		this._client.expire(this._prefix + sessionId, ttl, callback);
	}
};

module.exports = RedisSession;