<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); ?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Websocket</title>

        <link href="font.css" rel="stylesheet"/>
        <style>
        body { margin: 0;font-family: 'Raleway', sans-serif; font-size:1em; letter-spacing:0.02em;  }
        * { padding:0px; margin:0px;outline: 0; }
        p { line-height:1.4; }
        #content { padding:15px; background-color:#ddd; overflow-y: auto; position: absolute; padding-bottom:30px;
                   border:1px solid #CCC; margin:10px; height: auto; bottom: 50px; top: 0px;left: 0px;right: 0px; }
        #content #chat p { line-height: 1.6; margin-right:150px; }
        #seen-typing { color:#999; position:absolute; bottom:70px; z-index:10; left:25px; font-size:0.9em; }
        #new-message { color:#eee; background-color: #333; padding: 5px; cursor:pointer; position:absolute; bottom:70px; z-index:10; left:25px; font-size:0.8em; border-radius:3px; display:none; margin:auto 40%; }
        #input-holder { margin-left: 10px;margin-right: 30px; position: absolute;bottom: 10px;width: auto;left: 0px;right: 0px; }
        #input { border:1px solid #ccc; display: block; padding:10px; width:100%; font-size:1em; }
        #status { width:200px; display:block; float:left; margin-top:15px; }
        .client { color:#000; }
        .server { color:#888; }
        .time { color:#999; opacity: 0;margin-left: 15px;font-size: 1em; float:right; margin-right: 15px; }
        p:hover .time { opacity: 1; }
        #reconnect { padding:7px 10px; border:1px solid #ccc; border-radius:3px; background-color:#fff; font-size:1em; }
        #bg_login { position: absolute;background-color: #eee;width:100%;height:100%;display:none; }
        #login { position:absolute;top: 30%;text-align: center;width:100%;font-size: 1em;display:none; }
        #username { padding:10px;font-size:1em;max-width:300px;width:100%;margin:auto; }
        #wrapper { width:auto;margin:auto 40px auto 20px; }
        #users { position:absolute;right:10px;top:10px;bottom:60px;width:160px;border-left:1px solid #aaa; background-color:#eee; }
        .user { padding:5px 15px; }
        @media only screen and (max-width: 400px) {
            #users { display: none; }
            #content #chat p { margin-right:20px; }
        }
        </style>
    </head>
    <body>
        <div id="content">
            <div id="chat"></div>
        </div>
        <div id="users"></div>
        <div id="seen-typing"></div>
        <div id="new-message">New Message</div>
        <div id="input-holder">
            <input type="text" id="input" autocomplete="off" placeholder="Type here..">
        </div>

        <div id="bg_login"></div>
        <div id="login">
            <div id="wrapper">
                <input id="username" autofocus autocomplete="off" placeholder="Your name please..">
            </div>
        </div>

        <input id="ip_address" type="hidden" value="<?php echo $_SERVER["REMOTE_ADDR"]; ?>">

        <script src="jquery-1.11.3.min.js"></script>
        <script src="client.js"></script>
    </body>
</html>
