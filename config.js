
var querystring = require("querystring"),
    http = require("http"),
    https = require("https"),
	dns = require('dns'),
    internet = true,
	check_internet = false,
    interval_internet,
    pswd_srvr = "isu2uDIABL0W67B",
    origins = [
        "http://localhost",
        "http://127.0.0.1",
        "http://192.168.0.10",
        "http://artinity.dtdns.net",
        "http://utiis.dyndns.org",
        "http://www.kpjselangor.com",
        "https://www.kpjselangor.com",
        "http://www.ladiesfoto.com",
        "http://kpj",
    ],
    helps = "" +
		"<br><b>/nick</b> - to set or change nickname" +
		"<br><b>/users</b> - to get online users" +
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

exports.get_https = function() {
    return https;
}

exports.clear_interval = function() {
    clearInterval(interval_internet);
}

exports.check_internet = function(n) {
    check_internet = n;
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

var date_std = function (timestamp) {
    if(!timestamp) timestamp = new Date().getTime();
    if(Math.ceil(timestamp).toString().length == 10) timestamp *= 1000;
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var date = new Date(timestamp - tzoffset);
    var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    return iso[1] + ' ' + iso[2];
}

exports.date_std;

exports.set_app = function(a, b) {
    for (var i = 0, len = b.length; i < len; i++) {
        console.log(b[i]);
        if (!a[b[i]]) {
            a[b[i]] = [];
            a[b[i]].total_user = 0;
            a[b[i]].online_state = true;
            a[b[i]].type = "public";
            a[b[i]].history = {
                type: "history",
                msg: []
            };
            if(b[i] == "kpj") {
                a[b[i]].online_state = false;
                a[b[i]].type = "private";
            }
        }
    }
}

exports.add_app = function(a, b) {
    if (!a[b]) {
        a[b] = [];
        a[b].total_user = 0;
        a[b].online_state = true;
        a[b].type = "public";
        a[b].history = {
            type: "history",
            msg: []
        };
    }
}

exports.censor = function(a) {
    var i = 0;
    return function(key, value) {
        if(i !== 0 && typeof(a) === 'object' && typeof(value) == 'object' && a == value) 
            return '[Circular]'; 
        if(i >= 29)
            return '[Unknown]';
        ++i; 
        return value;  
    }
}

exports.handle_request = function(request, response, users, channel_list) {
    if(request.method == 'POST') {
        processPost(request, response, function() {
            console.log(request.post);
            response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
            response.end();
        });
        return;
    }
    if (request.url === '/users') {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(users));
    } else if (request.url === '/channels') {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(channel_list));
    } else {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end('Sorry, unknown url');
    }
}

exports.processPost = function(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;

    if(request.method == 'POST') {
        request.on('data', function(data) {
            queryData += data;
            if(queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function() {
            request.post = querystring.parse(queryData);
            callback();
        });

    }
}

exports.PostThis = function(obj, host, url, callback) {
	if(host != "localhost" && !internet) {
		console.log("ERROR - Cannot post: No connection.");
		return;
	}
    var post_data = querystring.stringify(obj),
        post_options = {
            host: host,
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
            if(typeof callback === "function") {
                callback(data);
            }
            console.log(data);
        });
    });

    post_req.on('error', function(err) {
        if (err.code === "ECONNRESET") {
            console.log(date_std() + " Timeout occurs");
        }
        console.log(date_std() + " POST - Socket error.", err);
    });

    post_req.setTimeout(10000, function() {
        this.abort();
    });

    post_req.write(post_data);
    post_req.end();
}

exports.GetThis = function(host, path, callback) {
    var options = {
        host: host,
        path: path
    };

    var req = http.request(options, function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            console.log(data);
            if (data !== '') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.log(date_std() + 'This doesn\'t look like a valid JSON: - ' + host + path);
                    return;
                }
            }
            if (typeof callback === "function") {
                callback(data);
            }
        });
    });

    req.on('error', function(err) {
        if (err.code === "ECONNRESET") {
            console.log(date_std() + " Timeout occurs");
        }
        console.log(date_std() + " GET - Socket error.", err);
    });

    req.setTimeout(10000, function() {
        this.abort();
    });

    req.end();
}

interval_internet = setInterval(function() {
    if(check_internet === false) {
        return;
    }
	dns.resolve('www.google.com', function(err){
		if (err) {
            console.log("ERROR - No connection.");
			internet = false;
		} else {
            console.log("SUCCESS - Connected.");
			internet = true;
		}
	});
}, (10000));


