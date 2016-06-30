<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);

require_once('db.php');
$db = new Database();
$db->connect();


if(isset($_POST["msg"])) {
	$msg = $_POST["msg"];
	$app_id = $_POST["app_id"];
	$db->insert("message", ["msg"=>$msg, "app_id"=>$app_id]);
	// echo "OK";
}




