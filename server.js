"use strict";

// =========================================================================================================

process.title = "node-chat";
process.env.TZ = 'Asia/Kuala_Lumpur';

var port = 3777,
    webSocketServer = require("websocket").server,
    util = require("./config"),
    http = util.get_http(),
    https = util.get_https(),
    fs = require("fs"),
    mysql = require("mysql"),
    app_list = [
        "ska",
        "utiis",
        "utiis_ui",
        "kpj",
        "kpj_ui",
        "ladiesfoto",
        "ladiesfoto_ui",
        "debunga",
        "debunga_ui",
    ],
    con,
    mysql_status = 0,
    mysql_timer = null,
    ps = "isu2uDIABL0W67B",
    admins = [
        {username:"SKALOOT", password:"phpmysql"},
        {username:"ADMINISTRATOR", password:"phpmysql"},
        {username:"ADMIN", password:"phpmysql"},
    ],
    users = [],
    apps = [],
    channel_list = [],
    blocked_list = [],
    blocked_id = [],
    timer_password_temp = [],
    clean_up,
    msg_count = 0,
    start_time = new Date().getTime(),
    shutdown = false,
	store_msg = false,
    max_connection = 200,
    total_connection = 1,
    origins = util.get_origin(),
    helps = util.get_help();


// ========================================= CREATE SERVER ====================================================

var options = {
    // key: fs.readFileSync("key.pem"),
    // cert: fs.readFileSync("cert.pem")
};

// var server = https.createServer(options, function(request, response) {
var server = http.createServer(function(request, response) {
	util.handle_request(request, response, users, channel_list);
});

server.listen(port, function() {
    console.log("start Time : " + new Date());
    console.log(util.get_time() + " Server is listening on port " + port);
});

var wsServer = new webSocketServer({
    httpServer: server
});


util.set_app(apps, app_list);


/* ========================================= CONNECT TO MYSQL ==================================================== */

function db(sql, callback) {
    con = mysql.createConnection({
        host: "kpjselangor.com",
        user: "amirosol_kpj",
        password: "kpjselangor123",
        insecureAuth: true
    });
    con.connect(function(err) {
        if (err) {
            console.log(err);
            return false;
        }
        con.query("USE amirosol_newkpj", function(err, result) {
            if (err) {
                console.log(err);
                con.end();
                return;
            }
            con.query(sql, function(err, result) {
                if (err) {
                    console.log(err);
                    con.end();
                    return;
                }
                console.log(result);
                if(typeof callback == "function") {
                    return callback(result);
                }
            });
            con.end();
        });
    });
    con.on('error', function(err) {
        console.log("DB ERROR : " + err);
    });
}


// ========================================== CONNECT ====================================================

