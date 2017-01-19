<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);

$admins = [
	["username"=>"SKALOOT", "password"=>"phpmysql"],
	["username"=>"ADMINISTRATOR", "password"=>"phpmysql"],
	["username"=>"ADMIN", "password"=>"phpmysql"],
];

echo json_encode($admins);