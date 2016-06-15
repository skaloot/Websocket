
// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

"use strict";


process.title = 'node-chat';
// var webSocketsServerPort = 8080;
var webSocketsServerPort = 3777;
var webSocketServer = require('websocket').server;
var http = require('http');
var history = {type: 'history',msg:[]};
var clients = [];
var connectionIDCounter = 0;
var detail;
var index;



function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}


var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; } );


var helps = ""
    +"<br><b>/nick</b> - to set or change nickname"
    +"<br><b>/users</b> - to get online users"
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
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});


var wsServer = new webSocketServer({
    httpServer: server
});


// ========================================== CONNECT ====================================================

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    var userName = null;
    var userId = Math.random();
    var ping = true;
    var ping_result = " has closed the connection";
    var flood = false;
    var active = false;
    var seen = 0;
    var check = false;
    // var userColor = false;
    // var userColor = colors.shift();

    if (history.length > 0) {
        connection.sendUTF(JSON.stringify(history));
    }

    console.log((new Date()) + ' Connection accepted. - ');

    connection.sendUTF(JSON.stringify({
        type: 'connected',
        time: (new Date()).getTime(),
        msg: "<i>Connected..",
        author: "[Server]",
    }));

    // ========================================== GET MSG ====================================================

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // ========================================== NO NICK ====================================================
            if (userName === null) {
                var msgs = JSON.parse(message.utf8Data);
                if(msgs.msg.substring(0, 11) == "/reconnect ") {
                    // clients.forEach(function(i, idx) {
                    for(var i in clients) {
                        // check = false;
                        if(msgs.msg.substring(11, msgs.msg.length) === clients[i].user_name) {
                            userName = htmlEntities(msgs.msg.substring(11, msgs.msg.length));
                            userId = msgs.id;
                            detail = {
                                connection: connection,
                                user_name: userName,
                                user_id: userId,
                                origin: request.origin,
                                ping: true,
                                seen: false,
                            };
                            clients[i].connection = connection;
                            // check = true;
                            active = true;
                            ping();
                        }
                    }
                    // if(check === false) {
                    //     connection.sendUTF(JSON.stringify({
                    //         type:'info',
                    //         time: (new Date()).getTime(),
                    //         msg: "<i>Username doesnt exist!. ",
                    //         author: "[Server]",
                    //     }));
                    // }
                } else if(msgs.msg.substring(0, 6) == "/nick ") {
                    clients.forEach(function(i, idx) {
                        if(htmlEntities(msgs.msg.substring(6, msgs.msg.length)) === i.user_name && msgs.id === i.user_id) {
                            // check = true;
                            // connection.sendUTF(JSON.stringify({
                            //     type:'info', 
                            //     time: (new Date()).getTime(),
                            //     msg: "<i>Oopss.. username <b>"+i.user_name+"</b> is not available.</i>",
                            //     author: "[Server]",
                            // }));
                            // userName = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                            // userId = msgs.id;
                            // detail = {
                            //     connection: connection,
                            //     user_name: userName,
                            //     user_id: userId,
                            //     origin: request.origin,
                            //     ping: true,
                            //     seen: false,
                            // };
                            // clients[idx] = detail;
                            // check = true;
                            // active = true;
                        }
                        return;
                    });
                    // if(check === false) {
                        userName = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                        userId = msgs.id;
                        detail = {
                            connection: connection,
                            user_name: userName,
                            user_id: userId,
                            origin: request.origin,
                            ping: true,
                            seen: false,
                        };
                        clients.push(detail);
                        active = true;
                        var users = "";
                        var n = 1;
                        clients.forEach(function(i, idx) {
                            if(i.user_name !== null) {
                                users += "<br>"+(n++)+". "+i.user_name;
                            }
                            console.log(i.user_name+" - "+i.user_id);
                        });
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
                            type:'user-add',
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> just connected..</i>",
                            author: "[Server]",
                            user: userName,
                        });
                        clients.forEach(function(i, idx) {
                            if(userId !== i.user_id && i.user_name !== null) {
                                i.connection.sendUTF(json);
                            }
                        });
                        console.log((new Date()) + ' User is known as: ' + userName + ' with id ' + userId);
                        ping();
                    // }
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
                var index = get_index(userId);
                var msgs = JSON.parse(message.utf8Data);
                console.log((new Date()) + ' Received Message from '+ userName + ': ' + msgs.msg);
                if(msgs.msg == "/quit") {
                    ping_result = " has closed the connection";
                    connection.sendUTF(JSON.stringify({
                        type:'info',
                        time: (new Date()).getTime(),
                        msg: "<i>You have been disconnected. Thank You."
                        +"<br>--- bye ---</i>",
                        author: "[Server]",
                    }));
                    connection.close();
                    remove_client();
                } else if(msgs.msg == "/shutdown") {
                    wsServer.shutDown();
                    return;
                } else if(msgs.msg.substring(0, 6) == "/nick ") {
                    var check = true;
                    var newNick = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
                    clients.forEach(function(i, idx) {
                        if(htmlEntities(msgs.msg.substring(6, msgs.msg.length)) === i.user_name) {
                            check = false;
                        }
                    });
                    if(check === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. username <b>"+newNick+"</b> is not available.</i>",
                            author: "[Server]",
                        }));
                    } else {
                        console.log((new Date()) + ' User ' + userName + ' has changed nickname to '+newNick);
                        connection.sendUTF(JSON.stringify({
                            type:'newNick',
                            time: (new Date()).getTime(),
                            msg: "<i>You are now known as <b>"+newNick+"</b></i>",
                            author: "[Server]",
                            nickname: newNick,
                        }));
                        var json = JSON.stringify({
                            type:'user-info',
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> has changed nickname to <b>"+newNick+"</b></i>",
                            author: "[Server]",
                            user: userName,
                            newNick: newNick,
                        });
                        clients.forEach(function(i, idx) {
                            if(userId !== i.user_id && i.user_name !== null) {
                                i.connection.sendUTF(json);
                            }
                        });
                        userName = newNick;
                        clients[index].user_name = userName;
                    }
                } else if(msgs.msg == "/users") {
                    var users = "";
                    var n = 1;
                    clients.forEach(function(i, idx) {
                        if(i.user_name !== null) {
                            users += "<br>"+(n++)+". "+i.user_name+" - "+i.user_id;
                        }
                    });
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
                    clients.forEach(function(i, idx) {
                        if(userId !== i.user_id && i.user_name !== null) {
                            i.connection.sendUTF(json);
                            i.seen = false;
                        }
                    });
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
                    clients.forEach(function(i, idx) {
                        if(i.user_name === receipient) {
                            i.connection.sendUTF(json);
                            found = true;
                            return;
                        }
                    });
                    if(found === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. username <b>"+receipient+"</b> is not here.</i>",
                            author: "[Server]",
                        }));
                    }
                } else if(msgs.msg.substring(0, 7) == "/close ") {
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    res.splice(0,2);
                    var the_msg = res.toString().replace(/,/g, " ");
                    var found = false;
                    clients.forEach(function(i, idx) {
                        if(i.user_name === receipient) {
                            i.connection.close();
                            clients.splice(idx, 1);
                            found = true;
                            return;
                        }
                    });
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
                    clients.forEach(function(i, idx) {
                        if(userId !== i.user_id && i.user_name !== null) {
                            i.connection.sendUTF(json);
                        }
                    });
                } else if(msgs.msg == "/seen") {
                    var all = true;
                    // clients[index].seen = true;
                    clients.forEach(function(i, idx) {
                        if(userId === i.user_id && i.user_name !== null && i.connection !== null) {
                            i.seen = true;
                        }
                    });
                    clients.forEach(function(i, idx) {
                        if(i.seen === false) {
                            all = false;
                        }
                    });
                    var json = JSON.stringify({type:'seen', author: userName});
                    if(all == true && clients.length > 2) {
                        var json = JSON.stringify({type:'seen', author: "all"});
                    }
                    clients.forEach(function(i, idx) {
                        if(userId !== i.user_id && i.user_name !== null) {
                            i.connection.sendUTF(json);
                        }
                    });
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
                    var i = 0;
                    var timer = setInterval(function() {
                        i++;
                        var json = JSON.stringify({type:'info', author: userName, msg:"you have just been flooded by "+userName+" - "+i});
                        clients.forEach(function(c, idx) {
                            if(userId !== c.user_id && c.user_name !== null) {
                                c.connection.sendUTF(json);
                            }
                        });
                        if(i === 2000 || flood === false) {
                            clearInterval(timer);
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
                    ping = true;
                } else {
                    var obj = {
                        type:'message',
                        time: (new Date()).getTime(),
                        msg: htmlEntities(msgs.msg),
                        author: userName,
                    };
                    history['msg'].push(obj);
                    history['msg'] = history['msg'].slice(-10);
                    var json = JSON.stringify(obj);
                    clients.forEach(function(i, idx) {
                        if(userId !== i.user_id && i.user_name !== null && i.connection !== null) {
                            i.connection.sendUTF(json);
                            i.seen = false;
                        }
                        if(userId === i.user_id && i.user_name !== null && i.connection !== null) {
                            i.seen = true;
                        }
                    });
                    // clients[index].seen = true
                }
            }
        }
    });


    // ========================================== DISCONNECT ====================================================

    connection.on('close', function(connection) {
        var index = get_index(userId);
        // delete clients[index].connection;
        // clients.splice(index, 1);
        active = false;
    });



    var remove_client = function() {
        var index = get_index(userId);
        var json = JSON.stringify({
            type:'user-remove',
            time: (new Date()).getTime(),
            msg: "<i><b>"+userName+"</b>"+ ping_result+"</i>",
            author: "[server]",
            user: userName,
        });
        console.log((new Date()) + " "+ userName + ping_result);
        clients.splice(index, 1);
        clients.forEach(function(i, idx) {
            if(i.user_name !== null) {
                i.connection.sendUTF(json);
            }
        });
        userName = null;
        userId = null;
    }



    var get_index = function(userId) {
        for(var i in clients) {
           if(clients[i].user_id === userId) {
             return i;
           }
        }
    }




    // ========================================== PING ====================================================

    var ping = function() {
        setInterval(function() {
            if(userName !== null && active === true) {
                console.log((new Date()) + " Ping started - "+userName+" - "+userId);
                var json = JSON.stringify({ type:"ping", msg: "ping" });
                ping = false;
                connection.sendUTF(json);
                setTimeout(function() {
                    if(ping === false) {
                        ping_result = " has been disconnected.. - [No Respond]";
                        connection.close();
                        remove_client();
                    }
                }, 500);
            }
        }, 30000);
    }


});


