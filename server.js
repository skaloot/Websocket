"use strict";

// =========================================================================================================

process.title = "Ska-chat";
process.env.TZ = 'Asia/Kuala_Lumpur';

var port = 3777,
    webSocketServer = require("websocket").server,
    util = require("./config"),
    http = util.get_http(),
    https = util.get_https(),
    fs = require("fs"),
    app_list = util.app_list(),
    ps = "isu2uDIABL0W67B",
    admins = [],
    users = [],
    apps = [],
	total_user = 0,
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
    console.log("\n------------------------------------------------");
    console.log("Start Time : " + new Date());
    console.log("Server is listening on port " + port);
    console.log("------------------------------------------------\n");
});

var wsServer = new webSocketServer({
    httpServer: server
});


util.set_app(apps, app_list);



/* =============================================================== CONNECT =============================================================== */

wsServer.on("request", function(request) {
    console.log(util.get_time() + " Total connection : " + total_connection);
    if (typeof request.origin != "undefined" && origins.indexOf(request.origin) == -1 || shutdown === true) {
        console.log(util.get_time() + " Connection was blocked from origin " + request.origin);
        if (blocked_list.indexOf(request.origin) == -1) {
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
        quit = false,
        password = false,
        password_user = null,
        detail,
        detail_2,
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
        if (message.type == "utf8") {
            var msgs = message.utf8Data;
            try {
                msgs = JSON.parse(msgs);
            } catch (e) {
                console.log("This doesn\'t look like a valid JSON: ", msgs);
                return;
            }

            if (msgs.msg != "/ping") {
                console.log(util.get_time() + " Received Message : " + msgs.msg);
            }

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
            
            /* =============================================================== NO APP ID =============================================================== */

            if (appId == null) {
                if (msgs.msg == "/appid") {
                    var found = false;
                    if(!apps[msgs.app_id]) {
                        util.add_app(apps, msgs.app_id);
                    }
                    found = true;
                    appId = util.htmlEntities(msgs.app_id);
                    // clients = apps[appId];
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
            
            /* =============================================================== SET PASSWORD =============================================================== */

            if (password === true) {
                if (msgs.msg != "/typing" && msgs.msg != "/ping" && msgs.msg != "/seen") {
                    msgs.msg = "/n " + password_user + " " + util.htmlEntities(msgs.msg);
                }
            }
            if (password_shutdown === true) {
                if (msgs.msg == "/typing" || msgs.msg == "/ping" || msgs.msg == "/seen") {
                    return;
                }
                password_shutdown = false;
                check_password(userName, msgs.msg, function(verified) {
					if (verified === false) {
						console.log("Invalid..");
						connection.sendUTF(JSON.stringify({
							type: "info",
							time: (new Date()).getTime(),
							msg: "<i>Password is invalid.</i>",
							author: "[Server]",
						}));
					} else {
						console.log("Shutting down..");
						ShutTheHellUp();
					}
				});
            }

            /* =============================================================== NO NICK =============================================================== */

            if (userName == null) {
                if (msgs.msg == "/login") {
                    var sql = "SELECT * FROM chat WHERE email = '" + msgs.email + "';";
                    var obj = {
                        type: "connected",
                        connected: true,
                        time: (new Date()).getTime(),
                        author: "[Server]",
                        msg: "<i>Connected...</i>",
                    };
                    util.sql("amirosol_newkpj", sql, function(result) {
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
					
                    if (res[2]) {
                        check_password(nick, res[2], function(verified) {
							if (verified === false) {
								console.log("Invalid..");
								connection.sendUTF(JSON.stringify({
									type: "info",
									time: (new Date()).getTime(),
									msg: "<i>Oopss.. Invalid password.. Good Bye!</i>",
									author: "[Server]",
								}));
								setTimeout(function() {
									// connection.sendUTF(JSON.stringify({
										// type: "quit"
									// }));
									connection.close();
								}, 2000);
							} else {
								console.log("Verified..");
								connection.sendUTF(JSON.stringify({
									type: "info",
									time: (new Date()).getTime(),
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
						// check_user(msgs);
						/* for (var i = 0, len = clients.length; i < len; i++) {
							if (users[i].user_id == msgs.id) {
								if (users[i].active === false) {
									userName = users[i].user_name;
									userId = users[i].user_id;
									channel = msgs.channel;
									ip_address = msgs.ip_address;
									users[i].connection = connection;
									users[i].active = true;
									users[i].online = true;
									users[i].seen = false;
									users[i].last_seen = new Date().getTime();
									reconnect = true;
									if (admin === true) {
										users[i].admin = true;
									}
									if (users[i].msg.length > 0) {
										connection.sendUTF(JSON.stringify({
											type: "info",
											time: (new Date()).getTime(),
											msg: "<i>------------------------------------<br></i>",
											author: "[Server]",
										}));
										for (var n = 0, len2 = users[i].msg.length; n < len2; n++) {
											connection.sendUTF(users[i].msg[n]);
										}
									}
									connection.sendUTF(JSON.stringify({
										type: "online",
										time: (new Date()).getTime(),
										author: "[Server]",
										assigned: users[i].assigned,
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
										connection.sendUTF(JSON.stringify({
											type: "info",
											time: (new Date()).getTime(),
											msg: server_stat(appId, channel),
											author: "[Server]",
										}));
									}
									online_users(users[i].app_id, connection);
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
								if (users[i].user_name == nick && users[i].active === true) {
									connection.sendUTF(JSON.stringify({
										type: "info",
										time: (new Date()).getTime(),
										msg: "<i>Oopss.. Nickname is not available.",
										author: "[Server]",
									}));
									return;
								}
							}
						} */
						
						for (var i = 0, len = users.length; i < len; i++) {
							if (users[i].user_id == msgs.id) {
								if (users[i].active === false) {
									userName = users[i].user_name;
									userId = users[i].user_id;
									channel = users[i].channel;
									ip_address = users[i].ip_address;
									users[i].connection = connection;
									users[i].active = true;
									users[i].online = true;
									users[i].seen = false;
									users[i].last_seen = new Date().getTime();
									reconnect = true;
									if (admin === true) {
										users[i].admin = true;
									}
									if (users[i].msg.length > 0) {
										connection.sendUTF(JSON.stringify({
											type: "info",
											time: (new Date()).getTime(),
											msg: "<i>------------------------------------<br></i>",
											author: "[Server]",
										}));
										for (var n = 0, len2 = users[i].msg.length; n < len2; n++) {
											connection.sendUTF(users[i].msg[n]);
										}
									}
									connection.sendUTF(JSON.stringify({
										type: "online",
										time: (new Date()).getTime(),
										author: "[Server]",
										assigned: users[i].assigned,
										nickname: userName + admin_password,
										// app_type: users.type,
										channels: users[i].channels
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
										connection.sendUTF(JSON.stringify({
											type: "info",
											time: (new Date()).getTime(),
											msg: server_stat(appId, channel),
											author: "[Server]",
										}));
									}
									online_users(users[i].app_id, connection);
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
								if (users[i].user_name == nick && users[i].active === true) {
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
								channels: [msgs.channel],
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
							if(temp_detail) {
								detail.ip_address = temp_detail.ip_address;
								ip_address = temp_detail.ip_address;
								detail.screen = temp_detail.screen;
								detail.agent = temp_detail.agent;
								temp_detail = null;
							}
							if (msgs.operator) {
								detail.operator = true;
							}
							setup_channel(channel);
							// clients.push(detail);
							// clients.total_user++;
							
							users.push(detail);
							total_user++;
							index = get_index(userId);

							if (channel == "ladiesfoto") {
								util.GetThis("www.ladiesfoto.com", "/websocket/login_mail.php?username=" + userName);
							}
							
							var m = "Type <b>/help</b> for list of command.";
							// if (clients.type == "private") {
								// m = "Please wait. Our staff will be with you shortly. Thank You.";
							// }
							connection.sendUTF(JSON.stringify({
								type: "welcome",
								time: (new Date()).getTime(),
								msg: "<i>------------------------------------" +
									"<br><b>WELCOME " + userName + "!!</b><br>" + m +
									"<br>------------------------------------</i>",
								author: "[Server]",
								nickname: userName + admin_password,
								// app_type: clients.type,
								channels: users[index].channels
							}));
							var json = JSON.stringify({
								type: "info",
								time: (new Date()).getTime(),
								msg: "<i><b>" + userName + "</b> just connected..</i>",
								author: "[Server]",
								channel: channel
							});
							// if (clients.type != "private") {
								for (var i = 0, len = users.length; i < len; i++) {
									for (var ii = 0, lenn = users[i].channels.length; ii < lenn; ii++) {
										if (userId !== users[i].user_id && users[i].active === true && users[i].channels[ii] == channel) {
											users[i].connection.sendUTF(json);
											break;
										}
									}
								}
							// }
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
								connection.sendUTF(JSON.stringify({
									type: "info",
									time: (new Date()).getTime(),
									msg: server_stat(appId, channel),
									author: "[Server]",
								}));
								util.sql("websocket", "INSERT into log (username, ip_address) VALUES ('"+userName+"', '"+ip_address+"')");
							}
							online_users(appId);
							console.log(util.get_time() + " User is known as: " + userName + " - " + userId);
						}
					}
                
				} else {
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>You haven't told us your name yet!. <br>Please type in <b>/nick &lt;your name&gt;</b> to start sending message.</i>",
                        author: "[Server]",
                    }));
                }

            /* =============================================================== HAS NICK =============================================================== */
            
            } else if (userName !== null && appId !== null) {
                clients = apps[appId];
                index = get_index(userId);
                if(index === null) return;
					
                if (channel == "kpj") {
                    if(users[index].assigned == null && users[index].operator === false && admin === false) {
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
                } else if (msgs.msg == "/reload") {
                	var json = JSON.stringify({
                        type: "reload",
                        author: userName,
                        author_id: userId
                    });
                    send(json, channel, userId);
                    // for (var i = 0, len = clients.length; i < len; i++) {
                    //     if (userId !== users[i].user_id && users[i].active === true) {
                    //         users[i].connection.sendUTF(JSON.stringify({
                    //             type: "reload",
                    //             author: userName,
                    //             author_id: userId
                    //         }));
                    //         users[i].seen = false;
                    //     }
                    // }
                    // users[index].seen = true;
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
				} else if (msgs.msg.substring(0, 5) == "/sql ") {
					if (admin !== true) return;

                    var res = msgs.msg.split(" ");
                    res.splice(0, 1);
                    var sql = res.toString().replace(/,/g, " ");
                    console.log(sql);

                    util.sql("websocket", sql, function(result) {
                        connection.sendUTF(JSON.stringify({
                            type: "sql_result",
                            time: (new Date()).getTime(),
                            author: "[Server]",
                            data: result,
                        }));
                    });
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
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (receipient == users[i].user_name) {
                            users[i].connection.sendUTF(JSON.stringify({
                                type: "reload",
                                time: (new Date()).getTime(),
                                author: "[Server]"
                            }));
                            blocked_id.push({
                                user_id: users[i].user_id,
                                user_name: users[i].user_name
                            });
                            users[i].is_blocked = true;
                            users[i].connection.close();
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
                            if (receipient == blocked_id[i].user_name) {
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
                    users[index].msg = [];
                    var receipient_id = msgs.receipient;
                    var receipient;
                    if (users[index].operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (receipient_id == users[i].user_id && users[i].assigned == null) {
                            users[i].assigned = userId;
                            users[index].client = users[i].user_id;
                            users[i].connection.sendUTF(JSON.stringify({
                                type: "assigned",
                                assigned: userId,
                                time: (new Date()).getTime(),
                                msg: "<i>Hi.. you are now chatting with <b>" + userName + "</b>.</i>",
                                author: "[Server]",
                            }));
                            receipient = users[i].user_name;
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
                    if (users[index].operator !== true) {
                        connection.sendUTF(JSON.stringify({
                            type: "info",
                            time: (new Date()).getTime(),
                            msg: "<i>Oopss.. you're not authorized.</i>",
                            author: "[Server]",
                        }));
                        return;
                    }
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (receipient == users[i].user_id && users[i].assigned !== null && users[index].client == receipient) {
                            users[i].assigned = null;
                            users[i].msg = [];
                            users[index].msg = [];
                            users[index].client = null;
                            users[i].connection.sendUTF(JSON.stringify({
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
                    users.online_state = msgs.state;
                    connection.sendUTF(JSON.stringify({
                        type: "online_state",
                        time: (new Date()).getTime(),
                        author: "[Server]",
                        state: users.online_state,
                    }));
                } else if (msgs.msg == "/history" || msgs.msg == "/h") {
                    if (channel == "kpj") {
                        if (users[index].assigned !== null || users[index].operator === true) {
                            return;
                        }
                    }
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
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: server_stat(appId, channel),
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
                    send(json, channel, userId);
                    // for (var i = 0, len = clients.length; i < len; i++) {
                    //     if (userId !== users[i].user_id && users[i].active === true) {
                    //         users[i].connection.sendUTF(json);
                    //         users[i].seen = false;
                    //     }
                    // }
                    // users[index].seen = true;
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
                    send(json, channel, userId);

                    // for (var i = 0, len = clients.length; i < len; i++) {
                    //     if (userId !== users[i].user_id && users[i].active === true) {
                    //         users[i].connection.sendUTF(json);
                    //         users[i].seen = false;
                    //     }
                    // }
                    // users[index].seen = true;
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
                    send(json, channel, userId);
                    // for (var i = 0, len = clients.length; i < len; i++) {
                    //     if (userId !== users[i].user_id && users[i].active === true) {
                    //         users[i].connection.sendUTF(json);
                    //         users[i].seen = false;
                    //     }
                    // }
                    // users[index].seen = true;
                } else if (msgs.msg.substring(0, 11) == "/unmute all") {
                    var json = JSON.stringify({
                        type: "unmute",
                    });
                    send(json, channel, userId);
                    // for (var i = 0, len = clients.length; i < len; i++) {
                    //     if (userId !== users[i].user_id && users[i].active === true) {
                    //         users[i].connection.sendUTF(json);
                    //     }
                    // }
                } else if (msgs.msg.substring(0, 6) == "/user " || msgs.msg.substring(0, 3) == "/u ") {
                    if (admin !== true) return;

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
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (users[i].user_name == receipient) {
                            var c = "",
                            	chnls = users[i].channels;
                            for(var n = 0; n < chnls.length; n++) {
                                c += chnls[n] + ", ";
                            }
                            var json = JSON.stringify({
                                type: "info",
                                time: (new Date()).getTime(),
                                msg: "<i>------------------<br>User Info" +
                                    "<br> - Nickname : " + users[i].user_name +
                                    "<br> - Online : " + util.DateDiff((new Date()).getTime(), users[i].start) +
                                    "<br> - User ID : " + users[i].user_id +
                                    "<br> - Origin : " + users[i].origin +
                                    "<br> - IP Address : " + users[i].ip_address +
                                    "<br> - Screen : " + users[i].screen + "px" +
                                    "<br> - Active : " + users[i].active +
                                    "<br> - User Agent : " + users[i].agent +
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
                    if (receipient == "-all" || receipient == "-a") {
                    	send(json, channel, userId);
                        // for (var i = 0, len = clients.length; i < len; i++) {
                        //     if (userId !== users[i].user_id && users[i].active === true) {
                        //         users[i].connection.sendUTF(json);
                        //         users[i].seen = false;
                        //     }
                        // }
                        // users[index].seen = true;
                        return;
                    }
                    var found = false;
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (users[i].user_name == receipient && users[i].active === true) {
                            users[i].connection.sendUTF(json);
                            users[i].seen = false;
                            found = true;
                            break;
                        }
                    }
                    users[index].seen = true;
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
					for (var i = 0, len = users.length; i < len; i++) {
						if (newNick == users[i].user_name && users[i].active === true) {
							connection.sendUTF(JSON.stringify({
								type: "info",
								time: (new Date()).getTime(),
								msg: "<i>Oopss.. Nickname <b>" + newNick + "</b> is not available.</i>",
								author: "[Server]",
							}));
							return;
						}
					}
					
                    admin = false;
					
					if (res[2]) {
						check_password(newNick, res[2], function(verified) {
							if (verified === false) {
								console.log("Invalid..");
								connection.sendUTF(JSON.stringify({
									type: "info",
									time: (new Date()).getTime(),
									msg: "<i>Oopss.. Invalid password.. Good Bye!</i>",
									author: "[Server]",
								}));
								setTimeout(function() {
									// connection.sendUTF(JSON.stringify({
										// type: "quit"
									// }));
									connection.close();
								}, 2000);
							} else {
								console.log("Verified..");
								connection.sendUTF(JSON.stringify({
									type: "info",
									time: (new Date()).getTime(),
									msg: "<i>Verified..</i>",
									author: "[Server]",
								}));
								admin_password = " " + res[2];
								admin = true;
								proceed();
							}
						});
                    } else {
                        users[index].admin = false;
						proceed();
                    }
					
					function proceed() {
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
						if (channel != "kpj") {
							for (var i = 0, len = users.length; i < len; i++) {
								if (userId !== users[i].user_id && users[i].active === true) {
									users[i].connection.sendUTF(json);
								}
							}
						}
						if (admin === true) {
							connection.sendUTF(JSON.stringify({
								type: "channels_admin",
								channels: app_list
							}));
							connection.sendUTF(JSON.stringify({
								type: "info",
								time: (new Date()).getTime(),
								msg: server_stat(appId, channel),
								author: "[Server]",
							}));
						}
						userName = newNick;
						users[index].user_name = userName;
						online_users(appId);
					}
                } else if (msgs.msg.substring(0, 9) == "/channel " || msgs.msg.substring(0, 4) == "/ch " || msgs.msg.substring(0, 3) == "/j ") {
                    var res = msgs.msg.split(" ");
                    var chnl = util.htmlEntities(res[1]);
                    if (chnl == appId) {
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
					
					users[index].channel = chnl;
					channel = chnl;
					
                    if (!apps[chnl]) {
                        util.add_app(apps, chnl);
                    }
					
                    for (var i = 0, len = apps[chnl].length; i < len; i++) {
                        if (apps[chnl][i].user_id !== userId && userName == apps[chnl][i].user_name) {
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
                    for (var i = 0, len = users[index].channels.length; i < len; i++) {
				        if(users[index].channels[i] == chnl) check = true;
				    }

                    if (check === false) {
                        apps[chnl].push(users[index]);
                        add_channel(userId, chnl);
                    }
                    channel = chnl;
                    appId = chnl;
                    setup_channel(channel);
                    users[index].app_id = appId;
                    users[index].channel = appId;
                    users[index].assigned = null;

                    console.log(util.get_time() + " User " + userName + " has changed channel to " + channel);
                    var users_ = "";
                    var n = 1;
                    for (var i = 0, len = users.length; i < len; i++) {
	                    for (var ii = 0, lenn = users[i].channels.length; ii < lenn; ii++) {
	                        if (users[i].channels[ii] == channel) {
	                            if (users[i].user_id == userId) {
		                            users_ += "<br>" + (n++) + ". <b>" + users[i].user_name + "</b>";
		                        } else {
		                            users_ += "<br>" + (n++) + ". " + users[i].user_name;
		                        }
	                        }
	                    }
                    }
                    if (check === false) {
                        connection.sendUTF(JSON.stringify({
                            type: "channels",
                            channels: users[index].channels,
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
                            msg: "<i>------------------<br>Online users" + users_ + "<br>------------------</i>",
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
                    if (channel != "kpj" && check === false) {
						send(json, channel, userId);
                        // for (var i = 0, len = clients.length; i < len; i++) {
                            // if (userId !== users[i].user_id && users[i].active === true) {
                                // users[i].connection.sendUTF(json);
                            // }
                        // }
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
                    if (users[index].channels.length == 1) {
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
                    for (var i = 0, len = users[index].channels.length; i < len; i++) {
                        if (users[index].channels[i] == chnl) {
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
                    if (users[index].channel == "kpj") {
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
					send(json, chnl, userId);
                    for (var i = 0, len = users[index].channels.length; i < len; i++) {
                        if (users[index].channels[i] == chnl) users[index].channels.splice(i, 1);
                    }
                    // del_channel(userId, chnl);
                    // var idx = get_index(userId, chnl);
                    // apps[chnl].splice(idx, 1);

                   	channel = users[index].channels[0];
                    online_users(channel);

                    connection.sendUTF(JSON.stringify({
                        type: "channels",
                        channels: users[index].channels,
                    }));

                    if (chnl == appId) {
                        // var chnls = get_channel(userId);
                        // for (var i = 0, len = chnls.length; i < len; i++) {
                            // for (var ii = 0, len2 = apps[chnls[i]].length; ii < len2; ii++) {
                                // if (apps[chnls[i]][ii].user_id == userId) {
                                    // channel = chnl;
                                    appId = channel;
                                    // clients = apps[chnls[i]];
                                    // index = get_index(userId);
                                    users[index].app_id = appId;
                                    users[index].channel = appId;
                                    users[index].assigned = null;
                                    connection.sendUTF(JSON.stringify({
                                        type: "leave_channel",
                                        time: (new Date()).getTime(),
                                        author: "[Server]",
                                        new_channel: channel,
                                    }));
                                    online_users(channel, connection);
                                    return;
                                // }
                            // }
                        // }
                    }
                } else if (msgs.msg == "/users" || msgs.msg == "/u") {
                    var users_ = "";
                    var n = 1;
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (users[i].online === true) {
                            if (users[i].user_id == userId) {
                                users_ += "<br>" + (n++) + ". <b>" + users[i].user_name + "</b>";
                            } else {
                                users_ += "<br>" + (n++) + ". " + users[i].user_name;
                            }
                        }
                    }

                    // console.log(JSON.stringify(users));
                    
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>------------------<br>Online users" + users_ + "<br>------------------</i>",
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
                    if (channel == "kpj") {
                        // receipient = (users[index].assigned !== null) ? users[index].assigned : ((users[index].client !== null) ? users[index].client : null);
                    }
                    if (receipient == "all") {
						send(json, channel, userId);
                        // for (var i = 0, len = clients.length; i < len; i++) {
                            // if (userId !== users[i].user_id && users[i].active === true) {
                                // users[i].connection.sendUTF(json);
                                // users[i].seen = false;
                            // }
                        // }
                        // users[index].seen = true;
                    } else {
                        var found = false;
                        users[index].seen = true;
                        for (var i = 0, len = users.length; i < len; i++) {
                            if ((users[i].user_name == receipient || users[i].user_id == receipient) && users[i].active === true && users[i].channel == channel) {
                                users[i].connection.sendUTF(json);
                                users[i].seen = false;
                                users[index].seen = false;
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
                    if (channel == "kpj") return;
						
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
                    for (var i = 0, len = users.length; i < len; i++) {
                        if (users[i].user_name == receipient || users[i].user_id == receipient) {
                            if (users[i].active === true) {
                                users[i].connection.sendUTF(json);
                            } else {
                                users[i].msg.push(json);
                                users[i].msg = users[i].msg.slice(-20);
                            }
                            users[i].seen = false;
                            users[index].seen = false
                            found = true;

							if (store_msg) {
                                var insert = "'"+msgs.msg.replace(/"/g, "\\\"").replace(/'/g, "\\\'")+"'";
                                insert += ",'"+userName+"'";
                                insert += ",'"+channel+"'";
                                insert += ",'"+ip_address+"'";
                                var sql = "INSERT INTO message (msg, username, channel, ip_address) VALUES ("+insert+")";
                                util.sql("websocket", sql);
							}
                            break;
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
                    if (admin !== true) return;
                    
                    var res = msgs.msg.split(" ");
                    var receipient = res[1];
                    if (userName == receipient) return;

                    for (var i = 0, len = users.length; i < len; i++) {
                        if (users[i].user_name == receipient) {
                            quit = true;
							users[i].connection.close();
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
                    if (channel == "kpj") {
                        // if (apps[msgs.channel][idx].assigned !== null) {
                            // for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                // if (apps[msgs.channel][idx].assigned == apps[msgs.channel][i].user_id) {
                                    // apps[msgs.channel][i].connection.sendUTF(json);
                                // }
                            // }
                        // }
                        // if (apps[msgs.channel][idx].operator === true && apps[msgs.channel][idx].client !== null) {
                            // for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                // if (apps[msgs.channel][idx].client == apps[msgs.channel][i].user_id) {
                                    // apps[msgs.channel][i].connection.sendUTF(json);
                                // }
                            // }
                        // }
                        return;
                    }
					send(json, channel, userId);
                    // for (var i = 0, len = clients.length; i < len; i++) {
                        // if (userId !== users[i].user_id && users[i].active === true) {
                            // users[i].connection.sendUTF(json);
                        // }
                    // }
                } else if (msgs.msg == "/ping") {
                    connection.sendUTF(JSON.stringify({
                        type: "pong",
                    }));
                } else if (msgs.msg == "/seen") {
                    // if(!apps[msgs.channel]) return;
						
                    var json = JSON.stringify({
                        type: "seen",
                        author: userName
                    });
                    var idx = get_index(userId);
                    if (users[index].channel == "kpj") {
                        // if (apps[msgs.channel][idx].assigned !== null) {
                            // for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                // if (apps[msgs.channel][idx].assigned == apps[msgs.channel][i].user_id) {
                                    // apps[msgs.channel][i].connection.sendUTF(json);
                                // }
                            // }
                        // }
                        // if (apps[msgs.channel][idx].operator === true && apps[msgs.channel][idx].client !== null) {
                            // for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                                // if (apps[msgs.channel][idx].client == apps[msgs.channel][i].user_id) {
                                    // apps[msgs.channel][i].connection.sendUTF(json);
                                // }
                            // }
                        // }
                        // apps[msgs.channel][idx].seen = true;
                        return;
                    }
                    var all = true;
                    var receipient = msgs.receipient;
                    // apps[msgs.channel][idx].seen = true;
					
					users[index].seen = true;
                    var client_count = 0;
                    for (var i = 0, len = users[index].length; i < len; i++) {
						for (var ii = 0, lenn = users[index].channels.length; ii < lenn; ii++) {
							if (users[index].channels[ii] == channel && users[index][i].seen === false) {
								all = false;
								client_count++;
							}
						}
					}
                    if (client_count > 2 && all === true) {
                        var json = JSON.stringify({
                            type: "seen",
                            author: "all"
                        });
                    }
					send(json, channel, receipient);
                    // for (var i = 0, len = apps[msgs.channel].length; i < len; i++) {
                        // if (apps[msgs.channel][i].user_id == receipient) {
                            // apps[msgs.channel][i].connection.sendUTF(json);
                        // }
                    // }
				} else if (msgs.msg.substring(0, 11) == "/store_msg ") {
					if(!admin) return;
					var a = msgs.msg.split(" ");
					store_msg = (a[1] == "on") ? true : false;
                    connection.sendUTF(JSON.stringify({
                        type: "info",
                        time: (new Date()).getTime(),
                        msg: "<i>Done..</i>",
                        author: "[Server]",
                    }));
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
                        send(json, channel, userId);
                        // for (var i = 0, len = users.length; i < len; i++) {
                        //     if (userId !== users[i].user_id && users[i].active === true) {
                        //         users[i].connection.sendUTF(json);
                        //     }
                        // }
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
					util.sql("websocket", sql, function(data) {
						console.log(JSON.stringify(data));
						var a = "<i>------------------------------------<br>Admins<br>";
						for(var i in data) {
							a += (i+1) + ". " + data[i].username + "<br>";
						}
						a += "</i>";
						connection.sendUTF(JSON.stringify({
							type: "info",
							time: (new Date()).getTime(),
							msg: a,
							author: "[Server]",
						}));
					});
                } else if (msgs.msg == "/help" || msgs.msg.substring(0, 1) == "/") {
                    if (channel == "kpj" && users[index].operator === false) return;
                    
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
					
					send(json, channel, userId);
					
                    // if (clients.type == "private") {
                        // if (users[index].assigned !== null) {
                            // for (var i = 0, len = clients.length; i < len; i++) {
                                // if (userId !== users[i].user_id && (users[index].assigned == users[i].user_id || users[i].admin === true)) {
                                    // users[i].connection.sendUTF(json);
                                    // if (users[i].admin === false) {
                                        // users[i].msg.push(json);
                                        // users[i].msg = users[i].msg.slice(-20);
                                    // }
                                    // users[i].seen = false;
                                // }
                            // }
                            // users[index].msg.push(json);
                            // users[index].msg = users[index].msg.slice(-20);
                        // }
                        // if (users[index].operator === true && users[index].client !== null) {
                            // for (var i = 0, len = clients.length; i < len; i++) {
                                // if (userId !== users[i].user_id && (users[index].client == users[i].user_id || users[i].admin === true)) {
                                    // users[i].connection.sendUTF(json);
                                    // if (users[i].admin === false) {
                                        // users[i].msg.push(json);
                                        // users[i].msg = users[i].msg.slice(-20);
                                    // }
                                    // users[i].seen = false;
                                // }
                            // }
                            // users[index].msg.push(json);
                            // users[index].msg = users[index].msg.slice(-20);
                        // }
                    // } else {
                        // for (var i = 0, len = clients.length; i < len; i++) {
                            // if (userId !== users[i].user_id) {
                                // if (users[i].active === true) {
                                    // users[i].connection.sendUTF(json);
                                // } else {
                                    // users[i].msg.push(json);
                                    // users[i].msg = users[i].msg.slice(-20);
                                // }
                                // users[i].seen = false;
                            // }
                        // }
                    // }

                    users[index].seen = true;
					
                    if (store_msg) {
                        var insert = "'"+msgs.msg.replace(/"/g, "\\\"").replace(/'/g, "\\\'")+"'";
                        insert += ",'"+userName+"'";
                        insert += ",'"+channel+"'";
                        insert += ",'"+ip_address+"'";
                        var sql = "INSERT INTO message (msg, username, channel, ip_address) VALUES ("+insert+")";

                        if (users[index].channel == "kpj") {
                            util.sql("amirosol_newkpj", sql);
                        } else {
                            util.sql("websocket", sql);
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
            index = get_index(userId);
            if (index == null) return;
			
            if (userName !== null && appId !== null && users[index].active === true && quit === false && users[index].is_blocked === false) {
                users[index].active = false;
                ping(index, userId);
            }
            if (quit === true || users[index].is_blocked) {
                if(users[index].ping !== null) {
                    clearTimeout(users[index].ping);
                }
                var p = " has closed the connection";
				if (users[index].is_blocked) p = " has been blocked by admin.";
				
                // var chnls = get_channel(userId);
                // for (var i = 0, len = chnls.length; i < len; i++) {
                    // for (var ii = 0, len2 = apps[chnls[i]].length; ii < len2; ii++) {
                        // if (apps[chnls[i]][ii].user_id == userId) {
                            // remove_client(ii, chnls[i], p);
                            // break;
                        // }
                    // }
                // }
				
				remove_client(index, p);
            }
        }
    });

});



// =========================================================== FUNCTIONS ===========================================================


var get_index = function(id) {
    // var client = apps[app];
    // if (client) {
        for (var i = 0, len = users.length; i < len; i++) {
            if (users[i].user_id == id) {
                return i;
            }
        }
    // }
    return null;
};

var ping = function(idx, id) {
    if(users[idx].ping !== null) {
        clearTimeout(users[idx].ping);
    };
    users[idx].ping = setTimeout(function() {
        // var client = apps[app];
        idx = get_index(id);
        if (idx == null) return;
		
        users[idx].ping = null;
        if (users[idx].active === false) {
            var p = " has disconnected.. - [No Respond]";
            // for (var i = 0, len = app_list.length; i < len; i++) {
                // for (var ii = 0, len2 = apps[app_list[i]].length; ii < len2; ii++) {
                    // if (apps[app_list[i]][ii].user_id == id) {
                        // remove_client(ii, app_list[i], p);
                        // break;
                    // }
                // }
            // }
			
			remove_client(idx, p);
        } else {
            console.log(util.get_time() + " " + users[idx].user_name + " is active.");
        }
    }, 15000);
};

var remove_client = function(idx, pingresult) {
    // var client = apps[app];
    var type = "info";
    // if (users[idx].is_blocked === true) {
        // pingresult = " has been blocked by admin.";
    // }
    // if (users.type == "private") {
        // type = "leave";
        // if (users[idx].client !== null) {
            // var cl = users[idx].client;
            // for (var i = 0, len = users.length; i < len; i++) {
                // if (users[i].user_id == cl) {
                    // users[i].assigned = null;
                    // users[i].msg = [];
                    // users[i].connection.sendUTF(JSON.stringify({
                        // type: "unassigned",
                        // assigned: users[idx].user_id,
                        // time: (new Date()).getTime(),
                        // msg: "<i>Your session has ended due to <b>" + users[idx].user_iname + "'s</b> connectivity.</i>",
                        // author: "[Server]",
                        // channel: app
                    // }));
                    // break;
                // }
            // }
        // }
    // }
    var json = JSON.stringify({
        type: type,
        user_id: users[idx].user_id,
        time: (new Date()).getTime(),
        msg: "<i><b>" + users[idx].user_name + "</b>" + pingresult + "</i>",
        author: "[server]"
    });
    console.log(util.get_time() + " " + users[idx].user_name + pingresult);
    // del_user(client[idx].user_id);
    
	var ch = users[idx].channel;
	var chs = users[idx].channels;
	users.splice(idx, 1);

	send(json, ch);
	online_users(ch);
	   
	// for (var i = 0, len = users.length; i < len; i++) {
		// for (var ii = 0, lenn = chnls.length; ii < lenn; ii++) {
			// if (users[i].active === true && users[i].channel == chnls[ii]) {
				// users[i].connection.sendUTF(json);
				// send(json, chnls[ii]);
				// online_users(chnls[ii]);
			// }
		// }
    // }
};

var online_users = function(chnl, conn) {
    // var client = apps[app];
    var users_ = [];
    for (var i = 0, len = users.length; i < len; i++) {
    for (var ii = 0, lenn = users[i].channels.length; ii < lenn; ii++) {
    	console.log("Checking channel .. "+users[i].channels[ii]);
	        if (users[i].active === true && users[i].channels[ii] === chnl) {
	            users_.push({
	                name: users[i].user_name,
	                id: users[i].user_id,
	                ip_address: users[i].ip_address,
	                assigned: users[i].assigned,
	                operator: users[i].operator,
	                admin: users[i].admin,
	            });
	        }
	    }
	}
    var json = JSON.stringify({
        type: "users",
        channel: chnl,
        time: (new Date()).getTime(),
        users: users_,
        author: "[Server]",
    });
    if (conn) {
        conn.sendUTF(json);
        return;
    }
	
	send(json, chnl);
    // for (var i = 0, len = client.length; i < len; i++) {
        // if (client[i].active === true && client[i].channel == app) {
            // client[i].connection.sendUTF(json);
        // }
    // }
};

var send = function(json, chnnls, uid) {
	if (typeof chnnls == "string") {
		for (var i = 0, len = users.length; i < len; i++) {
			for (var ii = 0, lenn = users[i].channels.length; ii < lenn; ii++) {
				if (uid !== users[i].user_id && users[i].channels[ii] == chnnls) {
					if (users[i].active === true) {
						users[i].connection.sendUTF(json);
					} else {
						users[i].msg.push(json);
						users[i].msg = users[i].msg.slice(-20);
					}
					users[i].seen = false;
					break;
				}
			}
		}
	} else if (typeof chnnls == "object") {
		for (var i = 0, len = users.length; i < len; i++) {
			for (var ii = 0, lenn = users[i].channels.length; ii < lenn; ii++) {
				for (var iii = 0, lennn = chnnls.length; iii < lenn; iii++) {
					if (uid !== users[i].user_id && users[i].active === true && users[i].channels[ii] == chnnls[iii]) {
						if (users[i].active === true) {
							users[i].connection.sendUTF(json);
						} else {
							users[i].msg.push(json);
							users[i].msg = users[i].msg.slice(-20);
						}
						users[i].seen = false;
						break;
					}
				}
			}
		}
	}
}

var timer_password = function(id, con) {
    clearTimeout(timer_password_temp[id].timer);
    timer_password_temp[id].timer = setTimeout(function() {
		console.log("Timeout..");
        // con.sendUTF(JSON.stringify({
            // type: "quit"
        // }));
		con.close();
        if (timer_password_temp[id]) {
            delete timer_password_temp[id];
        }
    }, 15000);
};

var check_user = function(m) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id == m.id) return true;
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
        if(users[i].user_id == id) {
            return users.splice(i, 1);
        }
    }
    return false;
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
    console.log(util.get_time() + " Channel created - " + chnl);
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
	console.log("Verifying password..");
	var sql = "SELECT id FROM users WHERE username = '"+username+"' AND password = '"+util.MD5(password)+"'";
	util.sql("websocket", sql, function(data) {
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

var get_channel = function(id) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id == id) {
            return users[i].channels;
        }
    }
    return [];
}

var add_channel = function(id, chnl) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id == id) {
            if(users[i].channels.indexOf(chnl) == -1) {
                users[i].channels.push(chnl);
                return true;
            }
        }
    }
    return false;
}

var del_channel = function(id, chnl) {
    for (var i = 0, len = users.length; i < len; i++) {
        if(users[i].user_id == id) {
            var idx = users[i].channels.indexOf(chnl);
            users[i].channels.splice(idx, 1);
            break;
        }
    }
    return true;
}

var check_channel  = function(n, c) {
	for (var i = 0, len = users[n].channels.length; i < len; i++) {
        if(users[n].channels[i] == c) return true;
    }
    return false;
}

var date_std = function (timestamp) {
    if(!timestamp) timestamp = new Date().getTime();
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

var server_stat = function(id, chnn) {
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
	var result = "<i>----------------------------------------------------------------<br>Server Info" +
		"<br> - Up Time : <b>" + util.DateDiff((new Date()).getTime(), start_time) + "</b>" +
		"<br> - Total Users : <b>" + total_user + "</b>" +
		"<br> - Total Message : <b>" + msg_count + "</b>" +
		"<br> - Channel List : " + chnl_list +
		"<br> - Current Connection : <b>" + (total_connection - 1) + "</b>" +
		"<br> - Current Channel : <b>" + chnn + "</b>" +
		"<br> - Store Message : <b>" + store_msg_stat + "</b>" +
		blocked +
		"<br>----------------------------------------------------------------</i>";
		
	return result;
}