wsServer.on("request", function(request) {
    console.log(util.get_time() + " Total connection : " + total_connection);
    if (typeof request.origin != "undefined" && origins.indexOf(request.origin) === -1 || shutdown === true) {
        console.log(util.get_time() + " Connection was blocked from origin " + request.origin);
        if (blocked_list.indexOf(request.origin) === -1) {
            blocked_list.push(request.origin);
        }
        request.reject(401, "Go away. You're no authorized.");
        return;
    }
    if (total_connection > max_connection) {
        console.log(util.get_time() + " Connection reached max value!");
        request.reject(403, "Too many connection.. Please try later..");
        return;
    }
    console.log(util.get_time() + " Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin),
        userName = null,
        userId = null,
        appId = null,
        channel = null,
        ip_address = null,
        flood = false,
        check = false,
        quit = false,
        password = false,
        password_user = null,
        detail,
        clients,
        index = 0,
        is_blocked = false,
        admin = false,
        temp_detail = null,
        password_shutdown = false,
        shutdown_verified = false;

    total_connection++;

    // ========================================== GET MSG ====================================================

    connection.on("message", function(message) {
        if (message.type === "utf8") {
            var msgs = message.utf8Data;
            try {
                msgs = JSON.parse(msgs);
            } catch (e) {
                console.log("This doesn\'t look like a valid JSON: ", msgs);
                return;
            }
            console.log(util.get_time() + " Received Message : " + msgs.msg);
            if (check_blocked_id(msgs.id)) {
                console.log(util.get_time() + " Blocked ID trying to connect " + msgs.id);
                connection.sendUTF(JSON.stringify({
                    type: "blocked",
                    time: (new Date()).getTime(),
                    author: "[Server]",
                }));
                connection.close();
                return;
            }
            // ========================================== NO APP ID ====================================================
            if (appId === null) {
                if (msgs.msg == "/appid") {
                    var found = false;
                    if(!apps[msgs.app_id]) {
                        util.add_app(apps, msgs.app_id);
                    }
                    found = true;
                    appId = util.htmlEntities(msgs.app_id);
                    clients = apps[appId];
                    connection.sendUTF(JSON.stringify({
                        type: "connected",
                        time: (new Date()).getTime(),
                        msg: "<i>Connected...</i>",
                        app_id: appId,
                        author: "[Server]",
                        requests: request.accept
                    }));
                }
                return;
            }
            // ========================================== SET PASSWORD ====================================================
            if (password === true) {
                if (msgs.msg != "/typing" && msgs.msg != "/seen") {
                    msgs.msg = "/n " + password_user + " " + util.htmlEntities(msgs.msg);
                }
            }
            if (password_shutdown === true) {
                if (msgs.msg == "/typing" || msgs.msg == "/ping" || msgs.msg == "/seen") {
                    return;
                }
                password_shutdown = false;
                var verified = check_password(userName.toUpperCase(), msgs.msg);
                if (verified === false) {
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Password is invalid.</i>",
                        author: "[Server]",
                    }));
                    return;
                } else {
                    shutdown_verified = true;
                    msgs.msg = "/shutdown";
                }
            }
            // ========================================== NO NICK ====================================================
            if (userName === null) {
                if (msgs.msg == "/login") {
                    var sql = "SELECT * FROM chat WHERE email = '" + msgs.email + "';";
                    var result = db(sql, function(result){
                        if (result.length > 0) {
                            connection.sendUTF(JSON.stringify({
                                type: "connected",
                                connected: true,
                                granted: true,
                                time: (new Date()).getTime(),
                                author: "[Server]",
                                name: result[0].name,
                                msg: "<i>Connected...</i>",
                            }));
                        } else {
                            connection.sendUTF(JSON.stringify({
                                type: "connected",
                                connected: true,
                                granted: false,
                                time: (new Date()).getTime(),
                                author: "[Server]",
                            }));
                            connection.close();
                        }
                    });
                } else if (msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
                    var reconnect = false,
                        admin_password = "",
                        res = msgs.msg.split(" "),
                        nick = util.htmlEntities(res[1]);
                    if (nick == "" || nick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Your nickname is empty.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var isadmin = check_admin(nick.toUpperCase());
                    if (isadmin === true) {
                        if (!res[2]) {
                            temp_detail = {
                                ip_address: msgs.ip_address,
                                screen: msgs.screen,
                                agent: msgs.agent
                            };
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                auth_admin: true,
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>" + nick + "</b> is reserved for admin. Please type in your password within 15 seconds.</i>",
                                author: "[Server]",
                            }));
                            if (!timer_password_temp[msgs.id]) {
                                timer_password_temp[msgs.id] = {
                                    timer: null
                                };
                            }
                            timer_password(msgs.id, connection);
                            password = true;
                            password_user = nick;
                            return;
                        } else {
                            var verified = check_password(nick.toUpperCase(), res[2]);
                            password = false;
                            password_user = null;
                            if (timer_password_temp[msgs.id]) {
                                if (timer_password_temp[msgs.id].timer) {
                                    clearTimeout(timer_password_temp[msgs.id].timer);
                                }
                                delete timer_password_temp[msgs.id];
                            }
                            if (verified === false) {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. Invalid password.</i>",
                                    author: "[Server]",
                                }));
                                connection.sendUTF({type: "quit"});
                                return;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                }));
                                admin_password = " " + res[2];
                                admin = true;
                            }
                        }
                    }
                    check_user(msgs);
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_id === msgs.id) {
                            if (clients[i].active === false) {
                                userName = clients[i].user_name;
                                userId = clients[i].user_id;
                                channel = msgs.channel;
                                ip_address = msgs.ip_address;
                                clients[i].connection = connection;
                                clients[i].active = true;
                                clients[i].online = true;
                                clients[i].seen = false;
                                clients[i].last_seen = new Date().getTime();
                                reconnect = true;
                                if (admin === true) {
                                    clients[i].admin = true;
                                }
                                if (clients[i].msg.length > 0) {
                                    connection.sendUTF(JSON.stringify({
                                        type: "info",
                                        time: (new Date()).getTime(),
                                        msg: "<i>------------------------------------<br></i>",
                                        author: "[Server]",
                                    }));
                                    for (var n = 0, len2 = clients[i].msg.length; n < len2; n++) {
                                        connection.sendUTF(clients[i].msg[n]);
                                    }
                                }
                                connection.sendUTF(JSON.stringify({
                                    type: "online",
                                    time: (new Date()).getTime(),
                                    author: "[Server]",
                                    assigned: clients[i].assigned,
                                    nickname: userName + admin_password,
                                    app_type: clients.type,
                                    channels: get_channel(userId)
                                }));
                                if (channel == "kpj" || channel == "kpj_ui") {
                                    connection.sendUTF(JSON.stringify({
                                        type: "online_state",
                                        time: (new Date()).getTime(),
                                        author: "[Server]",
                                        state: apps["kpj"].online_state
                                    }));
                                }
                                if (admin === true) {
                                    connection.sendUTF(JSON.stringify({
                                        type: "channels_admin",
                                        channels: app_list
                                    }));
                                }
                                online_users(clients[i].app_id, connection);
                                break;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. You are already connected.</i>",
                                    author: "[Server]",
                                }));
                                return;
                            }
                        } else {
                            if (clients[i].user_name === nick && clients[i].active === true) {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. Nickname is not available.",
                                    author: "[Server]",
                                }));
                                return;
                            }
                        }
                    }
                    if (reconnect === false) {
                        userName = nick;
                        userId = msgs.id;
                        channel = msgs.channel;
                        ip_address = msgs.ip_address;
                        detail = {
                            connection: connection,
                            user_name: userName,
                            user_id: userId,
                            app_id: appId,
                            channel: msgs.channel,
                            ip_address: msgs.ip_address,
                            origin: request.origin,
                            seen: false,
                            active: true,
                            online: true,
                            ping: null,
                            is_blocked: false,
                            start: new Date().getTime(),
                            last_seen: new Date().getTime(),
                            assigned: null,
                            client: null,
                            msg: [],
                            admin: admin,
                            operator: false,
                            agent: msgs.agent,
                            screen: msgs.screen,
                        };
                        if(temp_detail !== null) {
                            detail.ip_address = temp_detail.ip_address;
                            detail.screen = temp_detail.screen;
                            detail.agent = temp_detail.agent;
                            temp_detail = null;
                        }
                        if (msgs.operator) {
                            detail.operator = true;
                        }
                        setup_channel(appId);
                        clients.push(detail);
                        clients.total_user++;

                        if (channel == "ladiesfoto") {
                            util.GetThis("www.ladiesfoto.com", "/websocket/login_mail.php?username=" + userName);
                        }
                        
                        var m = "Type <b>/help</b> for list of command.";
                        if (clients.type == "private") {
                            m = "Please wait. Our staff will be with you shortly. Thank You.";
                        }
                        connection.sendUTF(JSON.stringify({
                            type: "welcome",
                            time: (new Date()).getTime(),
                            msg: "<i>------------------------------------" +
                                "<br><b>WELCOME " + userName + "!!</b><br>" + m +
                                "<br>------------------------------------</i>",
                            author: "[Server]",
                            nickname: userName + admin_password,
                            app_type: clients.type,
                            channels: get_channel(userId)
                        }));
                        var json = JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i><b>" + userName + "</b> just connected..</i>",
                            author: "[Server]",
                            channel: channel
                        });
                        if (clients.type != "private") {
                            for (var i = 0, len = clients.length; i < len; i++) {
                                if (userId !== clients[i].user_id && clients[i].active === true) {
                                    clients[i].connection.sendUTF(json);
                                }
                            }
                        }
                        if (channel == "kpj" || channel == "kpj_ui") {
                            connection.sendUTF(JSON.stringify({
                                type: "online_state",
                                time: (new Date()).getTime(),
                                author: "[Server]",
                                state: apps["kpj"].online_state
                            }));
                        }
                        if (admin === true) {
                            connection.sendUTF(JSON.stringify({
                                type: "channels_admin",
                                channels: app_list
                            }));
                        }
                        online_users(appId);
                        console.log(util.get_time() + " User is known as: " + userName + " - " + userId);
                    }
                } else {
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>You haven't told us your name yet!. <br>Please type in <b>/nick &lt;your name&gt;</b> to start sending message.</i>",
                        author: "[Server]",
                    }));
                }
                // ========================================== HAS NICK ====================================================
            } else if (userName !== null && appId !== null) {
                clients = apps[appId];
                index = get_index(userId, appId);
                if(index === null) {
                    return;
                }
                if (clients.type == "private") {
                    if(clients[index].assigned === null && clients[index].operator === false && admin === false) {
                        if (msgs.msg != "/typing" && msgs.msg != "/seen" && msgs.msg != "/quit" && msgs.msg != "/ping") {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Please hold on. Our staff will be with you in a moment.</i>",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                }
                if (msgs.msg == "/quit") {
                    quit = true;
                    connection.close();
                } else if (msgs.msg == "/reload") {
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(JSON.stringify({
                                type: "reload",
                                author: userName,
                                author_id: userId
                            }));
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if (msgs.msg == "/shutdown" || msgs.msg == "/sd" || msgs.msg == "/kill" || msgs.msg == "/restart") {
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if(shutdown_verified === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Please type in your password..</i>",
                            author: "[Server]",
                        }));
                        password_shutdown = true;
                        return;
                    }
                    shutdown = true;
                    process.exit(0);
                    
                    util.clear_interval();
                    clearInterval(clean_up);
                    for (var i = 0, len = channel_list.length; i < len; i++) {
                        for (var ii = 0, len2 = apps[channel_list[i].name].length; ii < len2; ii++) {
                            var user = apps[channel_list[i].name][ii];
                            if(timer_password_temp[user.user_id] && timer_password_temp[user.user_id].timer) {
                                clearTimeout(timer_password_temp[user.user_id].timer);
                            }
                            user.is_blocked = false;
                            clearTimeout(user.ping);
                            user.connection.close();
                        }
                    }
                    server.close();
                } else if (msgs.msg == "/internet on") {
                    if (admin !== true) {
                        return;
                    }
                    util.check_internet(true);
                } else if (msgs.msg == "/internet off") {
                    if (admin !== true) {
                        return;
                    }
                    util.check_internet(false);
                } else if (msgs.msg.substring(0, 14) == "/allow_origin ") {
                    if (admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var origin = res[1];
                    origins.push(origin);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 14) == "/block_origin ") {
                    var res = msgs.msg.split(" ");
                    var origin = res[1];
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    origins.splice(origins.indexOf(origin), 1);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 7) == "/block ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (receipient === clients[i].user_name) {
                            clients[i].connection.sendUTF(JSON.stringify({
                                type: "reload",
                                time: (new Date()).getTime(),
                                author: "[Server]"
                            }));
                            blocked_id.push({
                                user_id: clients[i].user_id,
                                user_name: clients[i].user_name
                            });
                            clients[i].is_blocked = true;
                            clients[i].connection.close();
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 9) == "/unblock ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (receipient == "-a" || receipient == "-all") {
                        blocked_id = [];
                    } else {
                        for (var i = 0; i < blocked_id.length; i++) {
                            if (receipient === blocked_id[i].user_name) {
                                blocked_id.splice(i, 1);
                            }
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg == "/assign_client") {
                    clients[index].msg = [];
                    var receipient_id = msgs.receipient;
                    var receipient;
                    if (clients[index].operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (receipient_id === clients[i].user_id && clients[i].assigned === null) {
                            clients[i].assigned = userId;
                            clients[index].client = clients[i].user_id;
                            clients[i].connection.sendUTF(JSON.stringify({
                                type: "assigned",
                                assigned: userId,
                                time: (new Date()).getTime(),
                                msg: "<i>Hi.. you are now chatting with <b>" + userName + "</b>.</i>",
                                author: "[Server]",
                            }));
                            receipient = clients[i].user_name;
                            break;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "assign_client_result",
                        time: (new Date()).getTime(),
                        msg: "<i>Done</i>",
                        author: "[Server]",
                        receipient: receipient,
                        receipient_id: receipient_id,
                    }));
                    online_users(appId);
                } else if (msgs.msg == "/unassign_client") {
                    var receipient = msgs.receipient;
                    if (clients[index].operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (receipient === clients[i].user_id && clients[i].assigned !== null && clients[index].client === receipient) {
                            clients[i].assigned = null;
                            clients[i].msg = [];
                            clients[index].msg = [];
                            clients[index].client = null;
                            clients[i].connection.sendUTF(JSON.stringify({
                                type: "unassigned",
                                assigned: userId,
                                time: (new Date()).getTime(),
                                msg: "<i>Your session has ended.</i>",
                                author: "[Server]",
                            }));
                        }
                    }
                    online_users(appId);
                } else if (msgs.msg == "/online_state") {
                    clients.online_state = msgs.state;
                    connection.sendUTF(JSON.stringify({
                        type: "online_state",
                        time: (new Date()).getTime(),
                        author: "[Server]",
                        state: clients.online_state,
                    }));
                } else if (msgs.msg == "/history" || msgs.msg == "/h") {
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Chat History</i>",
                        author: "[Server]",
                    }));
                    var htry = get_history(channel);
                    connection.sendUTF(JSON.stringify(htry));
                } else if (msgs.msg == "/clear_history" || msgs.msg == "/ch") {
                    clear_history(channel);
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Chat history has been cleared.</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg == "/server" || msgs.msg == "/s") {
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var chnl_list = "";
                    for (var i = 0, len = channel_list.length; i < len; i++) {
                        var chnl_list_user = 0;
                        for (var n = 0, len2 = apps[channel_list[i].name].length; n < len2; n++) {
                            if (apps[channel_list[i].name][n].online === true) {
                                chnl_list_user++;
                            }
                        }
                        if (chnl_list_user > 0) {
                            chnl_list += "<b>" + channel_list[i].name + "</b> (<b>" + chnl_list_user + "</b>), ";
                        }
                    }
                    var blocked = "";
                    if (blocked_list.length > 0) {
                        blocked += "<br> - Blocked Orogin : <b>";
                        for (var i = 0, len = blocked_list.length; i < len; i++) {
                            blocked += blocked_list[i] + ", ";
                        }
                        blocked += "</b>";
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>----------------------------------------------------------------<br>Server Info" +
                            "<br> - Up Time : <b>" + util.DateDiff((new Date()).getTime(), start_time) + "</b>" +
                            "<br> - Total Users : <b>" + apps[appId].total_user + "</b>" +
                            "<br> - Total Message : <b>" + msg_count + "</b>" +
                            "<br> - Channel List : " + chnl_list +
                            "<br> - Current Connection : <b>" + (total_connection - 1) + "</b>" +
                            "<br> - Current Channel : <b>" + channel + "</b>" +
                            blocked +
                            "<br>----------------------------------------------------------------</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 10) == "/function " || msgs.msg.substring(0, 3) == "/f ") {
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var funct = res[1];
                    res.splice(0, 2);
                    var argument = res.toString().replace(/,/g, " ");
                    var json = JSON.stringify({
                        type: "function",
                        time: (new Date()).getTime(),
                        functions: funct,
                        arguments: argument,
                        author: userName,
                        author_id: userId
                    });
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if (msgs.msg.substring(0, 9) == "/youtube " || msgs.msg.substring(0, 4) == "/yt ") {
                    if (admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var embeded = res[1];
                    var json = JSON.stringify({
                        type: "youtube",
                        time: (new Date()).getTime(),
                        embeded: embeded,
                        author: userName,
                        author_id: userId
                    });
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if (msgs.msg.substring(0, 6) == "/open " || msgs.msg.substring(0, 3) == "/o ") {
                    if (admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var url = res[1];
                    var json = JSON.stringify({
                        type: "open",
                        time: (new Date()).getTime(),
                        url: url,
                        author: userName,
                        author_id: userId
                    });
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if (msgs.msg.substring(0, 11) == "/unmute all") {
                    var json = JSON.stringify({
                        type: "unmute",
                    });
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if (msgs.msg.substring(0, 6) == "/user " || msgs.msg.substring(0, 3) == "/u ") {
                    if (admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" "),
                        receipient = util.htmlEntities(res[1]),
                        found = false;
                    if (receipient == "" || receipient == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Receipient is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_name === receipient) {
                            var c = "",
                                chnls = get_channel(clients[i].user_id);
                            for(var n = 0; n < chnls.length; n++) {
                                c += chnls[n] + ", ";
                            }
                            var json = JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>------------------<br>User Info" +
                                    "<br> - Nickname : " + clients[i].user_name +
                                    "<br> - Online : " + util.DateDiff((new Date()).getTime(), clients[i].start) +
                                    "<br> - User ID : " + clients[i].user_id +
                                    "<br> - Origin : " + clients[i].origin +
                                    "<br> - IP Address : " + clients[i].ip_address +
                                    "<br> - Screen : " + clients[i].screen + "px" +
                                    "<br> - Active : " + clients[i].active +
                                    "<br> - User Agent : " + clients[i].agent +
                                    "<br> - Channels : " + c +
                                    "<br>------------------</i>",
                                author: "[Server]",
                            });
                            connection.sendUTF(json);
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 5) == "/chat" || msgs.msg.substring(0, 3) == "/c ") {
                    if (admin !== true) {
                        return;
                    }
                    if (msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 3) == "/c ") {
                        var res = msgs.msg.split(" ");
                        var receipient = util.htmlEntities(res[1]);
                    }
                    if (msgs.msg.substring(0, 5) == "/chat") {
                        var receipient = "-all";
                    }
                    if (receipient == "" || receipient == " ") {
                        return;
                    }
                    var json = JSON.stringify({
                        type: "chat",
                        author: userName,
                        author_id: userId
                    });
                    if (receipient === "-all" || receipient === "-a") {
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                            }
                        }
                        clients[index].seen = true;
                        return;
                    }
                    var found = false;
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_name == receipient && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                            found = true;
                            break;
                        }
                    }
                    clients[index].seen = true;
                    if (found === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if (msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
                    var admin_password = "",
                        res = msgs.msg.split(" "),
                        newNick = util.htmlEntities(res[1]);
                    if (newNick == "" || newNick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    admin = false;
                    var isadmin = check_admin(newNick.toUpperCase());
                    if (isadmin === true) {
                        if (!res[2]) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>" + newNick + "</b> is reserved for admin. Please type in your password.</i>",
                                author: "[Server]",
                            }));
                            if (!timer_password_temp[msgs.id]) {
                                timer_password_temp[msgs.id] = {
                                    timer: null
                                };
                            }
                            timer_password(msgs.id, connection);
                            password = true;
                            password_user = newNick;
                            return;
                        } else {
                            var verified = check_password(newNick.toUpperCase(), res[2]);
                            password = false;
                            password_user = null;
                            if (timer_password_temp[msgs.id]) {
                                if (timer_password_temp[msgs.id].timer) {
                                    clearTimeout(timer_password_temp[msgs.id].timer);
                                }
                                delete timer_password_temp[msgs.id];
                            }
                            if (verified === false) {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. Invalid password.</i>",
                                    author: "[Server]",
                                }));
                                return;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type: "info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                }));
                                admin_password = " " + res[2];
                                admin = true;
                            }
                        }
                    } else {
                        clients[index].admin = false;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (newNick === clients[i].user_name && clients[i].active === true) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>" + newNick + "</b> is not available.</i>",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    console.log(util.get_time() + " User " + userName + " has changed nickname to " + newNick);
                    connection.sendUTF(JSON.stringify({
                        type: "newNick",
                        time: (new Date()).getTime(),
                        msg: "<i>You are now known as <b>" + newNick + "</b></i>",
                        author: "[Server]",
                        nickname: newNick + admin_password,
                    }));
                    var json = JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i><b>" + userName + "</b> has changed nickname to <b>" + newNick + "</b></i>",
                        author: "[Server]",
                    });
                    if (clients.type != "private") {
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                    }
                    if (admin === true) {
                        connection.sendUTF(JSON.stringify({
                            type: "channels_admin",
                            channels: app_list
                        }));
                    }
                    userName = newNick;
                    clients[index].user_name = userName;
                    online_users(appId);
                } else if (msgs.msg.substring(0, 9) == "/channel " || msgs.msg.substring(0, 4) == "/ch " || msgs.msg.substring(0, 3) == "/j ") {
                    var res = msgs.msg.split(" ");
                    var chnl = util.htmlEntities(res[1]);
                    if (chnl === appId) {
                        return;
                    }
                    if (chnl == "" || chnl == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Channel is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (!apps[chnl]) {
                        util.add_app(apps, chnl);
                    }
                    for (var i = 0, len = apps[chnl].length; i < len; i++) {
                        if (apps[chnl][i].user_id !== userId && userName === apps[chnl][i].user_name) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>" + userName + "</b> is not available in that channel.<br>Please change your nickname and try again.</i>",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    var check = false;
                    for (var i = 0, len = apps[chnl].length; i < len; i++) {
                        if (apps[chnl][i].user_id === userId) {
                            check = true;
                            break;
                        }
                    }
                    if (check === false) {
                        apps[chnl].push(clients[index]);
                        add_channel(userId, chnl);
                    }
                    channel = chnl;
                    appId = chnl;
                    setup_channel(appId);
                    clients = apps[appId];
                    index = get_index(userId, appId);
                    clients[index].app_id = appId;
                    clients[index].channel = appId;
                    clients[index].assigned = null;

                    console.log(util.get_time() + " User " + userName + " has changed channel to " + channel);
                    var users = "";
                    var n = 1;
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_id === userId) {
                            users += "<br>" + (n++) + ". <b>" + clients[i].user_name + "</b>";
                        } else {
                            users += "<br>" + (n++) + ". " + clients[i].user_name;
                        }
                    }
                    if (check === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "channels",
                            channels: get_channel(userId),
                        }));
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>You are now in channel <b>" + chnl + "</b></i>",
                            author: "[Server]",
                            channel: chnl,
                        }));
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>------------------<br>Online users" + users + "<br>------------------</i>",
                            author: "[Server]",
                        }));
                    }
                    var json = JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i><b>" + userName + "</b> has joined the channel..</i>",
                        author: "[Server]",
                        channel: channel,
                    });
                    if (clients.type != "private" && check === false) {
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                    }
                    if (check === false) {
                        online_users(channel);
                    } else {
                        online_users(channel, connection);
                    }
                } else if (msgs.msg.substring(0, 7) == "/leave " || msgs.msg.substring(0, 3) == "/l " || msgs.msg == "/l") {
                    if(msgs.msg == "/l") {
                        var chnl = channel;
                    } else {
                        var res = msgs.msg.split(" ");
                        var chnl = util.htmlEntities(res[1]);
                    }
                    if (chnl == "" || chnl == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Channel is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (get_channel(userId).length == 1) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Cant leave this channel.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (!apps[chnl]) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Channel is not valid.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var check = false;
                    for (var i = 0, len = apps[chnl].length; i < len; i++) {
                        if (userId === apps[chnl][i].user_id) {
                            check = true;
                        }
                    }
                    if(check === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. You're not in that channel.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var type = "info";
                    if (clients.type == "private") {
                        type = "leave";
                    }
                    var json = JSON.stringify({
                        type: type,
                        user_id: userId,
                        time: (new Date()).getTime(),
                        msg: "<i><b>" + userName + "</b> has left the channel..</i>",
                        author: "[Server]",
                        channel: chnl
                    });
                    for (var i = 0, len = apps[chnl].length; i < len; i++) {
                        if (userId !== apps[chnl][i].user_id && apps[chnl][i].active === true) {
                            apps[chnl][i].connection.sendUTF(json);
                        }
                    }
                    del_channel(userId, chnl);
                    var idx = get_index(userId, chnl);
                    apps[chnl].splice(idx, 1);
                    online_users(chnl);
                    connection.sendUTF(JSON.stringify({
                        type: "channels",
                        channels: get_channel(userId),
                    }));
                    if (chnl === appId) {
                        var chnls = get_channel(userId);
                        for (var i = 0, len = chnls.length; i < len; i++) {
                            for (var ii = 0, len2 = apps[chnls[i]].length; ii < len2; ii++) {
                                if (apps[chnls[i]][ii].user_id === userId) {
                                    channel = chnls[i];
                                    appId = chnls[i];
                                    clients = apps[chnls[i]];
                                    index = get_index(userId, appId);
                                    clients[index].app_id = appId;
                                    clients[index].channel = appId;
                                    clients[index].assigned = null;
                                    connection.sendUTF(JSON.stringify({
                                        type: "leave_channel",
                                        time: (new Date()).getTime(),
                                        author: "[Server]",
                                        new_channel: channel,
                                    }));
                                    online_users(channel, connection);
                                    return;
                                }
                            }
                        }
                    }
                } else if (msgs.msg == "/users" || msgs.msg == "/u") {
                    var users = "";
                    var n = 1;
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].online === true) {
                            if (clients[i].user_id === userId) {
                                users += "<br>" + (n++) + ". <b>" + clients[i].user_name + "</b>";
                            } else {
                                users += "<br>" + (n++) + ". " + clients[i].user_name;
                            }
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Online users" + users + "<br>------------------</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a " || msgs.msg == "/alert" || msgs.msg == "/a") {
                    if (msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a ") {
                        var res = msgs.msg.split(" ");
                        var receipient = util.htmlEntities(res[1]);
                        if (receipient == "" || receipient == " ") {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Receipient is empty.",
                                author: "[Server]",
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
                    var json = JSON.stringify({
                        type: "alert",
                        time: (new Date()).getTime(),
                        msg: "<i><b>" + userName + "</b> needs your attention.</i>",
                        author: userName,
                        author_id: userId,
                        channel: msgs.channel
                    });
                    if (clients.type == "private") {
                        receipient = (clients[index].assigned !== null) ? clients[index].assigned : ((clients[index].client !== null) ? clients[index].client : null);
                    }
                    if (receipient === "all") {
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                            }
                        }
                        clients[index].seen = true;
                    } else {
                        var found = false;
                        clients[index].seen = true;
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if ((clients[i].user_name === receipient || clients[i].user_id === receipient) && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                                clients[index].seen = false;
                                found = true;
                                break;
                            }
                        }
                        if (found === false) {
                            connection.sendUTF(JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Receipient <b>" + receipient + "</b> is not here.</i>",
                                author: "[Server]",
                            }));
                        }
                    }
                } else if (msgs.msg.substring(0, 5) == "/msg " || msgs.msg.substring(0, 3) == "/m ") {
                    if (clients.type == "private") {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var receipient = util.htmlEntities(res[1]);
                    res.splice(0, 2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    if (the_msg == "" || the_msg == " ") {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Message is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var json = JSON.stringify({
                        type: "message",
                        time: (new Date()).getTime(),
                        msg: the_msg,
                        author: userName,
                        author_id: userId,
                    });
                    var found = false;
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_name === receipient || clients[i].user_id === receipient) {
                            if (clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            } else {
                                clients[i].msg.push(json);
                                clients[i].msg = clients[i].msg.slice(-20);
                            }
                            clients[i].seen = false;
                            clients[index].seen = false
                            found = true;
                            var obj = {
                                msg: util.htmlEntities(msgs.msg),
                                username: userName,
                                channel: channel,
                                ip_address: ip_address
                            };
							if (store_msg) {
								util.PostThis(obj, "localhost", "/websocket/msgs.php");
								break;
							}
                        }
                    }
                    if (found === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>" + receipient + "</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if (msgs.msg.substring(0, 7) == "/close ") {
                    if (admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (userName === receipient) {
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (clients[i].user_name === receipient) {
                            clients[i].connection.sendUTF(JSON.stringify({
                                type: "quit",
                                time: (new Date()).getTime(),
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Oopss.. username <b>" + receipient + "</b> is not here.</i>",
                        author: "[Server]",
                    }));
                } else if (msgs.msg == "/typing") {
                    if(!apps[msgs.channel]) {
                        return;
                    }
                    var json = JSON.stringify({
                        type: "typing",
                        author: userName
                    });
                    var idx = get_index(userId, msgs.channel);
                    if (apps[msgs.channel].type == "private") {
                        if (apps[msgs.channel][idx].assigned !== null) {
                            for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                if (apps[msgs.channel][idx].assigned === apps[msgs.channel][i].user_id) {
                                    apps[msgs.channel][i].connection.sendUTF(json);
                                }
                            }
                        }
                        if (apps[msgs.channel][idx].operator === true && apps[msgs.channel][idx].client !== null) {
                            for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                if (apps[msgs.channel][idx].client === apps[msgs.channel][i].user_id) {
                                    apps[msgs.channel][i].connection.sendUTF(json);
                                }
                            }
                        }
                        return;
                    }
                    for (var i = 0, len = clients.length; i < len; i++) {
                        if (userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if (msgs.msg == "/ping") {
                    connection.sendUTF(JSON.stringify({
                        type: "pong",
                    }));
                } else if (msgs.msg == "/seen") {
                    if(!apps[msgs.channel]) {
                        return;
                    }
                    var json = JSON.stringify({
                        type: "seen",
                        author: userName
                    });
                    var idx = get_index(userId, msgs.channel);
                    if (apps[msgs.channel].type == "private") {
                        if (apps[msgs.channel][idx].assigned !== null) {
                            for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                if (apps[msgs.channel][idx].assigned === apps[msgs.channel][i].user_id) {
                                    apps[msgs.channel][i].connection.sendUTF(json);
                                }
                            }
                        }
                        if (apps[msgs.channel][idx].operator === true && apps[msgs.channel][idx].client !== null) {
                            for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                if (apps[msgs.channel][idx].client === apps[msgs.channel][i].user_id) {
                                    apps[msgs.channel][i].connection.sendUTF(json);
                                }
                            }
                        }
                        apps[msgs.channel][idx].seen = true;
                        return;
                    }
                    var all = true;
                    var receipient = msgs.receipient;
                    apps[msgs.channel][idx].seen = true;
                    var client_count = 0;
                    for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                        if (apps[msgs.channel][i].seen === false) {
                            all = false;
                        }
                        client_count++;
                    }
                    if (client_count > 2 && all === true) {
                        var json = JSON.stringify({
                            type: "seen",
                            author: "all"
                        });
                    }
                    for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                        if (apps[msgs.channel][i].user_id === receipient) {
                            apps[msgs.channel][i].connection.sendUTF(json);
                        }
                    }
				} else if (msgs.msg.substring(0, 11) == "/store_msg ") {
					if(!admin) return;
					var a = msgs.msg.split(" ");
					store_msg = (a[0] == "on") ? true : false;
                } else if (msgs.msg == "/flood") {
                    if (admin !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (flood === true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you are still flooding.. please flood again later</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    flood = true;
                    var n = 0;
                    var floodTimer = setInterval(function() {
                        n++;
                        var json = JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            author: userName,
                            msg: "you have just been flooded by " + userName + " - " + n
                        });
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        if (n > 2000 || flood === false) {
                            clearInterval(floodTimer);
                            flood = false;
                        }
                    }, 50);
                } else if (msgs.msg == "/flood-stop") {
                    flood = false;
                } else if (msgs.msg == "/help" || msgs.msg.substring(0, 1) == "/") {
                    if (clients.type == "private" && clients[index].operator === false) {
                        return;
                    }
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------------------------<br>List of commands" + helps + "<br>------------------------------------</i>",
                        author: "[Server]",
                    }));
                } else {
                    var obj = {
                        type: "message",
                        time: (new Date()).getTime(),
                        msg: util.htmlEntities(msgs.msg),
                        author: userName,
                        author_id: userId,
                        channel: channel
                    };
                    msg_count++;
                    into_history(channel, obj);
                    var json = JSON.stringify(obj);
                    if (clients.type == "private") {
                        if (clients[index].assigned !== null) {
                            for (var i = 0, len = clients.length; i < len; i++) {
                                if (userId !== clients[i].user_id && (clients[index].assigned === clients[i].user_id || clients[i].admin === true)) {
                                    clients[i].connection.sendUTF(json);
                                    if (clients[i].admin === false) {
                                        clients[i].msg.push(json);
                                        clients[i].msg = clients[i].msg.slice(-20);
                                    }
                                    clients[i].seen = false;
                                }
                            }
                            clients[index].msg.push(json);
                            clients[index].msg = clients[index].msg.slice(-20);
                        }
                        if (clients[index].operator === true && clients[index].client !== null) {
                            for (var i = 0, len = clients.length; i < len; i++) {
                                if (userId !== clients[i].user_id && (clients[index].client === clients[i].user_id || clients[i].admin === true)) {
                                    clients[i].connection.sendUTF(json);
                                    if (clients[i].admin === false) {
                                        clients[i].msg.push(json);
                                        clients[i].msg = clients[i].msg.slice(-20);
                                    }
                                    clients[i].seen = false;
                                }
                            }
                            clients[index].msg.push(json);
                            clients[index].msg = clients[index].msg.slice(-20);
                        }
                    } else {
                        for (var i = 0, len = clients.length; i < len; i++) {
                            if (userId !== clients[i].user_id) {
                                if (clients[i].active === true) {
                                    clients[i].connection.sendUTF(json);
                                } else {
                                    clients[i].msg.push(json);
                                    clients[i].msg = clients[i].msg.slice(-20);
                                }
                                clients[i].seen = false;
                            }
                        }
                    }
                    clients[index].seen = true;
                    var obj = {
                        msg: util.htmlEntities(msgs.msg),
                        username: userName,
                        channel: channel,
                        ip_address: ip_address
                    };
                    if (store_msg) {
                        if (clients.type == "private") {
                            util.PostThis(obj, "www.kpjselangor.com", "/chat/msgs.php");
                        } else {
                            util.PostThis(obj, "localhost", "/websocket/msgs.php");
                        }
                    }
                }
            }
        }
    });


    // ========================================== DISCONNECT ====================================================

    connection.on("close", function(connection) {
        total_connection--;
        if (shutdown === false) {
            index = get_index(userId, appId);
            if (index === null) {
                return;
            }
            var client = apps[appId];
            if (userName !== null && appId !== null && client[index].active === true && quit === false && client[index].is_blocked === false) {
                client[index].active = false;
                ping(client[index].user_id, client[index].app_id);
            }
            if (quit === true || client[index].is_blocked === true) {
                if(client[index].ping !== null) {
                    clearTimeout(client[index].ping);
                }
                var p = " has closed the connection";
                var chnls = get_channel(userId);
                for (var i = 0, len = chnls.length; i < len; i++) {
                    for (var ii = 0, len2 = apps[chnls[i]].length; ii < len2; ii++) {
                        if (apps[chnls[i]][ii].user_id == userId) {
                            remove_client(ii, chnls[i], p);
                            break;
                        }
                    }
                }
            }
        }
    });

});



