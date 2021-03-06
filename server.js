
"use strict";


/* ============================================= PROCESS ================================================= */

var now = function() {
    return new Date().getTime();
}

var START_TIME = now();

process.title = 'Ska Chat';
process.env.TZ = "Asia/Kuala_Lumpur";
process.on('SIGINT', function() {
    console.log(date_std() + ' Received SIGINT.');
    process.exit(0);
});
process.on('SIGTERM', function (err) {
    console.log(date_std() + " " + err);
    process.exit(0);
});



/* ============================================= VARIABLE ================================================= */

var config = require("./config.js"),
    webSocketServer = config.webSocketServer,
    querystring = config.querystring,
    fs = config.fs,
    channels = [],
    clients = [],
    users = [],
    apps = [],
    channel_list = [],
    blocked_list = [],
    blocked_id = [],
    clean_up,
    timeout = [],
    debug = true,
    msg_count = 0,
    shutdown = false,
    store_msg = false,
    max_connection = 200,
    http = config.http,
    https = config.https,
    fs = config.fs,
    app_id = config.app_id,
    helps = config.helps,
    port = config.port,
    app_list = config.channel_list;


/* ========================================= CREATE SERVER ==================================================== */

var server;

var create_server = function(callback) {
    var h = (config.ssl) ? https : http, options = null;
    if (config.ssl) {
        var options = {
            key: (config.ssl) ? fs.readFileSync(config.ssl_key) : null,
            cert: (config.ssl) ? fs.readFileSync(config.ssl_cert) : null
        };
        server = https.createServer(options, function(request, response) {
            callback(request, response);
        });
    } else {
        server = http.createServer(function(request, response) {
            callback(request, response);
        });
    }
}

create_server(function(request, response) {

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });

    var params = {};
    if (request.url.indexOf("?") !== -1)
        params = config.querystring.parse(request.url.substr(request.url.indexOf("?")+1));

    var url = request.url;
    if (request.url.indexOf("?") !== -1)
        url = request.url.substr(0, request.url.indexOf("?"));

    var req = url.split("/").splice(1),
        e = (req[0]) ? req[0] : null,
        f = (req[1]) ? req[1] : null,
        g = (req[2]) ? req[2] : null,
        h = (req[3]) ? req[3] : null;

    /* =========================== POST REQUEST =========================== */
    if (request.method == "POST") {
        if (f != config.token) return response.end(JSON.stringify({
            status: "Error",
            message: "Invalid Token"
        }));

        if (e == "live_update") {
            config.processPost(request, response, function(data) {
                console.log(data);
            });
        }
        return response.end(JSON.stringify({
            status: "Success"
        }));
    }

    /* =========================== GET REQUEST =========================== */
    if (e === 'users') {
        response.end(JSON.stringify({
            status: 200,
            users: config.get_user(users, f),
        }));
    } else if (e == "fcm") {
        if (f && g && !params.message) config.fcm(f, g);
        if (f && g && params.message) config.fcm(f, g, decodeURI(params.message));

        response.end(JSON.stringify({
            status: "Success",
            fcm: config.fcm_history
        }));
    } else if (e === 'stat') {
        response.end(JSON.stringify({
            runtime: config.DateDiff((new Date()).getTime(), START_TIME, "all"),
            users: config.get_user(users, f),
            channel_list: channel_list,
            timeout: timeout.length
        }));
    }
    response.end(JSON.stringify({
        status: 200,
        message: "Hello there..!"
    }));
});


// =============================================================================================

server.listen(port, function() {
    console.log("\n------------------------------------------------");
    console.log("Start Time : " + new Date());
    console.log("Server is listening on port " + port);
    console.log("------------------------------------------------\n");
});

var wsServer = new webSocketServer({
    httpServer: server
});


config.set_app(apps, app_list);



/* =============================================================== CONNECT =============================================================== */

