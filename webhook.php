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
	$payload["repository"]["name"] == "Websocket") {
	foreach($payload["commits"]["modified"] as $modified) {
		$myFile = "github.log";
		$file = httpGet("https://raw.githubusercontent.com/skaloot/Websocket/master/".$modified);
		$fh = fopen($modified, 'w') or die("can't open file");
		fwrite($fh, $file);
		fclose($fh);
	}
}

echo json_encode(["status"=>"Done"]);