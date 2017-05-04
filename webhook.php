<?php (isset($_SERVER['HTTP_ACCEPT_ENCODING'])&&substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);

// require_once('db.php');
// $db = new Database();
// $db->connect();


// if(isset($_POST["msg"])) {
	// $msg = json_encode($_POST);
	// $username = "Github";
	// $channel = "Webhook";
	// $ip_address = "";
	// $db->insert("message", [
	// 	"msg"=>$msg,
	// 	"username"=>$username,
	// 	"channel"=>$channel,
	// 	"ip_address"=>$ip_address
	// ]);

	$myFile = "github.log";
	$fh = fopen($myFile, 'w') or die("can't open file");
	$msg = json_encode($_POST);
	// $msg = "hahaha";
	fwrite($fh, $msg);
	fclose($fh);
// }




