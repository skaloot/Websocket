$(function() {
    "use strict"; 

    var connection,
        $this = window || this,
        //  host = "//artinity.dtdns.net",
        host = location.host,
        port = 3777,
        app_id = "ska",
        channel = "utiis_ui",
        connect = false,
        online = false,
        window_active = true,
        myName = null,
        myInfo = null,
        sound = false,
        ip_address = null,
        msgs = [],
        id = null,
        sender = null,
        popup = null,
        timer,
        timer_reconnect,
        reconnect_count = 1,
        screen = $(window).width(),
        audio = new Audio("/websocket/toing.mp3");

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


    function strip(html) {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText;
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

            if (json.type === "reload") {
                connection.send(JSON.stringify({
                    id: id,
                    receipient: json.author_id,
                    msg: "/seen"
                }));
                window.location = window.location;
            } else if (json.type === "alert") {
                audio.play();
                console.log(json.author + ": " + strip(json.msg));
                connection.send(JSON.stringify({
                    id: id,
                    receipient: json.author_id,
                    msg: "/seen"
                }));
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
                    var chat_window = window.open("/websocket/", "chat_window", "status = 1, height = 400, width = 600, resizable = 1, left = 120px, scroll = 1");
                    connection.send(JSON.stringify({
                        id: id,
                        receipient: json.author_id,
                        msg: "/seen"
                    }));
                }
            } else if (json.type === "unmute") {
                sound = true;
            } else if (json.type === "app_id") {
                if (json.app_id !== app_id) {
                    app_id = json.app_id;
                }
            } else if (json.type === "my-info") {
                if(myInfo !== null) {
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
                console.log(json.author + ": " + strip(json.msg));
            } else if (json.type === "connected") {
                connection.send(JSON.stringify({
                    id: id,
                    msg: "/appid",
                    app_id: app_id
                }));
                if (localStorage.getItem("myName_ui")) {
                    myName = localStorage.getItem("myName_ui");
                } else {
                    myName = makeid();
                    localStorage.setItem("myName_ui", myName);
                }
                connection.send(JSON.stringify({
                    id: id,
                    channel: channel,
                    msg: "/nick " + myName,
                    ip_address: ip_address
                }));
                connection.send(JSON.stringify({
                    id: id,
                    msg: "Page - " + document.title
                }));
            } else if (json.type === "welcome") {
                myName = json.nickname;
            } else if (json.type === "online") {
                online = true;
            } else if (json.type === "typing") {
                //
            } else if (json.type === "seen") {
                // 
            } else if (json.type === "message") {
                console.log(json.author + ": " + strip(json.msg));
                if (sound === true) {
                    audio.play();
                }
                if (json.author !== "[server]") {
                    connection.send(JSON.stringify({
                        id: id,
                        receipient: json.author_id,
                        msg: "/seen"
                    }));
                }
            } else {
                console.log("Hmm..., I\"ve never seen JSON like this: ", json);
            }
        }
    }

    function create_id() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

    function go_here(here) {
        window.location = here;
    }

    $("#chat_icon").click(function() {
        if (!localStorage.getItem("chat")) {
            localStorage.setItem("myName", myName);
            if(localStorage.getItem("myPassword_ui")) {
                localStorage.setItem("myPassword", localStorage.getItem("myPassword_ui"));
            }
            var chat_window = window.open("/websocket/", "chat_window", "status = 1, height = 400, width = 600, resizable = 1, left = 120px, scroll = 1");
        }
    });

    window.onclick = function() {
        if (popup !== null) {
            window.open(popup);
            popup = null;
            connection.send(JSON.stringify({
                id: id,
                receipient: sender,
                msg: "/seen"
            }));
        }
    };


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
    } else {
        $.get("http://kpjselangor.com/ip", function(data) {
            ip_address = data;
            localStorage.setItem("ip_address", ip_address);
        });
    }

    connect_this(host, port);

    setInterval(function() {
        if (connect === true && connection.readyState === 3) {
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
        if(connect === true) {
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

});
