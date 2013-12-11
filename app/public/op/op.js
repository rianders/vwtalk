var apiKey = '44508332';
var sessionIds = [
  '2_MX40NDUwODMzMn5-V2VkIERlYyAwNCAxMDo1NjowNyBQU1QgMjAxM34wLjYxODMyNDZ-',
  '2_MX40NDUwODMzMn5-V2VkIERlYyAwNCAxMDo0NTozNyBQU1QgMjAxM34wLjY0MjIwODQ2fg'
];
var tokens = [
  'T1==cGFydG5lcl9pZD00NDUwODMzMiZzZGtfdmVyc2lvbj10YnJ1YnktdGJyYi12MC45MS4yMDExLTAyLTE3JnNpZz05ZWEwNTNhMGVkMDY1YmUwNDBmODE5OGQwNTUwOTkzZTAyNTEzYTI0OnJvbGU9cHVibGlzaGVyJnNlc3Npb25faWQ9Ml9NWDQwTkRVd09ETXpNbjUtVjJWa0lFUmxZeUF3TkNBeE1EbzFOam93TnlCUVUxUWdNakF4TTM0d0xqWXhPRE15TkRaLSZjcmVhdGVfdGltZT0xMzg2MTgzMzc3Jm5vbmNlPTAuNzE5NzQ3Mzk5MTkzNjY5MSZleHBpcmVfdGltZT0xMzg4Nzc1Mzc3JmNvbm5lY3Rpb25fZGF0YT0=',
  'T1==cGFydG5lcl9pZD00NDUwODMzMiZzZGtfdmVyc2lvbj10YnJ1YnktdGJyYi12MC45MS4yMDExLTAyLTE3JnNpZz02NGUzYzM4NzAxNmZlZjA1NzIzNDExMDgyOGNhNmYwOTU2NjE1N2RhOnJvbGU9cHVibGlzaGVyJnNlc3Npb25faWQ9Ml9NWDQwTkRVd09ETXpNbjUtVjJWa0lFUmxZeUF3TkNBeE1EbzBOVG96TnlCUVUxUWdNakF4TTM0d0xqWTBNakl3T0RRMmZnJmNyZWF0ZV90aW1lPTEzODYxODI3NDImbm9uY2U9MC4zMzgzNTQ0MDI5OTk3ODAwNCZleHBpcmVfdGltZT0xMzg4Nzc0NzQyJmNvbm5lY3Rpb25fZGF0YT0='
];
var curSession = 0;
var publisherProperties = {width:1, height:1, name:"test"};
var publisher = TB.initPublisher(apiKey, 'publisherContainer', publisherProperties);
var sessions = [];
for(var sessionId in sessionIds) {
  var session = TB.initSession(sessionIds[sessionId]);
  sessions.push(session);
  session.addEventListener('sessionConnected', sessionConnectedHandler);
  session.addEventListener('connectionDestroyed', connectionDestroyedHandler);
  session.addEventListener('sessionDisconnected', sessionDisconnectedHandler);
  session.addEventListener('streamCreated', streamCreatedHandler);
  session.addEventListener('streamDestroyed', streamDestroyedHandler);
  session.addEventListener('streamPropertyChanged', streamPropertyChangedHandler);
}

function addStreams(streams) {
  console.log("Streams: %s", streams.name);
  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];
    //if the stream is not myself
      var subscriberEl = document.createElement('div');
      subscriberEl.id = 'subscriber-' + stream.streamId;
      document.getElementById('subscriberContainer').appendChild(subscriberEl);
      sessions[curSession].subscribe(stream, subscriberEl.id);
  }
}

function switchSession() {
  console.log('cur: ' + curSession);
  disconnect();
  
  //this formula while cause curSession to cycle between 0 and the total number of sessions each time this function is called
  curSession = (curSession+1)%sessions.length;
  
  document.getElementById('session').innerHTML = curSession;
  connect();
  console.log('switch: ' + curSession);
}
function disconnect() {
  console.log('Disconnect %s', curSession);
  unpublish();
  sessions[curSession].disconnect();
  // preventDefault();
}
function connect() {
  console.log('Connect %s', curSession);
  publish();
  sessions[curSession].connect(apiKey, tokens[curSession]);
}
function publish() {
  console.log("Publish");
  sessions[curSession].publish(publisher);
}
function unpublish() {
  console.log("Unpublish");
  sessions[curSession].unpublish(publisher);
}
function sessionConnectedHandler(e) {
//  sessions[curSession].publish(publisher);
  addStreams(e.streams);
}
function connectionDestroyedHandler(e) {
  e.preventDefault();
  console.log('CONNECTIONDestroyed %s', curSession);  //    partnerConnection = null;
}
function sessionDisconnectedHandler(e) {
  console.log('sessionDisconnected %s', curSession);  //    partnerConnection = null;
  //e.preventDefault();
}
function streamCreatedHandler(e) {
  addStreams(e.streams);
}
function streamDestroyedHandler(e) {
  e.preventDefault();
  var subscriberDiv = document.getElementById("subscriber-"+e.streams[0].streamId);
  console.log(subscriberDiv);
  subscriberDiv.parentNode.removeChild(subscriberDiv);
  console.log(e);
}
function streamPropertyChangedHandler(e) {
  console.log(e);
}

