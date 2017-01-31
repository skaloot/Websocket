<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);

require_once('db.php');
$db = new Database();
$db->connect();


// if(isset($_POST["msg"])) {
	$msg = json_encode($_POST);
	$username = "Github";
	$channel = "Webhook";
	$ip_address = "";
	$db->insert("message", [
		"msg"=>$msg,
		"username"=>$username,
		"channel"=>$channel,
		"ip_address"=>$ip_address
	]);
// }




