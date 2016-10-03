$(function () {
    "use strict";

    var connection,
        content = $("#content"),
        chat = $("#chat"),
        seentyping = $("#seen-typing"),
        input = $("#input"),
        host = location.host,
    //  host = "//artinity.dtdns.net",
        port = 3777,
        app_id = "ska",
        channel = "utiis",
        connect = false,
        online = false,
        window_active = null,
        myName = "You",
        myPassword = "",
        sound = false,
        msgs = [],
        historys = 0,
        id = null,
        sender = null,
        popup = null,
        timer,
        timer_reconnect,
        reconnect_count = 1,
        audio = new Audio("toing.mp3");


    window.WebSocket = window.WebSocket || window.MozWebSocket;



    if (!window.WebSocket) {
        content.html($("<p>", { text: "Sorry, but your browser doesn't support WebSockets."} ));
        input.hide();
        $("span").hide();
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
        time = h + ":" + m;
        return time;
    }


    function executeFunctionByName(functionName, context , args) {
        args = [].slice.call(arguments).splice(2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        for(var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
    }


    function connect_this(host, port) {
        console.log("Connection start..");
        connection = new WebSocket("ws:"+host+":"+port);

        connection.onopen = function () {
            console.log(connection);
            connect = true;
            reconnect_count = 1;
        };

        connection.onerror = function (error) {
            chat.html(null);
            chat.append("<p class=\"server\"><i>Sorry, but there's some problem with your connection or the server is down.<br> Reconnecting in "+(reconnect_count*10)+" seconds. Thank You.</i></p>");
            connect = false;
            reconnect_this();
        };

        connection.onmessage = function (message) {
            var json = message.data;
            try {
                json = JSON.parse(json);
            } catch (e) {
                console.log("This doesn't look like a valid JSON: ", message.msg);
                return;
            }

            if (json.type === "ping") {
                connection.send(JSON.stringify({id:id, msg:"pong"}));
            } else if (json.type === "reload") {
                connection.send(JSON.stringify({id:id, receipient:json.author_id, msg:"/seen"}));
                window.location = window.location;
            } else if (json.type === "alert") {
                sender = json.author_id;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                audio.play();
            } else if (json.type === "function") {
                if(json.function == "go_here") {
                    go_here(json.arguments);
                    return;
                }
                sender = null;
                executeFunctionByName(json.function, window , json.arguments);
                connection.send(JSON.stringify({id:id, receipient:json.author_id, msg:"/seen"}));
            } else if (json.type === "open") {
                sender = json.author_id;
                popup = json.url;
            } else if (json.type === "unmute") {
                sender = null;
                sound = true;
            } else if (json.type === "newNick") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                var mn = json.nickname.split(" ");
                myName = mn[0];
                localStorage.setItem("myName", myName);
                if(mn[1]) {
                    localStorage.setItem("myPassword", mn[1]);
                } else {
                    if(localStorage.getItem("myPassword")) {
                        localStorage.removeItem("myPassword");
                    }
                }
            } else if (json.type === "newChannel") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                channel = json.channel;
                localStorage.setItem("channel", channel);
            } else if (json.type === "history") {
                sender = null;
                for (var i=0; i < json.msg.length; i++) {
                    addMessage(
                        json.msg[i].author+": ", 
                        json.msg[i].msg,
                        "client",
                        json.msg[i].time
                    );
                }
            } else if (json.type === "my-info") {
                sender = null;
                $.getJSON("http://ipinfo.io", function(data){
                    data.agent = navigator.userAgent;
                    console.log(data);
                    connection.send(JSON.stringify({
                        id: id, 
                        msg: "/info",
                        myinfo: data,
                        receipient: json.author_id,
                    }));
                });
            } else if (json.type === "info") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
            } else if (json.type === "appid_invalid") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                if(localStorage.getItem("app_id")) {
                    localStorage.removeItem("app_id");
                }
            } else if (json.type === "app_id") {
                sender = null;
                if(json.app_id !== app_id) {
                    localStorage.setItem("app_id", json.app_id);
                    app_id = json.app_id;
                    addMessage("", "<i>Your AppId has been changed to <b>"+json.app_id+"</b></i>", "server", (new Date()).getTime());
                }
            } else if (json.type === "connected") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                connection.send(JSON.stringify({msg:"/appid", app_id:app_id}));
                if(localStorage.getItem("myName")) {
                    myName = localStorage.getItem("myName");
                    if(localStorage.getItem("myPassword")) {
                        myPassword = " "+localStorage.getItem("myPassword");
                    }
                    connection.send(JSON.stringify({id:id, channel:channel, msg:"/nick "+myName+myPassword}));
                } else {
                    sender = null;
                    addMessage(
                        "",
                        "<i>Please type in <b>/nick &lt;your name&gt;</b> to begin.</i>",
                        "server",
                        (new Date()).getTime()
                    );
                }
            } else if (json.type === "welcome") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                var mn = json.nickname.split(" ");
                myName = mn[0];
                online = true;
                if(json.url !== null) {
                    $.getJSON(json.url, function(data) {
                        console.log(data);
                    });
                }
                localStorage.setItem("myName", myName);
                if(mn[1]) {
                    localStorage.setItem("myPassword", mn[1]);
                }
            } else if (json.type === "online") {
                online = true;
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
            } else if (json.type === "typing") {
                seentyping.html("<i>"+json.author+" is typing..</i>");
                content.scrollTop(content[0].scrollHeight);
                window.clearTimeout(timer);
                timer = window.setTimeout(function() {
                    seentyping.html(null);
                }, 5000);
            } else if (json.type === "seen") {
                window.clearTimeout(timer);
                seentyping.html("<i>seen by "+json.author+" "+get_time((new Date()).getTime())+"</i>");
                content.scrollTop(content[0].scrollHeight);
            } else if (json.type === "message") {
                sender = json.author_id;
                addMessage(
                    json.author+": ", 
                    json.msg, 
                    "client",
                    json.time
                );
            } else {
                console.log("Hmm..., I\"ve never seen JSON like this: ", json);
            }
        };    
    }


    input.keydown(function(e) {
        var msg = $(this).val();
        if (e.keyCode === 13) {
            msg.trim();
            if (!msg || msg.trim().length === 0) {
                return;
            }
            var d = new Date();
            if(msg == "/connect") {
                if(connect === false && connection.readyState !== 1) {
                    sender = myName;
                    var time = (new Date()).getTime();
                    chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">"+get_time(time)+"</span></p>");
                    connect_this(host, port);
                }
            } else if(msg == "/mute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>mute</b></i>", "server", (new Date()).getTime());
                sound = false;
            } else if(msg == "/unmute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>unmute</b></i>", "server", (new Date()).getTime());
                sound = true;
            } else if(msg == "/clear") {
                chat.html(null);
            } else if(msg == "/rr") {
                window.location = window.location;
            } else {
                if(connect === true) {
                    addMessage(
                        myName+": ", 
                        msg, 
                        "client",
                        (new Date()).getTime()
                    );
                    if(msg == "/quit" || msg == "/q") {
                        if(online === true) {
                            sender = null;
                            connection.send(JSON.stringify({id:id, msg:"/quit"}));
                            connect = false;
                            online = false;
                            chat.html(null);
                            localStorage.removeItem("myName");
                            localStorage.removeItem("myPassword");
                            localStorage.removeItem("myId");
                            localStorage.removeItem("channel");
                            if(window.opener !== null) {
                                localStorage.removeItem("chat");
                                window.close();
                            }
                        }
                    } else if(msg == "/reload" || msg == "/r") {
                        sender = null;
                        connection.send(JSON.stringify({id:id, msg:"/reload"}));
                    } else if(msg == "/info" || msg == "/i") {
                        sender = null;
                        $.getJSON("http://ipinfo.io", function(data){
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
                        connection.send(JSON.stringify({id:id, channel:channel, msg:msg.trim()}));
                    }
                }
            }
            msgs.push(msg);
            msgs = msgs.slice(-10);
            historys = msgs.length;
            $(this).val("");
        } else if (e.keyCode === 40) {
            if(historys < msgs.length) {
                historys++;
            } else {
                historys = 0;
            }
            var m = msgs[historys];
            $(this).val(m);
            return false;
        } else if (e.keyCode === 38) {
            if(historys > 0) {
                historys--;
            } else {
                historys = msgs.length;
            }
            var m = msgs[historys];
            $(this).val(m);
            return false;
        }
    });

    input.keyup(function(e) {
        var msg = $(this).val();
        if(msg.length === 1 && msg !== "/" && myName !== "You" && connect === true && online === true) {
            connection.send(JSON.stringify({id:id, msg:"/typing"}));
        }
    });

    input.focus(function() {
        window_active = true;
    });

    var addMessage = function(author, message, textClass, time) {
        seentyping.html(null);
        chat.append("<p class=\""+textClass+"\"><b>"+author+"</b> "+ message + " <span class=\"time\">"+get_time(time)+"</span></p>");
        if(window_active !== true) {
            document.title = "..New Message..";
            if(sound === true) {
                audio.play();
            }
        } else if(window_active === true) {
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
        }
        content.scrollTop(content[0].scrollHeight);
    };


    function create_id() {
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4();
    }


    content.click(function() {
        if(window.getSelection().type === "Range") {
            return;
        }
        input.focus();
    });

    window.onclick = function() {
        if(popup !== null) {
            window.open(popup);
            popup = null;
            connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
        }
        change_title();
        window_active = true;
    };

    window.onfocus = function() {
        change_title();
        window_active = true;
    };

    window.onblur = function() {
        window_active = false;
    };

    window.onkeydown = function() {
        if(window.getSelection().type === "Range") {
            return;
        }
        input.focus();
    };

    window.onresize = function() {
        content.scrollTop(content[0].scrollHeight);
    };

    window.onbeforeunload = function() {
        localStorage.removeItem("chat");
    };

    function change_title() {
        if(document.title !== "Websocket") {
            document.title = "Websocket";
            if(sender !== null) {
                connection.send(JSON.stringify({id:id, receipient:sender, msg:"/seen"}));
            }
        }
    }


    setInterval(function() {
        if(connect === true && connection.readyState === 3) {
            connect = false;
            online = false;
            connect_this(host, port);
            var time = (new Date()).getTime();
            chat.append("<p class=\"server\"><i>You are not connected..</i><span class=\"time\">"+get_time(time)+"</span></p>");
            chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">"+get_time(time)+"</span></p>");
        }
    }, 3000);

    var reconnect_this = function() {
        reconnect_count++;
        clearTimeout(timer_reconnect);
        timer_reconnect = setTimeout(function() {
            connect = true;
        }, reconnect_count*10000);
    };

    function go_here(here) {
        window.location = here;
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





    var time = (new Date()).getTime();
    chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">"+get_time(time)+"</span></p>");
    if(localStorage.getItem("myId")) {
        id = localStorage.getItem("myId");
        console.log("Existing Id - "+id);
    } else {
        id = create_id();
        localStorage.setItem("myId", id);
        localStorage.setItem("app_id", app_id);
        console.log("New Id - "+id);
    }
    if(localStorage.getItem("channel")) {
        channel = localStorage.getItem("channel");
    } else {
        localStorage.setItem("channel", channel);
    }

    localStorage.setItem("chat",id);
    connect_this(host, port);

    
});
