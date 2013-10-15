/*
*
* Copyright (c) 2009 by Vivox Inc.
*
* Permission to use, copy, distribute this software for any purpose is allowed
* only in conjunction with the use of Vivox Services and in all cases must
* include this notice.
*
* THE SOFTWARE IS PROVIDED "AS IS" AND VIVOX DISCLAIMS
* ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL VIVOX
* BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL
* DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR
* PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
* ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
* SOFTWARE.
*/
/**
* @copyright 2010 Vivox Inc. All Rights Reserved.
* @author jason leggett
*/
    console.log("VivoxUnity.js: start loading");
    
var vvxHandle = null;
var voiceChannelAddress = "sip:confctl-158@regp.vivox.com";
var isLoggingIn = false;
//this is called from withing unity to starup the plugin and create the voice object, note not all 
//callbacks are set below just the ones we useed.
function VivoxUnityInit() {
    console.log("VivoxUnityInit: Start");
    var callbackFunctions = {
        onConnected: vivoxConnected
				 , onParticipantAdded: ParticipantAdded
				 , onParticipantRemoved: ParticipantRemoved
				 , onParticipantUpdated: ParticipantUpdated
				 , onVersionCheck: VersionCheck
    };
    console.log("VivoxUnityInit: Callback functions success");
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
}

//this is returned after creating the voice object so user can take appropriate action
function VersionCheck(event) {
    console.log("VersionCheck: Start");
    //// alert("VersionCheck result: " + event.StatusCode);
    switch (event.StatusCode) {
        case Vivox.OK:
            console.log("VersionCheck: Everything's ok");
            return;
        case Vivox.INSTALL_REQUIRED:
            //GetUnity().SendMessage("VivoxHud", "onVersionCheck", "0:You need to install the Vivox plugin to enjoy Voice chat.");
            return;
        case Vivox.UPGRADE_REQUIRED:
	    console.log("Vivox upgrade needed: " + event.StatusCode);
	    console.dir(event);
            //GetUnity().SendMessage("VivoxHud", "onVersionCheck", "0:You need to upgrade your Vivox plugin to enjoy Voice chat.");
            return;
        case Vivox.OS_NOT_SUPPORTED:
            //GetUnity().SendMessage("VivoxHud", "onVersionCheck", "1:Your operating system is not compatible with Vivox Voice.");
            return;
        case Vivox.BROWSER_NOT_SUPPORTED:
            console.log("VersionCheck: Browser not supported");
            //GetUnity().SendMessage("VivoxHud", "onVersionCheck", "1:Your browser is not yet supported by Vivox Voice.");
            return;
    }
}

//callback when connection to vivox is established
function vivoxConnected(Event) {
    //alert("connected");
    console.log("vivoxConnected : sending message to unity of connection");
    GetUnity().SendMessage("VivoxHud", "onVivoxConnected", "Connected to Vivox network!");
}

