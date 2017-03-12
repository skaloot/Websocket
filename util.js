


var querystring = require("querystring"),
    http = require("http"),
    pswd_srvr = "isu2uDIABL0W67B",
    origins = [
        "http://localhost",
        "http://127.0.0.1",
        "http://192.168.0.10",
        "http://artinity.dtdns.net",
        "http://www.kpjselangor.com",
        "https://www.kpjselangor.com",
        "http://www.ladiesfoto.com",
        "http://kpj",
    ],
    helps = "" +
    "<br><b>/nick</b> - to set or change nickname" +
    "<br><b>/users</b> - to get online users" +
    "<br><b>/info</b> - to get your connection info" +
    "<br><b>/history</b> - to get chat history" +
    "<br><b>/msg &lt;name&gt; &lt;your message&gt;</b> - for private message" +
    "<br><b>/alert &lt;name&gt;</b> - to get your friend's attention" +
    "<br><b>/quit</b> - to close your connection" +
    "<br><b>/clear</b> - to clear your screen" +
    "<br><b>/mute</b> - to mute your notification sound" +
    "<br><b>/unmute</b> - to unmute your notification sound" +
    "<br>arrow <b>up</b> - and <b>down</b> for your messages history";



/* ======================================================================================================== */




exports.get_http = function() {
    return http;
}

exports.get_origin = function() {
    return origins;
}

exports.get_help = function() {
    return helps;
}

var checkTime = function(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

exports.get_time = function() {
    var t = new Date(),
        h = checkTime(t.getHours()),
        m = checkTime(t.getMinutes()),
        s = checkTime(t.getSeconds());
    return h + ":" + m + ":" + s + " - ";
}

exports.get_date = function() {
    var t = new Date(),
        y = t.getFullYear(),
        m = checkTime(t.getMonth() + 1),
        d = checkTime(t.getDate()),
        h = checkTime(t.getHours()),
        mt = checkTime(t.getMinutes()),
        s = checkTime(t.getSeconds());
    return m + "-" + d + "-" + y + "-" + h + "-" + mt + "-" + s;
}

exports.htmlEntities = function(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

exports.originIsAllowed = function(origin) {
    return true;
}

exports.DateDiff = function(time1, time2) {
    var diffMS = time1 - time2,
        diffS = Math.floor(diffMS / 1000),
        diffM = Math.floor(diffS / 60),
        diffH = Math.floor(diffM / 60),
        diffD = Math.floor(diffH / 24);

    diffS = diffS - (diffM * 60);
    diffM = diffM - (diffH * 60);
    diffH = diffH - (diffD * 24);

    return diffD + " days, " + diffH + " hours, " + diffM + " minutes, " + diffS + " seconds";
}

exports.set_app = function(apps, app_list) {
    for (var i = 0, len = app_list.length; i < len; i++) {
        console.log(app_list[i]);
        if (!apps[app_list[i]]) {
            apps[app_list[i]] = [];
            apps[app_list[i]].total_user = 0;
            apps[app_list[i]].online_state = true;
            apps[app_list[i]].type = "public";
            apps[app_list[i]].history = {
                type: "history",
                msg: []
            };
            if(app_list[i] == "kpj") {
                apps[app_list[i]].online_state = false;
                apps[app_list[i]].type = "private";
            }
        }
    }
}

exports.PostThis = function(obj, type, url) {
    var post_data = querystring.stringify(obj),
        post_options = {
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
        res.on("data", function(data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.log("This doesn\'t look like a valid JSON: ", data);
                return;
            }
            if (type === "admin") {
                for (var i = 0, len = data.length; i < len; i++) {
                    obj.push({
                        username: data[i].username,
                        password: data[i].password
                    });
                }
            }
        });
    });
    post_req.write(post_data);
    post_req.end();
}

