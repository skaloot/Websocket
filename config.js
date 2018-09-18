

exports.webSocketServer = require('websocket').server;
exports.http = require('http');
exports.https = require('https');
exports.fs = require('fs');
exports.querystring = require('querystring');
exports.jwt = require('jsonwebtoken');

exports.mysql = require('./mysql.js');
// exports.firebase = require('./firebase.js');

exports.ssl = false;
exports.port = 3000;
exports.app_key = "V1hwS01HRkhTa2hQV0ZwclVWUXdPUT09";
exports.root = "localhost";
exports.webhook = "/api/webhook";
exports.ssl_key = __dirname + "/ssl/key.key";
exports.ssl_cert = __dirname + "/ssl/cert.crt";
exports.token = "skA8d40f4264fc9109a42a7b2052efd4f9350ae6e708a8cb326c1b030adfea9e8ec";

exports.channel_list = [
    "hairlo",
    "hairlo_admin",
    "dodoo_admin",
    "kt_express",
];

exports.helps = [
    "<b>/nick</b> - to set or change nickname",
    "<b>/users</b> - to get online users",
    "<b>/history</b> - to get chat history",
    "<b>/msg &lt;name&gt; &lt;your message&gt;</b> - for private message",
    "<b>/alert &lt;name&gt;</b> - to get your friend's attention",
    "<b>/quit</b> - to close your connection",
    "<b>/clear</b> - to clear your screen",
    "<b>/mute</b> - to mute your notification sound",
    "<b>/unmute</b> - to unmute your notification sound",
    "arrow <b>up</b> - and <b>down</b> for your messages history",
];

exports.origins = [
    "http://localhost",
    "https://localhost",
    "http://127.0.0.1",
    "https://127.0.0.1",
    "https://www.dodoodelivery.com",
    "https://cms.dodoodelivery.com",
    "https://www.hairlo.net",
    "https://hairlo.net",
    "https://cms.hairlo.net",
    "https://chat.hairlo.net",
];


/* ==================================== FIREBASE ==================================== */
// exports.fcm = function(n, t, m) {
//     this.firebase.fcm(n, t, m);
// }
// exports.fcm_history = this.firebase.fcm_history;


/* ==================================== SQL ==================================== */
exports.sql = function(sql, callback) {
    this.mysql.sql(sql, callback);
}

/* ==================================== PROCESS POST REQUEST ==================================== */
exports.processPost = function(request, response, callback) {
    var queryData = "";
    request.on('data', function(data) {
        queryData += data;
        if(queryData.length > 1e6) {
            queryData = "";
            response.writeHead(413, {'Content-Type': 'text/plain'}).end();
            request.connection.destroy();
        }
    }).on('end', function() {
        if(typeof callback == "function") callback(queryData);
    });
}

/* ==================================== MAKE A POST REQUEST ==================================== */
exports.PostThis = function(obj, path, host, callback) {
    var post_data = this.querystring.stringify(obj);
    var post_options = {
        host: host,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };
    var h = (this.ssl) ? this.https : this.http;
    var req = h.request(post_options, function(response) {
        response.on('data', function(data) {
            try {
                data = JSON.parse(data);
                if (typeof callback === "function") return callback(data);
            } catch (e) {
                return console.log('This doesn\'t look like a valid JSON: - ' + data);
            }
        });
    });

    req.on('error', function(err) {
        if (err.code === "ECONNRESET") {
            console.log(date_std() + " Timeout occurs");
        }
        console.log(date_std() + " POST - Socket error.", err);
    });

    req.setTimeout(10000, function() {
        this.abort();
    });

    req.write(post_data);
    req.end();
}

