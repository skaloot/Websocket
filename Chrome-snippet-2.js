var s = new WebSocket('ws://ec2-54-255-128-252.ap-southeast-1.compute.amazonaws.com:3777');
s.onmessage = function(message) {
    var json = JSON.parse(message.data);
    if (json.type === "connected") {
        this.send(JSON.stringify({
            id: '1',
            msg: '/appid',
            app_id: 'carsome_bidding'
        }));
        this.send(JSON.stringify({
            id: '1',
            msg: '/n chrome',
            item_id: 'type1'
        }));
    } else if (json.type === "countdown_all") {
        console.log(json);
    } else if (json.type === "new_notification") {
        s.close();
    }
};
s.onclose = function() {
    console.log('Connection closed');
};
