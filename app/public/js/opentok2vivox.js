//Vivox functions that could be called by or have been called from unity web player
var prevRoom = '';
var session;
var room = 'unassigned';
var user;
var gData;
//initial vars
var vvxHandle = {};
vvxHandle = {
  '_accounts': {
    '15b642c2-19ed-44aa-80be-e171202a03f3': {
      'AccountHandle': '15b642c2-19ed-44aa-80be-e171202a03f3',
      'Uri': 'sip:.90b11c633f65_2013102314160476785300.@regp.vivox.com',
      'DisplayName': 'Rick%20Support',
      'IsAnonymousLogin': true,
      'State': '1',
      'WavDestinationPath': 'C:\\Users\\rianders\\Documents\\'
    }
  }
};
//var voiceChannelAddress = "sip:confctl-158@regp.vivox.com";
var isLoggingIn = true;
var opentokdivs = '<div id="devicePanelContainer"></div>\n<div id="publisherContainer"></div>\n<div id="streamsContainer"></div>';

//functino from vivox
function VivoxUnityInit() {
  //If possible this is where the OpenTok init code should go
  console.log('VivoxUnityInit');
  console.log('VivoxUnityInit: Start');
  var callbackFunctions = {
      onConnected: vivoxConnected,
      onParticipantAdded: ParticipantAdded,
      onParticipantRemoved: ParticipantRemoved,
      onParticipantUpdated: ParticipantUpdated,
      onVersionCheck: VersionCheck
    };
  console.log('VivoxUnityInit: Callback functions success');
  console.log('VivoxJoinedRoom:start');
  GetUnity().SendMessage('VivoxHud', 'VivoxJoinedRoom', '');
  console.log('VivoxJoinedRoom:end');
  //GetUnity().SendMessage("RaiseHand", "VivoxJoinedRoom", "");
  //triggers vivoxLogin event and assigns user name
  GetUnity().SendMessage('VivoxHud', 'onVivoxConnected', 'Connected to Vivox network!');
  console.log('VivoxUnityInit: end');
}

function VersionCheck(event) {
  console.log('VersionCheck event' + event);
}

function vivoxConnected(Event) {
  console.log('vivoxConnected: ' + Event);
}

function HandleMuting(isMuted) {
  console.log('HandleMuting: ' + isMuted);
}

function VivoxLogin(player) {
  user = player;
  if (isLoggingIn) {
    isLoggingIn = false;
    $.ajax({
      dataType: 'json',
      url: '/api/' + world + '/' + user + '/' + room,
      success: function (data) {
        globaldata = $.extend({}, data);
        sessions = data.sessions;
        for (key in sessions) {
          console.log('Key: ' + key + ' data: ' + data.sessions[key].sessionId);
          var session = TB.initSession(data.sessions[key].sessionId);
          sessions[key] = session;
          sessions[key].addEventListener('sessionConnected', sessionConnectedHandler);
          sessions[key].addEventListener('streamCreated', streamCreatedHandler);
        }
        sessions[room].connect(globaldata.apikey, globaldata.tokens[room]);
        $('#rooms').text('Room: ' + room);
      }
    });
  }
  console.log('OpenTOK url: ' + '/api/' + '001/' + user + '/' + currentRoom);
  console.log('VivoxLoginEnd: ' + player);
}

function SwitchToChannel(newChannel) {
  //This is where the vivox session disconnect and connect code should go.
  prevRoom = currentRoom;
  console.log('prevRoom: ' + prevRoom);
  console.log('SwitchToChannel: ' + newChannel);
  //Determine if there is a new room
  GetUnity().SendMessage('VivoxHud', 'UpdateCurrentChannel', newChannel);
  if (newChannel == 'sip:confctl-592@regp.vivox.com') {
    console.log('Management: room3');
    currentRoom = 'room3';
  }
  if (newChannel == 'sip:confctl-593@regp.vivox.com') {
    console.log('Union: room1');
    currentRoom = 'room1';
  }
  if (newChannel == 'sip:confctl-591@regp.vivox.com') {
    console.log('Negotiation: room2');
    currentRoom = 'room2';
  }
  //If room acutally changes switch
  if (prevRoom != currentRoom) {
    sessions[prevRoom].disconnect();
    $('#opentok').append('<div id=\'publisherContainer\' />');
    sessions[currentRoom].connect(globaldata.apikey, globaldata.tokens[currentRoom]);
    $('#rooms').text('Room: ' + currentRoom);
  }
  console.log('SwitchToChannelComplete');
}

function installLocation() {
  console.log('installLocation');
}
function VivoxInstall() {
  console.log('VivoxInstall');
}
function vivoxCompletedLogin(Response) {
  console.log('vivoxCompletedLogin: ' + Response);
}
function ParticipantAdded(event) {
  console.log('ParticipantAdded: ' + event);
}
function ParticipantRemoved(event) {
  console.log('ParticipantRemoved: ' + event);
}
function ParticipantUpdated(event) {
  console.log('ParticipantUpdated: ' + event);
}
function VivoxCreateChannel(channelName) {
  console.log('VivoxCreateChannel: ' + channelName);
}
function vivoxChannelCreate(Response) {
  console.log('vivoxChannelCreate: ' + Response);
}
function VivoxJoinChannel(channelURI, fontId) {
  console.log('VivoxJoinChannel: ' + channelURI + ' fintId: ' + fontId);
}
function VivoxLogout(channelURI) {
  console.log('VivoxLogout: ' + channelURI);
  //added commented out vivox onvivoxlogout
  GetUnity().SendMessage('VivoxHud', 'onVivoxLogout');
}
function vivoxCompletedLogout(Response) {
  console.log('vivoxCompletedLogout: ' + Response);
}
function VivoxMicMute(mute) {
  console.log('VivoxMicMute: ' + mute);
}
function vivoxMicMuteResult(response) {
  console.log('vivoxMicMuteResult: ' + response);
}
