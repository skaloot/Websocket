<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
header("Content-Type: application/json");
ini_set("error_reporting", E_ALL);


function httpGet($url) {
    $ch = curl_init();  
 
    curl_setopt($ch,CURLOPT_URL,$url);
    curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
	curl_setopt($ch,CURLOPT_HEADER, false);
 
    $output=curl_exec($ch);
 
    curl_close($ch);
    return $output;
}


if(isset($_POST["payload"])) {
	$payload = json_decode($_POST["payload"], true);
	$github = "github.log";
	$date = date("H:i:s d-m-Y");
	$a = "";
	if($payload["repository"]["name"] == "Websocket") {
		foreach($payload["commits"][0]["modified"] as $modified) {
			if($modified == "webhook.php") {
				continue;
			}
			chmod($modified, 0777);
			$a .= $date." - ".$modified."\n";
			$data = httpGet("https://raw.githubusercontent.com/skaloot/Websocket/master/".$modified);
			$fh = fopen("git_".$modified, 'w+') or die("can't open file");
			fwrite($fh, $data);
			fclose($fh);
		}
	}
	$fh = fopen($github, 'a+') or die("can't open file");
	fwrite($fh, $a);
	fclose($fh);

	echo json_encode(["status"=>"Done"]);
}