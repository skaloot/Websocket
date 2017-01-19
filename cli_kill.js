    

    var WebSocket = require('websocket').w3cwebsocket;
	var host = "localhost";
	// var host = "ec2-54-255-128-252.ap-southeast-1.compute.amazonaws.com";

    new WebSocket('ws://'+host+':3777').onmessage = function (message) {
        var json = JSON.parse(message.data);
        // console.log(json.type+" - "+json.msg);
        if(json.type=='connected') {
            this.send(JSON.stringify({msg:'/appid',app_id:'carsome_bidding'}));
            this.send(JSON.stringify({id:'abc123',msg:'/n administrator carsome123',item_id:null,market_id:null}));
            this.send(JSON.stringify({id:'abc123',msg:'/kill'}));
            this.close();
        }
    };




