<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);


if(isset($_GET["username"])) {
	$username = $_GET['username'];
	$msg = "Dear Ladies,

	".$username." has just logged in to ur chatroom.

	-Websocket Chat-";
	mail("skaloot@gmail.com", "WebChat Login Notification - ".$username, $msg, "From: WebChat<no-reply@ladiesfoto.com>");
	// mail("ladiesfoto@gmail.com", "WebChat Login Notification - ".$username, $msg, "From: WebChat<no-reply@ladiesfoto.com>");
	// mail("ladiesfotostudio@gmail.com", "WebChat Login Notification - ".$username, $msg, "From: WebChat<no-reply@ladiesfoto.com>");
}



if(isset($_POST["username"]) && isset($_POST["channel"])) {
	$username = $_POST['username'];
	if($_POST["channel"] === "ladiesfoto") {
		if($username == "skaloot" || $username == "ska" || $username == "hudajamal" || $username == "admin" || $username == "huda") {
			exit;
		}
		file_get_contents("http://www.ladiesfoto.com/chat/login_mail.php?username=".$username);
	}
}



