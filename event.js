"use strict";

process.title = "Event Emitter";
process.env.TZ = "Asia/Kuala_Lumpur";
process.env.PORT = 8080;


const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();



// =========================================================================================================


myEmitter.on('event1', function(a, b) {
	// setImmediate(() => {
		console.log(a, b, this);
	// });
});



myEmitter.emit('event1', 'ska', 'loot');