// =========================================================== FUNCTIONS ===========================================================


var get_index = function(id, app) {
    var client = apps[app];
    if (client) {
        for (var i = 0, len = client.length; i < len; i++) {
            if (client[i].user_id === id) {
                return i;
            }
        }
    }
    return null;
};


var ping = function(id, app) {
    var idx = get_index(id, app);
    if (idx === null) {
        return;
    }
    if(apps[app][idx].ping !== null) {
        clearTimeout(apps[app][idx].ping);
    };
    apps[app][idx].ping = setTimeout(function() {
        var client = apps[app];
        idx = get_index(id, app);
        if (idx === null) {
            return;
        }
        apps[app][idx].ping = null;
        if (client[idx].active === false) {
            var p = " has been disconnected.. - [No Respond]";
            for (var i = 0, len = app_list.length; i < len; i++) {
                for (var ii = 0, len2 = apps[app_list[i]].length; ii < len2; ii++) {
                    if (apps[app_list[i]][ii].user_id == id) {
                        remove_client(ii, app_list[i], p);
                        break;
                    }
                }
            }
        } else {
            console.log(util.get_time() + " " + client[idx].user_name + " is active.");
        }
    }, 15000);
};


var timer_password = function(id, con) {
    clearTimeout(timer_password_temp[id].timer);
    timer_password_temp[id].timer = setTimeout(function() {
        con.sendUTF(JSON.stringify({
            type: "quit",
            time: (new Date()).getTime(),
            author: "[Server]",
        }));
        if (timer_password_temp[id]) {
            delete timer_password_temp[id];
        }
    }, 15000);
};


