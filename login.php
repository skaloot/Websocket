<?php (substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip'))?ob_start("ob_gzhandler"):ob_start(); 

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');



if(isset($_POST["email"])) {
	if($_POST["email"] == "tatiana@gmail.com") {
		echo json_encode(["success"=>true,"name"=>"Tatiana"]);
		exit;
	}
	echo json_encode(["success"=>false]);
}