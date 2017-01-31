$(function(){"use strict"; function e(e){return 10>e&&(e="0"+e),e}function n(n){var t=new Date(n),o=t.getHours(),i=t.getMinutes(),l=t.getSeconds();o=e(o),i=e(i),l=e(l);var n=o+":"+i;return n}function t(e,n,t){t=[].slice.call(arguments).splice(2); for(var o=e.split("."),i=o.pop(),l=0;l<o.length;l++)n=n[o[l]];return n[i].apply(n,t)}function o(e,o){console.log("Connection start.."),s=new WebSocket("ws:"+e+":"+o),s.onopen=function(){console.log(s),w=!0,T=1},s.onerror=function(e){g.html(null),g.append('<p class="server"><i>Sorry, but there\'s some problem with your connection or the server is down.<br> Reconnecting in '+10*T+" seconds. Thank You.</i></p>"),w=!1,W()},s.onmessage=function(e){try{var o=JSON.parse(e.data)}catch(i){return void console.log("This doesn't look like a valid JSON: ",e.msg)}if("ping"===o.type)s.send(JSON.stringify({id:N,msg:"pong"}));else if("reload"===o.type)s.send(JSON.stringify({id:N,receipient:o.author_id,msg:"/seen"})),window.location=window.location;else if("alert"===o.type)J=o.author_id,C("",o.msg,"server",o.time),D.play();else if("function"===o.type)J=null,t(o["function"],window,o.arguments),s.send(JSON.stringify({id:N,receipient:o.author_id,msg:"/seen"}));else if("open"===o.type)J=o.author_id,O=o.url;else if("unmute"===o.type)J=null,I=!0;else if("newNick"===o.type){J=null,C("",o.msg,"server",o.time);var l=o.nickname.split(" ");v=l[0],localStorage.setItem("myName",v),l[1]?localStorage.setItem("myPassword",l[1]):localStorage.getItem("myPassword")&&localStorage.removeItem("myPassword")}else if("newChannel"===o.type)J=null,C("",o.msg,"server",o.time),y=o.channel,localStorage.setItem("channel",y);else if("history"===o.type){J=null; for(var r=0;r<o.msg.length;r++)C(o.msg[r].author+": ",o.msg[r].msg,"client",o.msg[r].time)}else if("my-info"===o.type)J=null,$.getJSON("http://ipinfo.io",function(e){e.agent=navigator.userAgent,console.log(e),s.send(JSON.stringify({id:N,msg:"/info",myinfo:e,receipient:o.author_id}))});else if("info"===o.type)J=null,C("",o.msg,"server",o.time);else if("appid_invalid"===o.type)J=null,C("",o.msg,"server",o.time),localStorage.getItem("app_id")&&localStorage.removeItem("app_id");else if("app_id"===o.type)J=null,o.app_id!==f&&(localStorage.setItem("app_id",o.app_id),f=o.app_id,C("","<i>Your AppId has been changed to <b>"+o.app_id+"</b></i>","server",(new Date).getTime()));else if("connected"===o.type)J=null,C("",o.msg,"server",o.time),s.send(JSON.stringify({msg:"/appid",app_id:f})),localStorage.getItem("myName")?(v=localStorage.getItem("myName"),localStorage.getItem("myPassword")&&(_=" "+localStorage.getItem("myPassword")),s.send(JSON.stringify({id:N,channel:y,msg:"/nick "+v+_}))):(J=null,C("","<i>Please type in <b>/nick &lt;your name&gt;</b> to begin.</i>","server",(new Date).getTime()));else if("welcome"===o.type){J=null,C("",o.msg,"server",o.time);var l=o.nickname.split(" ");v=l[0],h=!0,null!==o.url&&$.getJSON(o.url,function(e){console.log(e)}),localStorage.setItem("myName",v),l[1]&&localStorage.setItem("myPassword",l[1])}else"online"===o.type?(h=!0,J=null,C("",o.msg,"server",o.time)):"typing"===o.type?(m.html("<i>"+o.author+" is typing..</i>"),c.scrollTop(c[0].scrollHeight),window.clearTimeout(a),a=window.setTimeout(function(){m.html(null)},5e3)):"seen"===o.type?(window.clearTimeout(a),m.html("<i>seen by "+o.author+" "+n((new Date).getTime())+"</i>"),c.scrollTop(c[0].scrollHeight)):"message"===o.type?(J=o.author_id,C(o.author+": ",o.msg,"client",o.time)):console.log('Hmm..., I"ve never seen JSON like this: ',o)}}function i(){var e=function(){return(65536*(1+Math.random())|0).toString(16).substring(1)};return e()+e()+"-"+e()+"-"+e()+"-"+e()+"-"+e()+e()+e()}function l(){"Websocket"!==document.title&&(document.title="Websocket",null!==J&&s.send(JSON.stringify({id:N,receipient:J,msg:"/seen"})))}var s,a,r,c=$("#content"),g=$("#chat"),m=$("#seen-typing"),u=$("#input"),p=($("#status"),$("#reconnect"),location.host),d=3777,f="ska",y="utiis",w=!1,h=!1,S=null,v="You",_="",I=!1,b=[],k=0,N=null,J=null,O=null,T=1,D=new Audio("toing.mp3");if(localStorage.getItem("channel")?y=localStorage.getItem("channel"):localStorage.setItem("channel",y),window.WebSocket=window.WebSocket||window.MozWebSocket,!window.WebSocket)return c.html($("<p>",{text:"Sorry, but your browser doesn't support WebSockets."})),u.hide(),void $("span").hide();u.keydown(function(e){var t=$(this).val();if(13===e.keyCode){if(t.trim(),!t||0==t.trim().length)return;new Date;if("/connect"==t){if(w===!1&&1!==s.readyState){J=v;var i=(new Date).getTime();g.append('<p class="server"><i>Connecting...</i><span class="time">'+n(i)+"</span></p>"),o(p,d)}}else"/mute"==t?(J=null,C("","<i>You just changed your sound to <b>mute</b></i>","server",(new Date).getTime()),I=!1):"/unmute"==t?(J=null,C("","<i>You just changed your sound to <b>unmute</b></i>","server",(new Date).getTime()),I=!0):"/clear"==t?g.html(null):"/rr"==t?window.location=window.location:w===!0&&(C(v+": ",t,"client",(new Date).getTime()),"/quit"==t||"/q"==t?h===!0&&(J=null,s.send(JSON.stringify({id:N,msg:"/quit"})),w=!1,h=!1,g.html(null),localStorage.removeItem("myName"),localStorage.removeItem("myPassword"),localStorage.removeItem("myId"),localStorage.removeItem("channel"),null!==window.opener&&window.close()):"/reload"==t||"/r"==t?(J=null,s.send(JSON.stringify({id:N,msg:"/reload"}))):"/info"==t||"/i"==t?(J=null,$.getJSON("http://ipinfo.io",function(e){e.agent=navigator.userAgent,console.log(e),s.send(JSON.stringify({id:N,msg:"/info",myinfo:e,receipient:null}))})):(J=null,s.send(JSON.stringify({id:N,channel:y,msg:t.trim()}))));b.push(t),b=b.slice(-10),k=b.length,$(this).val("")}else{if(40===e.keyCode){k<b.length?k++:k=0;var l=b[k];return $(this).val(l),!1}if(38===e.keyCode){k>0?k--:k=b.length;var l=b[k];return $(this).val(l),!1}}}),u.keyup(function(e){var n=$(this).val();1===n.length&&"/"!==n&&"You"!==v&&w===!0&&h===!0&&s.send(JSON.stringify({id:N,msg:"/typing"}))}),u.focus(function(){S=!0});var C=function(e,t,o,i){m.html(null),g.append('<p class="'+o+'"><b>'+e+"</b> "+t+' <span class="time">'+n(i)+"</span></p>"),S!==!0?(document.title="..New Message..",I===!0&&D.play()):S===!0&&null!==J&&s.send(JSON.stringify({id:N,receipient:J,msg:"/seen"})),c.scrollTop(c[0].scrollHeight)};c.click(function(){"Range"!==window.getSelection().type&&u.focus()}),window.onclick=function(){null!==O&&(window.open(O),O=null,s.send(JSON.stringify({id:N,receipient:J,msg:"/seen"}))),l(),S=!0},window.onfocus=function(){l(),S=!0},window.onblur=function(){S=!1},window.onkeydown=function(){"Range"!==window.getSelection().type&&u.focus()},window.onresize=function(){c.scrollTop(c[0].scrollHeight)},console.log("\n==============================================================\n   __                               __       __    _________\n  /  \\  |  /      /\\      |        /  \\     /  \\       |\n  |     | /      /  \\     |       /    \\   /    \\      |\n   \\    |/      /    \\    |      |      | |      |     |\n    \\   |\\     /______\\   |      |      | |      |     |\n     |  | \\   /        \\  |       \\    /   \\    /      |\n  \\__/  |  \\ /          \\ |_____   \\__/     \\__/       |\n  \n==============================================================\n      -- https://www.facebook.com/skaloot --              \n");var P=(new Date).getTime();g.append('<p class="server"><i>Connecting...</i><span class="time">'+n(P)+"</span></p>"),localStorage.getItem("myId")?(N=localStorage.getItem("myId"),console.log("Existing Id - "+N)):(N=i(),localStorage.setItem("myId",N),localStorage.setItem("app_id",f),console.log("New Id - "+N)),o(p,d),setInterval(function(){if(w===!0&&3===s.readyState){w=!1,h=!1,o(p,d);var e=(new Date).getTime();g.append('<p class="server"><i>You are not connected..</i><span class="time">'+n(e)+"</span></p>"),g.append('<p class="server"><i>Connecting...</i><span class="time">'+n(e)+"</span></p>")}},3e3);var W=function(){T++,clearTimeout(r),r=setTimeout(function(){w=!0},1e4*T)}});