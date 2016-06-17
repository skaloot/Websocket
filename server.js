
"use strict";


process.title = 'node-chat';
// var webSocketsServerPort = 8080;
var webSocketsServerPort = 3777;
var webSocketServer = require('websocket').server;
var http = require('http');
var history = {type: 'history',msg:[]};
var clients = [];
var index = 0;



function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}

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

    if (history.length > 0) {
        connection.sendUTF(JSON.stringify(history));
    }

    console.log(get_time(time) + ' Connection accepted. - ');

    connection.sendUTF(JSON.stringify({
        type: 'connected',
        time: (new Date()).getTime(),
        msg: "<i>Connected..",
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
					for(var i in clients) {
						if(clients[i].user_id == msgs.id) {
							if(clients[i].active === false) {
								console.log(get_time(time) + " Found user! - "+ clients[i].user_name+" - "+clients[i].user_id);
								userName = clients[i].user_name;
								userId = msgs.id;
								clients[i].connection = connection;
								clients[i].user_id = msgs.id;
								clients[i].active = true;
								active = true;
								reconnect = true;
								index = i;
								return;
							} else {
								connection.sendUTF(JSON.stringify({
									type:'info',
									time: (new Date()).getTime(),
									msg: "<i>Oopss.. Username already exist.",
									author: "[Server]",
								}));
								return;
							}
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
							pinger: true,
							seen: false,
							active: true,
						};
						clients.push(detail);
						active = true;
						index = get_index(userId);

						var users = "";
						var n = 1;
						for(var i in clients) {
							if(clients[i].user_name !== null) {
								users += "<br>"+(n++)+". "+clients[i].user_name;
							}
							console.log(get_time(time)+ " " +clients[i].user_name+" - "+clients[i].user_id);
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
							type:'user-add',
							time: (new Date()).getTime(),
							msg: "<i><b>"+userName+"</b> just connected..</i>",
							author: "[Server]",
						});
						for(var i in clients) {
							if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
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
                    remove_client();
                } else if(msgs.msg == "/shutdown") {
                    wsServer.shutDown();
                    return;
                } else if(msgs.msg.substring(0, 6) == "/nick ") {
                    var check = true;
                    var newNick = htmlEntities(msgs.msg.substring(6, msgs.msg.length));
					for(var i in clients) {
						if(htmlEntities(msgs.msg.substring(6, msgs.msg.length)) === clients[i].user_name) {
                            check = false;
                        }
					}
                    if(check === false) {
                        connection.sendUTF(JSON.stringify({
                            type:'info',
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. username <b>"+newNick+"</b> is not available.</i>",
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
                            type:'user-info',
                            time: (new Date()).getTime(),
                            msg: "<i><b>"+userName+"</b> has changed nickname to <b>"+newNick+"</b></i>",
                            author: "[Server]",
                            user: userName,
                            newNick: newNick,
                        });
						for(var i in clients) {
							if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
								clients[i].connection.sendUTF(json);
							}
						}
                        userName = newNick;
                        clients[index].user_name = userName;
                    }
                } else if(msgs.msg == "/users") {
                    var users = "";
                    var n = 1;
					for(var i in clients) {
						if(clients[i].user_name !== null && active === true) {
							users += "<br>"+(n++)+". "+clients[i].user_name;
                        }
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
					for(var i in clients) {
						if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
                            clients[i].connection.sendUTF(json);
                            clients[i].seen = false;
                        }
					}
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
					for(var i in clients) {
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
					for(var i in clients) {
						if(clients[i].user_name === receipient) {
                            clients[i].connection.close();
                            // clients.splice(i, 1);
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
					for(var i in clients) {
						if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
							clients[i].connection.sendUTF(json);
						}
					}
                } else if(msgs.msg == "/seen") {
                    var all = true;
					clients[index].seen = true;
					for(var i in clients) {
						if(clients[i].seen === false) {
                            all = false;
                        }
					}
                    var json = JSON.stringify({type:'seen', author: userName});
                    if(all == true && clients.length > 2) {
                        var json = JSON.stringify({type:'seen', author: "all"});
                    }
					for(var i in clients) {
						if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
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
                    var timer = setInterval(function() {
                        n++;
                        var json = JSON.stringify({type:'info', author: userName, msg:"you have just been flooded by "+userName+" - "+n});
						for(var i in clients) {
							if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
								clients[i].connection.sendUTF(json);
							}
						}
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
					for(var i in clients) {
						if(userId !== clients[i].user_id && clients[i].user_name !== null && active === true) {
                            clients[i].connection.sendUTF(json);
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
		if(userName !== null && active === true && quit === false) {
			console.log(get_time(time) + ' ' + userName +' has closed connection - ping started');
			clients[index].active = false;
			ping();
		}
    });


    var get_index = function(id) {
        for(var i in clients) {
           if(clients[i].user_id === id) {
			 return i;
           }
        }
		return null;
    }




    // ========================================== PING ====================================================
	
	var ping = function() {
		setTimeout(function() {
			if(clients[index].active === false) {
				ping_result = " has been disconnected.. - [No Respond]";
				remove_client();
			} else {
				console.log(get_time(time) + clients[index].user_name +' is active');
			}
		}, 10000);
    }
	
	var remove_client = function() {
        var json = JSON.stringify({
            type:'user-remove',
            time: (new Date()).getTime(),
            msg: "<i><b>"+userName+"</b>"+ ping_result+"</i>",
            author: "[server]",
        });
        console.log(get_time(time) + ' ' + userName + ping_result);
        clients.splice(index, 1);
        for(var i in clients) {
            if(clients[i].user_name !== null && active === true) {
                clients[i].connection.sendUTF(json);
            }
        }
        userName = null;
        userId = null;
		index = get_index(userId);
    }
	
});



