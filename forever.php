<?php

$path = getcwd();

if(strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
	echo rtrim(shell_exec('"C:/Program Files/nodejs/node.exe" '.$path.'/cli.js 2>&1').PHP_EOL);
} else {
	echo rtrim(shell_exec('/usr/local/bin/node '.$path.'/cli.js 2>&1').PHP_EOL);
}