wsServer.on("request", function(request) {
    if (debug) console.log(config.get_time() + " Total connection : " + wsServer.connections.length);
    if ((typeof request.origin != "undefined" && config.origins.indexOf(request.origin) === -1) || shutdown === true) {
        if (debug) console.log(config.get_time() + " Connection was blocked from origin " + request.origin);
        if (blocked_list.indexOf(request.origin) == -1) {
            blocked_list.push(request.origin);
        }
        request.reject(401, "Go away. You're no authorized.");
        return;
    }
    if (wsServer.connections.length > max_connection) {
        if (debug) console.log(config.get_time() + " Connection reached max value!");
        request.reject(403, "Too many connection.. Please try later..");
        return;
    }
    if (debug) console.log(config.get_time() + " Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin),
        userName = null,
        userId = null,
        appId = null,
        channel = null,
        channels = [],
        ip_address = null,
        flood = false,
        quit = false,
        password = false,
        password_user = null,
        detail,
        detail_temp,
        index = 0,
        is_blocked = false,
        admin = false,
        temp_detail = null,
        origin = request.origin,
        password_shutdown = false,
        shutdown_verified = false;

    connection.id = config.generate_id();

    // ========================================== GET MSG ====================================================

    connection.on("message", function(message) {
        if (message.type == "utf8") {
            var msgs = message.utf8Data;
            try {
                msgs = JSON.parse(msgs);
            } catch (e) {
                if (msgs == "ping") {
                    connection.sendUTF("pong");
                    return;
                }
            }

            // if (debug) console.log(config.get_time() + " Received Message : " + msgs.msg);

            if (check_blocked_id(msgs.id)) {
                if (debug) console.log(config.get_time() + " Blocked ID trying to connect " + msgs.id);
                connection.sendUTF(JSON.stringify({
                    type: "blocked",
                    time: now(),
                    author: "[Server]",
                }));
                connection.sendUTF(JSON.stringify({
                    type: "logout"
                }));
                return;
            }

            if (!msgs.msg) return;
            
            /* =============================================================== NO APP ID =============================================================== */

            if (appId == null) {
                if (msgs.msg == "/appid") {
                    if (msgs.app_id !== config.app_key) {
                        connection.sendUTF(JSON.stringify({
                            type: 'appid_invalid',
                            msg: "<i>App ID is invalid!.",
                            author: "[Server]",
                        }));
                    }

                    appId = config.htmlEntities(msgs.app_id);

                    connection.sendUTF(JSON.stringify({
                        type: "connected",
                        time: now(),
                        msg: "<i>Connected...</i>",
                        author: "[Server]",
                        requests: request.accept
                    }));
                }
                return;
            }
            
            /* =============================================================== SET PASSWORD =============================================================== */

            if (password === true) {
                if (msgs.msg != "/typing" && msgs.msg != "/ping" && msgs.msg != "/seen") {
                    msgs.msg = "/n " + password_user + " " + config.htmlEntities(msgs.msg);
                }
            }
            if (password_shutdown === true) {
                if (msgs.msg == "/typing" || msgs.msg == "/ping" || msgs.msg == "/seen") {
                    return;
                }
                password_shutdown = false;
                check_password(userName, msgs.msg, function(verified) {
                    if (verified === false) {
                        if (debug) console.log("Invalid..");
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Password is invalid.</i>",
                            author: "[Server]",
                        }));
                        return;
                    } else {
                        if (debug) console.log("Shutting down..");
                        ShutTheHellUp();
                        return;
                    }
                });
            }

            /* =============================================================== NO USER ID =============================================================== */

            if (userId === null) {
                if (msgs.msg == "/login") {
                    var sql = "SELECT * FROM chat WHERE email = '" + msgs.email + "';";
                    var obj = {
                        type: "connected",
                        connected: true,
                        time: now(),
                        author: "[Server]",
                        msg: "<i>Connected...</i>",
                    };
                    config.sql("amirosol_newkpj", sql, function(result) {
                        if (result.length > 0) {
                            obj.granted = true;
                            obj.name = result[0].name;
                        } else {
                            obj.granted = false;
                        }
                        connection.sendUTF(JSON.stringify(obj));
                        if (!obj.granted) connection.close();
                    });
                } else if (msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
                    var reconnect = false,
                        admin_password = "",
                        res = msgs.msg.split(" "),
                        nick = config.htmlEntities(res[1]);
                    if (nick == "" || nick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Your nickname is empty.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (!msgs.channel) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Please provide channel.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    
                    if (res[2]) {
                        check_password(nick, res[2], function(verified) {
                            if (verified === false) {
                                if (debug) console.log("Invalid..");
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: now(),
                                    msg: "<i>Oopss.. Invalid password.. Good Bye!</i>",
                                    author: "[Server]",
                                }));

                                setTimeout(function() {
                                    connection.sendUTF(JSON.stringify({
                                        type: "logout"
                                    }));
                                }, 2000);
                            } else {
                                if (debug) console.log("Verified..");
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: now(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                }));
                                admin_password = " " + res[2];
                                admin = true;
                                register_user();
                            }
                        });
                    } else {
                        register_user();
                    }
                    
                    function register_user() {                      
                        config.add_app(apps, msgs.channel);
                        var similliar = false;

                        for (var i = 0, len = users.length; i < len; i++) {
                            if (users[i].user_id == msgs.id) {
                                userName = users[i].user_name;
                                userId = users[i].user_id;
                                channel = users[i].channel;
                                channels = users[i].channels;
                                ip_address = users[i].ip_address;

                                users[i].connection = connection;
                                users[i].active = true;
                                users[i].online = true;
                                users[i].seen = false;
                                users[i].timestamp = now();
                                reconnect = true;

                                connection.user = users[i].detail;

                                if (admin) users[i].admin = true;
                                connection.sendUTF(JSON.stringify({
                                    type: "online",
                                    time: now(),
                                    author: "[Server]",
                                    assigned: users[i].assigned,
                                    nickname: userName + admin_password,
                                    channels: users[i].channels
                                }));
                                if (channel == "kpj" || channel == "kpj_ui") {
                                    connection.sendUTF(JSON.stringify({
                                        type: "online_state",
                                        time: now(),
                                        author: "[Server]",
                                        state: apps["kpj"].online_state
                                    }));
                                }
                                if (admin) {
                                    connection.sendUTF(JSON.stringify({
                                        type: "channels_admin",
                                        channels: app_list
                                    }));
                                    connection.sendUTF(JSON.stringify({
                                        type: "json",
                                        time: now(),
                                        data: server_stat(channel),
                                        author: "[Server]",
                                        channel: channel
                                    }));
                                }
                                online_users(users[i].channel, connection);
                                if (users[i].msg.length > 0) {
                                    connection.sendUTF(JSON.stringify({
                                        type: "info",
                                        time: now(),
                                        msg: "<i>------------------------------------<br></i>",
                                        author: "[Server]",
                                        channel: channel,
                                    }));
                                    for (var n = 0, len2 = users[i].msg.length; n < len2; n++) {
                                        connection.sendUTF(users[i].msg[n]);
                                    }
                                    users[i].msg = [];
                                }
                                break;
                            }
                            if (users[i].user_name == nick && reconnect === false) similliar = true;
                        }
                        if (similliar) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: now(),
                                msg: "<i>Oopss.. Nickname is not available.<br>Please type in <b>/nick &lt;your name&gt;</b> to set your name.</i>",
                                author: "[Server]",
                            }));
                            detail_temp = msgs;
                            return;
                        }
                        if (reconnect === false) {
                            userName = nick;
                            userId = msgs.id;
                            channel = msgs.channel;
                            channels = [msgs.channel];
                            ip_address = msgs.ip_address || detail_temp.ip_address || 0;
                            detail = {
                                connection: connection,
                                user_name: userName,
                                user_id: userId,
                                app_id: appId,
                                channel: msgs.channel,
                                channels: [msgs.channel],
                                ip_address: msgs.ip_address || detail_temp.ip_address || 0,
                                origin: request.origin,
                                seen: false,
                                active: true,
                                online: true,
                                ping: null,
                                ping_: false,
                                ping_timeout: null,
                                is_blocked: false,
                                start: now(),
                                timestamp: now(),
                                assigned: null,
                                client: null,
                                msg: [],
                                admin: admin,
                                operator: false,
                                agent: msgs.agent || detail_temp.agent || "",
                                screen: msgs.screen || detail_temp.screen || 0,
                            };

                            detail.detail = detail;

                            if (msgs.operator) detail.operator = true;
                            setup_channel(channel);
                            
                            users.push(detail);
                            index = users.length - 1;
                            connection.user = detail;

                            if (channel == "ladiesfoto") {
                                config.GetThis("www.ladiesfoto.com", "/websocket/login_mail.php?username=" + userName);
                            }
                            
                            var m = "Type <b>/help</b> for list of command.";
                            connection.sendUTF(JSON.stringify({
                                type: "welcome",
                                time: now(),
                                msg: "<i>------------------------------------" +
                                    "<br><b>WELCOME " + userName + "!!</b><br>" + m +
                                    "<br>------------------------------------</i>",
                                author: "[Server]",
                                nickname: userName + admin_password,
                                channels: channels,
                            }));
                            var json = {
                                type: "info",
                                time: now(),
                                msg: "<i><b>" + userName + "</b> just connected..</i>",
                                author: "[Server]",
                                channel: channel
                            };
                            send(json, channel, userId);

                            if (channel == "kpj" || channel == "kpj_ui") {
                                // connection.sendUTF(JSON.stringify({
                                //  type: "online_state",
                                //  time: now(),
                                //  author: "[Server]",
                                //  state: apps["kpj"].online_state,
                                //  channel: channel,
                                // }));
                            }
                            if (admin) {
                                connection.sendUTF(JSON.stringify({
                                    type: "channels_admin",
                                    channels: app_list
                                }));
                                connection.sendUTF(JSON.stringify({
                                    type: "json",
                                    time: now(),
                                    data: server_stat(channel),
                                    author: "[Server]",
                                    channel: channel,
                                }));
                                config.sql("INSERT into log (username, ip_address) VALUES ('"+userName+"', '"+ip_address+"')");
                            }
                            online_users(channel);
                            if (debug) console.log(config.get_time() + " User is known as: " + userName + " - " + userId);
                        }
                        ping(connection.user);
                    }
                
                } else {
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>You haven't told us your name yet!. <br>Please type in <b>/nick &lt;your name&gt;</b> to set your name.</i>",
                        author: "[Server]",
                    }));
                }

            /* =============================================================== HAS USER ID =============================================================== */
            
            } else {
                index = get_index(userId);
                if(index === null) return;

                if (msgs.msg != "/typing" && msgs.msg != "/seen" && msgs.msg != "/quit" && msgs.msg != "/ping") {
                    connection.user.timestamp = now();
                }
                    
                if (channel == "kpj") {
                    if(connection.user.assigned == null && connection.user.operator === false && admin === false) {
                        if (msgs.msg != "/typing" && msgs.msg != "/seen" && msgs.msg != "/quit" && msgs.msg != "/ping") {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: now(),
                                msg: "<i>Please hold on. Our staff will be with you in a moment.</i>",
                                author: "[Server]",
                                channel: channel,
                            }));
                            return;
                        }
                    }
                }
                if (msgs.msg == "/quit") {
                    quit = true;
                } else if (msgs.msg == "/reload") {
                    var json = {
                        type: "reload",
                        author: userName,
                        author_id: userId
                    };
                    send(json, channel, userId);
                } else if (msgs.msg == "/shutdown" || msgs.msg == "/sd" || msgs.msg == "/kill" || msgs.msg == "/restart") {
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if(shutdown_verified === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Please type in your password..</i>",
                            author: "[Server]",
                        }));
                        password_shutdown = true;
                        return;
                    }
                } else if (msgs.msg.substring(0, 5) == "/sql ") {
                    if (admin !== true) return;

                    var res = msgs.msg.split(" ");
                    res.splice(0, 1);
                    var sql = res.toString().replace(/,/g, " ");
                    if (debug) console.log(sql);

                    config.sql(sql, function(result) {
                        connection.sendUTF(JSON.stringify({
                            type: "json",
                            time: now(),
                            author: "[Server]",
                            data: result,
                            channel: channel,
                        }));
                    });
                } else if (msgs.msg.substring(0, 14) == "/allow_origin ") {
                    if (!admin) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var origin = res[1];
                    config.origins.push(origin);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 14) == "/block_origin ") {
                    var res = msgs.msg.split(" ");
                    var origin = res[1];
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    config.origins.splice(config.origins.indexOf(origin), 1);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 7) == "/block ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (receipient == wc[i].user.user_name) {
                            wc[i].sendUTF(JSON.stringify({
                                type: "reload",
                                time: now(),
                                author: "[Server]",
                                channel: channel,
                            }));
                            blocked_id.push({
                                user_id: wc[i].user.user_id,
                                user_name: wc[i].user.user_name
                            });
                            wc[i].user.is_blocked = true;
                            wc[i].close();
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 9) == "/unblock ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if (receipient == "-a" || receipient == "-all") {
                        blocked_id = [];
                    } else {
                        for (var i = 0; i < blocked_id.length; i++) {
                            if (receipient == blocked_id[i].user_name) {
                                blocked_id.splice(i, 1);
                            }
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg == "/assign_client") {
                    connection.user.msg = [];
                    var receipient_id = msgs.receipient;
                    var receipient;
                    if (connection.user.operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (receipient_id == wc[i].user.user_id && wc[i].user.assigned == null) {
                            wc[i].user.assigned = userId;
                            connection.user.client = wc[i].user.user_id;
                            wc[i].user.connection.sendUTF(JSON.stringify({
                                type: "assigned",
                                assigned: userId,
                                time: now(),
                                msg: "<i>Hi.. you are now chatting with <b>" + userName + "</b>.</i>",
                                author: "[Server]",
                                channel: channel,
                            }));
                            receipient = wc[i].user.user_name;
                            break;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "assign_client_result",
                        time: now(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                        receipient: receipient,
                        receipient_id: receipient_id,
                        channel: channel,
                    }));
                    online_users(channel);
                } else if (msgs.msg == "/unassign_client") {
                    var receipient = msgs.receipient;
                    if (connection.user.operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (receipient == wc[i].user.user_id && wc[i].user.assigned !== null && connection.user.client == receipient) {
                            wc[i].user.assigned = null;
                            wc[i].user.msg = [];
                            connection.user.msg = [];
                            connection.user.client = null;
                            wc[i].user.connection.sendUTF(JSON.stringify({
                                type: "unassigned",
                                assigned: userId,
                                time: now(),
                                msg: "<i>Your session has ended.</i>",
                                author: "[Server]",
                                channel: channel,
                            }));
                        }
                    }
                    online_users(channel);
                } else if (msgs.msg == "/online_state") {
                    users.online_state = msgs.state;
                    connection.sendUTF(JSON.stringify({
                        type: "online_state",
                        time: now(),
                        author: "[Server]",
                        state: users.online_state,
                        channel: channel,
                    }));
                } else if (msgs.msg == "/history" || msgs.msg == "/h") {
                    if (channel == "kpj") {
                        if (connection.user.assigned !== null || connection.user.operator === true) {
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>------------------<br>Chat History</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                    var htry = get_history(channel);
                    connection.sendUTF(JSON.stringify(htry));
                } else if (msgs.msg == "/clear_history" || msgs.msg == "/ch") {
                    clear_history(channel);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Chat history has been cleared.</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg == "/server" || msgs.msg == "/s") {
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "json",
                        time: now(),
                        data: server_stat(channel),
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 10) == "/function " || msgs.msg.substring(0, 3) == "/f ") {
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var funct = res[1];
                    res.splice(0, 2);
                    var argument = res.toString().replace(/,/g, " ");
                    var json = {
                        type: "function",
                        time: now(),
                        functions: funct,
                        arguments: argument,
                        author: userName,
                        author_id: userId,
                        channel: channel
                    };
                    send(json, channel, userId);
                } else if (msgs.msg.substring(0, 9) == "/youtube " || msgs.msg.substring(0, 4) == "/yt ") {
                    if (!admin) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var embeded = res[1];
                    var json = {
                        type: "youtube",
                        time: now(),
                        embeded: embeded,
                        author: userName,
                        author_id: userId,
                        channel: channel,
                    };
                    send(json, channel, userId);
                } else if (msgs.msg.substring(0, 6) == "/open " || msgs.msg.substring(0, 3) == "/o ") {
                    if (admin !== true) return;

                    var res = msgs.msg.split(" ");
                    var url = res[1];
                    var json = {
                        type: "open",
                        time: now(),
                        url: url,
                        author: userName,
                        author_id: userId,
                        channel: channel,
                    };
                    send(json, channel, userId);
                } else if (msgs.msg.substring(0, 11) == "/unmute all") {
                    var json = {
                        type: "unmute",
                        channel: channel,
                    };
                    send(json, channel, userId);
                } else if (msgs.msg.substring(0, 6) == "/user " || msgs.msg.substring(0, 3) == "/u ") {
                    if (admin !== true) return;

                    var res = msgs.msg.split(" "),
                        receipient = config.htmlEntities(res[1]),
                        found = false;
                    if (receipient == "" || receipient == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Receipient is empty.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if (receipient == "all") {
                        var users_ = get_users("all", userId);
                        connection.sendUTF(JSON.stringify({
                            type: "json",
                            time: now(),
                            data: users_,
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (wc[i].user.user_name == receipient) {
                            var c = "",
                                chnls = wc[i].user.channels;
                            for(var n = 0; n < chnls.length; n++) {
                                c += chnls[n] + ", ";
                            }
                            var json = {
                                type: "json",
                                time: now(),
                                data: {
                                    user_name: wc[i].user.user_name,
                                    user_id: wc[i].user.user_id,
                                    online: config.DateDiff(now(), wc[i].user.start),
                                    last_seen: config.DateDiff(now(), wc[i].user.timestamp),
                                    origin: wc[i].user.origin,
                                    ip_address: wc[i].user.ip_address,
                                    screen: wc[i].user.screen,
                                    active: wc[i].user.active,
                                    agent: wc[i].user.agent,
                                    channel: wc[i].user.channel,
                                    channels: wc[i].user.channels,
                                },
                                author: "[Server]",
                                channel: channel,
                            };
                            return connection.sendUTF(JSON.stringify(json));
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 5) == "/chat" || msgs.msg.substring(0, 3) == "/c ") {
                    if (!admin) return;

                    if (msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 3) == "/c ") {
                        var res = msgs.msg.split(" ");
                        var receipient = config.htmlEntities(res[1]);
                    }
                    if (msgs.msg.substring(0, 5) == "/chat") {
                        var receipient = "-all";
                    }
                    if (receipient == "" || receipient == " ") return;

                    var json = {
                        type: "chat",
                        author: userName,
                        author_id: userId,
                        channel: channel,
                    };
                    if (receipient == "-all" || receipient == "-a") {
                        return send(json, channel, userId);
                    }
                    var found = false;
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (wc[i].user.user_name == receipient && wc[i].user.active === true && wc[i].user.channel == channel) {
                            wc[i].user.connection.sendUTF(JSON.stringify(json));
                            wc[i].user.seen = false;
                            found = true;
                            break;
                        }
                    }
                    if (found === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                    } else {
                        connection.user.seen = true;
                    }
                } else if (msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
                    var admin_password = "",
                        res = msgs.msg.split(" "),
                        newNick = config.htmlEntities(res[1]);
                    if (newNick == "" || newNick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Nickname is empty.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if (!check_username(userId, userName)) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Nickname <b>" + newNick + "</b> is not available.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    
                    admin = false;
                    
                    if (res[2]) {
                        check_password(newNick, res[2], function(verified) {
                            if (verified === false) {
                                if (debug) console.log("Invalid..");
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: now(),
                                    msg: "<i>Oopss.. Invalid password.. Good Bye!</i>",
                                    author: "[Server]",
                                    channel: channel,
                                }));

                                setTimeout(function() {
                                    connection.sendUTF(JSON.stringify({
                                        type: "logout"
                                    }));
                                }, 2000);
                            } else {
                                if (debug) console.log("Verified..");
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: now(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                    channel: channel,
                                }));
                                admin_password = " " + res[2];
                                admin = true;
                                proceed();
                            }
                        });
                    } else {
                        connection.user.admin = false;
                        proceed();
                    }
                    
                    function proceed() {
                        if (debug) console.log(config.get_time() + " User " + userName + " has changed nickname to " + newNick);
                        connection.sendUTF(JSON.stringify({
                            type: "newNick",
                            time: now(),
                            msg: "<i>You are now known as <b>" + newNick + "</b></i>",
                            author: "[Server]",
                            channel: channel,
                            nickname: newNick + admin_password,
                        }));
                        if (admin) {
                            connection.sendUTF(JSON.stringify({
                                type: "channels_admin",
                                channels: app_list
                            }));
                            connection.sendUTF(JSON.stringify({
                                type: "json",
                                time: now(),
                                data: server_stat(channel),
                                author: "[Server]",
                                channel: channel,
                            }));
                        }
                        userName = newNick;
                        connection.user.user_name = newNick;
                        var json = {
                            type: "info",
                            time: now(),
                            msg: "<i><b>" + userName + "</b> has changed nickname to <b>" + newNick + "</b></i>",
                            author: "[Server]",
                            channel: channel,
                        };
                        for (var i = 0, len = channels.length; i < len; i++) {
                            send(json, channels[i], userId);
                            online_users(channels[i]);
                        }
                    }
                } else if (msgs.msg.substring(0, 9) == "/channel " || msgs.msg.substring(0, 4) == "/ch " || msgs.msg.substring(0, 3) == "/j ") {
                    var res = msgs.msg.split(" ");
                    var chnl = config.htmlEntities(res[1]);

                    if (chnl == channel) return;

                    if (chnl == "" || chnl == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Channel is empty.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }

                    config.add_app(apps, chnl);
                    setup_channel(chnl);

                    var been_here = false;
                    for (var i = 0, len = channels.length; i < len; i++) {
                        if (channels[i] == chnl) been_here = true;
                    }

                    if (!been_here) {
                        channels.push(chnl);
                        connection.user.channels = channels;
                    }

                    channel = chnl;
                    connection.user.channel = chnl;
                    connection.user.assigned = null;

                    if (!been_here) {
                        connection.sendUTF(JSON.stringify({
                            type: "channels",
                            channels: channels,
                        }));
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>You are now in channel <b>" + chnl + "</b></i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        var users_ = get_users(channel, userId);
                        connection.sendUTF(JSON.stringify({
                            type: "json",
                            time: now(),
                            data: users_,
                            author: "[Server]",
                            channel: channel,
                        }));
                    }
                    var json = {
                        type: "info",
                        time: now(),
                        msg: "<i><b>" + userName + "</b> has joined the channel..</i>",
                        author: "[Server]",
                        channel: channel,
                    };
                    if (!been_here) {
                        if (channel != "kpj") {
                            send(json, channel, userId);
                        }
                        online_users(channel);
                    } else {
                        online_users(channel, connection);
                    }
                } else if (msgs.msg.substring(0, 7) == "/leave " || msgs.msg.substring(0, 3) == "/l " || msgs.msg == "/l") {
                    if(msgs.msg == "/l") {
                        var chnl = channel;
                    } else {
                        var res = msgs.msg.split(" ");
                        var chnl = config.htmlEntities(res[1]);
                    }
                    if (chnl == "" || chnl == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Channel is empty.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if (channels.length == 1) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Cant leave this channel.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var check = false;
                    for (var i = 0, len = channels.length; i < len; i++) {
                        if (channels[i] == chnl) {
                            channels.splice(i, 1);
                            check = true;
                        }
                    }
                    if(!check) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. You're not in that channel.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var type = "info";
                    if (connection.user.channel == "kpj") {
                        type = "leave";
                    }
                    var json = {
                        type: type,
                        user_id: userId,
                        time: now(),
                        msg: "<i><b>" + userName + "</b> has left the channel..</i>",
                        author: "[Server]",
                        channel: chnl
                    };

                    send(json, chnl, userId);
                    online_users(chnl);

                    channel = channels[0];
                    connection.user.channel = channel;
                    connection.user.channels = channels;
                    connection.user.assigned = null;
                    connection.sendUTF(JSON.stringify({
                        type: "new_channel",
                        time: now(),
                        author: "[Server]",
                        channel: channel,
                        channels: channels,
                    }));
                    online_users(channel, connection);
                } else if (msgs.msg == "/users" || msgs.msg == "/u") {
                    var users_ = get_users(channel, userId);
                    connection.sendUTF(JSON.stringify({
                        type: "json",
                        time: now(),
                        data: users_,
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a " || msgs.msg == "/alert" || msgs.msg == "/a") {
                    if (msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a ") {
                        var res = msgs.msg.split(" ");
                        var receipient = config.htmlEntities(res[1]);
                        if (receipient == "" || receipient == " ") {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: now(),
                                msg: "<i>Oopss.. Receipient is empty.",
                                author: "[Server]",
                                channel: channel,
                            }));
                            return;
                        }
                        if (receipient == "-a" || receipient == "-all") {
                            receipient = "all";
                        }
                    }
                    if (msgs.msg == "/alert" || msgs.msg == "/a") {
                        var receipient = "all";
                    }
                    var json = {
                        type: "alert",
                        time: now(),
                        msg: "<i><b>" + userName + "</b> needs your attention.</i>",
                        author: userName,
                        author_id: userId,
                        channel: channel,
                    };
                    if (channel == "kpj") {
                        receipient = (connection.user.assigned !== null) ? connection.user.assigned : ((connection.user.client !== null) ? connection.user.client : null);
                    }
                    if (receipient == "all") {
                        send(json, channel, userId);
                    } else {
                        var found = false;
                        connection.user.seen = true;
                        var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                            if ((wc[i].user.user_name == receipient || wc[i].user.user_id == receipient) && wc[i].user.active === true && wc[i].user.channel == channel) {
                                wc[i].user.connection.sendUTF(JSON.stringify(json));
                                wc[i].user.seen = false;
                                connection.user.seen = false;
                                found = true;
                                break;
                            }
                        }
                        if (found === false) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: now(),
                                msg: "<i>Oopss.. Receipient <b>" + receipient + "</b> is not here.</i>",
                                author: "[Server]",
                                channel: channel,
                            }));
                        }
                    }
                } else if (msgs.msg.substring(0, 5) == "/msg " || msgs.msg.substring(0, 3) == "/m ") {
                    if (channel == "kpj") return;
                        
                    var res = msgs.msg.split(" ");
                    var receipient = config.htmlEntities(res[1]);
                    res.splice(0, 2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    if (the_msg == "" || the_msg == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Message is empty.",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    var json = {
                        type: "message",
                        time: now(),
                        msg: the_msg,
                        author: userName,
                        author_id: userId,
                    };
                    var found = false;
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (wc[i].user.user_name == receipient && wc[i].user.channel == channel) {
                            if (wc[i].user.active === true) {
                                wc[i].user.connection.sendUTF(JSON.stringify(json));
                            } else {
                                wc[i].user.msg.push(json);
                                wc[i].user.msg = wc[i].user.msg.slice(-20);
                            }
                            wc[i].user.seen = false;
                            connection.user.seen = false
                            found = true;

                            if (store_msg) {
                                var insert = "'"+msgs.msg.replace(/"/g, "\\\"").replace(/'/g, "\\\'")+"'";
                                insert += ",'"+userName+"'";
                                insert += ",'"+channel+"'";
                                insert += ",'"+ip_address+"'";
                                var sql = "INSERT INTO message (msg, username, channel, ip_address) VALUES ("+insert+")";
                                config.sql(sql);
                            }
                            return;
                        }
                    }
                    if (found === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                    }
                } else if (msgs.msg.substring(0, 7) == "/close ") {
                    if (admin !== true) return;
                    
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (userName == receipient) return;

                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (wc[i].user.user_name == receipient) {
                            quit = true;
                            wc[i].user.connection.close();
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Oopss.. username <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg == "/typing") {
                    if(!users) {
                        return;
                    }
                    var json = {
                        type: "typing",
                        author: userName,
                        channel: channel
                    };
                    if (channel == "kpj") {
                        if (connection.user.assigned !== null) {
                            var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                                if (connection.user.assigned == wc[i].user.user_id) {
                                    wc[i].user.connection.sendUTF(JSON.stringify(json));
                                }
                            }
                        }
                        if (connection.user.operator === true && connection.user.client !== null) {
                            var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                                if (connection.user.client == wc[i].user.user_id) {
                                    wc[i].user.connection.sendUTF(JSON.stringify(json));
                                }
                            }
                        }
                        return;
                    }
                    send(json, channel, userId);
                } else if (msgs.msg == "/ping") {
                    connection.sendUTF(JSON.stringify({
                        type: "pong",
                    }));
                } else if (msgs.msg == "/seen") {
                    var json = {
                        type: "seen",
                        author: userName,
                        channel: channel
                    };
                    if (channel == "kpj") {
                        if (connection.user.assigned !== null) {
                            var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                                if (connection.user.assigned == wc[i].user.user_id) {
                                    wc[i].user.connection.sendUTF(JSON.stringify(json));
                                }
                            }
                        }
                        if (connection.user.operator === true && connection.user.client !== null) {
                            var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                                if (connection.user.client == wc[i].user.user_id) {
                                    wc[i].user.connection.sendUTF(JSON.stringify(json));
                                }
                            }
                        }
                        connection.user.seen = true;
                        return;
                    }
                    var all = true;
                    var receipient = msgs.receipient;                   
                    var client_count = 0;
                    connection.user.seen = true;

                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        for (var ii = 0, lenn = wc[i].user.channels.length; ii < lenn; ii++) {
                            if (wc[i].user.channels[ii] == channel) {
                                if (wc[i].user.seen === false) all = false;
                                client_count++;
                            }
                        }
                    }
                    if (client_count > 2 && all === true) {
                        var json = {
                            type: "seen",
                            author: "all",
                            channel: channel
                        };
                    }
                    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
                        if (wc[i].user.active === true && wc[i].user.user_id == receipient) {
                            wc[i].user.connection.sendUTF(JSON.stringify(json));
                            return;
                        }
                    }
                } else if (msgs.msg.substring(0, 11) == "/store_msg ") {
                    if(!admin) return;
                    var a = msgs.msg.split(" ");
                    store_msg = (a[1] == "on") ? true : false;
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: now(),
                        msg: "<i>Done..</i>",
                        author: "[Server]",
                        channel: channel,
                    }));
                } else if (msgs.msg == "/flood") {
                    if (!admin) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    if (flood === true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: "<i>Oopss.. you are still flooding.. please flood again later</i>",
                            author: "[Server]",
                            channel: channel,
                        }));
                        return;
                    }
                    flood = true;
                    var n = 0;
                    var floodTimer = setInterval(function() {
                        n++;
                        var json = {
                            type: "info",
                            time: now(),
                            author: userName,
                            channel: channel,
                            msg: "you have just been flooded by " + userName + " - " + n
                        };
                        send(json, channel, userId);
                        if (n > 2000 || flood === false) {
                            clearInterval(floodTimer);
                            flood = false;
                        }
                    }, 50);
                } else if (msgs.msg == "/flood-stop") {
                    flood = false;
                } else if (msgs.msg == "/admin") {
                    if(!admin) return;
                    var sql = "SELECT * FROM users";
                    config.sql(sql, function(data) {
                        if (debug) console.log(JSON.stringify(data));
                        var a = "<i>------------------------------------<br>Admins<br>";
                        for(var i in data) {
                            a += (i+1) + ". " + data[i].username + "<br>";
                        }
                        a += "</i>";
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: now(),
                            msg: a,
                            author: "[Server]",
                        }));
                    });
                } else if (msgs.msg == "/help" || msgs.msg.substring(0, 1) == "/") {
                    if (channel == "kpj" && connection.user.operator === false) return;
                    
                    connection.sendUTF(JSON.stringify({
                        type: "json",
                        time: now(),
                        data: {command: helps},
                        author: "[Server]",
                    }));
                } else {
                    var obj = {
                        type: "message",
                        time: now(),
                        msg: config.htmlEntities(msgs.msg),
                        author: userName,
                        author_id: userId,
                        channel: channel
                    };
                    msg_count++;
                    into_history(channel, obj);
                    var json = JSON.stringify(obj);
                    send(json, channel, userId);
                    connection.user.seen = true;
                    
                    if (store_msg) {
                        var insert = "'"+msgs.msg.replace(/"/g, "\\\"").replace(/'/g, "\\\'")+"'";
                        insert += ",'"+userName+"'";
                        insert += ",'"+channel+"'";
                        insert += ",'"+ip_address+"'";
                        var sql = "INSERT INTO message (msg, username, channel, ip_address) VALUES ("+insert+")";

                        if (connection.user.channel == "kpj") {
                            config.sql("amirosol_newkpj", sql);
                        } else {
                            config.sql(sql);
                        }
                    }
                }
            }
        }
    });


    connection.on("pong", function(msg) {
        connection.user.ping_ = true;
    });


    connection.on("ping", function(msg) {
        
    });


    // ========================================== DISCONNECT ====================================================

    connection.on("close", function(msg) {

        if (shutdown === false) {            
            connection.user.online = false;

            if (quit === true || connection.user.is_blocked) {
                clearTimeout(timeout[connection.id]);
                var p = " has closed the connection";
                if (connection.user.is_blocked) p = " has been blocked by admin.";  
                remove_client(connection.user, p);
            }
        }
    });

});





