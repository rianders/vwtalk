var config = {}

config.opentok = {};
config.opentok.key = "10120602";
config.opentok.secret = "41c132f9c35f3278f4d2b78b8f87bb4b94210b3d" ;
config.opentok.location = "localhost";
config.port = (process.env.PORT || 3000);
config.host = (process.env.HOST || "127.0.0.1");
module.exports = config;
