(function(global) {
    "use strict";

    var connection = null,
        content = $("#content"),
        chat = $(".chat"),
        seentyping = $("#seen-typing"),
        input = $("#input"),
		// host = "//127.0.0.1",
        host = location.host,
        // host = "//artinity.dtdns.net",
        port = 3777,
        app_id = "utiis",
        channel = "utiis",
		channels = [],
        connect = false,
        online = false,
        window_active = null,
        myName = null,
        myInfo = null,
        ip_address = localStorage.getItem("ip_address"),
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
        assigned = null,
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

    function get_time(t) {
        var today = new Date(t),
            h = today.getHours(),
            m = today.getMinutes(),
            s = today.getSeconds();
        h = checkTime(h);
        m = checkTime(m);
        s = checkTime(s);
        var time = h + ":" + m;
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
        chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time() + "</span></p>");
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

            if (json.type === "pong") {
                //
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
            } else if (json.type === "assigned") {
                sender = null;
                assigned = json.assigned;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                sound = true;
                audio.play();
            } else if (json.type === "unassigned") {
                assigned = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
                localStorage.removeItem("client_chat_with_id");
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
                $("#channels-title").hide();
                $("#btn-server").hide();
                $("#btn-restart").hide();
                $("#channels").html(null);
            } else if (json.type === "leave_channel") {
                sender = null;
				chat.hide();
				channel = json.channel;
				app_id = json.channel;
				localStorage.setItem("channel", channel);
				localStorage.setItem("app_id", app_id);
				if(channels.indexOf(channel) !== -1) {
					//
				}
				chat = $("#chat_"+channel);
				chat.show();
				content.scrollTop(chat.height());
				addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
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
            } else if (json.type === "info") {
                sender = null;
                addMessage(
                    "",
                    json.msg,
                    "server",
                    json.time
                );
            } else if (json.type === "leave") {
                if(localStorage.getItem("client_chat_with_id")) {
                    if(json.user_id == localStorage.getItem("client_chat_with_id")) {
                        sender = null;
                        addMessage(
                            "",
                            json.msg,
                            "server",
                            json.time
                        );
                        localStorage.removeItem("client_chat_with_id");
                    }
                }
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
                if (localStorage.getItem("myPassword")) {
                    myPassword = " " + localStorage.getItem("myPassword");
                }
                if (!localStorage.getItem("myName")) {
                    localStorage.setItem("myName", $("#username").val());
                    $("#username").attr("disabled", "disabled");
                }
                localStorage.setItem("myId", id);
                localStorage.setItem("chat", id);
                myName = localStorage.getItem("myName");
                connection.send(JSON.stringify({
                    id: id,
                    channel: channel,
                    msg: "/nick " + myName + myPassword,
                    ip_address: ip_address,
					agent: navigator.userAgent,
                    screen: screen,
                }));
                $("#login").hide();
                $("#bg_login").hide();
                input.focus();
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
                $("#username").val(null);
                $("#username").removeAttr("disabled");
				channels.push(channel);
                $(".chat").attr("id","chat_"+channel);
                chat = $("#chat_"+channel);
                input.focus();
            } else if (json.type === "online") {
                online = true;
                window_active = false;
				channels.push(channel);
                $(".chat").attr("id","chat_"+channel);
                chat = $("#chat_"+channel);
            } else if (json.type === "online_state") {
                //
            } else if (json.type === "users") {
                $("#users").html(null);
                for(var i=0, len=json.users.length; i<len; i++) {
                    if(json.users[i].name == myName) {
                        $("#users").append("<div class='user' onclick=\"ch.whois('"+json.users[i].name+"')\"><b>"+json.users[i].name+"</b></div>");
                    } else {
                        $("#users").append("<div class='user' onclick=\"ch.whois('"+json.users[i].name+"')\">"+json.users[i].name+"</div>");
                    }
                }
            } else if (json.type === "channels") {
                $("#channels-title").show();
                $("#channels").html(null);
                for(var i=0, len=json.channels.length; i<len; i++) {
                    var c = "";
                    var d = "";
                    if(json.channels[i] == channel) {
                        c = "channel-now";
                    } else {
                        d = "onclick=\"ch.chg_channel(this,'"+json.channels[i]+"');\"";
                    }
                    $("#channels").append("<div class='channel "+c+"' onclick=\"ch.chg_channel(this,'"+json.channels[i]+"');\">"+json.channels[i]+"</div>");
                }
                $("#btn-server").show();
                $("#btn-restart").show();
            } else if (json.type === "typing") {
                var h = chat.height()-1;
                if(h < content.height()) {
                    seentyping.html("<i>" + json.author + " is typing..</i>");
                } else if(content.scrollTop()+content.height() >= h) {
                    seentyping.html("<i>" + json.author + " is typing..</i>");
                    content.scrollTop(chat.height());
                }
                window.clearTimeout(timer);
                timer = window.setTimeout(function() {
                    seentyping.html(null);
                }, 5000);
            } else if (json.type === "seen") {
                window.clearTimeout(timer);
                var h = chat.height()-1;
                if(h < content.height()) {
                    seentyping.html("<i>seen by " + json.author + " " + get_time(new Date().getTime()) + "</i>");
                } else if(content.scrollTop()+content.height() >= h) {
                    seentyping.html("<i>seen by " + json.author + " " + get_time(new Date().getTime()) + "</i>");
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
            } else if (json.type === "quit") {
                online = true;
                ch.quit();
            } else if (json.type === "message") {
                sender = json.author_id;
                addMessage(
                    json.author + ": ",
                    json.msg,
                    "client",
                    json.time,
					json.channel
                );
            } else {
                console.log("Hmm..., I\"ve never seen JSON like this: ", json);
            }
        };
    }


    global.ch = {
        chg_channel: function(e,c) {
			$(".channel").removeClass("channel-now");
			$(e).addClass("channel-now");
            connection.send(JSON.stringify({
                id: id,
                msg: "/ch "+c,
            }));
			chat.hide();
			channel = c;
			app_id = c;
			localStorage.setItem("channel", channel);
			localStorage.setItem("app_id", app_id);
			if(channels.indexOf(channel) !== -1) {
				$("#chat_"+channel).show();
			} else {
				$("#content").append("<div class=\"chat\" id=\"chat_"+channel+"\"></div>");
				channels.push(channel);
			}
            chat = $("#chat_"+channel);
			content.scrollTop(chat.height());
        },
		server_detail: function() {
			connection.send(JSON.stringify({
                id: id,
                msg: "/server"
            }));
			content.scrollTop(chat.height());
		},
        restart: function() {
            connection.send(JSON.stringify({
                id: id,
                msg: "/restart"
            }));
            content.scrollTop(chat.height());
        },
		whois: function(u) {
			connection.send(JSON.stringify({
                id: id,
                msg: "/u "+u
            }));
			content.scrollTop(chat.height());
		},
		quit: function() {
			if (online === true) {
				connection.send(JSON.stringify({
					id: id,
					msg: "/quit"
				}));
                connection.close();
				connect = false;
				online = false;
				myName = null;
				connection = null;
                myPassword = "";
				$("#login").show();
				$("#bg_login").show();
                $("#username").val(null).removeAttr("disabled").focus();
				$("#channels-title").hide();
				$("#btn-server").hide();
                $("#btn-restart").hide();
				$("#channels").html(null);
                $("#users").html(null);
				chat.html(null);
				chat.removeAttr("id");
				chat = $(".chat");
				msgs = [];
				channels = [];
				historys = 0;
				localStorage.clear();
				if (window.opener !== null) {
					localStorage.removeItem("chat");
					window.close();
				}
			}
		},
    }


    input.keydown(function(e) {
		if(window_active !== true) {
			window_active = true;
		}
        var msg = $(this).val();
        if (e.keyCode === 13) {
            msg = msg.trim().replace(/\s+/g, " ");
            if (!msg || msg.length === 0) {
                return;
            }
            var d = new Date();
            if (msg == "/mute") {
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
                        (new Date()).getTime(),
						channel
                    );
                    if (msg == "/quit" || msg == "/q") {
                        ch.quit();
                    } else if (msg.substring(0, 9) == "/channel " || msg.substring(0, 4) == "/ch ") {
                        var res = msg.split(" ");
                        var c = res[1];
                        ch.chg_channel(c);
                    } else if (msg == "/reload" || msg == "/r") {
                        connection.send(JSON.stringify({
                            id: id,
                            msg: "/reload"
                        }));
                    } else {
                        connection.send(JSON.stringify({
                            id: id,
                            channel: channel,
                            msg: msg
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

    var addMessage = function(author, message, textClass, time, chnl=null) {
        seentyping.html(null);
		var c = chat;
		if(chnl !== null) {
			if(channels.indexOf(chnl) === -1) {
				$("#content").append("<div class=\"chat\" id=\"chat_"+chnl+"\"></div>");
				channels.push(chnl);
			}
			c = $("#chat_"+chnl);
		}
        var h = c.height()-1;
        c.append("<p class=\"" + textClass + "\"><b>" + author + "</b> " + message + " <span class=\"time\">" + get_time(time) + "</span></p>");
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
                msg: "/seen",
				channel: channel
            }));
        }
    }


    function scroll(h) {
        if(sender == "me" || h < content.height()) {
            content.scrollTop(chat.height());
        } else if(content.scrollTop()+content.height() >= h) {
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
        if($(this).scrollTop()+$(this).height() >= chat.height()-1) {
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
                connect_this(host, port);
				$("#username").attr("disabled","disabled");
            }
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
        localStorage.removeItem("client_chat_with_id");
    };

    function change_title() {
        if (document.title !== "Websocket") {
            document.title = "Websocket";
            seen();
        }
    }

    var check_con = setInterval(function() {
        var h = chat.height()-1;
        if (connect === true && connection.readyState === 3 && blocked !== true) {
            connect = false;
            online = false;
            connect_this(host, port);
            if(h < content.height()) {
                chat.append("<p class=\"server\"><i>You are not connected..</i><span class=\"time\">" + get_time() + "</span></p>");
                chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time() + "</span></p>");
            } else if(content.scrollTop()+content.height() >= h) {
                chat.append("<p class=\"server\"><i>You are not connected..</i><span class=\"time\">" + get_time() + "</span></p>");
                chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time() + "</span></p>");
                content.scrollTop(chat.height());
            }
        }
    }, 3000);
    
    var ping = setInterval(function() {
        if (connect === true && online === true && connection.readyState === 1 && blocked !== true) {
            connection.send(JSON.stringify({
                msg: "/ping"
            }));
        }
    }, 60000);

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



    if (localStorage.getItem("app_id")) {
        app_id = localStorage.getItem("app_id");
        channel = localStorage.getItem("app_id");
    } else {
        localStorage.setItem("app_id", app_id);
        localStorage.setItem("channel", app_id);
    }

    if (localStorage.getItem("myName")) {
        $("#bg_login").hide();
        $("#login").hide();
        if (localStorage.getItem("myId")) {
            id = localStorage.getItem("myId");
            console.log("Existing Id - " + id);
        } else {
            id = create_id();
            localStorage.setItem("myId", id);
            console.log("New Id - " + id);
        }
        localStorage.setItem("chat", id);
        connect_this(host, port);
    }


})(this);
