    var currentRoom;
    var room = "room1";
    var user;
    var sessions = {};
    var globaldata = {};
    var publisher;
    var isMicOn = true;
	var sessionToJoinOnStart;
	
    TB.setLogLevel(TB.DEBUG);
  
function subscribeToStreams(streams) {
    console.log("subscribeToStreams");

    for (var ii = 0; ii < streams.length; ii++) {
        console.log("stream ii: " + streams.length + ", StreamName: " + streams[ii].name);
        // Make sure we don't subscribe to ourself
        if (streams[ii].connection.connectionId == sessions[room].connection.connectionId) {
            return;
        }

        // Create the div to put the subscriber element in to
        var div = document.createElement('div');
        div.setAttribute('id', 'stream' + streams[ii].streamId);
        var streamsContainer = document.getElementById('streamsContainer');
        streamsContainer.appendChild(div);

        var subProperties = new Object();
        subProperties.height = 100;
        subProperties.width = 128;
        subProperties.style = {};
        subProperties.style.nameDisplayMode = "on";

        var subscriber = sessions[room].subscribe(streams[ii], 'stream' + streams[ii].streamId, subProperties);

    }

}

    function streamCreatedHandler(event) {
        console.log("streamCreateHandler");
        subscribeToStreams(event.streams);
    }
    function sessionConnectedHandler(event) {
        console.log("sessionConnectedHandler");//: cnt:  " +  event.connections.length);

        // Create publisher and start streaming into the session
        var div = document.createElement('div');
        div.setAttribute('id', 'publisher');

        var publisherContainer = document.getElementById('publisherContainer');
        // This example assumes that a publisherContainer div exists
        publisherContainer.appendChild(div);


        var publisher = TB.initPublisher(event.apikey, publisherContainer, {
            height: 128,
            width: 128,
            name: user
        });
        sessions[room].publish(publisher);

        // Subscribe to streams that were in the session when we connected
        subscribeToStreams(event.streams);
        }

  $(document).ready(function() {
      console.log("ready!");
      //Maybe declare all sessions when ready with event handlers.
      //Then join various sessions on click
      room = "room1";
      world = "001";
      currentRoom = room;
      user = $("#username").val();
      $.ajax({
          dataType: "json",
          url: "/api/" + world + "/" + user + "/" + room,
          success: function(data) {
              globaldata = data;
              sessions = data.sessions;

              for (key in sessions) {
                  console.log("Key: " + key + " data: " + data.sessions[key].sessionId);
                  var session = TB.initSession(data.sessions[key].sessionId);
                  sessions[key] = session;
                  sessions[key].addEventListener("sessionConnected", sessionConnectedHandler);
                  sessions[key].addEventListener("streamCreated", streamCreatedHandler);
              }
          }
      });
  
      $(".disconnect").click(function(event) {
          sessions[currentRoom].disconnect();
          //disconnect kills the div the publisher is in
          $("#devicePanelContainer").prepend("<div id='publisherContainer' />");
          console.log("Disconnect Room: " + currentRoom);
      });
  
      $(".connect").click(function(event) {
          //console.log(sessions);
          console.log("room: " + event.target.id);
          console.log("token: " + globaldata.tokens[event.target.id]);
          console.dir(sessions[event.target.id]);
          sessions[event.target.id].connect(globaldata.apikey,globaldata.tokens[event.target.id]);
          $("#rooms").val(event.target.id);
      });
  });

    