// =========================================================== FUNCTIONS ===========================================================


var get_index = function(id) {
    for (var i = 0, len = users.length; i < len; i++) {
        if (users[i].user_id == id) return i;
    }
    return null;
};

var ping = function(user) {
    var id = user.connection.id;
    if (timeout[id]) clearTimeout(timeout[id]);

    timeout[id] = setTimeout(function() {
        if (user.active === false || user.online === false) {
            delete timeout[id];
            return;
        }
        
        user.ping_ = false;
        user.connection.ping();

        timeout[id] = setTimeout(function() {            
            if (user.ping_ === false) {
                console.log("no respond.. set as inactive");
                user.active = false;
            } else {
                ping(user);
            }
        }, 3000);

    }, 15000);
};

var remove_client = function(user, pingresult) {
    if (debug) console.log(config.get_time() + " " + user.user_name + pingresult);
    
    var chnls = user.channels;
    var _name = user.user_name;
    var _id = user.user_id;
    users.splice(users.indexOf(user), 1);

    for (var i = 0, len = chnls.length; i < len; i++) {
        var json = {
            type: "info",
            user_id: _id,
            time: now(),
            msg: "<i><b>" + _name + "</b>" + pingresult + "</i>",
            author: "[server]",
            channel: chnls[i]
        };
        send(json, chnls[i]);
        online_users(chnls[i]);
    }
};

