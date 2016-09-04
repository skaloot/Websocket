var s = new WebSocket('ws://artinity.dtdns.net:3777');
s.onmessage = function(message) {
    var json = JSON.parse(message.data);
    if (json.type === "connected") {
        this.send(JSON.stringify({
            id: '1',
            msg: '/appid',
            app_id: 'ska'
        }));
        this.send(JSON.stringify({
            id: '1',
            msg: '/n chrome',
            channel: 'utiis'
        }));
        this.send(JSON.stringify({
            id: '1',
            msg: '/a'
        }));
    } else {
        console.log(((json.author) ? json.author : '') + ' - ' + ((json.msg) ? json.msg : ''));
        if (json.msg == 'fuckoff') {
            this.send(JSON.stringify({
                id: '1',
                msg: '/quit'
            }));
        }
    }
};
s.onclose = function() {
    console.log('Connection closed');
};
//s.close();
