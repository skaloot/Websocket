<?php

$path = getcwd();

if(strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
	shell_exec('"C:/Program Files/nodejs/node.exe" '.$path.'\\cli.js');
} else {
	shell_exec('/usr/bin/node /home/ubuntu/timer/cli_MY.js');
}