var remove_client = function(idx, app, pingresult) {
    var client = apps[app];
    var type = "info";
    if (client[idx].is_blocked === true) {
        pingresult = " has been blocked by admin.";
    }
    if (client.type == "private") {
        type = "leave";
        if (client[idx].client !== null) {
            var cl = client[idx].client;
            for (var i = 0, len = client.length; i < len; i++) {
                if (client[i].user_id === cl) {
                    client[i].assigned = null;
                    client[i].msg = [];
                    client[i].connection.sendUTF(JSON.stringify({
                        type: "unassigned",
                        assigned: userId,
                        time: (new Date()).getTime(),
                        msg: "<i>Your session has ended due to <b>" + userName + "'s</b> connectivity.</i>",
                        author: "[Server]",
                        channel: app
                    }));
                    break;
                }
            }
        }
    }
    var json = JSON.stringify({
        type: type,
        user_id: client[idx].user_id,
        time: (new Date()).getTime(),
        msg: "<i><b>" + client[idx].user_name + "</b>" + pingresult + "</i>",
        author: "[server]",
        channel: app
    });
    console.log(util.get_time() + " " + client[idx].user_name + pingresult);
    del_user(client[idx].user_id);
    client.splice(idx, 1);
    for (var i = 0, len = client.length; i < len; i++) {
        if (client[i].active === true) {
            client[i].connection.sendUTF(json);
        }
    }
    online_users(app);
};

