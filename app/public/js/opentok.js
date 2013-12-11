var currentRoom;
var room = 'room1';
var user;
var sessions = {};
var globaldata = {};
var publisher;
var isMicOn = true;
var sessionToJoinOnStart;
var subscribed = false;
var config = {
	mic: true,
	video: true
}

TB.setLogLevel(TB.DEBUG);

function subscribeToStreams(streams) {
  console.log('subscribeToStreams');
  for (var ii = 0; ii < streams.length; ii++) {
    console.log('stream ii: ' + streams.length + ', StreamName: ' + streams[ii].name);
    // Make sure we don't subscribe to ourself
    // Create the div to put the subscriber element in to
    var div = document.createElement('div');
    div.setAttribute('id', 'stream' + streams[ii].streamId);
    var streamsContainer = document.getElementById('streamsContainer');
    streamsContainer.appendChild(div);
    var subProperties = {};
    subProperties.height = 100;
    subProperties.width = 128;
    subProperties.style = {};
    subProperties.style.nameDisplayMode = 'on';
    var subscriber = sessions[currentRoom].subscribe(streams[ii], 'stream' + streams[ii].streamId, subProperties);  // subscriber.subscribeToVideo(false).subscribeToAudio(true);
  }
}

function streamCreatedHandler(event) {
  console.log('streamCreateHandler');
  subscribeToStreams(event.streams);
}

function sessionConnectedHandler(event) {
  console.log('sessionConnectedHandler');
  //: cnt:  " +  event.connections.length);
  // Create publisher and start streaming into the session
  sessions[currentRoom].publish(publisher);
  sessions[currentRoom].pubObj = publisher;
  console.log('Pub Room: ' + room);
  console.log('Pub currentRoom: ' + currentRoom);
  // Subscribe to streams that were in the session when we connected
  subscribeToStreams(event.streams);
}

function streamAvailableHandler(event) {
  console.log('streamAvailableHandler: no camera or microphone');
}
function unpublish(room) {
	sessions[room].unpublish(sessions[room].pubObj);
	console.log("unpublished: " + room);
}
function connectionDestroyedHandler(event) {
	event.preventDefault();
	console.log("The session disconnected. " + event.reason);
}
function streamDestroyedHandler(ee) {
  ee.preventDefault();
  var subscriberDiv = document.getElementById("subscriber-"+ee.streams[0].streamId);
  console.log(subscriberDiv);
  subscriberDiv.parentNode.removeChild(subscriberDiv);
  console.log(ee);
}
