<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: skaloot.com');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", -1);
ini_set("display_errors", -1);


$arrContextOptions = array(
    "ssl"=>array(
        "verify_peer"=>false,
        "verify_peer_name"=>false,
    ),
    'http' => array(
        'method' => "GET",
        'header' =>
            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n" .
            "Accept-Language: en-US,en;q=0.8\r\n".
            "Keep-Alive: timeout=3, max=10\r\n",
            "Connection: keep-alive",
        'user_agent' => "User-Agent: Mozilla/5.0 (Windows NT 6.1) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.66 Safari/535.11",
        "ignore_errors" => true,
        "timeout" => 60
    )
);


if(isset($_POST["payload"])) {
	header("Content-Type: application/json");
	$payload = json_decode($_POST["payload"], true);
	$github = "github.log";
	$date = date("H:i:s d-m-Y");
	$a = "";
	if($payload["repository"]["name"] == "Websocket" && $payload["pusher"]["name"] == "skaloot") {
		foreach($payload["commits"][0]["modified"] as $modified) {
			if($modified == "webhook.php") {
				continue;
			}
			$a .= $date." - ".$modified." - modified\n";
			$data = file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/".$modified."?".rand(), false, stream_context_create($arrContextOptions));
			$fh = fopen($modified, 'w+') or die("can't open file");
			fwrite($fh, $data);
			fclose($fh);
		}
		foreach($payload["commits"][0]["added"] as $added) {
			if($added == "webhook.php") {
				continue;
			}
			$a .= $date." - ".$added." - added\n";
			$data = file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/".$added."?".rand(), false, stream_context_create($arrContextOptions));
			$fh = fopen($added, 'w+') or die("can't open file");
			fwrite($fh, $data);
			fclose($fh);
		}
		foreach($payload["commits"][0]["removed"] as $removed) {
			if($removed == "webhook.php") {
				continue;
			}
			if(file_exists($removed)) {
				$a .= $date." - ".$removed." - removed\n";
				unlink($removed);
			}
		}
	}
	$fh = fopen($github, 'a+') or die("can't open file");
	fwrite($fh, $a);
	fclose($fh);

	echo json_encode(["status"=>"Done"]);
	exit;
}


header("Content-Type: text/plain");
echo file_get_contents("https://raw.githubusercontent.com/skaloot/Websocket/master/server.js?".rand(), false, stream_context_create($arrContextOptions));






