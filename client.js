$(function () {
    "use strict";

    var content = $('#content');
    var chat = $('#chat');
    var seentyping = $('#seen-typing');
    var input = $('#input');
    var status = $('#status');
    // var host = "//127.0.0.1";
    // var host = "//175.139.12.245";
    // var host = "//192.168.0.10";
    var host = location.host;
    var port = 3777;
    var connect = false;
    var window_active = true;
    var myName = "You";
    var sound = false;
    var msgs = [];
    var history = 0;
    var id = Math.random();
    var sender = null;
    var timer;

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



    // ========================================== CONNECTING ====================================================

    var connection = new WebSocket('ws:'+host+':'+port);

    connection.onopen = function () {
        input.removeAttr('disabled');
        input.focus();
        connect = true;
        if(localStorage.getItem("myName")) {
            myName = localStorage.getItem("myName");
            connection.send(JSON.stringify({id:id, msg:"/nick "+myName}));
        }
    }

    connection.onerror = function (error) {
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your connection or the server is down.' } ));
        connect = false;
    }



    /// ========================================== GET MSG ====================================================

    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
            // var time = get_time(json.time);
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
            var audio = new Audio('toing.mp3');
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
            for (var i=0; i < json.length; i++) {
                addMessage(
                    "",
                    json.msg[i],
                    "server",
                    json.time
                );
            }
        } else if (json.type === 'info') {
            sender = null;
            addMessage(
                "",
                json.msg,
                "server",
                json.time
            );
        } else if (json.type === 'user-add') {
            sender = null;
            addMessage(
                "",
                json.msg,
                "server",
                json.time
            );
        } else if (json.type === 'user-remove') {
            sender = null;
            addMessage(
                "",
                json.msg,
                "server",
                json.time
            );
        } else if (json.type === 'user-info') {
            sender = null;
            addMessage(
                "",
                json.msg,
                "server",
                json.time
            );
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



    // ========================================== SEND MSG ====================================================

    input.keydown(function(e) {
        var msg = $(this).val();
        if (e.keyCode === 13) {
            if (!msg) {
                return;
            }
            var d = new Date();
            if(msg == "/mute") {
                sender = myName;
                addMessage("", "<i>You just changed your sound to <b>mute</b></i>", "server", (new Date()).getTime());
                sound = false;
            } else if(msg == "/unmute") {
                sender = myName;
                addMessage("", "<i>You just changed your sound to <b>unmute</b></i>", "server", (new Date()).getTime());
                sound = true;
            } else if(msg == "/clear") {
                chat.html("");
            } else {
                if(msg == "/quit") {
                    localStorage.removeItem('myName');
                }
                sender = null;
                connection.send(JSON.stringify({id:id, msg:msg}));
                addMessage(
                    myName+": ", 
                    msg, 
                    "client",
                    (new Date()).getTime()
                );
            }
            msgs.push(msg);
            msgs = msgs.slice(-10);
            $(this).val("");
            history = msgs.length;
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
        if(msg.length === 1 && msg !== "/" && myName !== "You") {
            connection.send(JSON.stringify({id:id, msg:"/typing"}));
        }
    })




    // ========================================== ADD MSG ====================================================

    var addMessage = function(author, message, textClass, time) {
        seentyping.html("");
        chat.append('<p class="'+textClass+'"><b>'+author+'</b> '+ message + ' <span class="time">'+get_time(time)+'</span></p>');
        if(window_active === false) {
            document.title = "..New Message..";
            if(sound === true) {
                var audio = new Audio('toing.mp3');
                audio.play();
            }
        } else {
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
        }
        content.scrollTop(content[0].scrollHeight);
    }

    

    // ========================================== NO RESPOND ====================================================

    setInterval(function() {
        if (connection.readyState !== 1) {
            input.attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
            connect = false;
        }
    }, 3000);



    window.onbeforeunload = function() {
        // if(connect === false) {
        //     return;
        // }
        // return("Please type quit to end your connection. Thank You.");
        // localStorage.removeItem('myName');
    }

    window.onfocus = function() {
        change_title();
        window_active = true;
        // console.log("Window - focus");
    }

    window.onblur = function() {
        window_active = false;
        // console.log("Window - blur");
    }

    window.onclick = function() {
        input.focus();
    }

    function change_title() {
        if(document.title !== "Websocket") {
            document.title = "Websocket";
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
        }
    }

});


