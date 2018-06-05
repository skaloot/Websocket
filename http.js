var http = require("http");

http.createServer(function(request, response) {
	console.log("Incoming cobbection..");
	response.writeHead(200, {"Content-Type": "text/plain"});
	response.write("Hello Ska");
	response.end();
}).listen(8080);

// hahaha