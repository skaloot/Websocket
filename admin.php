<?php

header('Access-Control-Allow-Origin: *');
date_default_timezone_set("Asia/Kuala_lumpur");
ini_set("error_reporting", E_ALL);

$admins = [
	["username"=>"SKALOOT", "password"=>"phpmysql"],
	["username"=>"HISSHAM", "password"=>"123"],
];

$i = 1;
foreach($admins as $admin) {
	$comma = ",";
	if($i++ == count($admins)) {
		$comma = "";
	}
	echo $admin["username"]."-".$admin["password"].$comma;
}