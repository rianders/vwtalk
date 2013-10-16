var config = {}

config.opentok = {};
config.opentok.key = "10120602";
config.opentok.secret = "41c132f9c35f3278f4d2b78b8f87bb4b94210b3d" ;
config.opentok.location = "localhost";
config.host = (process.env.PORT || 8080);
config.port = (process.env.HOST || 'localhost');

module.exports = config;