var sessions = {};
var tokens = {};
tokens.one = token1;
tokens.two = token2;
var curSession = 'one';
var session = TB.initSession(sessionId1);
sessions.one = session;
sessions.one.addEventListener('sessionConnected', function (e) {
  var publisherEl = document.createElement('div');
  publisherEl.id = 'publisher';
  document.getElementById('publisherContainer').appendChild(publisherEl);
  sessions[curSession].publish('publisher');
  addStreams(e.streams);
});
sessions.one.addEventListener('connectionDestroyed', connectionDestroyedHandler);
sessions.one.addEventListener('sessionDisconnected', sessionDisconnectedHandler);
sessions.one.addEventListener('streamCreated', function (e) {
  addStreams(e.streams);
});
var session = TB.initSession(sessionId2);
sessions.two = session;
sessions.two.addEventListener('sessionConnected', function (e) {
  var publisherEl = document.createElement('div');
  publisherEl.id = 'publisher';
  document.getElementById('publisherContainer').appendChild(publisherEl);
  sessions[curSession].publish('publisher');
  addStreams(e.streams);
});
sessions.two.addEventListener('connectionDestroyed', connectionDestroyedHandler);
sessions.one.addEventListener('sessionDisconnected', sessionDisconnectedHandler);
sessions.two.addEventListener('streamCreated', function (e) {
  addStreams(e.streams);
});
function addStreams(streams) {
  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];
    if (stream.connection.connectionId !== sessions[curSession].connection.connectionId) {
      var subscriberEl = document.createElement('div');
      subscriberEl.id = 'subscriber-' + stream.streamId;
      document.getElementById('subscriberContainer').appendChild(subscriberEl);
      sessions[curSession].subscribe(stream, subscriberEl.id);
    }
  }
}
function switchSession() {
  console.log('cur: ' + curSession);
  if (curSession === 'one') {
    curSession = 'two';
  } else {
    curSession = 'one';
  }
  document.getElementById('session').innerHTML = curSession;
  console.log('switch: ' + curSession);
}
function disconnect() {
  console.log('Disconnect %s', curSession);
  sessions[curSession].disconnect();
}
function connect() {
  console.log('Connect %s', curSession);
  sessions[curSession].connect(apiKey, tokens[curSession]);
}
function connectionDestroyedHandler(event) {
  preventDefault();
  console.log('ConnectionDestroyed %s', curSession);  //    partnerConnection = null;
}
function sessionDisconnectedHandler(event) {
  console.log('sessionDisconnected %s', curSession);  //    partnerConnection = null;
}
