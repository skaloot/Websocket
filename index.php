<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); ?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Websocket</title>

        <link href="https://fonts.googleapis.com/css?family=Raleway:300,300i,600,600i" rel="stylesheet">
        <style>
        body { margin: 0;font-family: 'Raleway', sans-serif; font-size:1em; letter-spacing:0.02em;  }
        * { padding:0px; margin:0px;outline: 0; }
        p { line-height:1.4; }
        #content { padding:15px; background:#ddd; overflow-y: auto; position: absolute; padding-bottom:30px;
                   border:1px solid #CCC; margin:10px; height: auto; bottom: 50px; top: 0px;left: 0px;right: 0px; }
        #content #chat p { line-height: 1.6; }
        #seen-typing { color:#999; position:absolute; bottom:70px; z-index:10; left:25px; font-size:0.9em; }
        #input-holder { margin-left: 10px;margin-right: 30px; position: absolute;bottom: 10px;width: auto;left: 0px;right: 0px; }
        #input { border:1px solid #ccc; display: block; padding:10px; width:100%; font-size:1em; }
        #status { width:200px; display:block; float:left; margin-top:15px; }
        .client { color:#000; }
        .server { color:#888; }
        .time { color:#999; opacity: 0;margin-left: 15px;font-size: 1em; }
        p:hover .time { opacity: 1; }
        #reconnect { padding:7px 10px; border:1px solid #ccc; border-radius:3px; background-color:#fff; font-size:1em; }
        #bg_login { position: absolute;background-color: #eee;width:100%;height:100%;display:none; }
        #login { position:absolute;top: 30%;text-align: center;width:100%;font-size: 1.1em;display:none; }
        #username { padding:10px;font-size:1.1em;max-width:300px;width:100%;margin:10px 20px auto 20px; }
        </style>
    </head>
    <body>
        <div id="content">
            <div id="chat"></div>
        </div>
        <div id="seen-typing"></div>
        <div id="input-holder">
            <input type="text" id="input" autocomplete="off" placeholder="Type here..">
        </div>

        <div id="bg_login"></div>
        <div id="login">
            <input id="username" autofocus autocomplete="off" placeholder="Username">
        </div>

        <script src="jquery-1.11.3.min.js"></script>
        <script src="client.js"></script>
    </body>
</html>
