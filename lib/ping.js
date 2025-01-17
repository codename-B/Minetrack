var mcpe_ping = require('mcpe-ping-fixed');
var mcpc_ping = require('mc-ping-updated');

var request = require('request');

var logger = require('./logger');
var util = require('./util');

// This is a wrapper function which will ping once, and update all relevant games on the list
function generateConfig(timeout, callback) {
	try {
		request({
			uri: 'https://games.roblox.com/v1/games/list?_=0',
    		headers: {
    	  		'Content-Type': 'application/json'
    		},
			method: 'GET',
			timeout: timeout
		}, function(err, res, body) {
			if (err) {
				callback(err, null);
			} else {
				var body = JSON.parse(body);
				var games = body["games"];
				if(games != null) {
					var output = [];
					for (var i = 0; i < games.length; i++) {
						var game = games[i];
						var out = {
							ip: game["universeId"],
							name: game["name"],
							type: 'NA',
							category: 'roblox'
						};
						output[i] = out;
						// getThumbnail(timeout, game["universeId"], game, callback)
					}
					console.log(JSON.stringify(output));
				}
			}
		});
	} catch(err) {
		callback(err, null);
	}
}

function pingRobloxAPI(host, timeout, callback) {
	try {
		request({
			uri: host,
    		headers: {
    	  		'Content-Type': 'application/json'
    		},
			method: 'GET',
			timeout: timeout
		}, function(err, res, body) {
			if (err) {
				callback(err, null);
			} else {
				var body = JSON.parse(body);
				var games = body["data"];
				for (var i = 0; i < games.length; i++) {
					var game = games[i];
					getThumbnail(timeout, game["id"], game, callback)
				}
			}
		});
	} catch(err) {
		callback(err, null);
	}
}

function getThumbnail(timeout, universeId, game, callback) {
	request({
		uri: 'https://thumbnails.roblox.com/v1/games/icons?universeIds='+universeId+'&size=150x150&format=Png',
    	headers: {
      		'Content-Type': 'application/json'
    	},
		method: 'GET',
		timeout: timeout
	}, function(err, res, body) {
		if(err) {
			callback(err, null);
		} else {
			var img = JSON.parse(body);
			var fav = null;
			try {
				fav = img["data"][0]["imageUrl"];
			} catch(exception) {}
			
			callback(null, {
				ip: universeId,
				players: {
					online: game["playing"],
					max: game["playing"]
				},
				version: 0,
				favicon: fav
			});
		}
	});
}

// This is a wrapper function for mc-ping-updated, mainly used to convert the data structure of the result.
function pingMinecraftPC(host, port, timeout, callback, version) {
    var startTime = util.getCurrentTimeMs();

	mcpc_ping(host, port, function(err, res) {
	    if (err) {
	        callback(err, null);
	    } else {
	    	// Remap our JSON into our custom structure.
	        callback(null, {
				players: {
					online: res.players.online,
					max: res.players.max
				},
				version: res.version.protocol,
				latency: util.getCurrentTimeMs() - startTime,
				favicon: res.favicon
			});
	    }
	}, timeout, version);
}

// This is a wrapper function for mcpe-ping, mainly used to convert the data structure of the result.
function pingMinecraftPE(host, port, timeout, callback) {
	var startTime = util.getCurrentTimeMs();

	mcpe_ping(host, port || 19132, function(err, res) {
		if (err) {
			callback(err, null);
		} else {
			// Remap our JSON into our custom structure.
			callback(err, {
				players: {
					online: parseInt(res.currentPlayers),
					max: parseInt(res.maxPlayers)
				},
				version: res.version,
				latency: util.getCurrentTimeMs() - startTime
			});
		}
	}, timeout);
}

exports.ping = function(host, port, type, timeout, callback, version) {
	if (type === 'PC') {
		util.unfurlSRV(host, port, function(host, port){
			pingMinecraftPC(host, port || 25565, timeout, callback, version);
		})
	} else if (type === 'PE') {
		pingMinecraftPE(host, port || 19132, timeout, callback);
	} else if (type == 'NA') {
		pingRobloxAPI(host, timeout, callback);
	} else {
		throw new Error('Unsupported type: ' + type);
	}
};
