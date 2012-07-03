var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	redis = require('redis'),
	redis_client = redis.createClient(),
	ps_client = redis.createClient(),
	crypto = require('crypto'),
	users = 0;

app.listen(80);

function handler (req, res) {
	var file = (req.url === "/")? "/client.html" : req.url;
	
	fs.readFile(__dirname + file, function (err, data) {
		if (err) {
      		res.writeHead(500);
      		return res.end('Error loading index.html');
    	}

    	res.writeHead(200);
    	res.end(data);

	});
}

io.sockets.on('connection', function (socket) {
	users++;

	// on initial load, query redis and find all the past chat messages
	redis_client.sort("chat:main", "by", "chat:main:*", "get", "*", function(err, set){
		console.log(set);
		socket.emit("initial load", set);
	});
	
	socket.on('new message', function (data) {
		var message = data.message,
			shasum = crypto.createHash('sha1'),
			id;
		
		shasum.update(message+Date.now());
		id = shasum.digest('hex');
		
		console.log("SHA1 ID: " + id);
    	console.log("Redis:: set - chat:message:user"+users+":"+data.message+" => "+Date.now());
		redis_client.sadd("chat:main", id, redis.print);
		redis_client.set("chat:main:"+id, Date.now(), redis.print);
		redis_client.set(id, message);
		
		socket.emit("broadcast", {message: message});
  	});
});