/* ==================================== MAKE A GET REQUEST ==================================== */
exports.GetThis = function(host, path, callback, protocol) {
    var options = {
        host: host,
        path: path
    };

    var h = (this.ssl) ? this.https : this.http;
    if (protocol && protocol == "http") h = this.http;
    if (protocol && protocol == "https") h = this.https;
    
    var req = h.request(options, function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            if (data !== '') {
                try {
                    data = JSON.parse(data);
                    console.log(data);
                    if (typeof callback === "function") return callback(data);
                } catch (e) {
                    return console.log(date_std() + 'This doesn\'t look like a valid JSON: - ' + host + path);
                }
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

exports.get_time = function() {
    var t = new Date(),
        h = this.checkTime(t.getHours()),
        m = this.checkTime(t.getMinutes()),
        s = this.checkTime(t.getSeconds());
    return h + ":" + m + ":" + s + " - ";
}

exports.checkTime = function(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

exports.htmlEntities = function(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&sbquo;");
}

exports.originIsAllowed = function(origin) {
    return true;
}

exports.generate_id = function(origin) {
    var S4 = function() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
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

exports.date_std = function (timestamp) {
    if(!timestamp) timestamp = new Date().getTime();
    if(Math.ceil(timestamp).toString().length == 10) timestamp *= 1000;
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var date = new Date(timestamp - tzoffset);
    var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    return iso[1] + ' ' + iso[2];
}

exports.set_app = function(a, b) {
    for (var i = 0, len = b.length; i < len; i++) {
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

exports.sort_array = function (arr) {
    arr.sort(function(a, b) {
        var A = a.timestamp;
        var B = b.timestamp;
        if (A < B) {
            return 1;
        }
        if (A > B) {
            return -1;
        }
        return 0;
    });
    return arr;
}

exports.get_user = function(u, n) {
    var data = [];
    if (n) {
        for (var i = 0, len = u.length; i < len; i++) {
            if (u[i].user_name == n) {
                data = {
                    user_name: u[i].user_name,
                    user_id: u[i].user_id,
                    online: this.DateDiff((new Date()).getTime(), u[i].start),
                    last_seen: this.DateDiff((new Date()).getTime(), u[i].timestamp),
                    origin: u[i].origin,
                    ip_address: u[i].ip_address,
                    screen: u[i].screen,
                    active: u[i].active,
                    agent: u[i].agent,
                    channel: u[i].channel,
                    channels: u[i].channels,
                };
                return data;
            }
        }
    } else {
        for (var i = 0, len = u.length; i < len; i++) {
            data.push({
                user_name: u[i].user_name,
                user_id: u[i].user_id,
                online: this.DateDiff((new Date()).getTime(), u[i].start),
                last_seen: this.DateDiff((new Date()).getTime(), u[i].timestamp),
                origin: u[i].origin,
                ip_address: u[i].ip_address,
                screen: u[i].screen,
                active: u[i].active,
                agent: u[i].agent,
                channel: u[i].channel,
                channels: u[i].channels,
            });
        }
        data = this.sort_array(data);
        return data;
    }
}

exports.MD5 = function (string) {

    function RotateLeft(lValue, iShiftBits) {
        return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
    }

    function AddUnsigned(lX,lY) {
        var lX4,lY4,lX8,lY8,lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }

    function F(x,y,z) { return (x & y) | ((~x) & z); }
    function G(x,y,z) { return (x & z) | (y & (~z)); }
    function H(x,y,z) { return (x ^ y ^ z); }
    function I(x,y,z) { return (y ^ (x | (~z))); }

    function FF(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function GG(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function HH(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function II(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1=lMessageLength + 8;
        var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
        var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
        var lWordArray=Array(lNumberOfWords-1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while ( lByteCount < lMessageLength ) {
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount-(lByteCount % 4))/4;
        lBytePosition = (lByteCount % 4)*8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
        lWordArray[lNumberOfWords-2] = lMessageLength<<3;
        lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
        return lWordArray;
    };

    function WordToHex(lValue) {
        var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
        for (lCount = 0;lCount<=3;lCount++) {
            lByte = (lValue>>>(lCount*8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
        }
        return WordToHexValue;
    };

    function Utf8Encode(string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    };

    var x=Array();
    var k,AA,BB,CC,DD,a,b,c,d;
    var S11=7, S12=12, S13=17, S14=22;
    var S21=5, S22=9 , S23=14, S24=20;
    var S31=4, S32=11, S33=16, S34=23;
    var S41=6, S42=10, S43=15, S44=21;

    string = Utf8Encode(string);

    x = ConvertToWordArray(string);

    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k=0;k<x.length;k+=16) {
        AA=a; BB=b; CC=c; DD=d;
        a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
        d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
        c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
        b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
        a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
        d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
        c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
        b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
        a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
        d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
        c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
        b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
        a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
        d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
        c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
        b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
        a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
        d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
        c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
        b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
        a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
        d=GG(d,a,b,c,x[k+10],S22,0x2441453);
        c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
        b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
        a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
        d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
        c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
        b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
        a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
        d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
        c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
        b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
        a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
        d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
        c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
        b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
        a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
        d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
        c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
        b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
        a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
        d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
        c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
        b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
        a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
        d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
        c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
        b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
        a=II(a,b,c,d,x[k+0], S41,0xF4292244);
        d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
        c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
        b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
        a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
        d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
        c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
        b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
        a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
        d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
        c=II(c,d,a,b,x[k+6], S43,0xA3014314);
        b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
        a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
        d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
        c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
        b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
        a=AddUnsigned(a,AA);
        b=AddUnsigned(b,BB);
        c=AddUnsigned(c,CC);
        d=AddUnsigned(d,DD);
    }

    var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);

    return temp.toLowerCase();
}


