
"use strict";

function get_time(today) {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    h = checkTime(h);
    m = checkTime(m);
    s = checkTime(s);
    var time = h + ":" + m + ":" + s + " - ";
    // var time = h + ":" + m;
    return time;
}

function checkTime(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}


// =========================================================================================================


process.title = 'node-chat';
// var webSocketsServerPort = 8080;
var webSocketsServerPort = 3777;
var webSocketServer = require('websocket').server;
var http = require('http');
var history = {type: 'history',msg:[]};
var clients = [];
var clients_count = 0;
var msg_count = 0;
var index = 0;
var start_time = new Date();


var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; } );


var helps = ""
    +"<br><b>/nick</b> - to set or change nickname"
    +"<br><b>/users</b> - to get online users"
    +"<br><b>/info</b> - to get your connection info"
    +"<br><b>/history</b> - to get chat history"
    +"<br><b>/msg &lt;name&gt; &lt;your message&gt;</b> - for private message"
    +"<br><b>/alert</b> - to get your friend's attention"
    +"<br><b>/quit</b> - to close your connection"
    +"<br><b>/clear</b> - to clear your screen"
    +"<br><b>/mute</b> - to mute your notification sound"
    +"<br><b>/unmute</b> - to unmute your notification sound"
    +"<br>arrow <b>up</b> - and <b>down</b> for your messages history";


var server = http.createServer(function(request, response) {
// CREATE SERVER
});
var time = (new Date()).getTime();
server.listen(webSocketsServerPort, function() {
    console.log(get_time(time) + " Server is listening on port " + webSocketsServerPort);
});


var wsServer = new webSocketServer({
    httpServer: server
});


// ========================================== CONNECT ====================================================