function HandleMuting(isMuted) {
    if(isMuted=="True")
    {
        vvxHandle.setLocalSpeakerMute(true);
    }
    else
    {
        vvxHandle.setLocalSpeakerMute(false);
    }    
}    
//called from unity and is passed in the player name. You can modify this to accept a passwor to login normally instead of anonymously
function VivoxLogin(player) {
    player = encodeURI(player);
    // alert("Logged in");
    console.log("VivoxLogin: Start");
    if (vvxHandle.isLoggedIn()) {
        console.log("VivoxLogin: isloggedin() true");
        return;
    }
    vvxHandle.anonymousLogin(player, vivoxCompletedLogin);
    $("#VivoxOnlineUsers").append("Negotiation");
    //vvxHandle.login("username","password" vivoxCompletedLogin);
    console.log("VivoxLogin: End");
}
function SwitchToChannel(newChannel) {
    console.log("Switching Vivox Channels!");
    if(!isLoggingIn && newChannel!=voiceChannelAddress) //prevent multiple channel switches from happening simultaneously
    {
        isLoggingIn=true;
        vvxHandle.endSession(voiceChannelAddress);
        clearVivoxUsers();
        vvxHandle.startSession(newChannel);
        voiceChannelAddress=newChannel;
        //adjusting the online users tab in the sidebar
        if(voiceChannelAddress=="sip:confctl-158@regp.vivox.com")
        {
            $("#VivoxOnlineUsers").append("Negotiation");
        }
        else if(voiceChannelAddress=="sip:confctl-157@regp.vivox.com")
        {
            $("#VivoxOnlineUsers").append("Management");
        }
        else
        {
            $("#VivoxOnlineUsers").append("Union");
        }    
        GetUnity().SendMessage("VivoxHud", "UpdateCurrentChannel", newChannel);
    }
}
//function to determine correct download location of the plugin based on browser and os. This may not be used if packaging plugin //install with main install of game
function installLocation() {
    try {
        var install_location = "#";
        var win = (navigator.platform.indexOf("Win") != -1);
        var mac = (navigator.platform.indexOf("Mac") != -1);
        if (navigator.userAgent.indexOf("MSIE") != -1) {
            install_location = "http://code.vivox.com/downloads/VivoxDownloader-1.18.3.4133.exe";

        } else if (navigator.userAgent.indexOf("Firefox") != -1) {
            var ppc = (navigator.oscpu.indexOf("PPC") != -1);
            if (!ppc) {
                if (mac) {
                    install_location = "http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133-Darwin.signed.xpi";
                } else {
                    install_location = "http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133-win32.signed.xpi";
                }
            } else {

            }
        } else if (navigator.userAgent.indexOf("Chrome") != -1) {

            install_location = "http://code.vivox.com/downloads/VivoxDownloader-1.18.3.4133.exe";

        } else if (navigator.userAgent.indexOf("Safari") != -1) {

            if (mac) {
                install_location = "http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133.pkg";
            } else {
                install_location = "http://code.vivox.com/downloads/VivoxDownloader-1.18.3.4133.exe";
            }

        }
        return install_location;

    } catch (e) {

    }
}

//can be called from unity to start download process. Works in firefox and ie but may be more efficent way of doing this
function VivoxInstall() {
    // alert("vivox install");
    var install_location = installLocation();
    try {
        var installDiv = document.getElementById("VivoxInstall");
        var installLink = document.createElement("a");
        installLink.href = installLocation();
        installLink.title = "Vivox Install";

        var installText = document.createTextNode("Install Vivox");

        installLink.appendChild(installText);
        installDiv.appendChild(installLink);

        //window.top.location.replace(install_location);   
    } catch (e) {
    }
}

//callback to unity for completed login
function vivoxCompletedLogin(Response) {
    console.log("vivoxCompletedLogin: Start");
    //alert("completed login");
    if (Response.Success) {
        console.log("vivoxCompletedLogin: response Success");
        vvxHandle.setLocalMicMute("false"); //we want the mic to start off unmuted
        //GetUnity().SendMessage("VivoxHud", "onVivoxLogin", "Logged into the Vivox network!");
    } else {
        console.log("vivoxCompletedLogin: response failure");
        return;
    }
}

function ParticipantAdded(event) {
    console.log("ParticipantAdded: start");
    //alert("participant added");
    /* A participant was added to the channel */
    var uri = event.Participant.Uri;
    var displayName = event.Participant.DisplayName;
    var session_uri = event.SessionUri;
    //GetUnity().SendMessage("VivoxHud", "VivoxParticipantAdded", displayName);
    vvxHandle.unmuteChannelUserAudio(session_uri, uri);
    if(event.Participant.DisplayName==vvxHandle.getAccount().DisplayName)
    {
        console.log("Finished joining room");
        isLoggingIn=false;
        GetUnity().SendMessage("VivoxHud", "VivoxJoinedRoom", "");
        GetUnity().SendMessage("RaiseHand", "UpdateHandRaisers", "");
    }
    addToVivoxUsers(event.Participant.DisplayName);
    if(event.Participant.IsSpeaking) {
        var img = "<img src=" + "speaking.png width=12px height=12px" + ">";
        vivoxUserSpeaking(event.Participant.DisplayName, img);
    }
    else {
        var img = "<img src=" + "quiet.png width=12px height=12px" + ">";
        vivoxUserSpeaking(event.Participant.DisplayName, img);
    }
    console.log("Added to online users");
}