var online_users = function(app, conn) {
    var client = apps[app];
    var users = [];
    for (var i = 0, len = client.length; i < len; i++) {
        if (client[i].active === true) {
            users.push({
                name: client[i].user_name,
                id: client[i].user_id,
                ip_address: client[i].ip_address,
                assigned: client[i].assigned,
                operator: client[i].operator,
                admin: client[i].admin,
            });
        }
    }
    var json = JSON.stringify({
        type: "users",
        channel: app,
        time: (new Date()).getTime(),
        users: users,
        author: "[Server]",
    });
    if (conn) {
        conn.sendUTF(json);
        return;
    }
    for (var i = 0, len = client.length; i < len; i++) {
        if (client[i].active === true && client[i].channel === app) {
            client[i].connection.sendUTF(json);
        }
    }
};

var check_admin = function(username) {
    for (var i = 0, len = admins.length; i < len; i++) {
        if (admins[i].username === username) {
            return true;
        }
    }
    return false;
};

var setup_channel = function(chnl) {
    for (var i = 0, len = channel_list.length; i < len; i++) {
        if (channel_list[i].name === chnl) {
            channel_list[i].users++;
            return;
        }
    }
    channel_list.push({
        name: chnl,
        users: 1,
    });
    console.log("Channel created - " + chnl);
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

var check_password = function(username, password) {
    for (var i = 0, len = admins.length; i < len; i++) {
        if (admins[i].password === password && admins[i].username === username) {
            return true;
        }
    }
    return false;
};

var check_blocked_id = function(id) {
    for (var i = 0, len = blocked_id.length; i < len; i++) {
        if (blocked_id[i].user_id === id) {
            return true;
        }
    }
    return false;
};

var check_user = function(m) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id === m.id) {
            return true;
        }
    }
    users.push({
        user_id: m.id,
        user_name: util.htmlEntities(m.msg.split(" ")[1]),
        channels: [m.channel]
    });
    return true;
}

