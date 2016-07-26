$(function () {
    "use strict";

    var connection;
    var $this = window || this;
    var content = $('#content');
    var chat = $('#chat');
    var seentyping = $('#seen-typing');
    var input = $('#input');
    var status = $('#status');
    var reconnect = $('#reconnect');
    // var host = "//127.0.0.1";
    // var host = "//artinity.dtdns.net";
    var host = location.host;
    var port = 3777;
    var app_id = "utiis";
    var connect = false;
    var window_active = true;
    var myName = "You";
    var sound = false;
    var msgs = [];
    var history = 0;
    var id = null;
    var sender = null;
    var popup = null;
    var timer;
    var audio = new Audio('/websocket/toing.mp3');

    window.WebSocket = window.WebSocket || window.MozWebSocket;



    // ========================================== NOT SUPPORTED ====================================================

    if (!window.WebSocket) {
        console.log('Sorry, but your browser doesn\'t support WebSockets.');
        return;
    }


    var get_time2 = function(dt) {
        var time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
        return time;
    }

    function checkTime(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    function get_time(today) {
        var today = new Date();
        var h = today.getHours();
        var m = today.getMinutes();
        var s = today.getSeconds();
        h = checkTime(h);
        m = checkTime(m);
        s = checkTime(s);
        // var time = h + ":" + m + ":" + s;
        var time = h + ":" + m;
        return time;
    }

    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < 5; i++ ) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }


    function strip(html) {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent||tmp.innerText;
    }


    function executeFunctionByName(functionName, context, args) {
        var args = [].slice.call(arguments).splice(2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        for(var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
    }


    function connect_this(host, port) {
        console.log("Connection start..");
        connection = new WebSocket('ws:'+host+':'+port);

        connection.onopen = function () {
            console.log(connection);
        }

        connection.onerror = function (error) {
            console.log('Sorry, but there\'s some problem with your connection or the server is down.');
            connect = false;
        }

        connection.onmessage = function (message) {
            try {
                var json = JSON.parse(message.data);
            } catch (e) {
                console.log('This doesn\'t look like a valid JSON: ', message.msg);
                return;
            }

            if (json.type === 'ping') {
                connection.send(JSON.stringify({id:id, receipient:json.author, msg:"pong"}));
            } else if (json.type === 'reload') {
                connection.send(JSON.stringify({id:id, receipient:json.author, msg:"/seen"}));
                window.location = window.location;
            } else if (json.type === 'alert') {
                sender = null;
                audio.play();
                console.log(json.author+": "+strip(json.msg));
                connection.send(JSON.stringify({id:id, receipient:json.author, msg:"/seen"}));
            } else if (json.type === 'function') {
                sender = null;
                executeFunctionByName(json.function, window , json.arguments);
                connection.send(JSON.stringify({id:id, receipient:json.author, msg:"/seen"}));
            } else if (json.type === 'open') {
                sender = json.author;
                popup = json.url;
            } else if (json.type === 'chat') {
                window.open("/websocket/", "Websocket", "status = 1, height = 400, width = 600, resizable = 1, left = 120px, scroll = 1");
                connection.send(JSON.stringify({id:id, receipient:json.author, msg:"/seen"}));
            } else if (json.type === 'unmute') {
                sender = null;
                sound = true;
            } else if (json.type === 'welcome') {
                sender = null;
                myName = json.nickname;
                connect = true;
                localStorage.setItem("myName", myName);
            } else if (json.type === 'app_id') {
                sender = null;
                if(json.app_id !== app_id) {
                    app_id = json.app_id;
                }
            } else if (json.type === 'my-info') {
                sender = null;
                $.getJSON('http://ipinfo.io', function(data){
                    data.agent = navigator.userAgent;
                    console.log(data);
                    connection.send(JSON.stringify({
                        id: id, 
                        msg: "/info",
                        myinfo: data,
                        receipient: json.author_id,
                    }));
                });
            } else if (json.type === 'info') {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                console.log(json.author+": "+strip(json.msg));
            } else if (json.type === 'connected') {
                connection.send(JSON.stringify({id:id, msg:"/appid", app_id:app_id}));
                if(localStorage.getItem("myName") && localStorage.getItem("myId")) {
                    myName = localStorage.getItem("myName");
                    id = localStorage.getItem("myId");
                } else {
                    myName = makeid();
                }
                connection.send(JSON.stringify({id:id, msg:"/nick "+myName}));
                connection.send(JSON.stringify({id:id, msg:"Page - "+document.title}));
            } else if (json.type === 'typing') {
                console.log(json.author+" is typing..");
            } else if (json.type === 'seen') {
                // console.log("seen by "+json.author);
            } else if (json.type === 'message') {
                sender = json.author;
                addMessage(
                    json.author+": ", 
                    json.msg, 
                    "client",
                    json.time
                );
                console.log(json.author+": "+strip(json.msg));
                if(json.author !== "[server]") {
                    connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
                }
            } else {
                console.log('Hmm..., I\'ve never seen JSON like this: ', json);
            }
        }       
    }




    var addMessage = function(author, message, textClass, time) {
        
    }


    function check_con() {
        var ska_inteval = setInterval(function() {
            if (connection.readyState !== 1) {
                if(localStorage.getItem("myName")) {
                    if(connect === true) {
                        connect_this(host, port);
                        var time = (new Date()).getTime();
                        console.log('You are not connected..');
                        console.log('Connecting...');
                        connect = false;
                    }
                } else {
                    clearInterval(ska_inteval);
                }
            }
        }, 3000);
    }


    console.log('Connecting...');
    if(localStorage.getItem("myId")) {
        id = localStorage.getItem("myId");
        console.log("Existing Id - "+id);
        connect_this(host, port);
        check_con();
    } else {
        $.getJSON("/websocket/user_id.php?user_id", function(data) {
            id = data.user_id;
            localStorage.setItem("myId", id);
            localStorage.setItem("app_id", app_id);
            console.log("New Id - "+id);
            connect_this(host, port);
            check_con();
        });
    }


    function change_title() {

    }

    window.onclick = function() {
        if(popup !== null) {
            window.open(popup);
            popup = null;
            connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
        }
    }

    console.log("\n"
    +"==============================================================\n"
    +"   __                               __       __    _________\n"
    +"  /  \\  |  /      /\\      |        /  \\     /  \\       |\n"
    +"  |     | /      /  \\     |       /    \\   /    \\      |\n"
    +"   \\    |/      /    \\    |      |      | |      |     |\n"
    +"    \\   |\\     /______\\   |      |      | |      |     |\n"
    +"     |  | \\   /        \\  |       \\    /   \\    /      |\n"
    +"  \\__/  |  \\ /          \\ |_____   \\__/     \\__/       |\n"
    +"  \n"
    +"==============================================================\n"
    +"      -- https://www.facebook.com/skaloot --              \n");

});



