(function(window) {
    // "use strict";

    var connection = null,
        content = $("#content_chat"),
        chat = $("#chat"),
        seentyping = $("#seen-typing"),
        input = $("#input"),
        $this = window || this,
         // host = "//artinity.dtdns.net",
        host = "//localhost",
        port = 3777,
        app_id = "kpj",
        channel = "kpj",
        connect = false,
        online = false,
        window_active = null,
        myName = null,
        myInfo = null,
        sound = false,
        ip_address = null,
        msgs = [],
        id = null,
        sender = null,
        popup = null,
        chat_with = null,
        chat_with_id = null,
        timer,
        timer_reconnect,
        reconnect_count = 1,
        blocked = false,
        pending_seen = false,
        screen = $(window).width(),
        audio = new Audio("toing.mp3");

    window.WebSocket = window.WebSocket || window.MozWebSocket;



    // ========================================== NOT SUPPORTED ====================================================

    if (!window.WebSocket) {
        console.log("Sorry, but your browser doesn't support WebSockets.");
        return;
    }


    var get_time2 = function(dt) {
        var time = (dt.getHours() < 10 ? "0" + dt.getHours() : dt.getHours()) + ":" (dt.getMinutes() < 10 ? "0" + dt.getMinutes() : dt.getMinutes());
        return time;
    }

    function checkTime(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    function get_time() {
        var today = new Date(),
            h = today.getHours(),
            m = today.getMinutes(),
            s = today.getSeconds();
        h = checkTime(h);
        m = checkTime(m);
        s = checkTime(s);
        var time = h + ":" + m;
        return time;
    }

    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }


    function executeFunctionByName(functionName, context, args) {
        var args = [].slice.call(arguments).splice(2);
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
        }

        connection.onerror = function(error) {
            console.error("Sorry, but there's some problem with your connection or the server is down.");
            connect = false;
            reconnect_this();
        }

        connection.onmessage = function(message) {
            try {
                var json = JSON.parse(message.data);
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
                executeFunctionByName(json.functions, window, json.arguments);
            } else if (json.type === "open") {
                sender = json.author_id;
                popup = json.url;
            } else if (json.type === "chat") {
                if (!localStorage.getItem("chat")) {
                    $("#chat_icon").trigger("click");
                }
            } else if (json.type === "unmute") {
                sound = true;
            } else if (json.type === "app_id") {
                if (json.app_id !== app_id) {
                    app_id = json.app_id;
                }
            } else if (json.type === "my-info") {
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
                }).error(function(){
                    myInfo = {};
                    myInfo.agent = navigator.userAgent;
                    myInfo.screen = screen;
                    myInfo.active = window_active;
                    myInfo.ip = ip_address;
                    connection.send(JSON.stringify({
                        id: id,
                        msg: "/info",
                        myinfo: myInfo,
                        receipient: json.author_id,
                    }));
                });
            } else if (json.type === "info") {
                //
            } else if (json.type === "leave") {
                if(localStorage.getItem("chat_with")) {
                    if(json.user_id == localStorage.getItem("chat_with_id")) {
                        sender = null;
                        addMessage(
                            "",
                            json.msg,
                            "server",
                            json.time
                        );
                        $("#chat_header").html(null);
                        localStorage.removeItem("chat_with");
                        localStorage.removeItem("chat_with_id");
                    }
                }
            } else if (json.type === "connected") {
                connection.send(JSON.stringify({
                    id: id,
                    msg: "/appid",
                    app_id: app_id
                }));
                var pw = "";
                if (localStorage.getItem("myPassword_ui")) {
                    pw = " "+localStorage.getItem("myPassword_ui");
                }
                connection.send(JSON.stringify({
                    id: id,
                    channel: channel,
                    msg: "/nick " + myName+pw,
                    ip_address: ip_address,
                    operator: true,
                }));
                if(localStorage.getItem("chat_with")) {
                    chat.html(null);
                    $("#chat_header").html(localStorage.getItem("chat_with"));
                    $("#content_chat_wrapper").fadeIn("50", function(){
                        chat.html(null);
                        input.focus();
                    });
                }
            } else if (json.type === "welcome") {
                var mn = json.nickname.split(" ");
                myName = mn[0];
                online = true;
                localStorage.setItem("myName", myName);
                if (mn[1]) {
                    localStorage.setItem("myPassword_ui", mn[1]);
                }
            } else if (json.type === "online") {
                online = true;
                window_active = false;
            } else if (json.type === "users") {
                if(localStorage.getItem("chat_with")) {
                    return;
                }
                $("#client_list").html(null);
                var x = 1;
                for(var i=0, len=json.users.length; i<len; i++) {
                    var assign;
                    if(json.users[i].operator === true || json.users[i].admin === true) {
                        continue;
                    }
                    if(json.users[i].assigned !== null) {
                        assign = "<span class='assign' onclick=\"skachat.unassign_client('"+json.users[i].id+"')\">Assigned</span>";
                    } else {
                        assign = "<span class=\"not-assign\" onclick=\"skachat.assign_client('"+json.users[i].id+"')\">Not Assigned</span>";
                    }
                    var elem = "<tr class='list'><td><span class='numbering'>"+(x++)+"</span></td><td>"+json.users[i].name+"</td><td>12121212</td><td>"+assign+"</td></tr>";
                    $("#client_list").append(elem);
                }
                $("#total_client").html((x-1));
            } else if (json.type === "assign_client_result") {
                localStorage.setItem("chat_with", json.receipient);
                localStorage.setItem("chat_with_id", json.receipient_id);
                chat_with = json.receipient;
                chat_with_id = json.receipient_id;
                $("#chat_header").html(chat_with);
                $("#content_chat_wrapper").fadeIn("50", function(){
                    chat.html(null);
                    input.focus();
                });
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
        }
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
                if (connection === null && connect === false && blocked !== true) {
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
                        //
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
                        }).error(function(){
                            myInfo = {};
                            myInfo.agent = navigator.userAgent;
                            myInfo.screen = screen;
                            myInfo.active = window_active;
                            myInfo.ip = ip_address;
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

    skachat = {
        assign_client: function(cid) {
            connection.send(JSON.stringify({
                id: id,
                receipient: cid,
                msg: "/assign_client"
            }));
        },
        unassign_client: function(cid) {
            connection.send(JSON.stringify({
                id: id,
                receipient: cid,
                msg: "/unassign_client"
            }));
            chat.html(null);
            $("#content_chat_wrapper").hide();
            localStorage.removeItem("chat_with");
            localStorage.removeItem("chat_with_id");
        },
    }

    function create_id() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

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
        if(!localStorage.getItem("chat_with") && !localStorage.getItem("chat_with_id") || message == "<i>Verified..</i>") {
            return;
        }
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


    content.scroll(function() {
        if($(this).scrollTop()+$(this).height() == chat.height()) {
            $("#new-message").hide();
            if(pending_seen === true) {
                pending_seen = false;
                seen();
            }
        }
    });

    $("#content_chat_wrapper").click(function() {
        if (window.getSelection().type === "Range") {
            return;
        }
        if (popup !== null) {
            window.open(popup);
            popup = null;
            connection.send(JSON.stringify({
                id: id,
                receipient: sender,
                msg: "/seen"
            }));
        }
        input.focus();
        window_active = true;
    });

    function go_here(here) {
        window.location = here;
    }

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
        localStorage.removeItem("myName_admin");
        localStorage.removeItem("myPassword_ui");
    };

    function change_title() {
        if (document.title !== "KPJ Selangor CMS 2.0 - Chat") {
            document.title = "KPJ Selangor CMS 2.0 - Chat";
            seen();
        }
    }



    // ==================================================================================================

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




    console.log("Connecting...");
    if (localStorage.getItem("myId_ui")) {
        id = localStorage.getItem("myId_ui");
        console.log("Existing Id - " + id);
    } else {
        id = create_id();
        localStorage.setItem("myId_ui", id);
        console.log("New Id - " + id);
    }

    if (localStorage.getItem("ip_address")) {
        ip_address = localStorage.getItem("ip_address");
    }

    myName = localStorage.getItem("myName_admin");
    connect_this(host, port);

    setInterval(function() {
        if (connect === true && connection.readyState === 3 && blocked !== true) {
            console.log("You are not connected..");
            console.log("Connecting...");
            connect = false;
            online = false;
            connect_this(host, port);
        }
    }, 3000);

    var reconnect_this = function() {
        reconnect_count++;
        timer_reconnect = setTimeout(function() {
            connect = true;
        }, reconnect_count * 10000);
    }

    window.setTimeout(function(){
        if(connect === true && connection.readyState === 1) {
            connection.send(JSON.stringify({
                id: id,
                msg: "/quit"
            }));
            connection = null;
            connect = false;
            online = false;
            console.log("Disconnected...");
        }
    }, 1800000);

})(this);
