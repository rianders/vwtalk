/**
 *  Initial code form here: https://github.com/Srirangan/express-bootstrap
 * Module dependencies.
 */
var express = require('express'), routes = require('./routes'), opentok = require('opentok');
var config = require('./config');
console.log('PORT: ' + config.port + ' HOST: ' + config.host);
var app = express();
// Configuration
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
//world data
var worlds = {};
var world = {};
worlds['001'] = world;
world.name = 'negotiation';
world.roomCount = 3;
world.roomNames = [];
world.roomNames[0] = 'union';
world.roomNames[1] = 'management';
world.roomNames[2] = 'middle';
console.log('world: %j', worlds);
//OpenTOk Config
var location = config.opentok.location;
var opentokAPP = new opentok.OpenTokSDK(config.opentok.key, config.opentok.secret);
var tokens = {};
var sessions = {};
var ii;
for (ii = 0; ii < world.roomCount; ii++) {
  var session = {};
  session.sessionName = world.roomNames[ii];
  session.sessionId = 'NOT';
  session.token = '';
  sessions[world.roomNames[ii]] = session;
}
for (var key in sessions) {
  console.log('key: ' + key);
  opentokAPP.createSession(location, { 'p2p.preference': 'disabled' }, function (aKey) {
    return function (result) {
      sessions[aKey.toString()].sessionId = result;
      console.log('sessions[' + aKey.toString() + '].sessionId: ', sessions[aKey].sessionId);
    };
  }(key));
}
app.configure('development', function () {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});
app.configure('production', function () {
  app.use(express.errorHandler());
});
// Routes
app.get('/', function (req, res) {
  res.redirect('/Negotiation');
  console.log('Sessions: %j', sessions);
  res.render('index', {
    title: 'OpenTok Test',
    sessions: sessions
  });
});
app.get('/support', routes.support);
app.get('/api/:world/:user/:room', function (req, res) {
  //This selects the world, the user, and starter room
  var data = {};
  data.user = req.params.user;
  data.sessionName = req.params.room;
  data.apikey = config.opentok.key;
  //data.sessionId = sessions[session.sessionName].sessionId;
  //loop sessions
  for (var key in sessions) {
    var token = opentokAPP.generateToken({
        session_id: sessions[key].sessionId,
        role: opentok.RoleConstants.PUBLISHER,
        connection_data: 'userId:' + req.params.user
      });
    tokens[key] = token;
    sessions[key].token = token;  // console.log("token: ",sessions[key].token );
  }
  data.tokens = tokens;
  data.sessions = sessions;
  console.log('data: %j', data);
  res.json(data);
});
app.listen(config.port, function () {
  console.log('opentok app running: ' + config.port);
});
