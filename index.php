<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start();
date_default_timezone_set("Asia/Kuala_lumpur");
?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

        <link rel="icon" href="favicon.ico" type="image/x-icon">
        
        <title>Websocket</title>

        <link href="font.css?<?php echo date("Y-m-d H"); ?>" rel="stylesheet" />
        <style>
        html { -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box; }
        *, *:before, *:after { -webkit-box-sizing: inherit; -moz-box-sizing: inherit; box-sizing: inherit; }
        body { margin: 0;font-family: 'Raleway', sans-serif; font-size:1em; letter-spacing:0.02em; font-size: 1em; }
        * { padding:0px; margin:0px;outline: 0; }
        p { line-height:1.4; }
        #body { width: 100%; height:100%; margin:0px; position:absolute; overflow:hidden; }
        #content { background-color:#FFF; overflow-y: auto; position:absolute; margin:20px; height:auto; bottom:40px; top:0px;left: 220px; right:0px; padding-bottom:25px; }
        #content .chat p { line-height: 1.6; }
        #content .chat p:hover { background-color:#f5f5f5 }
        #seen-typing { color:#999; position:absolute; bottom:50px; font-size:0.8em; }
        #new-message { color:#eee; background-color: #333; padding: 5px; cursor:pointer; position:absolute; bottom:50px; z-index:10; left:50%; font-size:0.8em; border-radius:3px; display:none; margin:auto -50px;
            width:100px; text-align:center; }
        #input-holder { margin: 20px; width:auto; position:absolute; left:220px; bottom:0px; right:0px; }
        #input { border:2px solid #ddd; display: block; padding:10px; font-size:1em; border-radius:5px; -webkit-border-radius:5px; -moz-border-radius:5px; transition:border 0.2s; width:100%;  }
        #input:focus { border:2px solid #bbb; }
        #status { width:200px; display:block; float:left; margin-top:15px; }
        .client { color:#000; }
        .server { color:#888; }
        .time { color:#999; opacity: 0;margin-left: 15px;font-size: 1em; float:right; margin-right: 15px; }
        p:hover .time { opacity: 1; }
        #reconnect { padding:7px 10px; border:1px solid #ccc; border-radius:3px; background-color:#fff; font-size:1em; }
        #bg_login { position: absolute; background-color:#303e4d; width:100%;height:100%;display:block; }
        #login { position:absolute;top: 30%;text-align: center;width:100%;display:block; }
        #username { padding:10px;font-size:1em;max-width:300px;width:100%;margin:auto; border-radius:3px; border:0px; }
        #wrapper { width:auto; margin:auto 20px; }
        #panel { position:absolute;left:0px;top:0px;bottom:0px;width:220px;background-color:#303e4d;color:#FFF; overflow-y:auto; }
        #users-title, #channels-title, #channels-title-admin { font-size: 1em; padding:10px 20px; border-bottom:1px solid #45515f; background-color:#263442; }
        #users, #channels, #channels-admin { color:#ccc; }
        #channels-title, #channels-title-admin, #btn-server, #btn-restart { display:none; }
        #channels, #channels-admin, #users { margin-bottom:15px; }
		#btn-server, #btn-restart { padding-top:0px; }
		.btn { display:block; border:0px; padding:10px 15px; width:100%; cursor:pointer; font-size:0.9em; background-color:#263442; color:#FFF; }
		.btn:hover { background-color:#1c2936; }
        .user, .channel { font-size:0.9em; padding:7px 18px; cursor:pointer; transition:background-color 0.2s; }
        .user:hover, .channel:hover, .channel-now { background-color:#3f4e5f; color:#FFF; }
		.panel { padding:15px 20px;display:block; }
        .close-channel { position:absolute;margin: -25px 0 0 200px; cursor: pointer; opacity:0.3; }
        .close-channel:hover { opacity:1; }
        @media only screen and (max-width: 500px) {
            #panel { display: none; }
			#content, #input-holder { left:0px; }
            #content .chat p { margin-right:20px; }
        }
        </style>
    </head>
    <body>
        <div id="body">
            <div id="panel">
                <div class="panel" id="btn-quit">
                    <button class="btn" onclick="ch.quit()">Logout</button>
                </div>
				<div class="panel" id="btn-server">
					<button class="btn" onclick="ch.server_detail()">Server Detail</button>
				</div>
                <div class="panel" id="btn-restart">
                    <button class="btn" onclick="ch.restart()">Restart Server</button>
                </div>
                <div id="channels-title">Channels</div>
                <div id="channels"></div>
                <div id="channels-title-admin">Channel Admin</div>
                <div id="channels-admin"></div>
                <div id="users-title">Online Users</div>
                <div id="users"></div>
            </div>

            <div id="content">
                <div class="chat"></div>
            </div>

            <div id="input-holder">
            <div id="seen-typing"></div>
            <div id="new-message">New Message</div>
                <input type="text" id="input" autocomplete="off" placeholder="Type here..">
            </div>

            <div id="bg_login"></div>
            <div id="login">
                <div id="wrapper">
                    <input id="username" autofocus autocomplete="off" placeholder="Your name please..">
                </div>
            </div>
        </div>

        <script type="text/javascript" src="jquery-1.11.3.min.js"></script>
        <script type="text/javascript">
            localStorage.setItem("ip_address", "<?php echo $_SERVER["REMOTE_ADDR"]; ?>");
        </script>
        <?php if(isset($_GET["channel"])) { ?>
            <?php if($_GET["channel"] == "debunga") { ?>
                <script src="client_debunga.js?<?php echo date("Y-m-d H:i"); ?>"></script>
            <?php } ?>
        <?php } else { ?>
            <script src="client.js?<?php echo date("Y-m-d H:i"); ?>"></script>
        <?php } ?>
    </body>
</html>