function ParticipantRemoved(event) {
    // alert("participant removed");
    /* A participant was added to the channel */
    var uri = event.Participant.Uri;
    var displayName = event.Participant.DisplayName;
    removeFromVivoxUsers(event.Participant.DisplayName);
    //GetUnity().SendMessage("VivoxHud", "VivoxParticipantRemoved", displayName);

}
//a participant was updated in some way here we are only looking at the speaking indicator
function ParticipantUpdated(event) {
    //alert("participant updated");
    var uri = event.Participant.Uri;
    var displayName = event.Participant.DisplayName;
    if (displayName == null) {
        console.log("Display name was null");
        displayName = uri;
    }
    var speaking = event.Participant.IsSpeaking;
    if(event.Participant.IsSpeaking) {
        var img = "<img src=" + "speaking.png width=12px height=12px" + ">";
        vivoxUserSpeaking(event.Participant.DisplayName, img);
    }
    else {
        var img = "<img src=" + "quiet.png width=12px height=12px" + ">";
        vivoxUserSpeaking(event.Participant.DisplayName, img);
    }
    var combo = displayName + ":" + speaking;
    //GetUnity().SendMessage("VivoxHud", "VivoxParticipantIsSpeaking", combo);
}

//can be called by unity to create a channel, note with anonymousLogin player will not have permissions to create a channel
function VivoxCreateChannel(channelName) {
    // alert("create channel " + channelName);
    // RG: Added following line to pick up name of channel from Unity
    console.log("VivoxCreateChannel: Start");
    voiceChannelAddress = channelName;
    vvxHandle.createChannel({ ChannelName: channelName }, vivoxChannelCreate);
    console.log("VivoxCreateChannel: End");
}

function vivoxChannelCreate(Response) {
    if (Response.Success) {
        //GetUnity().SendMessage("VivoxHud", "onVivoxChannelCreate", Response.ChannelURI);
    } else {
        //with anonymousLogin player will not have permissions to create a channel so connecting to an Ephemeral channel
        //GetUnity().SendMessage("VivoxHud", "onVivoxChannelCreate", voiceChannelAddress);
        //GetUnity().SendMessage("VivoxHud", "onVivoxChannelCreate", "Error:" + Response.StatusCode);
    }
}

//can be called from unity to connect to a channel using the channel uri and a fontid. 0 for fontid is no font
function VivoxJoinChannel(channelURI, fontId) {
    //alert("channel join " + channelURI);
    console.log("VivoxJoinChannel: Start");
    vvxHandle.startSession(channelURI, {
        fontId: 0
    });
}

function VivoxLogout(channelURI) {
    console.log("VivoxLogout: Start");
    vvxHandle.endSession(channelURI);
    vvxHandle.logout();
    vvxHandle.unsetCallbacks();
    clearVivoxUsers();
    channelURI="sip:confctl-158@regp.vivox.com";
    console.log("a");
    console.log("VivoxLogout: End");
}
function vivoxCompletedLogout(Response) {
    if (Response.Success) {
        //    GetUnity().SendMessage("VivoxHud", "onVivoxLogout");
        // alert("logged out");
    }
}

function VivoxMicMute(mute) {
    if(mute == "False")
    {
        vvxHandle.setLocalMicMute(false);
    }
    else
    {
        vvxHandle.setLocalMicMute(true);
    }    
    /*if (mute == "True") {
        vvxHandle.setLocalMicMute(1, vivoxMicMuteResult);
    }
    else {
        vvxHandle.setLocalMicMute(0, vivoxMicMuteResult);
    }*/
}

function vivoxMicMuteResult(response) {
    //alert(response);
}

console.log("VivoxUnity.js: end loaded");
