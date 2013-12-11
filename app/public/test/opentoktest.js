
  $(document).ready(function() {
      console.log("ready!");
      //Maybe declare all sessions when ready with event handlers.
      //Then join various sessions on click
      room = "room1";
      world = "001";
      currentRoom = room;
      $.ajax({
          dataType: "json",
          url: "/api/" + world + "/" + user + "/" + room,
          success: function(data) {
              globaldata = $.extend({},  data);
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
          //disconnect from previous room
          sessions[currentRoom].disconnect();
          $("#devicePanelContainer").prepend("<div id='publisherContainer' />");
          //connect to new room
          currentRoom = event.target.id;
          console.log("room: " + event.target.id);
          console.log("token: " + globaldata.tokens[event.target.id]);
          console.dir(sessions[event.target.id]);
          sessions[event.target.id].connect(globaldata.apikey,globaldata.tokens[event.target.id]);
          $("#rooms").text($(event.target).text());
      });
  });

   