var online_users = function(chnl, conn) {
    var users_ = [];
    var wc = wsServer.connections;
    for (var i = 0, len = wc.length; i < len; i++) {
        for (var ii = 0, lenn = wc[i].user.channels.length; ii < lenn; ii++) {
            if (wc[i].user.active === true && wc[i].user.channels[ii] === chnl) {
                users_.push({
                    name: wc[i].user.user_name,
                    id: wc[i].user.user_id,
                    ip_address: wc[i].user.ip_address,
                    assigned: wc[i].user.assigned,
                    operator: wc[i].user.operator,
                    admin: wc[i].user.admin,
                });
                break;
            }
        }
    }
    var json = {
        type: "users",
        channel: chnl,
        time: now(),
        users: users_,
        author: "[Server]",
    };

    if (conn) return conn.sendUTF(JSON.stringify(json));
    send(json, chnl);
};

var get_users = function(chnl, uid) {
    var users_ = [];
    var n = 1;
    var wc = wsServer.connections;
    for (var i = 0, len = wc.length; i < len; i++) {
        if (chnl == "all") {
            users_.push(wc[i].user.user_name);
        } else {
            for (var ii = 0, lenn = wc[i].user.channels.length; ii < lenn; ii++) {
                if (wc[i].user.channels[ii] == chnl) {
                    users_.push(wc[i].user.user_name);
                }
            }
        }
    }
    return users_;
}

