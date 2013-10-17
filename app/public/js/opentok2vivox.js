
//Vivox functions that could be called by or have been called from unity web player

//initial vars
var vvxHandle = {};
//var voiceChannelAddress = "sip:confctl-158@regp.vivox.com";
var isLoggingIn = false;


//functino from vivox

function VivoxUnityInit() {
    console.log("VivoxUnityInit");
    console.log("VivoxUnityInit: Start");
    var callbackFunctions = {
        onConnected: vivoxConnected
				 , onParticipantAdded: ParticipantAdded
				 , onParticipantRemoved: ParticipantRemoved
				 , onParticipantUpdated: ParticipantUpdated
				 , onVersionCheck: VersionCheck
    };
    console.log("VivoxUnityInit: Callback functions success");
    //vvxHandle not enabled
    /*
    vvxHandle = new Vivox.API('https://www.regp.vivox.com/api2/',
				{
				    callbacks: callbackFunctions,
				    //autoDownload: false,
				    pluginVersion: '0.0.0',
				    channelUri: voiceChannelAddress,
				    //ephemeralId: voiceChannelAddress
				});
				console.log("VivoxUnityInit: Finished!" + vvxHandle);
    // alert("Init!");
    */
    
    }

function VersionCheck(event) {
    console.log("VersionCheck event" + event);
}

function vivoxConnected(Event) { console.log("vivoxConnected: " + Event ); }

function HandleMuting(isMuted) { console.log("HandleMuting: " + isMuted); }

function VivoxLogin(player) { console.log("VivoxLogin: " + player); }

function SwitchToChannel(newChannel) { console.log("SwitchToChannel: " + newChannel); }

function installLocation() { console.log("installLocation"); }

function VivoxInstall() { console.log("VivoxInstall"); }

function vivoxCompletedLogin(Response) { console.log("vivoxCompletedLogin: " + Response); }

function ParticipantAdded(event) { console.log("ParticipantAdded: " + event); }

function ParticipantRemoved(event) { console.log("ParticipantRemoved: " + event); }

function ParticipantUpdated(event) { console.log("ParticipantUpdated: " + event); }

function VivoxCreateChannel(channelName) { console.log("VivoxCreateChannel: " + channelName); }

function vivoxChannelCreate(Response) { console.log("vivoxChannelCreate: " + Response); }

function VivoxJoinChannel(channelURI, fontId) { console.log("VivoxJoinChannel: " + channelURI + " fintId: " + fontId); }

function VivoxLogout(channelURI) { console.log("VivoxLogout: " + channelURI); }

function vivoxCompletedLogout(Response) { console.log("vivoxCompletedLogout: " + Response); }

function VivoxMicMute(mute) { console.log("VivoxMicMute: " + mute ); }

function vivoxMicMuteResult(response) { console.log("vivoxMicMuteResult: " + response); }
