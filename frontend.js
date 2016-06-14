(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
    var host = "//127.0.0.1";
    // var host = "//175.139.8.26";
    // var host = "//192.168.0.10";
    var port = 8080;
    var connect = false;
    var window_active = "active";
    var myColor = false;
    var myName = "You";
    var sound = true;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;



    // ========================================== NOT SUPPORTED ====================================================

    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }



    // ========================================== CONNECTING ====================================================

    var connection = new WebSocket('ws:'+host+':'+port);


    connection.onopen = function () {
        input.removeAttr('disabled');
        input.focus();
        status.text('Choose name:');
    }

    connection.onerror = function (error) {
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your connection or the server is down.' } ));
        connect = false;
    }



    /// ========================================== GET MSG ====================================================

    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        if (json.type === 'ping') {
            connection.send("/pong");
        } else if (json.type === 'alert') {
            addMessage(
                json.data.author, 
                json.data.msg, 
                json.data.color, 
                new Date(json.data.time)
            );
            var audio = new Audio('toing.mp3');
            audio.play();
        } else if (json.type === 'welcome') {
            addMessage(
                json.data.author, 
                json.data.msg, 
                json.data.color, 
                new Date(json.data.time)
            );
            myName = json.data.nickname;
            connect = true;
        } else if (json.type === 'newNick') {
            addMessage(
                json.data.author, 
                json.data.msg, 
                json.data.color, 
                new Date(json.data.time)
            );
            myName = json.data.nickname;
        } else if (json.type === 'history') {
            for (var i=0; i < json.data.length; i++) {
                addMessage(json.data[i].author, json.data[i].msg,
                           json.data[i].color, new Date(json.data[i].time));
            }
        } else if (json.type === 'message' || json.type === 'info') {
            addMessage(
                json.data.author, 
                json.data.msg, 
                json.data.color, 
                new Date(json.data.time)
            );
            if(window_active == "blur") {
                document.title = "..New Message..";
                if(sound == true) {
                    var audio = new Audio('toing.mp3');
                    audio.play();
                }
            }
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    }



    // ========================================== SEND MSG ====================================================

    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            var d = new Date();
            if(msg == "/mute") {
                addMessage("[server]", "<br><i>You just changed your sound to <b>mute</b></i>", "red", d);
                sound = false;
            } else if(msg == "/unmute") {
                addMessage("[server]", "<br><i>You just changed your sound to <b>unmute</b></i>", "red", d);
                sound = true;
            } else {
                connection.send(msg);
                addMessage(myName, msg, "#333", d);
            }
            $(this).val('');
        }
    })




    // ========================================== ADD MSG ====================================================

    function addMessage(author, message, color, dt) {
        content.append('<p><span style="color:' + color + '">' + author + '</span> <span style="color:#999;">@ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())+'</span>'
             + ': ' + message + '</p>');
        content.scrollTop(content[0].scrollHeight);
    }

    

    // ========================================== NO RESPOND ====================================================

    setInterval(function() {
        if (connection.readyState !== 1) {
            input.attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
            connect = false;
        }
    }, 3000);



    window.onbeforeunload = function() {
        if(connect === false) {
            return;
        }
        return("Please type quit to end your connection. Thank You.");
    }

    window.onfocus = function() {
        change_title();
        window_active = "active";
        // console.log("Window - focus");
    }

    window.onblur = function() {
        window_active = "blur";
        // console.log("Window - blur");
    }

    window.onclick = function() {
        input.focus();
    }

    function change_title() {
        if(document.title != "Websocket") {
            document.title = "Websocket";
            // console.log("Window - title");
        }
    }

})();


