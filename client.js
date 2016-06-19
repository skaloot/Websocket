$(function () {
    "use strict";

    var connection;

    var content = $('#content');
    var chat = $('#chat');
    var seentyping = $('#seen-typing');
    var input = $('#input');
    var status = $('#status');
    var reconnect = $('#reconnect');
    // var host = "//127.0.0.1";
    // var host = "//localhost";
    // var host = "//175.142.186.238";
    // var host = "//192.168.0.10";
    var host = location.host;
    // var port = 8080;
    var port = 3777;
    var connect = false;
    var window_active = true;
    var myName = "You";
    var sound = false;
    var msgs = [];
    var history = 0;
    var id;
    var sender = null;
    var timer;
    var audio = new Audio('toing.mp3');

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;



    // ========================================== NOT SUPPORTED ====================================================

    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t support WebSockets.'} ));
        input.hide();
        $('span').hide();
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

    function get_time(time) {
        var today = new Date(time);
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


    function connect_this(host, port) {
        console.log("Connection start..");
        id = Math.random();
        connection = new WebSocket('ws:'+host+':'+port);

        connection.onopen = function () {
            console.log(connection);
            input.removeAttr('disabled');
            if(window_active === true) {
                input.focus();
            }
        }

        connection.onerror = function (error) {
            content.html($('<p>', { text: 'Sorry, but there\'s some problem with your connection or the server is down.' } ));
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
                connection.send(JSON.stringify({id:id, msg:"pong"}));
            } else if (json.type === 'alert') {
                sender = json.author;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                audio.play();
            } else if (json.type === 'welcome') {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                myName = json.nickname;
                connect = true;
                localStorage.setItem("myName", myName);
                localStorage.setItem("myId", id);
            } else if (json.type === 'newNick') {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                myName = json.nickname;
                localStorage.setItem("myName", myName);
            } else if (json.type === 'history') {
                sender = null;
                for (var i=0; i < json.msg.length; i++) {
                    addMessage(
                        json.msg[i].author+": ", 
                        json.msg[i].msg,
                        "client",
                        json.msg[i].time
                    );
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
            } else if (json.type === 'push') {
                sender = null;
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
                audio.play();
                alert(json.msg);
            } else if (json.type === 'info') {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
            } else if (json.type === 'connected') {
                sender = null;
                connect = true;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                if(localStorage.getItem("myName") && localStorage.getItem("myId")) {
                    myName = localStorage.getItem("myName");
                    id = localStorage.getItem("myId");
                    connection.send(JSON.stringify({id:id, msg:"/nick "+myName}));
                } else {
                    sender = null;
                    addMessage(
                        "",
                        "<i>Please type in <b>/nick &lt;your name&gt;</b> to begin.</i>",
                        "server",
                        get_time((new Date()).getTime())
                    );
                }
            } else if (json.type === 'typing') {
                seentyping.html("<i>"+json.author+" is typing..</i>");
                content.scrollTop(content[0].scrollHeight);
                window.clearTimeout(timer);
                timer = window.setTimeout(function() {
                    seentyping.html("");
                }, 5000);
            } else if (json.type === 'seen') {
                window.clearTimeout(timer);
                seentyping.html("<i>seen by "+json.author+" "+get_time((new Date()).getTime())+"</i>");
                content.scrollTop(content[0].scrollHeight);
            } else if (json.type === 'message') {
                sender = json.author;
                addMessage(
                    json.author+": ", 
                    json.msg, 
                    "client",
                    json.time
                );
            } else {
                console.log('Hmm..., I\'ve never seen JSON like this: ', json);
            }
        }       
    }


    input.keydown(function(e) {
        var msg = $(this).val();
        if (e.keyCode === 13) {
            if (!msg) {
                return;
            }
            var d = new Date();
            if(msg == "/connect") {
                if(connect === false) {
                    sender = myName;
                    var time = (new Date()).getTime();
                    chat.append('<p class="server"><i>Connecting...</i><span class="time">'+get_time(time)+'</span></p>');
                    connect_this(host, port);
                    check_con();
                }
                $(this).val("");
            } else if(msg == "/mute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>mute</b></i>", "server", (new Date()).getTime());
                sound = false;
            } else if(msg == "/unmute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>unmute</b></i>", "server", (new Date()).getTime());
                sound = true;
            } else if(msg == "/clear") {
                chat.html("");
            } else {
                if(connect === true) {
                    addMessage(
                        myName+": ", 
                        msg, 
                        "client",
                        (new Date()).getTime()
                    );
                    msgs.push(msg);
                    msgs = msgs.slice(-10);
                    history = msgs.length;
                    if(msg == "/quit") {
                        sender = null;
                        connection.send(JSON.stringify({id:id, msg:msg}));
                        localStorage.removeItem('myName');
                        localStorage.removeItem('myId');
                        connect = false;
                    } else if(msg == "/info") {
                        sender = null;
                        $.getJSON('http://ipinfo.io', function(data){
                            data.agent = navigator.userAgent;
                            console.log(data);
                            connection.send(JSON.stringify({
                                id: id, 
                                msg: "/info",
                                myinfo: data,
                                receipient: null,
                            }));
                        });
                    } else {
                        sender = null;
                        connection.send(JSON.stringify({id:id, msg:msg}));
                    }
                }
            }
            $(this).val("");
        } else if (e.keyCode === 40) {
            if(history < msgs.length) {
                var m = msgs[history];
                $(this).val(m);
                history++;
            } else {
                history = 0;
                $(this).val("");
            }
        } else if (e.keyCode === 38) {
            if(history > 0) {
                var m = msgs[history-1];
                $(this).val(m);
                history--;
            } else {
                history = msgs.length;
                $(this).val("");
            }
        }
    })

    input.keyup(function(e) {
        var msg = $(this).val();
        if(msg.length === 1 && msg !== "/" && myName !== "You" && connect === true) {
            connection.send(JSON.stringify({id:id, msg:"/typing"}));
        }
    })

    var addMessage = function(author, message, textClass, time) {
        seentyping.html("");
        chat.append('<p class="'+textClass+'"><b>'+author+'</b> '+ message + ' <span class="time">'+get_time(time)+'</span></p>');
        if(window_active === false) {
            document.title = "..New Message..";
            if(sound === true) {
                audio.play();
            }
        } else {
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
        }
        content.scrollTop(content[0].scrollHeight);
    }


    function check_con() {
        var ska_inteval = setInterval(function() {
            if (connection.readyState !== 1) {
                if(localStorage.getItem("myName")) {
                    if(connect === true) {
                        connect_this(host, port);
                        var time = (new Date()).getTime();
                        chat.append('<p class="server"><i>You are not connected..</i><span class="time">'+get_time(time)+'</span></p>');
                        chat.append('<p class="server"><i>Connecting...</i><span class="time">'+get_time(time)+'</span></p>');
                        connect = false;
                    }
                } else {
                    clearInterval(ska_inteval);
                }
            }
        }, 3000);
    }


    var time = (new Date()).getTime();
    chat.append('<p class="server"><i>Connecting...</i><span class="time">'+get_time(time)+'</span></p>');
    connect_this(host, port);
    check_con();


    window.onfocus = function() {
        change_title();
        window_active = true;
    }

    window.onblur = function() {
        window_active = false;
    }

    window.onclick = function() {
        input.focus();
    }

    window.onresize = function() {
        content.scrollTop(content[0].scrollHeight);
    }

    function change_title() {
        if(document.title !== "Websocket") {
            document.title = "Websocket";
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
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