var send = function(json, chnnls, uid) {
    var wc = wsServer.connections;
    var ch = [];
    if (typeof chnnls == "string") chnnls = [chnnls];
    if (typeof json == "string") json = JSON.parse(json);
    ch = chnnls;

    for(var i = 0, len = wc.length; i < len; i++) {
        for (var ii = 0, lenn = wc[i].user.channels.length; ii < lenn; ii++) {
            for (var iii = 0, lennn = ch.length; iii < lenn; iii++) {
                if (uid !== wc[i].user.user_id && wc[i].user.channels[ii] == ch[iii]) {
                    json.channel = ch[iii];
                    if (wc[i].active === true) {
                        wc[i].sendUTF(JSON.stringify(json));
                    } else {
                        wc[i].user.msg.push(json);
                        wc[i].user.msg = wc[i].user.msg.slice(-20);
                    }
                    wc[i].user.seen = false;
                    break;
                }
            }
        }
    }
}

var setup_channel = function(chnl) {
    for (var i = 0, len = channel_list.length; i < len; i++) {
        if (channel_list[i].name == chnl) {
            channel_list[i].users++;
            return;
        }
    }
    channel_list.push({
        name: chnl,
        users: 1,
    });
    if (debug) console.log(config.get_time() + " Channel created - " + chnl);
};

