/**
 *  Initial code form here: https://github.com/Srirangan/express-bootstrap
 * Module dependencies.
 */
var express = require('express'),
    routes = require('./routes'),
    opentok = require('opentok'),
    Sync = require('sync');

var config = require('./config');

var app = module.exports = express();

// Configuration

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

//world data
var worlds = {};
var world = {};
worlds["001"] = world;
world.name = "negotiation";
world.roomCount = 3;
world.roomNames = [];
world.roomNames[0] = "room1";
world.roomNames[1] = "room2";
world.roomNames[2] = "room3";
console.log( "world: %j", worlds);

//OpenTOk Config
var location = config.opentok.location;
var opentokAPP = new opentok.OpenTokSDK(config.opentok.key, config.opentok.secret);

console.log("rmCount: ", world.roomCount);
var sessions = {};
for (var ii = 0; ii < world.roomCount; ii++) {
    var session = {};
    session.sessionName = world.roomNames[ii];
    session.sessionId = "NOT";
    sessions[world.roomNames[ii]] = session;
}
console.log(sessions);
/* This is not working because by the time the session is create "room3" is the key for all rooms.
Sync(function() {
var key;
    for (key in sessions) {
        console.log("key: " + key);
        opentokAPP.createSession(location, {'p2p.preference':'disabled'}, function(result){
            sessions[key.toString()].sessionId = result;
            console.log("sessions[" + key.toString() + "].sessionId: ", sessions[key].sessionId);

        });
    }
});

console.log(sessions);
*/


Sync(function() {
    opentokAPP.createSession(location, {
        'p2p.preference': 'disabled'
    }, function(result) {
        console.log(sessions["room1"]);
        sessions["room1"].sessionId = result;
        opentokAPP.createSession(location, {
            'p2p.preference': 'disabled'
        }, function(result) {
            sessions["room2"].sessionId = result;
            opentokAPP.createSession(location, {
                'p2p.preference': 'disabled'
            }, function(result) {
                sessions["room3"].sessionId = result;
                console.log("ASessions %j", sessions);
            });
        });
    });
});



app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
    console.log("Sessions: %j", sessions);
    res.render('index', {
        title: 'OpenTok Test',
        sessions: sessions
    });
});

app.get('/support', routes.support);


app.get('/api/:world/:user/:room', function(req, res) {
    var data = {};
    data.user = req.params.user;
    data.sessionName = req.params.room;
    data.apikey = config.opentok.key;
    console.log("sesionName: " + data.sessionName);
    data.sessionId = sessions[session.sessionName].sessionId;
    console.log("opentok: %j", opentok);
    var token = opentokAPP.generateToken({
        session_id: data.sessionId,
        role: opentok.RoleConstants.SUBSCRIBER,
        connection_data: "userId:" + req.params.user
    });
    data.token = token;
    console.log("token: ", data.token);
    console.log("data: %j", data);

    res.json(data);

});

app.listen(process.env.PORT, function() {
    console.log("opentok app running: " + process.env.PORT);
});
