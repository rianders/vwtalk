//Vivox functions that could be called by or have been called from unity web player
var prevRoom = '';
var session;
var world = "001";
$(document).ready(function() {
  $.ajax({
    dataType: 'json',
    url: '/api/' + world + '/' + user + '/' + room,
    success: function (data) {
      //copy the data for later use
      globaldata = $.extend({}, data);
      sessions = data.sessions;
      //initalize the sessions
      for (var key in sessions) {
        console.log('Key: ' + key + ' data: ' + data.sessions[key].sessionId);
        var session = TB.initSession(data.sessions[key].sessionId);
        sessions[key] = session;
        sessions[key].addEventListener('sessionConnected', sessionConnectedHandler);
        sessions[key].addEventListener('streamCreated', streamCreatedHandler);
        sessions[key].addEventListener('connectionDestroyed', connectionDestroyedHandler);
        sessions[key].addEventListener('streamDestroyed', streamDestroyedHandler);
      }
      console.log("Joining:" + room);
    }
  });
});
function initUser(player) {
  console.log("intiUser: Start");
  user = player;
  sessions[room].connect(globaldata.apikey, globaldata.tokens[room]);
  $('#rooms').text('Room: ' + room);
  //set publishing options
  var pubOptions = {
    publishAudio: config.mic,
    publishVideo: config.video,
    height: 1,
    width: 1,
    name: user
  };
  publisher = TB.initPublisher(globaldata.apikey, "publisherContainer", pubOptions);
  console.log('OpenTOK url: ' + '/api/' + '001/' + user + '/' + currentRoom);
  console.log('initUser End: ' + player);
}

function RoomChange(newRoom) {
  //This is where the vivox session disconnect and connect code should go.
  console.log('RoomChange: ' + newRoom);
  //If room acutally changes switch
  if (newRoom != currentRoom) {
    unpublish(currentRoom);
    sessions[currentRoom].disconnect();
    sessions[newRoom].connect(globaldata.apikey, globaldata.tokens[newRoom]);
    currentRoom = newRoom;
    $('#rooms').text('Room: ' + currentRoom);
  }
  console.log('RoomChange End');
}
//mute myself
function MicMute(mute) {
  console.log('MicMute: ' + mute);
  toggleAudio(!mute);
}
//mute other people
function SetVolume(newVolume) {
  console.log('SetVolume: ' + isMuted);
  $('#video').volume = newVolume;
}
