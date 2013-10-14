	newWorld.opentokSessions = {};
			opentok.createSession('127.0.0.1', function(result) {
				newWorld.opentokSessions.management = result;
				opentok.createSession('127.0.0.1', function(result) {
					newWorld.opentokSessions.union = result;
					opentok.createSession('127.0.0.1', function(result) {
						newWorld.opentokSessions.middle = result;
						db.collection('worlds').save(newWorld);
					});
				});
			});
			
			
			
			
			io.sockets.on('connection', function (socket) {
	socket.on('generateToken', function (data, fn) {
		//43200000 is 12 hours in milliseconds i.e. the time for a token to expire in milliseconds
		if(tokens[data.session] != null && (tokens[data.session].timestamp-new Date().getTime())<43200000)
		{
			fn(tokens[data.session]);
		}
		else
		{
			tokens[data.session] = {};
			tokens[data.session].session = opentok.generateToken({session_id:data.session});
			tokens[data.session].timestamp = new Date().getTime();
			fn(tokens[data.session]);
		}
		console.log("Sent token: " + tokens[data.session]);
	});
});