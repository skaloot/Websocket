<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);


if(isset($_POST["payload"]) && $_POST["payload"]["repository"]["name"] == "Websocket") {
	foreach($_POST["payload"]["commits"]["modified"] as $modified) {
		$myFile = "github.log";
		$file = file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/".$modified);
		$fh = fopen($modified, 'w') or die("can't open file");
		fwrite($fh, $file);
		fclose($fh);
	}
}
