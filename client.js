(function(window) {
    "use strict";

    var connection,
        content = $("#content"),
        chat = $("#chat"),
        seentyping = $("#seen-typing"),
        input = $("#input"),
        host = location.host,
        // host = "//artinity.dtdns.net",
        port = 3777,
        app_id = "utiis",
        channel = "utiis",
        connect = false,
        online = false,
        window_active = null,
        myName = null,
        myInfo = null,
        ip_address = $("#ip_address").val(),
        screen = $(window).width(),
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
        pending_seen = false,
        blocked = false,
        audio = new Audio("toing.mp3");


    window.WebSocket = window.WebSocket || window.MozWebSocket;



    if (!window.WebSocket) {
        content.html($("<p>", {
            text: "Sorry, but your browser doesn't support WebSockets."
        }));
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


    function executeFunctionByName(functionName, context, args) {
        args = [].slice.call(arguments).splice(2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        for (var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
    }


    function connect_this(host, port) {
        console.log("Connection start..");
        connection = new WebSocket("ws:" + host + ":" + port);

        connection.onopen = function() {
            console.log(connection);
            connect = true;
            reconnect_count = 1;
        };

        connection.onerror = function(error) {
            chat.html("<p class=\"server\"><i>Sorry, but there's some problem with your connection or the server is down.<br> Reconnecting in " + (reconnect_count * 10) + " seconds. Thank You.</i></p>");
            online = false;
            reconnect_this();
        };

        connection.onmessage = function(message) {
            var json = message.data;
            try {
                json = JSON.parse(json);
            } catch (e) {
                console.log("This doesn't look like a valid JSON: ", message.msg);
                return;
            }

            if (json.type === "ping") {
                connection.send(JSON.stringify({
                    id: id,
                    msg: "/pong"
                }));
            } else if (json.type === "reload") {
                connection.send(JSON.stringify({
                    id: id,
                    receipient: json.author_id,
                    msg: "/seen"
                }));
                window.location = window.location;
            } else if (json.type === "blocked") {
                blocked = true;
                connect = false;
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
                connection.send(JSON.stringify({
                    id: id,
                    receipient: json.author_id,
                    msg: "/seen"
                }));
                if (json.functions == "go_here") {
                    go_here(json.arguments);
                    return;
                }
                sender = null;
                executeFunctionByName(json.functions, window, json.arguments);
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
                if (mn[1]) {
                    localStorage.setItem("myPassword", mn[1]);
                } else {
                    if (localStorage.getItem("myPassword")) {
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
                app_id = json.channel;
                localStorage.setItem("channel", channel);
                localStorage.setItem("app_id", app_id);
            } else if (json.type === "history") {
                sender = null;
                for (var i = 0; i < json.msg.length; i++) {
                    addMessage(
                        json.msg[i].author + ": ",
                        json.msg[i].msg,
                        "client",
                        json.msg[i].time
                    );
                }
            } else if (json.type === "my-info") {
                sender = null;
                if(myInfo !== null) {
                    myInfo.active = window_active;
                    connection.send(JSON.stringify({
                        id: id,
                        msg: "/info",
                        myinfo: myInfo,
                        receipient: json.author_id,
                    }));
                    return;
                }
                $.getJSON("http://ipinfo.io", function(data) {
                    data.agent = navigator.userAgent;
                    data.screen = screen;
                    data.active = window_active;
                    console.log(data);
                    myInfo = data;
                    connection.send(JSON.stringify({
                        id: id,
                        msg: "/info",
                        myinfo: myInfo,
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
                if (localStorage.getItem("app_id")) {
                    localStorage.removeItem("app_id");
                }
            } else if (json.type === "app_id") {
                sender = null;
                if (json.app_id !== app_id) {
                    localStorage.setItem("app_id", json.app_id);
                    app_id = json.app_id;
                    addMessage("", "<i>Your AppId has been changed to <b>" + json.app_id + "</b></i>", "server", (new Date()).getTime());
                }
                channel = json.app_id;
                app_id = json.app_id;
                localStorage.setItem("channel", json.app_id);
                localStorage.setItem("app_id", json.app_id);
            } else if (json.type === "connected") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                connection.send(JSON.stringify({
                    msg: "/appid",
                    app_id: app_id,
                    id: id
                }));
                if (localStorage.getItem("myName") && localStorage.getItem("myId")) {
                    myName = localStorage.getItem("myName");
                    if (localStorage.getItem("myPassword")) {
                        myPassword = " " + localStorage.getItem("myPassword");
                    }
                    connection.send(JSON.stringify({
                        id: id,
                        channel: channel,
                        msg: "/nick " + myName + myPassword,
                        ip_address: ip_address
                    }));
                    $("#login").hide();
                    $("#bg_login").hide();
                    input.focus();
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
                localStorage.setItem("myName", myName);
                if (mn[1]) {
                    localStorage.setItem("myPassword", mn[1]);
                }
                $("#login").hide();
                $("#bg_login").hide();
                $("#username").val(null);
                $("#username").removeAttr("disabled");
                input.focus();
            } else if (json.type === "online") {
                online = true;
                window_active = false;
            } else if (json.type === "users") {
                $("#users").html("<br><div class='user'><b>Online Users</b></div>");
                for(var i=0, len=json.users.length; i<len; i++) {
                    if(json.users[i] == myName) {
                        $("#users").append("<div class='user'><b>"+json.users[i]+"</b></div>");
                    } else {
                        $("#users").append("<div class='user'>"+json.users[i]+"</div>");
                    }
                }
            } else if (json.type === "typing") {
                var h = chat.height();
                if(h < content.height()) {
                    seentyping.html("<i>" + json.author + " is typing..</i>");
                } else if(content.scrollTop()+content.height() == h) {
                    seentyping.html("<i>" + json.author + " is typing..</i>");
                    content.scrollTop(chat.height());
                }
                window.clearTimeout(timer);
                timer = window.setTimeout(function() {
                    seentyping.html(null);
                }, 5000);
            } else if (json.type === "seen") {
                window.clearTimeout(timer);
                var h = chat.height();
                if(h < content.height()) {
                    seentyping.html("<i>seen by " + json.author + " " + get_time((new Date()).getTime()) + "</i>");
                } else if(content.scrollTop()+content.height() == h) {
                    seentyping.html("<i>seen by " + json.author + " " + get_time((new Date()).getTime()) + "</i>");
                    content.scrollTop(chat.height());
                }
            } else if (json.type === "youtube") {
                sender = json.author_id;
                addMessage(
                    json.author + ": ",
                    "<br><iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/"+json.embeded+"?autoplay=1\" frameborder=\"0\" allowfullscreen></iframe>",
                    "client",
                    json.time
                );
            } else if (json.type === "message") {
                sender = json.author_id;
                addMessage(
                    json.author + ": ",
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
            if (msg == "/connect") {
                if (connect === false && connection.readyState !== 1 && blocked !== true) {
                    sender = myName;
                    var time = (new Date()).getTime();
                    chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time(time) + "</span></p>");
                    connect_this(host, port);
                }
            } else if (msg == "/mute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>mute</b></i>", "server", (new Date()).getTime());
                sound = false;
            } else if (msg == "/unmute") {
                sender = null;
                addMessage("", "<i>You just changed your sound to <b>unmute</b></i>", "server", (new Date()).getTime());
                sound = true;
            } else if (msg == "/clear") {
                chat.html(null);
            } else if (msg == "/rr") {
                window.location = window.location;
            } else {
                sender = "me";
                var addmsg = msg;
                if (connect === true) {
                    if (msg.substring(0, 9) == "/youtube " || msg.substring(0, 4) == "/yt ") {
                        var res = msg.split(" ");
                        var embeded = res[1];
                        addmsg = "<br><iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/"+embeded+"?autoplay=1\" frameborder=\"0\" allowfullscreen></iframe>";
                    }
                    addMessage(
                        myName + ": ",
                        addmsg,
                        "client",
                        (new Date()).getTime()
                    );
                    if (msg == "/quit" || msg == "/q") {
                        if (online === true) {
                            connection.send(JSON.stringify({
                                id: id,
                                msg: "/quit"
                            }));
                            connect = false;
                            online = false;
                            chat.html(null);
                            myName = null;
                            $("#login").show();
                            $("#username").focus();
                            $("#bg_login").show();
                            localStorage.removeItem("myName");
                            localStorage.removeItem("myPassword");
                            localStorage.removeItem("myId");
                            localStorage.removeItem("channel");
                            localStorage.removeItem("app_id");
                            if (window.opener !== null) {
                                localStorage.removeItem("chat");
                                window.close();
                            }
                        }
                    } else if (msg == "/reload" || msg == "/r") {
                        connection.send(JSON.stringify({
                            id: id,
                            msg: "/reload"
                        }));
                    } else if (msg == "/info" || msg == "/i") {
                        $.getJSON("http://ipinfo.io", function(data) {
                            data.agent = navigator.userAgent;
                            data.screen = screen;
                            data.active = window_active;
                            console.log(data);
                            myInfo = data;
                            connection.send(JSON.stringify({
                                id: id,
                                msg: "/info",
                                myinfo: myInfo,
                                receipient: null,
                            }));
                        });
                    } else {
                        connection.send(JSON.stringify({
                            id: id,
                            channel: channel,
                            msg: msg.trim()
                        }));
                    }
                }
            }
            msgs.push(msg);
            msgs = msgs.slice(-10);
            historys = msgs.length;
            $(this).val(null);
        } else if (e.keyCode === 40) {
            if (historys < msgs.length) {
                historys++;
            } else {
                historys = 0;
            }
            var m = msgs[historys];
            $(this).val(m);
            return false;
        } else if (e.keyCode === 38) {
            if (historys > 0) {
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
        if (msg.length === 1 && msg !== "/" && myName !== null && online === true) {
            connection.send(JSON.stringify({
                id: id,
                msg: "/typing"
            }));
        }
    });

    var addMessage = function(author, message, textClass, time) {
        seentyping.html(null);
        var h = chat.height();
        chat.append("<p class=\"" + textClass + "\"><b>" + author + "</b> " + message + " <span class=\"time\">" + get_time(time) + "</span></p>");
        scroll(h);
        if (window_active === false) {
            document.title = "..New Message..";
            if (sound === true) {
                audio.play();
            }
        } else {
            seen();
        }
    };


    function seen() {
        if (window_active === true && sender !== null && sender != "me" && pending_seen === false) {
            connection.send(JSON.stringify({
                id: id,
                receipient: sender,
                msg: "/seen"
            }));
        }
    }


    function scroll(h) {
        if(sender == "me" || h < content.height()) {
            content.scrollTop(chat.height());
        } else if(content.scrollTop()+content.height() == h) {
            content.scrollTop(chat.height());
        } else {
            $("#new-message").show();
            pending_seen = true;
        }
    }


    $("#new-message").click(function() {
        $(this).hide();
        content.scrollTop(chat.height());
    });


    $("#content").scroll(function() {
        if(content.scrollTop()+content.height() == chat.height()) {
            $("#new-message").hide();
            if(pending_seen === true) {
                pending_seen = false;
                seen();
            }
        }
    });


    function create_id() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

    $("#username").keydown(function(e) {
        if (e.keyCode === 13) {
            if(($(this).val() == "" || $(this).val() == " ")) {
                return;
            }
            if(connect === false && myName === null) {
                id = create_id();
                localStorage.setItem("myId", id);
                localStorage.setItem("myName", $(this).val());
                connect_this(host, port);
                $(this).attr("disabled", "disabled");
                return;
            }
            sender = null;
            connection.send(JSON.stringify({
                id: id,
                channel: channel,
                msg: "/n "+$(this).val(),
                ip_address: ip_address
            }));
            $(this).attr("disabled", "disabled");
        }
    });

    window.onclick = function() {
        if (this.getSelection().type === "Range") {
            return;
        }
        if(myName === null) {
            $("#username").focus();
            return;
        }
        if (popup !== null) {
            this.open(popup);
            popup = null;
            connection.send(JSON.stringify({
                id: id,
                receipient: sender,
                msg: "/seen"
            }));
        }
        input.focus();
        window_active = true;
    };

    window.onfocus = function() {
        window_active = true;
        change_title();
    };

    window.onblur = function() {
        window_active = false;
    };

    window.onkeydown = function() {
        if (this.getSelection().type === "Range" || myName === null) {
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
        if (document.title !== "Websocket") {
            document.title = "Websocket";
            seen();
        }
    }


    setInterval(function() {
        var h = chat.height();
        if (connect === true && connection.readyState === 3 && blocked !== true) {
            connect = false;
            online = false;
            connect_this(host, port);
            var time = (new Date()).getTime();
            if(h < content.height()) {
                chat.append("<p class=\"server\"><i>You are not connected..</i><span class=\"time\">" + get_time(time) + "</span></p>");
                chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time(time) + "</span></p>");
            } else if(content.scrollTop()+content.height() == h) {
                chat.append("<p class=\"server\"><i>You are not connected..</i><span class=\"time\">" + get_time(time) + "</span></p>");
                chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time(time) + "</span></p>");
                content.scrollTop(chat.height());
            }
        }
    }, 3000);

    var reconnect_this = function() {
        reconnect_count++;
        clearTimeout(timer_reconnect);
        timer_reconnect = setTimeout(function() {
            connect = true;
        }, reconnect_count * 10000);
    };

    function go_here(here) {
        window.location = here;
    }




    console.log("\n" +
        "==============================================================\n" +
        "   __                               __       __    _________\n" +
        "  /  \\  |  /      /\\      |        /  \\     /  \\       |\n" +
        "  |     | /      /  \\     |       /    \\   /    \\      |\n" +
        "   \\    |/      /    \\    |      |      | |      |     |\n" +
        "    \\   |\\     /______\\   |      |      | |      |     |\n" +
        "     |  | \\   /        \\  |       \\    /   \\    /      |\n" +
        "  \\__/  |  \\ /          \\ |_____   \\__/     \\__/       |\n" +
        "  \n" +
        "==============================================================\n" +
        "      -- https://www.facebook.com/skaloot --              \n");




    var time = (new Date()).getTime();
    chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time(time) + "</span></p>");
    if (localStorage.getItem("myId")) {
        id = localStorage.getItem("myId");
        console.log("Existing Id - " + id);
    } else {
        id = create_id();
        localStorage.setItem("myId", id);
        localStorage.setItem("app_id", app_id);
        console.log("New Id - " + id);
    }

    if (localStorage.getItem("app_id")) {
        app_id = localStorage.getItem("app_id");
        channel = localStorage.getItem("app_id");
    } else {
        localStorage.setItem("app_id", app_id);
        localStorage.setItem("channel", app_id);
    }

    if (!localStorage.getItem("myName")) {
        $("#bg_login").show();
        $("#login").show();
        $("#username").focus();
    }

    localStorage.setItem("chat", id);
    connect_this(host, port);


})(this);
