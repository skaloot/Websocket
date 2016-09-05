
"use strict";

function checkTime(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function get_time(t) {
    t = new Date();
    var h = t.getHours();
    var m = t.getMinutes();
    var s = t.getSeconds();
    h = checkTime(h);
    m = checkTime(m);
    s = checkTime(s);
    return h + ":" + m + ":" + s + " - ";
}

function get_date() {
    var t = new Date();
    var y = t.getFullYear();
    var m = t.getMonth()+1;
    var d = t.getDate();
    var h = t.getHours();
    var mt = t.getMinutes();
    var s = t.getSeconds();
    return m + "-" + d + "-" + y + "-" + h + "-" + mt + "-" + s;
}

function htmlEntities(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function originIsAllowed(origin) {
  return true;
}

function DateDiff(time1, time2) {
    var str1 = time1.split("-");
    var str2 = time2.split("-");

    var t1 = new Date(str1[2], str1[0]-1, str1[1], str1[3], str1[4], str1[5]);
    var t2 = new Date(str2[2], str2[0]-1, str2[1], str2[3], str2[4], str2[5]);

    var diffMS = t1 - t2;    
    var diffS = Math.floor(diffMS / 1000);
    var diffM = Math.floor(diffS / 60);
    var diffH = Math.floor(diffM / 60);
    var diffD = Math.floor(diffH / 24);
    diffS = diffS - (diffM * 60);
    diffM = diffM - (diffH * 60);
    diffH = diffH - (diffD * 24);
    
    return diffD+" days, "+diffH+" hours, "+diffM+" minutes, "+diffS+" seconds";
}

var set_app = function(apps,app_list) {
    for(var i=0, len=app_list.length; i<len; i++) {
        console.log(app_list[i]);
        if(!apps[app_list[i]]) {
            apps[app_list[i]] = [];
            apps[app_list[i]].total_user = 0;
            apps[app_list[i]].history = {type:"history" ,msg:[]};
        }
    }
};

var set_apps = function() {
    set_app(apps,app_list);
};

function PostThis(obj, type, url) {
    var post_data = querystring.stringify(obj);
    var post_options = {
      host: "localhost",
      port: "80",
      path: url,
      method: "POST",
      headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(post_data)
      }
    };
    var post_req = http.request(post_options, function(res) {
        res.setEncoding("utf8");
        res.on("data", function (data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.log("This doesn\'t look like a valid JSON: ", data);
                return;
            }
            if(type === "admin") {
                for(var i=0, len=data.length; i<len; i++) {
                    obj.push({username: data[i].username, password: data[i].password});
                }
            }
        });
    });
    post_req.write(post_data);
    post_req.end();
}







// =========================================================================================================


process.title = "node-chat";
// var port = 8080;
var port = 3777;
var webSocketServer = require("websocket").server;
var http = require("http");
var querystring = require("querystring");
var fs = require("fs");
var app_list = ["ska"];
var admins = [];
var apps = [];
var channel_list = [];
var clients;
var msg_count = 0;
var start_time = get_date();
var shutdown = false;
var time;

var helps = ""
    +"<br><b>/nick</b> - to set or change nickname"
    +"<br><b>/users</b> - to get online users"
    +"<br><b>/info</b> - to get your connection info"
    +"<br><b>/history</b> - to get chat history"
    +"<br><b>/msg &lt;name&gt; &lt;your message&gt;</b> - for private message"
    +"<br><b>/alert &lt;name&gt;</b> - to get your friend's attention"
    +"<br><b>/quit</b> - to close your connection"
    +"<br><b>/clear</b> - to clear your screen"
    +"<br><b>/mute</b> - to mute your notification sound"
    +"<br><b>/unmute</b> - to unmute your notification sound"
    +"<br>arrow <b>up</b> - and <b>down</b> for your messages history";


// ========================================= CREATE SERVER ====================================================

var options = {
    // key: fs.readFileSync("key.pem"),
    // cert: fs.readFileSync("cert.pem")
};

// var server = https.createServer(options, function(request, response) {
var server = http.createServer(function(request, response) {

}); 