var del_user = function(id) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id === id) {
            users.splice(i, 1);
            return true;
        }
    }
    return false;
}

var get_channel = function(id) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id === id) {
            return users[i].channels;
        }
    }
}

var add_channel = function(id, chnl) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id === id) {
            if(users[i].channels.indexOf(chnl) === -1) {
                users[i].channels.push(chnl);
                return true;
            }
        }
    }
}

var del_channel = function(id, chnl) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id === id) {
            var idx = users[i].channels.indexOf(chnl);
            users[i].channels.splice(idx, 1);
            break;
        }
    }
    return true;
}

var date_std = function (timestamp) {
    if(!timestamp) timestamp = new Date().getTime();
    if(Math.ceil(timestamp).toString().length == 10) timestamp *= 1000;
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var date = new Date(timestamp - tzoffset);
    var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    return iso[1] + ' ' + iso[2];
}

clean_up = setInterval(function() {
    for (var i = 0, len = app_list.length; i < len; i++) {
        for (var ii = 0, len2 = apps[app_list[i]].length; ii < len2; ii++) {
            if (app_list[i] == "kpj_ui" || app_list[i] == "ladiesfoto_ui" || app_list[i] == "utiis_ui") {
                if ((new Date()).getTime() - apps[app_list[i]][ii].last_seen > 900000 && apps[app_list[i]][ii].admin === false) {
                    apps[app_list[i]][ii].connection.close();
                }
            }
        }
    }
}, 60000);
