<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", 1);
ini_set('display_errors', 1);

require_once('db.php');
$db = new Database();
$db->connect();


if(isset($_POST["msg"])) {
	$msg = $_POST["msg"];
	$username = $_POST["username"];
	$channel = $_POST["channel"];
	$ip_address = $_POST["ip_address"];

	if($channel == "kpj_ui" || $channel == "utiis_ui" || $channel == "ladiesfoto_ui" || $channel == "debunga_cms") {
		exit;
	}

	$db->insert("message", [
		"msg"=>$msg,
		"username"=>$username,
		"channel"=>$channel,
		"ip_address"=>$ip_address
	]);
}