var into_history = function(chnl, obj) {
    apps[chnl].history["msg"].push(obj);
    apps[chnl].history["msg"] = apps[chnl].history["msg"].slice(-20);
};

var clear_history = function(chnl) {
    apps[chnl].history["msg"] = [];
};

var get_history = function(chnl) {
    return apps[chnl].history;
};

var check_password = function(username, password, callback) {
    if (debug) console.log("Verifying password..");
    var sql = "SELECT id FROM users WHERE username = '"+username+"' AND password = '"+config.MD5(password)+"'";
    config.sql(sql, function(data) {
        var check = false;
        if(data.length > 0) check = true;
        if (typeof callback == "function") return callback(check);
        return check;
    });
};

var check_blocked_id = function(id) {
    for (var i = 0, len = blocked_id.length; i < len; i++) {
        if (blocked_id[i].user_id == id) {
            return true;
        }
    }
    return false;
};

var check_username = function(id, n) {
    var wc = wsServer.connections;
                    for (var i = 0, len = wc.length; i < len; i++) {
        if(wc[i].user.user_id != id && wc[i].user.user_name == n) return false;
    }
    return true;
}

var date_std = function (timestamp) {
    if(!timestamp) timestamp = now();
    if(Math.ceil(timestamp).toString().length == 10) timestamp *= 1000;
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var date = new Date(timestamp - tzoffset);
    var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    return iso[1] + ' ' + iso[2];
}

