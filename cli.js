    

    var WebSocket = require('websocket').w3cwebsocket;

    new WebSocket('ws://localhost:3777').onmessage = function (message) {
        var json = JSON.parse(message.data);
        if(json.type=='connected') {
            this.send(JSON.stringify({msg:'/appid',app_id:'ska'}));
            this.send(JSON.stringify({id:'abc1234',msg:'/n administrator phpmysql', channel:'ska'}));
            this.send(JSON.stringify({id:'abc123',msg:'/ping'}));
            // this.send(JSON.stringify({id:'abc123',msg:'/restart'}));
            // this.close();
        }
        if(json.type=='pong') {
            console.log("pong");
            this.send(JSON.stringify({id:'abc123',msg:'/quit'}));
            // this.close();
        }
        // this.close();
    };




