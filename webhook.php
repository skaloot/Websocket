<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", -1);
ini_set("display_errors", -1);


$arrContextOptions = array(
    "ssl"=>array(
        "verify_peer"=>false,
        "verify_peer_name"=>false,
    ),
);


if(isset($_POST["payload"])) {
	header("Content-Type: application/json");
	$payload = json_decode($_POST["payload"], true);
	$github = "github.log";
	$date = date("H:i:s d-m-Y");
	$a = "";
	if($payload["repository"]["name"] == "Websocket") {
		foreach($payload["commits"][0]["modified"] as $modified) {
			if($modified == "webhook.php") {
				continue;
			}
			$a .= $date." - ".$modified."\n";
			$data = file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/".$modified."?".rand(), false, stream_context_create($arrContextOptions));
			$fh = fopen($modified, 'w+') or die("can't open file");
			fwrite($fh, $data);
			fclose($fh);
		}
	}
	$fh = fopen($github, 'a+') or die("can't open file");
	fwrite($fh, $a);
	fclose($fh);

	echo json_encode(["status"=>"Done"]);
	exit;
}


header("Content-Type: text/plain");
echo file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/server.js", false, stream_context_create($arrContextOptions));






