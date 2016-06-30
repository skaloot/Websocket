<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);


if(isset($_GET["username"]) && isset($_GET["app_id"])) {
	$username = $_GET['username'];
	if($_GET["app_id"] === "ladiesfotochat") {
		if($username == "skaloot" || $username == "ska" || $username == "hudajamal" || $username == "admin" || $username == "huda") {
			exit;
		}
		echo file_get_contents("http://www.ladiesfoto.com/websocket/login_mail.php?username=".$username);
	}
}