time = (new Date()).getTime();
server.listen(port, function() {
    console.log("start Time : "+start_time);
    console.log(get_time(time) + " Server is listening on port " + port);
});

var wsServer = new webSocketServer({
    httpServer: server
});


set_app(apps,app_list);
PostThis(admins, "admin", "/websocket/admin.php");


// ========================================== CONNECT ====================================================

wsServer.on("request", function(request) {
    time = (new Date()).getTime();
    console.log(get_time(time) + " Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin);
    var userName = null;
    var userId = null;
    var appId = null;
    var channel = null;
    var ping_result = " has closed the connection";
    var flood = false;
    var check = false;
    var quit = false;
    var password = false;
    var password_user = null;
    var detail;
    var index = 0;
    var admin = false;

    connection.sendUTF(JSON.stringify({
        type: "connected",
        time: (new Date()).getTime(),
        msg: "<i>Connected...",
        author: "[Server]",
    }));

    // ========================================== GET MSG ====================================================

    connection.on("message", function(message) {
        time = (new Date()).getTime();
        if (message.type === "utf8") {
            var msgs = message.utf8Data;
            try {
                msgs = JSON.parse(msgs);
            } catch (e) {
                console.log("This doesn\'t look like a valid JSON: ", msgs);
                return;
            }
            console.log(get_time(time) + " Received Message : " + msgs.msg);
            // ========================================== NO APP ID ====================================================
            if(msgs.msg == "/appid") {
                if (appId === null && userName === null) {
                    var found = false;
                    for(var i=0, len=app_list.length; i<len; i++) {
                        if(app_list[i] == msgs.app_id) {
                            found = true;
                            appId = htmlEntities(msgs.app_id);
                            clients = apps[app_list[i]];
                            console.log("App ID - "+app_list[i]);
                            connection.sendUTF(JSON.stringify({
                                type:"app_id",
                                time: (new Date()).getTime(),
                                app_id: appId,
                                author: "[Server]",
                            }));
                            break;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:"appid_invalid",
                            time: (new Date()).getTime(),
                            msg: "<i>Your App ID is invalid!. Please reload the page.",
                            author: "[Server]",
                        }));
                        return;
                    }
                }
                return;
            }
            // ========================================== NO NICK ====================================================
            clients = apps[appId];
            if (password === true) {
                var stop = false;
                var pw = "<i>Password Invalid.</i>";
                if(msgs.msg.substring(0, 3) == "/p ") {
                    var res = msgs.msg.split(" ");
                    msgs.msg = "/n "+password_user+" "+htmlEntities(res[1]);
                } else {
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>Password is empty. Please type in the password.</i>",
                        author: "[Server]",
                    }));
                    return;
                }
                password = false;
                password_user = null;
            }
            if (userName === null && appId !== null) {
                if(msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
                    var reconnect = false;
					var admin_password = "";
                    var res = msgs.msg.split(" ");
                    var nick = htmlEntities(res[1]);
                    if (nick == "" || nick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Your nickname is empty.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var isadmin = check_admin(nick.toUpperCase());
                    if(isadmin === true) {
                        if(!res[2]) {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>"+nick+"</b> is reserved for admin. Please type in <b>/p &lt;password&gt;</b>.</i>",
                                author: "[Server]",
                            }));
                            password = true;
                            password_user = nick;
                            return;
                        } else {
                            var verified = check_password(nick.toUpperCase(), res[2]);
                            if(verified === false) {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss..Invalid password.</i>",
                                    author: "[Server]",
                                }));
                                return;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                }));
								admin_password = " "+res[2];
                                admin = true;
                            }
                        }
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_id === msgs.id) {
                            if(clients[i].active === false) {
                                console.log(get_time(time) + " Existing user! - "+ clients[i].user_name+" - "+clients[i].user_id);
                                userName = clients[i].user_name;
                                userId = clients[i].user_id;
                                channel = msgs.channel;
                                clients[i].connection = connection;
                                clients[i].active = true;
                                clients[i].online = true;
                                clients[i].seen = false;
                                reconnect = true;
                                index = i;
                                if(clients[i].msg.length > 0) {
                                    connection.sendUTF(JSON.stringify({
                                        type:"info",
                                        time: (new Date()).getTime(),
                                        msg: "<i>------------------------------------<br>Unread Message..</i>",
                                        author: "[Server]",
                                    }));
                                    for(var n=0, len2=clients[i].msg.length; n<len2; n++) {
                                        connection.sendUTF(clients[i].msg[n]);
                                    }
                                }
                                clients[i].msg = [];
                                var users = "";
                                var n = 1;
                                for(var x=0, len2=clients.length; x<len2; x++) {
                                    if(clients[x].online === true && channel === clients[x].channel) {
                                        if(clients[x].user_id === userId) {
                                            users += "<br>"+(n++)+". <b>"+clients[x].user_name+"</b>";
                                        } else {
                                            users += "<br>"+(n++)+". "+clients[x].user_name;
                                        }
                                    }
                                }
                                var obj = {username: userName, channel: channel};
                                PostThis(obj, "login", "/websocket/login_mail.php");
								connection.sendUTF(JSON.stringify({
                                    type:"online",
                                    time: (new Date()).getTime(),
                                    msg: "<i>------------------<br>Online users"+users+"<br>------------------</i>",
                                    author: "[Server]",
									nickname: userName+admin_password,
                                }));
                                break;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. You are already connected.</i>",
                                    author: "[Server]",
                                }));
                                return;
                            }
                        } else {
                            if(clients[i].user_name === nick && clients[i].active === true && clients[i].channel === msgs.channel) {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. Nickname is not available.",
                                    author: "[Server]",
                                }));
                                return;
                            }
                        }
                    }
                    if(reconnect === false) {
                        if(!msgs.channel) {
                            chnl = "no_channel";
                        } else {
                            chnl = msgs.channel;
                        }
                        userName = nick;
                        userId = msgs.id;
                        channel = chnl;
                        detail = {
                            connection: connection,
                            user_name: userName,
                            user_id: userId,
                            app_id: appId,
                            channel: msgs.channel,
                            origin: request.origin,
                            seen: false,
                            active: true,
                            online: true,
                            ping: true,
                            msg: [],
                        };
                        setup_channel(channel);
                        clients.push(detail);
                        index = clients.length-1;
                        clients.total_user++;

                        var users = "";
                        var n = 1;
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(clients[i].online === true && channel === clients[i].channel) {
                                if(clients[i].user_id === userId) {
                                    users += "<br>"+(n++)+". <b>"+clients[i].user_name+"</b>";
                                } else {
                                    users += "<br>"+(n++)+". "+clients[i].user_name;
                                }
                                
                            }
                        }
                        var obj = {username: userName, channel: channel};
                        PostThis(obj, "login", "/websocket/login_mail.php");
                        connection.sendUTF(JSON.stringify({
                            type:"welcome", 
                            time: (new Date()).getTime(),
                            msg: "<i>------------------------------------"
                            +"<br><b>WELCOME "+userName+"!!</b><br>Type <b>/help</b> for list of command."
                            +"<br>------------------------------------</i>"
                            +"<br>Online users"+users+"<br>------------------</i>",
                            author: "[Server]",
                            nickname: userName+admin_password,
                            url: null,
                        }));
                        var json = JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> just connected..</i>",
                            author: "[Server]",
                        });
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        console.log(get_time(time) + " User is known as: " + userName + " - " + userId);
                    }
                } else {
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>You dont have a nickname yet!. <br>Please type in <b>/nick &lt;your name&gt;</b> to start sending message.</i>",
                        author: "[Server]",
                    }));
                }
            // ========================================== HAS NICK ====================================================
            } else if (userName !== null && appId !== null) {
                index = get_index(userId,appId);
                if(msgs.msg == "/quit") {
                    ping_result = " has closed the connection";
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>You have closed the connection. Thank You."
                        +"<br>--- bye ---</i>",
                        author: "[Server]",
                    }));
                    quit = true;
                    connection.close();
                } else if(msgs.msg == "/reload") {
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(JSON.stringify({type:"reload", author: userName, author_id: userId}));
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if(msgs.msg == "/shutdown" || msgs.msg == "/sd"  || msgs.msg == "/kill" || msgs.msg == "/restart") {
                    if(admin !== true) {
                        return;
                    }
                    shutdown = true;
                    for(var i=0, len=clients.length; i<len; i++) {
                        clients[i].connection.close();
                    }
                    server.close();
                } else if(msgs.msg == "/history" || msgs.msg == "/h") {
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Chat History</i>",
                        author: "[Server]",
                    }));
                    var htry = get_history(channel);
                    connection.sendUTF(JSON.stringify(htry));
                } else if(msgs.msg == "/clear_history" || msgs.msg == "/ch") {
                    clear_history(channel);
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>Chat history has been cleared.</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg == "/server" || msgs.msg == "/s") {
                    if(admin !== true) {
                        return;
                    }
                    var Apps = "";
                    for(var i=0, len=app_list.length; i<len; i++) {
                        Apps += app_list[i]+", ";
                    }
                    var chnl_list = "";
                    for(var i=0, len=channel_list.length; i<len; i++) {
                        var chnl_list_user = 0;
                        for(var n=0, len2=clients.length; n<len2; n++) {
                            if(channel_list[i].name === clients[n].channel && clients[n].online === true) {
                                chnl_list_user++;
                            }
                        }
                        if(chnl_list_user > 0) {
                            chnl_list += channel_list[i].name+" ("+chnl_list_user+"), ";
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Server Info"
                        +"<br> - Up Time : <b>"+DateDiff(get_date(), start_time)+"</b>"
                        +"<br> - Total Users : <b>"+apps.ska.total_user+"</b>"
                        +"<br> - Total Message : <b>"+msg_count+"</b>"
                        +"<br> - Channel List : <b>"+chnl_list+"</b>"
                        +"<br> - Current Channel : <b>"+channel+"</b>"
                        +"<br>------------------</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg.substring(0, 10) == "/function " || msgs.msg.substring(0, 3) == "/f ") {
                    if(admin !== true) {
                        return;
                    }
                    var res = msgs.msg.split(" ");
                    var funct = res[1];
                    res.splice(0,2);
                    var argument = res.toString().replace(/,/g, " ");
                    var json = JSON.stringify({
                        type:"function",
                        time: (new Date()).getTime(),
                        function: funct,
                        arguments: argument,
                        author: userName,
                        author_id: userId
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if(msgs.msg.substring(0, 6) == "/open " || msgs.msg.substring(0, 3) == "/o ") {
                    var res = msgs.msg.split(" ");
                    var url = res[1];
                    var json = JSON.stringify({
                        type:"open",
                        time: (new Date()).getTime(),
                        url: url,
                        author: userName,
                        author_id: userId
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if(msgs.msg.substring(0, 11) == "/unmute all") {
                    var json = JSON.stringify({
                        type:"unmute",
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg.substring(0, 6) == "/user " || msgs.msg.substring(0, 3) == "/u ") {
                    var res = msgs.msg.split(" ");
                    var receipient = htmlEntities(res[1]);
                    var found = false;
                    var json = JSON.stringify({
                        type: "my-info",
                        author_id: userId,
                    });
                    if (receipient == "" || receipient == " ") {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Receipient is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            break;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 5) == "/chat" || msgs.msg.substring(0, 3) == "/c ") {
                    if(admin !== true) {
                        return;
                    }
                    if(msgs.msg.substring(0, 6) == "/chat " || msgs.msg.substring(0, 3) == "/c ") {
                        var res = msgs.msg.split(" ");
                        var receipient = htmlEntities(res[1]);
                    }
                    if(msgs.msg.substring(0, 5) == "/chat") {
                        var receipient = "-all";
                    }
                    if(receipient == "" || receipient == " ") {
                        return;
                    }
                    var json = JSON.stringify({
                        type: "chat",
                        author: userName,
                        author_id: userId
                    });
                    if(receipient === "-all" || receipient === "-a") {
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                            }
                        }
                        clients[index].seen = true;
                    } else {
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(clients[i].user_name == receipient && clients[i].active === true && channel === clients[i].channel) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                                break;
                            }
                        }
                        clients[index].seen = true;
                    }
                } else if(msgs.msg == "/info") {
                    var myinfo = msgs.myinfo;
                    var receipient = msgs.receipient;
                    var json = JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>User Info"
                        +"<br> - Nickname : "+clients[index].user_name
                        +"<br> - Origin : "+clients[index].origin
                        +"<br> - IP Address : "+myinfo.ip
                        +"<br> - Location : "+myinfo.loc
                        +"<br> - Region : "+myinfo.region
                        +"<br> - City : "+myinfo.city
                        +"<br> - Postal : "+myinfo.postal
                        +"<br> - ISP : "+myinfo.org
                        +"<br> - User Agent : "+myinfo.agent
                        +"<br>------------------</i>",
                        author: "[Server]",
                    });
                    if(receipient === null) {
                        connection.sendUTF(json);
                        return;
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_id === receipient && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    }
                } else if(msgs.msg.substring(0, 6) == "/nick " || msgs.msg.substring(0, 3) == "/n ") {
					var admin_password = "";
                    var res = msgs.msg.split(" ");
                    var newNick = htmlEntities(res[1]);
                    if (newNick == "" || newNick == " ") {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    admin = false;
                    var isadmin = check_admin(newNick.toUpperCase());
                    if(isadmin === true) {
                        if(!res[2]) {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>"+newNick+"</b> is reserved for admin. Please type in <b>/p &lt;password&gt;</b>.</i>",
                                author: "[Server]",
                            }));
                            password = true;
                            password_user = newNick;
                            return;
                        } else {
                            var verified = check_password(newNick.toUpperCase(), res[2]);
                            if(verified === false) {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss..Invalid password.</i>",
                                    author: "[Server]",
                                }));
                                return;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type:"info",
                                    time: (new Date()).getTime(),
                                    msg: "<i>Verified..</i>",
                                    author: "[Server]",
                                }));
								admin_password = " "+res[2];
                                admin = true;
                            }
                        }
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(newNick === clients[i].user_name && clients[i].active === true && channel === clients[i].channel) {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>"+newNick+"</b> is not available.</i>",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    console.log(get_time(time) + " User " + userName + " has changed nickname to "+newNick);
                    connection.sendUTF(JSON.stringify({
                        type:"newNick",
                        time: (new Date()).getTime(),
                        msg: "<i>You are now known as <b>"+newNick+"</b></i>",
                        author: "[Server]",
                        nickname: newNick+admin_password,
                    }));
                    var json = JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i><b>"+userName+"</b> has changed nickname to <b>"+newNick+"</b></i>",
                        author: "[Server]",
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                    userName = newNick;
                    clients[index].user_name = userName;
                } else if(msgs.msg.substring(0, 9) == "/channel " || msgs.msg.substring(0, 4) == "/ch ") {
                    var res = msgs.msg.split(" ");
                    var chnl = htmlEntities(res[1]);
                    if (chnl == "" || chnl == " ") {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Channel is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    if (chnl === channel) {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. You are already in this channel.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].channel === chnl && clients[i].active === true && userName === clients[i].user_name) {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname <b>"+userName+"</b> is not available in that channel.<br>Please change your nickname and try again.</i>",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    var json = JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i><b>"+userName+"</b> has has left the channel..</i>",
                        author: "[Server]",
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                    channel = chnl;
                    clients[index].channel = chnl;
                    setup_channel(chnl);
                    console.log(get_time(time) + " User " + userName + " has changed channel to "+channel);
                    connection.sendUTF(JSON.stringify({
                        type:"newChannel",
                        time: (new Date()).getTime(),
                        msg: "<i>You are now in channel <b>"+chnl+"</b></i>",
                        author: "[Server]",
                        channel: chnl,
                    }));
                    var users = "";
                    var n = 1;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].online === true && channel === clients[i].channel) {
                            if(clients[i].user_id === userId) {
                                users += "<br>"+(n++)+". <b>"+clients[i].user_name+"</b>";
                            } else {
                                users += "<br>"+(n++)+". "+clients[i].user_name;
                            }
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Online users"+users+"<br>------------------</i>",
                        author: "[Server]",
                    }));
                    var json = JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i><b>"+userName+"</b> has has joined the channel..</i>",
                        author: "[Server]",
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg == "/users" || msgs.msg == "/u") {
                    var users = "";
                    var n = 1;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].online === true && channel === clients[i].channel) {
                            if(clients[i].user_id === userId) {
                                users += "<br>"+(n++)+". <b>"+clients[i].user_name+"</b>";
                            } else {
                                users += "<br>"+(n++)+". "+clients[i].user_name;
                            }
                        }
                    }
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Online users"+users+"<br>------------------</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a " || msgs.msg == "/alert" || msgs.msg == "/a") {
                    if(msgs.msg.substring(0, 7) == "/alert " || msgs.msg.substring(0, 3) == "/a ") {
                        var res = msgs.msg.split(" ");
                        var receipient = htmlEntities(res[1]);
                        if (receipient == "" || receipient == " ") {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Receipient is empty.",
                                author: "[Server]",
                            }));
                            return;
                        }
                        if(receipient == "-a" || receipient == "-all") {
                            receipient = "all";
                        }
                    }
                    if(msgs.msg == "/alert" || msgs.msg == "/a") {
                        var receipient = "all";
                    }
                    var json = JSON.stringify({
                        type:"alert",
                        time: (new Date()).getTime(),
                        msg: "<i><b>"+userName+"</b> needs your attention.</i>",
                        author: userName,
                        author_id: userId
                    });
                    if(receipient === "all") {
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                            }
                        }
                        clients[index].seen = true;
                    } else {
                        var found = false;
                        clients[index].seen = true;
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(clients[i].user_name === receipient && clients[i].active === true && channel === clients[i].channel) {
                                clients[i].connection.sendUTF(json);
                                clients[i].seen = false;
                                clients[index].seen = false;
                                found = true;
                                break;
                            }
                        }
                        if(found === false) {
                            connection.sendUTF(JSON.stringify({
                                type:"info",
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Receipient <b>"+receipient+"</b> is not here.</i>",
                                author: "[Server]",
                            }));
                        }
                    }
                } else if(msgs.msg.substring(0, 5) == "/msg " || msgs.msg.substring(0, 3) == "/m ") {
                    var res = msgs.msg.split(" ");
                    var receipient = htmlEntities(res[1]);
                    res.splice(0,2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    if (the_msg == "" || the_msg == " ") {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Message is empty.",
                            author: "[Server]",
                        }));
                        return;
                    }
                    var json = JSON.stringify({
                        type:"message",
                        time: (new Date()).getTime(),
                        msg: the_msg,
                        author: userName,
                    });
                    var found = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                            clients[index].seen = false
                            found = true;
                            break;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg.substring(0, 7) == "/close ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    var found = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient && channel === clients[i].channel) {
                            clients[i].connection.close();
                            found = true;
                            break;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. username <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg == "/typing") {
                    var json = JSON.stringify({type:"typing", author: userName});
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true && channel === clients[i].channel) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg == "/seen") {
                    var all = true;
                    var receipient = msgs.receipient;
                    clients[index].seen = true;
                    var client_count = 0;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].seen === false && channel === clients[i].channel) {
                            all = false;
                        }
                        if(channel === clients[i].channel) {
                            client_count++;
                        }
                    }
                    var json = JSON.stringify({type:"seen", author: userName});
                    if(all == true && client_count.length > 2) {
                        var json = JSON.stringify({type:"seen", author: "all"});
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_id === receipient) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg == "/flood") {
                    if(admin !== true) {
                        return;
                    }
                    if(flood === true) {
                        connection.sendUTF(JSON.stringify({
                            type:"info",
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
                        var json = JSON.stringify({type:"info", time: (new Date()).getTime(), author: userName, msg:"you have just been flooded by "+userName+" - "+n});
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        if(n > 2000 || flood === false) {
                            clearInterval(floodTimer);
                            flood = false;
                        }
                    }, 50);
                } else if(msgs.msg == "/flood-stop") {
                    flood = false;
                } else if(msgs.msg == "/help" || msgs.msg.substring(0, 1) == "/") {
                    connection.sendUTF(JSON.stringify({
                        type:"info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------------------------<br>List of commands"+helps+"<br>------------------------------------</i>",
                        author: "[Server]",
                    }));
                } else {
                    var obj = {
                        type:"message",
                        time: (new Date()).getTime(),
                        msg: htmlEntities(msgs.msg),
                        author: userName,
                        author_id: userId,
                    };
                    msg_count++;
                    into_history(channel, obj);
                    var json = JSON.stringify(obj);
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && channel === clients[i].channel) {
                            if(clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                            if(clients[i].active === false) {
                                clients[i].msg.push(json);
                                clients[i].msg = clients[i].msg.slice(-20);
                            }
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                    var obj = {msg: htmlEntities(msgs.msg), app_id: appId};
                    PostThis(obj, "history", "/websocket/msgs.php");
                }
            }
        }
    });


    // ========================================== DISCONNECT ====================================================

    connection.on("close", function(connection) {
        if(shutdown === false) {
            index = get_index(userId,appId);
            var client = apps[appId];
            console.log("Index - "+index);
            if(index !== null && userName !== null && appId !== null && client[index].active === true && quit === false) {
                client[index].active = false;
                if(client[index].ping === true) {
                    console.log(get_time(time) + " " + client[index].user_name +" has closed connection - ping started");
                    client[index].ping = false;
                    ping(client[index].user_id,client[index].app_id);
                }
            }
            if(quit === true) {
                remove_client(index,appId);
            }
        }
    });


    var get_index = function(id,app) {
        var client = apps[app];
        if(client) {
            for(var i=0, len=client.length; i<len; i++) {
               if(client[i].user_id === id) {
                 return i;
               }
            }
        }
        return null;
    };
    
    var ping = function(id,app) {
        setTimeout(function() {
            var idx = get_index(id,app);
            var client = apps[app];
            if(idx !== null) {
                if(client[idx].active === false) {
                    ping_result = " has been disconnected.. - [No Respond]";
                    remove_client(idx,app);
                } else {
                    console.log(get_time(time) + " " + client[idx].user_name +" is active");
                    client[idx].ping = true;
                }
            }
        }, 15000);
    };
    
    var remove_client = function(idx,app) {
        var client = apps[app];
        var json = JSON.stringify({
            type:"info",
            time: (new Date()).getTime(),
            msg: "<i><b>"+client[idx].user_name+"</b>"+ ping_result+"</i>",
            author: "[server]",
        });
        var chnnl = client[idx].channel;
        console.log(get_time(time) + " " + client[idx].user_name + ping_result);
        client.splice(idx, 1);
        for(var i=0, len=client.length; i<len; i++) {
            if(client[i].active === true && client[i].channel === chnnl) {
                client[i].connection.sendUTF(json);
            }
        }
    };

    var check_admin = function(username) {
        for(var i=0, len=admins.length; i<len; i++) {
            if(admins[i].username === username) {
                return true;
            }
        }
        return false;
    };

    var setup_channel = function(chnl) {
        for(var i=0, len=channel_list.length; i<len; i++) {
            if(channel_list[i].name === chnl) {
                channel_list[i].users++;
                return;
            }
        }
        var obj = {type:"history", msg:[]};
        channel_list.push({name:chnl, users:1, history:obj});
        console.log("Channel created - "+chnl);
    };

    var into_history = function(chnl,obj) {
        for(var i=0, len=channel_list.length; i<len; i++) {
            if(channel_list[i].name === chnl) {
                channel_list[i].history["msg"].push(obj);
                channel_list[i].history["msg"] = channel_list[i].history["msg"].slice(-20);
            }
        }
    };

    var clear_history = function(chnl) {
        for(var i=0, len=channel_list.length; i<len; i++) {
            if(channel_list[i].name === chnl) {
                channel_list[i].history["msg"] = [];
            }
        }
    };

    var get_history = function(chnl) {
        for(var i=0, len=channel_list.length; i<len; i++) {
            if(channel_list[i].name === chnl) {
                return channel_list[i].history;
            }
        }
    };

    var check_password = function(username, password) {
        for(var i=0, len=admins.length; i<len; i++) {
            if(admins[i].password === password && admins[i].username === username) {
                return true;
            }
        }
        return false;
    };
    
});



