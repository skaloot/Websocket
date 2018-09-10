(function(global) {
    "use strict";

    const $ = window.$;
    const jQuery = window.jQuery;
    var connection = null,
        content = $("#content"),
        chat = $(".chat"),
        seentyping = $("#seen-typing"),
        input = $("#input"),
        host = location.host,
        // host = "//utiis.dyndns.org",
        port = 3000,
        protocol = (location.protocol == "https:") ? "wss:" : "ws:",
        app_id = "V1hwS01HRkhTa2hQV0ZwclVWUXdPUT09",
        channel = "ska",
		channels = [],
        connect = false,
        online = false,
        window_active = null,
        myName = null,
        myId = null,
        myInfo = null,
        ip_address = localStorage.ip_address,
        screen = $(window).width(),
        myPassword = "",
        sound = false,
        msgs = [],
        users = [],
        historys = 0,
        id = null,
        sender = null,
        popup = null,
        timer,
        idle,
        interval,
        timer_reconnect,
        timeout = false,
        reconnect_count = 1,
        pending_seen = false,
		pending_seen_channel = false,
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


    var connect_this = function(host, port) {
        connection = new WebSocket(protocol + host + ":" + port);
        chat.append("<p class=\"server\"><i>Connecting...</i><span class=\"time\">" + get_time() + "</span></p>");
        console.log("Connecting..");
        
        connection.onopen = function() {
            console.log("Connected..");
            connect = true;
            timeout = false;
            this.send(JSON.stringify({
                id: myId,
                msg: "/appid",
                app_id: app_id,
            }));

            interval = setInterval(function() {
                if (connect === true && connection && connection.readyState !== 1) ska.error();
            }, 5000);
        }

        connection.onerror = function(error) {
            ska.error();
        }

        connection.onping = function(message) {
            console.log("got ping..");
            this.pong(myId);
        }

        connection.onmessage = function(message) {
            var json = message.data;
            try {
                json = JSON.parse(json);
            } catch (e) {
                //
            }

            if (typeof json == "object") {
                if (json.type === "pong") {
                    //
                } else if (json.type === "reload") {
                    this.send(JSON.stringify({
                        id: myId,
                        receipient: json.author_id,
                        msg: "/seen"
                    }));
                    window.location.reload();
                } else if (json.type === "blocked") {
                    blocked = true;
                    connect = false;
                } else if (json.type === "logout") {
                    ska.quit();
                } else if (json.type === "alert") {
                    sender = json.author_id;
                    addMessage(
                        "",
                        json.msg,
                        "server",
                        json.time,
                        json.channel
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
                    delete localStorage.client_chat_with_id;
                } else if (json.type === "function") {
                    this.send(JSON.stringify({
                        id: myId,
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
                    localStorage.myName = myName;
                    if (mn[1]) {
                        localStorage.myPassword = mn[1];
                    } else {
                        if (localStorage.myPassword) delete localStorage.myPassword;
                    }
                    $("#channels-title-admin").hide();
                    $("#btn-server").hide();
                    $("#btn-restart").hide();
                    $("#channels-admin").html(null);
                } else if (json.type === "history") {
                    sender = null;
                    var h = [];
                    for (var i = 0; i < json.msg.length; i++) {
                        var s = json.msg[i].author;
                        var o = {};
                        o[s] = json.msg[i].msg;
                        o.time = date_std(json.msg[i].time);
                        h.push(o);
                    }
                    output_json(h);
                } else if (json.type === "info") {
                    sender = null;
                    var chnl = null;
                    if(json.channel) {
                        chnl = json.channel;
                    }
                    addMessage(
                        "",
                        json.msg,
                        "server",
                        json.time,
                        chnl
                    );
                } else if (json.type === "leave") {
                    if(localStorage.client_chat_with_id) {
                        if(json.user_id == localStorage.client_chat_with_id) {
                            sender = null;
                            addMessage(
                                "",
                                json.msg,
                                "server",
                                json.time
                            );
                            delete localStorage.client_chat_with_id;
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
                } else if (json.type === "connected") {
                    sender = null;
                    addMessage(
                        "",
                        json.msg,
                        "server",
                        json.time
                    );
                    if (localStorage.myPassword) {
                        myPassword = " " + localStorage.myPassword;
                    }

                    this.send(JSON.stringify({
                        id: myId,
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
                    localStorage.myName = myName;
                    if (mn[1]) localStorage.myPassword = mn[1];

                    $("#username").val(null);
                    $("#username").removeAttr("disabled");
                    $(".chat").attr("id","chat_"+channel);
                    $("#channels-title").show();
                    $("#channels").html(null);
                    chat = $("#chat_"+channel);

                    var chnls = "";
                    for(var i=0, len=json.channels.length; i<len; i++) {
                        var c = "";
                        if(json.channels[i] == channel) {
                            c = " channel-now";
                        } else {
                            $("#content").append("<div class=\"chat\" id=\"chat_"+json.channels[i]+"\"></div>");
                        }
                        chnls += "<div class='channel"+c+"' id=\"c_"+json.channels[i]+"\" onclick=\"ska.chg_channel('"+json.channels[i]+"');\">";
                        chnls += json.channels[i]+"</div><span onclick=\"ska.leave_channel('"+json.channels[i]+"');\" class=\"close-channel\">x</span>";
                    }

                    $("#channels").append(chnls);
                    $(".chat").hide();
                    channels = json.channels;
                    chat.show();
                    input.focus();
                } else if (json.type === "online") {
                    online = true;
                    window_active = false;
                    $(".chat").attr("id","chat_"+channel);
                    chat = $("#chat_"+channel);
                    $("#channels-title").show();
                    $("#channels").html(null);
                    var chnls = "";
                    for(var i=0, len=json.channels.length; i<len; i++) {
                        var c = "";
                        if(json.channels[i] == channel) {
                            c = " channel-now";
                        } else {
                            $("#content").append("<div class=\"chat\" id=\"chat_"+json.channels[i]+"\"></div>");
                        }
                        chnls += "<div class='channel"+c+"' id=\"c_"+json.channels[i]+"\" onclick=\"ska.chg_channel('"+json.channels[i]+"');\">";
                        chnls += json.channels[i]+"</div><span onclick=\"ska.leave_channel('"+json.channels[i]+"');\" class=\"close-channel\">x</span>";
                    }
                    $("#channels").append(chnls);
                    $(".chat").hide();
                    channels = json.channels;
                    chat.show();
                } else if (json.type === "online_state") {
                    //
                } else if (json.type === "users") {
                    if (json.channel != channel) return;
                    $("#users").html(null);
                    for(var i=0, len=json.users.length; i<len; i++) {
                        if(json.users[i].name == myName) {
                            $("#users").append("<div class='user' onclick=\"ska.whois('"+json.users[i].name+"')\"><b>"+json.users[i].name+"</b></div>");
                        } else {
                            $("#users").append("<div class='user' onclick=\"ska.whois('"+json.users[i].name+"')\">"+json.users[i].name+"</div>");
                        }
                    }
                } else if (json.type === "channels") {
                    $("#channels-title").show();
                    $("#channels").html(null);
                    var chnls = "";
                    for(var i=0, len=json.channels.length; i<len; i++) {
                        var c = "";
                        if(json.channels[i] == channel) {
                            c = " channel-now";
                        }
                        chnls += "<div class='channel"+c+"' id=\"c_"+json.channels[i]+"\" onclick=\"ska.chg_channel('"+json.channels[i]+"');\">";
                        chnls += json.channels[i]+"</div><span onclick=\"ska.leave_channel('"+json.channels[i]+"');\" class=\"close-channel\">x</span>";
                    }
                    $("#channels").append(chnls);
                    channels = json.channels;
                } else if (json.type === "channels_admin") {
                    $("#channels-title-admin").show();
                    $("#channels-admin").html(null);
                    for(var i=0, len=json.channels.length; i<len; i++) {
                        var c = "";
                        if(json.channels[i] == channel) {
                            c = " channel-now";
                        }
                        $("#channels-admin").append("<div class='channel"+c+"' id=\"ca_"+json.channels[i]+"\" onclick=\"ska.chg_channel('"+json.channels[i]+"');\">"+json.channels[i]+"</div>");
                    }
                    $("#btn-server").show();
                    $("#btn-restart").show();
                } else if (json.type === "new_channel") {
                    $("#channels-title").show();
                    $("#channels").html(null);
                    var chnls = "";
                    for(var i=0, len=json.channels.length; i<len; i++) {
                        var c = "";
                        if(json.channels[i] == channel) {
                            c = " channel-now";
                        }
                        chnls += "<div class='channel"+c+"' id=\"c_"+json.channels[i]+"\" onclick=\"ska.chg_channel('"+json.channels[i]+"');\">";
                        chnls += json.channels[i]+"</div><span onclick=\"ska.leave_channel('"+json.channels[i]+"');\" class=\"close-channel\">x</span>";
                    }
                    $("#channels").append(chnls);
                    channels = json.channels;
                    ska.chg_channel(json.channel);
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
                    ska.quit();
                } else if (json.type === "json") {
                    sender = null;
                    output_json(json.data);
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
            }
        };
    }


    global.ska = {
        init: function() {
            if (localStorage.channel) channel = localStorage.channel;
            localStorage.channel = channel;

            if (localStorage.myName && localStorage.myId) {
                $("#bg_login").hide();
                $("#login").hide();
                myName = localStorage.myName;
                myId = localStorage.myId;
                connect_this(host, port);
            } else {
                myId = create_id();
                localStorage.myId = myId;
            }
        },
        chg_channel: function(c) {
			$(".channel").removeClass("channel-now");
            connection.send(JSON.stringify({
                id: myId,
                msg: "/ch "+c,
            }));
			chat.hide();
			channel = c;
            localStorage.channel = channel;
			if(channels.indexOf(channel) !== -1) {
				$("#chat_"+channel).show();
			} else {
				$("#content").append("<div class=\"chat\" id=\"chat_"+channel+"\"></div>");
			}
            $("#c_"+c).addClass("channel-now");
            $("#ca_"+c).addClass("channel-now");
            chat = $("#chat_"+channel);
			content.scrollTop(chat.height());
			if(pending_seen_channel === true) {
                pending_seen_channel = false;
                seen();
            }
        },
        leave_channel: function(c) {
            connection.send(JSON.stringify({
                id: myId,
                msg: "/l " + c
            }));
            if(channels.length > 1) $("#content #chat_"+c).remove();
        },
		server_detail: function() {
			connection.send(JSON.stringify({
                id: myId,
                msg: "/server"
            }));
			content.scrollTop(chat.height());
		},
        restart: function() {
            connection.send(JSON.stringify({
                id: myId,
                msg: "/restart"
            }));
            content.scrollTop(chat.height());
        },
		whois: function(u) {
			connection.send(JSON.stringify({
                id: myId,
                msg: "/u "+u
            }));
			content.scrollTop(chat.height());
		},
		quit: function() {
			if (online === true) {
                connection.send(JSON.stringify({
                    id: myId,
                    msg: "/quit"
                }));
                connection.close();
            }
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
            $("#channels-admin").html(null);
            $("#channels-title-admin").hide();
            $("#users").html(null);
            $("#content").html("<div class=\"chat\"></div>");
            chat = $(".chat");
            msgs = [];
            channels = [];
            historys = 0;
            delete localStorage.myId;
            delete localStorage.channel;
            delete localStorage.myName;
            delete localStorage.chat;
            delete localStorage.myPassword;
            delete localStorage.ip_address;
            if (window.opener !== null) window.close();
		},
        error: function() {
            clearInterval(interval);
            chat.html("<p class=\"server\"><i>Sorry, but there's some problem with your connection or the server is down.<br> Reconnecting in " + (reconnect_count * 5) + " seconds. Thank You.</i></p>");
            connect = false;
            online = false;
            if (reconnect_count == 5) {
                reconnect_count = 1;
                return false;
            }
            reconnect_count++;
            setTimeout(function() {
                connect_this(host, port);
            }, (reconnect_count * 5000));
        }
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
                        ska.quit();
                    } else if (msg == "/pong") {
                        connection.pong(myId);
                        connection.send("pong");
                    } else if (msg.substring(0, 9) == "/channel " || msg.substring(0, 4) == "/ch " || msg.substring(0, 3) == "/j " || msg.substring(0, 6) == "/join ") {
                        var res = msg.split(" ");
                        var c = res[1].replace(/[^\w\s]/gi, '');
                        ska.chg_channel(c);
                    } else if (msg.substring(0, 7) == "/leave " || msg.substring(0, 3) == "/l " || msg == "/l") {
                        if(msg == "/l") {
                            var c = channel;
                        } else {
                            var res = msg.split(" ");
                            var c = res[1].replace(/[^\w\s]/gi, '');
                        }
                        ska.leave_channel(c);
                    } else if (msg == "/reload" || msg == "/r") {
                        connection.send(JSON.stringify({
                            id: myId,
                            msg: "/reload"
                        }));
                    } else {
                        connection.send(JSON.stringify({
                            id: myId,
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
                id: myId,
                msg: "/typing",
				channel: channel
            }));
        }
    });


    /* =========================================================== FUNCTION =========================================================== */

    var checkTime = function(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    var get_time = function(t) {
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


    var executeFunctionByName = function(functionName, context, args) {
        args = [].slice.call(arguments).splice(2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        for (var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
    }

    var date_std = function (timestamp) {
        if(!timestamp) timestamp = new Date().getTime();
        if(Math.ceil(timestamp).toString().length == 10) timestamp *= 1000;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000;
        var date = new Date(timestamp - tzoffset);
        var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
        return iso[1] + ' ' + iso[2];
    }

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
        scroll(h, chnl);
        if (window_active === false) {
            document.title = "..New Message..";
            if (sound === true) {
                audio.play();
            }
        } else {
            seen();
        }
    };

    var output_json = function(data) {
        seentyping.html(null);
        var c = chat;
        var h = c.height()-1;
        c.append("<pre>"+JSON.stringify(data, undefined, 2)+"</pre>");
        scroll(h);
        if (window_active === false) {
            document.title = "..New Message..";
            if (sound === true) {
                audio.play();
            }
        } else {
            seen();
        }
    }


    function seen() {
        if (window_active === true && sender !== null && sender != "me" && pending_seen === false && pending_seen_channel === false) {
            connection.send(JSON.stringify({
                id: myId,
                receipient: sender,
                msg: "/seen",
				channel: channel
            }));
        }
    }


    function scroll(h, chnl=null) {
		if(chnl !== null && channel != chnl) {
			pending_seen_channel = true;
		} else if(sender == "me" || h < content.height()) {
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
			if(pending_seen_channel === true) {
                pending_seen_channel = false;
                seen();
				console.log("pending_seen_channel - "+pending_seen_channel);
            }
        }
    });


    var create_id = function() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

    $("#username").keydown(function(e) {
        if (e.keyCode === 13) {
            if(($(this).val() == "" || $(this).val() == " ")) return;

            if(connect === false) {
                myId = create_id();
                myName = $(this).val();
                localStorage.myId = myId;
                localStorage.myName = myName;

                connect_this(host, port);
				$("#username").attr("disabled","disabled");
            }
        }
    });

    window.addEventListener("focus", function() {
        window_active = true;
        change_title();
        clearTimeout(idle);
    }, false);

    window.addEventListener("blur", function() {
        window_active = false;
        clearTimeout(idle);
        if (!connect) return;

        idle = setTimeout(function() {
            console.log("Timeout..");
            timeout = true;
            ska.quit();
        }, 1800000);
        window_active = false;
    }, false);

    window.addEventListener("load", function () {
        ska.init();
    }, false);

    window.addEventListener("offline", function () {
        console.log("Offline..");
    }, false);
    
    window.addEventListener("online", function () {
        console.log("Online..");
    }, false);

    window.addEventListener("click", function () {
        if (this.getSelection().type === "Range") return;
        if (myName === null) return $("#username").focus();

        if (popup !== null) {
            this.open(popup);
            popup = null;
            connection.send(JSON.stringify({
                id: myId,
                receipient: sender,
                msg: "/seen"
            }));
        }
        input.focus();
        window_active = true;
    }, false);

    window.addEventListener("keydown", function () {
        if (this.getSelection().type === "Range" || myName === null) return;
        input.focus();
    }, false);

    window.addEventListener("resize", function () {
        content.scrollTop(content[0].scrollHeight);
    }, false);

    window.addEventListener("beforeunload", function () {
        delete localStorage.chat;
        delete localStorage.client_chat_with_id;
    }, false);


    var change_title = function() {
        if (document.title !== "Websocket") {
            document.title = "Websocket";
            seen();
        }
    }
    
    // var ping = setInterval(function() {
    //     if (connect === true && online === true && connection.readyState === 1 && blocked !== true) {
    //         connection.send("ping");
    //     }
    // }, 60000);

    var go_here = function(here) {
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

})(this);




