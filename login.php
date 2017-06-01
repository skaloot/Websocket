<?php (substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');



require_once("../db.php");
$db = new Database();
$db->connect();


if(isset($_POST["email"])) {
	$q = $db->select("chat","*","","email = '".$_POST["email"]."'");
	if($q) {
		$db->insert("chat_log", array("email"=>$_POST["email"],"time"=>date("Y-m-d H:i:s")));
		echo json_encode(array("success"=>true,"name"=>$q[0]["name"]));
	} else {
		echo json_encode(array("success"=>false));
	}
} else {
	echo json_encode(array("success"=>false));
}