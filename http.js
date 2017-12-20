var http = require("http");

http.createServer(function(request, response) {
	response.writeHead(200, {"Content-Type": "text/plain"});
	console.log(request);
	response.write("Hello Ska");
	response.end();
}).listen(3000);

// hahaha