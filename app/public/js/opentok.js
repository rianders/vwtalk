    var currentRoom;
    var room = "room1";
    var user;
    var sessions = {};
    var globaldata;
    var publisher;

    TB.setLogLevel(TB.DEBUG);
  

    function subscribeToStreams(streams) {
        console.log("subscribeToStreams");
        /* orig
        for (var i = 0; i < streams.length; i++) {
            var stream = streams[i];
            if (stream.connection.connectionId != sessions[room].connection.connectionId) {
                sessions[room].subscribe(stream);
            }
        }
        */
        
         for (var i = 0; i < streams.length; i++) {
        // Make sure we don't subscribe to ourself
        if (streams[i].connection.connectionId ==  sessions[room].connection.connectionId) {
          return;
        }

        // Create the div to put the subscriber element in to
        var div = document.createElement('div');
        div.setAttribute('id', 'stream' + streams[i].streamId);
        document.body.appendChild(div);

        // Subscribe to the stream
         sessions[room].subscribe(streams[i], div.id);
      }
        
    }

    function streamCreatedHandler(event) {
        console.log("stremCreateHandler");
        subscribeToStreams(event.streams);
    }
       function sessionConnectedHandler(event) {
        console.log("sessionConnectedHandler");
        
        // Create publisher and start streaming into the session
        var publisher = TB.initPublisher(event.apikey, 'myPublisherDiv');
        sessions[room].publish(publisher);

        // Subscribe to streams that were in the session when we connected
        subscribeToStreams(event.streams);
    }

  $(document).ready(function() {
        console.log("ready!");

         $(".disconnect").click(function(event) {
             sessions[currentRoom].disconnect();
             console.log("Disconnect: " + sessions[currentRoom]);
         });
         
        $(".session").click(function(event) {
            room = event.target.id;
            world = "001";
            currentRoom = room;
            user = $("#username").val();
            $.ajax({
                dataType: "json",
                url: "/api/" + world + "/" + user + "/" + room,
                success: function(data) {
		                console.log("Data: " + JSON.stringify(data));
                        var session = TB.initSession(data.sessionId);
                        sessions[room] = session;
                        sessions[room].connect(data.apikey, data.token);
                        sessions[room].addEventListener("sessionConnected", sessionConnectedHandler);
                        sessions[room].addEventListener("streamCreated", streamCreatedHandler);
                }
            });
        });
    });

    