wsServer.on('request', function(request) {
    var time = (new Date()).getTime();
    console.log(get_time(time) + ' Connection from origin ' + request.origin);
    var connection = request.accept(null, request.origin);
    var userName = null;
    var userId = null;
    var ping = true;
    var ping_result = " has closed the connection";
    var flood = false;
    var active = false;
    var seen = 0;
    var check = false;
    var quit = false;
    var detail;

    connection.sendUTF(JSON.stringify({
        type: 'connected',
        time: (new Date()).getTime(),
        msg: "<i>Connected...",
        author: "[Server]",
    }));

    // ========================================== GET MSG ====================================================

    connection.on('message', function(message) {
        var time = (new Date()).getTime();
        if (message.type === 'utf8') {
            // ========================================== NO NICK ====================================================
            var msgs = JSON.parse(message.utf8Data);
            console.log(get_time(time) + ' Received Message : ' + msgs.msg);
            if (userName === null) {
                if(msgs.msg.substring(0, 6) == "/nick ") {
                    var reconnect = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_id == msgs.id) {
                            if(clients[i].active === false) {
                                console.log(get_time(time) + " Existing user! - "+ clients[i].user_name+" - "+clients[i].user_id);
                                userName = clients[i].user_name;
                                userId = msgs.id;
                                clients[i].connection = connection;
                                clients[i].user_id = msgs.id;
                                clients[i].active = true;
                                clients[i].seen = false;
                                active = true;
                                reconnect = true;
                                index = i;
                                if(clients[i].msg.length > 0) {
                                    for(var n in clients[i].msg) {
                                        connection.sendUTF(clients[i].msg[n]);
                                    }
                                }
                                clients[i].msg = [];
                                return;
                            } else {
                                connection.sendUTF(JSON.stringify({
                                    type:'info',
                                    time: (new Date()).getTime(),
                                    msg: "<i>Oopss.. You are already connected.",
                                    author: "[Server]",
                                }));
                                return;
                            }
                        }
                        if(clients[i].user_name == htmlEntities(msgs.msg.substring(6, msgs.msg.length)) && clients[i].user_id != msgs.id) {
                            connection.sendUTF(JSON.stringify({
                                type:'info',
                                time: (new Date()).getTime(),
                                msg: "<i>Oopss.. Nickname is not available.",
                                author: "[Server]",
                            }));
                            return;
                        }
                    }
                    if(reconnect === false) {
                        userName = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                        userId = msgs.id;
                        detail = {
                            connection: connection,
                            user_name: userName,
                            user_id: userId,
                            origin: request.origin,
                            seen: false,
                            active: true,
                            ping: true,
                            msg: [],
                        };
                        clients.push(detail);
                        active = true;
                        index = clients.length-1;
                        clients_count++;

                        var users = "";
                        var n = 1;
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(clients[i].user_name !== null) {
                                users += "<br>"+(n++)+". "+clients[i].user_name;
                            }
                        }
                        connection.sendUTF(JSON.stringify({
                            type:'welcome', 
                            time: (new Date()).getTime(),
                            msg: "<i>------------------------------------"
                            +"<br><b>WELCOME "+userName+"!!</b><br>Type <b>/help</b> for list of command."
                            +"<br>------------------------------------</i>"
                            +"<br>Online users"+users+"<br>------------------</i>",
                            author: "[Server]",
                            nickname: userName,
                        }));
                        var json = JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> just connected..</i>",
                            author: "[Server]",
                        });
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].user_name !== null && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        console.log(get_time(time) + ' User is known as: ' + userName + ' - ' + userId);
                    }
                } else {
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>You dont have a nickname yet!. "
                        +"<br>Please type in <b>/nick &lt;your name&gt;</b> to start sending message.</i>",
                        author: "[Server]",
                    }));
                }
            // ========================================== HAS NICK ====================================================
            } else {
                index = get_index(userId);
                var msgs = JSON.parse(message.utf8Data);
                if(msgs.msg == "/quit") {
                    ping_result = " has closed the connection";
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>You have been disconnected. Thank You."
                        +"<br>--- bye ---</i>",
                        author: "[Server]",
                    }));
                    quit = true;
                    connection.close();
                } else if(msgs.msg == "/shutdown") {
                    wsServer.shutDown();
                    return;
                } else if(msgs.msg == "/history") {
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Chat History",
                        author: "[Server]",
                    }));
                    connection.sendUTF(JSON.stringify(history));
                } else if(msgs.msg == "/server") {
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Server Info"
                        +"<br> - Start Time : "+start_time
                        +"<br> - Total Users : "+clients_count
                        +"<br> - Total Message : "+msg_count
                        +"<br>------------------</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg.substring(0, 6) == "/user ") {
                    receipient = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                    var found = false;
                    var json = JSON.stringify({
                        type: "my-info",
                        author_id: userId,
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name == receipient) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg.substring(0, 6) == "/push ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    res.splice(0,2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    var json = JSON.stringify({
                        type:'push',
                        time: (new Date()).getTime(),
                        msg: the_msg,
                        author: userName,
                    });
                    var found = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nickname <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg == "/info") {
                    var myinfo = msgs.myinfo;
                    var receipient = msgs.receipient;
                    var idx = get_index(msgs.id);
                    var json = JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>User Info"
                        +"<br> - Nickname : "+clients[idx].user_name
                        +"<br> - Origin : "+clients[idx].origin
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
                        if(clients[i].user_id === receipient) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    }
                } else if(msgs.msg.substring(0, 6) == "/nick ") {
                    var check = true;
                    var newNick = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(htmlEntities(msgs.msg.substring(6, msgs.msg.length)) === clients[i].user_name) {
                            check = false;
                        }
                    }
                    if(check === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nsername <b>"+newNick+"</b> is not available.</i>",
                            author: "[Server]",
                        }));
                    } else {
                        console.log(get_time(time) + ' User ' + userName + ' has changed nickname to '+newNick);
                        connection.sendUTF(JSON.stringify({
                            type:'newNick',
                            time: (new Date()).getTime(),
                            msg: "<i>You are now known as <b>"+newNick+"</b></i>",
                            author: "[Server]",
                            nickname: newNick,
                        }));
                        var json = JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> has changed nickname to <b>"+newNick+"</b></i>",
                            author: "[Server]",
                        });
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        userName = newNick;
                        clients[index].user_name = userName;
                    }
                } else if(msgs.msg == "/users") {
                    var users = "";
                    var n = 1;
                    for(var i=0, len=clients.length; i<len; i++) {
                        users += "<br>"+(n++)+". "+clients[i].user_name;
                    }
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Online users"+users+"<br>------------------</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg == "/alert") {
                    var json = JSON.stringify({
                        type:'alert', 
                        time: (new Date()).getTime(),
                        msg: "<i><b>"+userName+"</b> needs your attention.</i>",
                        author: "[Server]",
                    });
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                } else if(msgs.msg.substring(0, 5) == "/msg ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    res.splice(0,2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    var json = JSON.stringify({
                        type:'message',
                        time: (new Date()).getTime(),
                        msg: the_msg,
                        author: userName,
                    });
                    var found = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient) {
                            clients[i].connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. Nikcname <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg.substring(0, 7) == "/close ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    res.splice(0,2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    var found = false;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].user_name === receipient) {
                            clients[i].connection.close();
                            found = true;
                            return;
                        }
                    }
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. username <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg == "/typing") {
                    var json = JSON.stringify({type:'typing', author: userName});
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg == "/seen") {
                    var all = true;
                    clients[index].seen = true;
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(clients[i].seen === false) {
                            all = false;
                        }
                    }
                    var json = JSON.stringify({type:'seen', author: userName});
                    if(all == true && clients.length > 2) {
                        var json = JSON.stringify({type:'seen', author: "all"});
                    }
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                        }
                    }
                } else if(msgs.msg == "/flood") {
                    if(flood === true) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
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
                        var json = JSON.stringify({type:'info', time: (new Date()).getTime(), author: userName, msg:"you have just been flooded by "+userName+" - "+n});
                        for(var i=0, len=clients.length; i<len; i++) {
                            if(userId !== clients[i].user_id && clients[i].active === true) {
                                clients[i].connection.sendUTF(json);
                            }
                        }
                        if(i === 2000 || flood === false) {
                            clearInterval(floodTimer);
                            flood = false;
                        }
                    }, 70);
                } else if(msgs.msg == "/flood-stop") {
                    flood = false;
                } else if(msgs.msg == "/help" || msgs.msg.substring(0, 1) == "/") {
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>------------------------------------<br>List of commands"+helps+"<br>------------------------------------</i>",
                        author: "[Server]",
                    }));
                } else if(msgs.msg == "pong") {
                    clients[index].active = true;
                } else {
                    var obj = {
                        type:'message',
                        time: (new Date()).getTime(),
                        msg: htmlEntities(msgs.msg),
                        author: userName,
                    };
                    msg_count++;
                    history['msg'].push(obj);
                    history['msg'] = history['msg'].slice(-10);
                    var json = JSON.stringify(obj);
                    for(var i=0, len=clients.length; i<len; i++) {
                        if(userId !== clients[i].user_id && clients[i].active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
                        if(userId !== clients[i].user_id && clients[i].active === false) {
                            clients[i].msg.push(json);
                            clients[i].seen = false;
                        }
                    }
                    clients[index].seen = true;
                }
            }
        }
    });


    // ========================================== DISCONNECT ====================================================

    connection.on('close', function(connection) {
        index = get_index(userId);
        console.log("Index - "+index);
        if(index !== null && userName !== null && clients[index].active === true && quit === false) {
            clients[index].active = false;
            if(clients[index].ping === true) {
                console.log(get_time(time) + ' ' + clients[index].user_name +' has closed connection - ping started');
                clients[index].ping = false;
                ping(clients[index].user_id);
            }
        }
        if(quit === true) {
            remove_client(index);
        }
    });


    var get_index = function(id) {
        for(var i=0, len=clients.length; i<len; i++) {
           if(clients[i].user_id == id) {
             return i;
           }
        }
        return null;
    }




    // ========================================== PING ====================================================
    
    var ping = function(id) {
        setTimeout(function() {
            var idx = get_index(id);
            if(idx !== null) {
                if(clients[idx].active === false) {
                    ping_result = " has been disconnected.. - [No Respond]";
                    remove_client(idx);
                } else {
                    console.log(get_time(time) + ' ' + clients[idx].user_name +' is active');
                    clients[idx].ping = true;
                }
            }
        }, 10000);
    }
    
    var remove_client = function(idx) {
        var json = JSON.stringify({
            type:'info',
            time: (new Date()).getTime(),
            msg: "<i><b>"+clients[idx].user_name+"</b>"+ ping_result+"</i>",
            author: "[server]",
        });
        console.log(get_time(time) + ' ' + clients[idx].user_name + ping_result);
        clients.splice(idx, 1);
        for(var i=0, len=clients.length; i<len; i++) {
            if(clients[i].active === true) {
                clients[i].connection.sendUTF(json);
            }
        }
        index = get_index(userId);
    }
    
});



