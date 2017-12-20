    

var WebSocket = require('websocket').w3cwebsocket;
console.log("Connecting....");

var ws = new WebSocket('ws://utiis.dyndns.org:3777');
ws.onopen = function() {
	console.log("Connection open..");
	this.send(JSON.stringify({msg:'/appid',app_id:'ska'}));
}
ws.onmessage = function (message) {
	var json = JSON.parse(message.data);
	console.log(json);
	if(json.type=='connected') {
		this.send(JSON.stringify({id:'abc123',msg:'/n skaloot phpmysql', channel:'ska'}));
		this.send(JSON.stringify({id:'abc123',msg:'/ping'}));
		// this.close();
	}
	if(json.type=='pong') {
		console.log("pong");
		// this.send(JSON.stringify({id:'abc123',msg:'/quit'}));
		this.close();
	}
};