var ShutTheHellUp = function() {
    shutdown = true;
    process.exit(0);
}

var count_channel = function(chnl) {
    for (var i = 0, len = channel_list.length; i < len; i++) {
        if (channel_list[i].name == chnl) channel_list[i].users++;
    }
};

var reset_count_channel = function(chnl) {
    for (var i = 0, len = channel_list.length; i < len; i++) {
        channel_list[i].users = 0;
    }
};

var server_stat = function(chnl) {
    reset_count_channel();

    for (var n = 0, len2 = users.length; n < len2; n++) {
        var chnl_list_count_inside = 0;
        for (var nn = 0, lenn = users[n].channels.length; nn < lenn; nn++) {
            count_channel(users[n].channels[nn]);
        }
    }

    var chnl_list = "";
    for (i in channel_list) {
        if (channel_list[i].users > 0) chnl_list += "<b>" + channel_list[i].name + "</b> (<b>" + channel_list[i].users + "</b>), ";
    }

    var blocked = "";
    if (blocked_list.length > 0) {
        blocked += "<br> - Blocked Orogin : <b>";
        for (var i = 0, len = blocked_list.length; i < len; i++) {
            blocked += blocked_list[i] + ", ";
        }
        blocked += "</b>";
    }
    var store_msg_stat = (store_msg) ? "On" : "Off";
    var results = "<i>----------------------------------------------------------------<br>Server Info" +
        "<br> - Up Time : <b>" + config.DateDiff(now(), START_TIME) + "</b>" +
        "<br> - Total Users : <b>" + users.length + "</b>" +
        "<br> - Total Message : <b>" + msg_count + "</b>" +
        "<br> - Channel List : " + chnl_list +
        "<br> - Current Connection : <b>" + wsServer.connections.length + "</b>" +
        "<br> - Current Channel : <b>" + chnl + "</b>" +
        "<br> - Store Message : <b>" + store_msg_stat + "</b>" +
        blocked +
        "<br>----------------------------------------------------------------</i>";

    var result = {
        ServerInfo: {
            UpTime: config.DateDiff(now(), START_TIME),
            TotalUsers: users.length,
            TotalMessage: msg_count,
            ChannelList: chnl_list,
            CurrentConnection: wsServer.connections.length,
            CurrentChannel: chnl,
            StoreMessage: store_msg,
        }
    };
        
    return result;
}


clean_up = setInterval(function() {
    for (var i = 0, len = users.length; i < len; i++) {
        if (!users[i]) {
            console.log("User not found...");
            continue;
        }
        if ((now() - users[i].timestamp) > 86400 && !users[i].connection) {
            remove_client(users[i], " has been removed");
        }
    }
}, 60000);




