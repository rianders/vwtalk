/*
/*
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
 * @author Vivox, Inc
 * @version 2.0.0
 * @projectDescription This file (vivoxVoice.class.js) contains a class that wraps the vivoxVoice plug in.
 * @copyright 2010 Vivox Inc. All Rights Reserved.
 *
 * $Id: VivoxVoiceAPI.js 4167 2011-06-07 20:36:19Z bjoseph $
 *  
 */

(function () {

    var default_config = {
        anonymous : false,      // {bool} login anonymously (as options.username)
        username : null,
        password : null,

        channelUri : null,      // auto join specified channel uri
        ephemeralId : null,   // auto join ephemeral channnel based on this id

        appName : null,        // Name applied to menu item in system tray

        callbacks : null,       // convenience, same as setCallbacks()

        logger : null,          // fn reference to send log message:  function log(msg, type)
        debug : {               // what types of log messages to recieve, boolean flags.  "all" enables everything.
            info : true,
            warn : true,
            debug : false,
            error : true,
            api : false,        // xml messages
            state : false,      // dump state after changing account, participant, etc objects
            all: false          // log everything, ignore types
        },

        autoStart : true,       // automatically start the plugin
        autoDownload : true,    // start download if install required
        autoConnect : true,     // automatically start the connect sequence

        embedTarget : null,      // DOM node where object tag will be written, defaults to document body
        writeObjectTag : true,  // automatically adds the plugin object tag to the page
        objectId : null,        // Use objectId instead of generating an id for the script object

        // required minimum plugin/sdk version and install/upgrade locations
        pluginVersion: "1.18.0",
		
		vvxInstallLocationWin : 'http://code.vivox.com/downloads/VivoxDownloader-1.18.3.4133.exe',
		vvxInstallLocationMac : 'http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133.pkg',
		vvxInstallLocationWinFF : 'http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133-win32.signed.xpi',
		vvxInstallLocationMacFF : 'http://code.vivox.com/downloads/VivoxWebVoice-1.18.3.4133-Darwin.signed.xpi'

    };

    window.Vivox = {

        // Participant Roles
        PARTICIPANT_USER      : 'participant_user',
        PARTICIPANT_MODERATOR : 'participant_moderator',
        PARTICIPANT_OWNER     : 'participant_owner',

        // Audio & Text States
        TEXT_STATE_CONNECTING       : "TextStateConnecting",
        TEXT_STATE_CONNECTED        : "TextStateConnected",
        TEXT_STATE_DISCONNECTED     : "TextStateDisconnected",
        AUDIO_STATE_CONNECTING      : "AudioStateConnecting",
        AUDIO_STATE_CONNECTED       : "AudioStateConnected",
        AUDIO_STATE_DISCONNECTED    : "AudioStateDisconnected",
        AUDIO_STATE_INCOMING        : "AudioStateIncoming",

        // Account Login State
        ACCOUNT_STATE_LOGGED_OUT   : "0",
        ACCOUNT_STATE_LOGGED_IN    : "1",
        ACCOUNT_STATE_LOGGING_IN   : "2",
        ACCOUNT_STATE_LOGGING_OUT  : "3",

        // Service Availability State
        AVAILABILITY_STATE_READY       : 1,
        AVAILABILITY_STATE_STARTING    : 0,
        AVAILABILITY_STATE_UNAVAILABLE : -1,

        // participantRemoved
        REMOVED_REASON_LEFT :  "RemovedReasonLeft",
        REMOVED_REASON_TIMEOUT : "RemovedReasonTimedout",
        REMOVED_REASON_BANNED : "RemovedReasonBanned",
        REMOVED_REASON_KICKED : "RemovedReasonKicked",

        // Voice Connection State
        CONNECTION_STATE_CONNECTED : "1",

        // Playback - TBD
        // "AuxBufferAudioRender"

        // Common error codes:
        ERROR_UNKNOWN_ACCOUNT         : "21600",
        ERROR_MISSING_PASSWORD        : "1009",    // "Invalid credentials."
        ERROR_WRONG_CREDENTIALS       : "20200",

        // Common response error types
        CONNECTOR_CREATE  : 'Connector.Create.1',
        DIAGNOSTIC_DUMP   : 'Aux.DiagnosticStateDump.1',
        LOGIN             : 'Account.Login.1',

        // Channel Modes
        CHANNEL_MODE_NORMAL : 1,
        CHANNEL_MODE_PRESENTATION : 2,
        CHANNEL_MODE_LECTURE : 3,
        CHANNEL_MODE_OPEN : 4,

        // Channel Spacial Types
        CHANNEL_TYPE_NORMAL : 0, 
        CHANNEL_TYPE_POSITIONAL : 2,

        /* Channel Errors:
        None
        OperationFailed
        InvalideUri
        NotValidInP2P
        InvalidSyntax
        SessionAlreadyActive
        TextNotEnabled
        AccessDenied
        UriNotFound
        MessageNotDelivered
        Max
        */

        // Plugin detection
        OS_NOT_SUPPORTED        : "osNotSupported",
        BROWSER_NOT_SUPPORTED   : "browserNotSupported",
        UPGRADE_REQUIRED        : "upgradeRequired",
        INSTALL_REQUIRED        : "installRequired",
        ACTIVE_X_REQUIRED       : "activeXRequired",
        ACTIVE_X_ERROR          : "activeXError",
        OK                      : "ok"
    };

    Vivox.API = function (account_server, options) {
        this.init(account_server, options);
    };

    Vivox.API.prototype = {
        init : function (account_server, options) {
            this._connector = null;
            this._accounts = {};
            this._sessions = {};
            this._participants = {};
            this._callbacks = [];
            this._localEventListeners = {};

            this._accountHandle = null; // for single-account mode

            if( ! account_server ){
                throw "Account Server is not defined.";
            }
            this._accountService = account_server;
            
            this._debug = options.debug || default_config.debug;
            this._logger = options.logger;
            this._config = default_config;
            for( var o in options ){
                if( !(o in this._config) ){
                    throw new Vivox.Error("configError", 'Unrecognized option: ' + o);
                }
                this._config[o] = options[o];
            }


            // listen to passed in callbacks/events
            if( options.callbacks ){
                this.setCallbacks(options.callbacks);
            }

            this._startup();
        },

        _startup : function () {

            // write out the object tag into the page
            if( this._installCheck() != Vivox.OK){
                return;
            }

            // on successful first install, we can get away with just a refresh

            if( this._installing ){
                clearInterval( this._installing );
                this._installing = null; 
            }

            this._objectId = this._config.objectId || nextObjectId();

            // if some version installed, write out so we can get version
            if( this._config.writeObjectTag ){
                this.writeObjectTag( this._config.embedTarget );
            }

            if( ! this.getPlugin() ){
                throw new Vivox.Error("noScriptObject", 'Unable to locate script object.');                 
            }

            // check we have min required version
            if( this._versionCheck() != Vivox.OK ){
                return;
            }


            // listen for plugin-in messages
            this._addScriptObjectListeners();

            // we listen to some events for state management
            this._addStateListeners();

            // default is to auto start, but can be disabled
            if( ! this._config.autoStart ){
                return;
            }

            if( this._config.appName ) {
                this.startNamed( this._config.appName );
            }
            else {
                this.start();
            }

        },

        /**
         * @return {String} the generated object id tag
         * @param target_el  The target HTML Elment for appending the object tag
         */
        writeObjectTag : function ( target_el ) {
            // append to passed element, defaulting to document
            var el = target_el;
            if( ! target_el ){
                var body = document.getElementsByTagName("body")[0];
                el = document.createElement("div");
                body.appendChild(el);
            }

            switch( Vivox.BrowserDetect.browser ){
                case "Explorer":
                    el.innerHTML = '<OBJECT ID="' + this._objectId + '"'
                            + ' CLASSID="CLSID:17E9F5FA-FBFA-4F83-9445-63C86BF29E7D"'
                            + ' DATA="DATA:application/x-oleobject;BASE64,+vXpF/r7g0+URWPIa/KefQAIAADYEwAA2BMAAA==" '
                            + 'type="voice/x-vivox" HEIGHT=1 WIDTH=1></OBJECT>';
                    break;

                case "Safari":
                case "Chrome":
                case "Firefox":
                    el.innerHTML += '<OBJECT ID="' + this._objectId + '"'
                            + ' type="voice/x-vivox" HEIGHT=1 WIDTH=1></OBJECT>';
                    break;
                default:
            }

        },

        _installCheck : function () {
            var o = this._config;
            var b = Vivox.BrowserDetect.browser;
            var status = this.detectPluginSupport();

            // if somehow not supported
            if( status != Vivox.OK ){
                this._fireEvent("onVersionCheck", [{
                    "@type": "VersionCheckEvent",
                    InstalledVersion: null,
                    RequiredVersion: this._config.pluginVersion,
                    StatusCode : status
                }]);
                return status;
            }

            status = this.getPluginStatus();

            if( status == Vivox.OK ){
                this.info('Vivox Voice Plugin IS installed');
                // version checking happens later
                return Vivox.OK;
            }

            this.info('Vivox Voice Plugin IS NOT installed');

            // avoid firing while we're polling for a successful installation
            if( this._installing ){
                return;
            }

            this._fireEvent("onVersionCheck", [{
                "@type": "VersionCheckEvent",
                InstalledVersion: false,
                RequiredVersion: this._config.pluginVersion,
                StatusCode : Vivox.INSTALL_REQUIRED
            }]);

            // start download if requested
            if( status == Vivox.INSTALL_REQUIRED
                    && this._config.autoDownload ){
                this.startPluginInstall();
            }

            return status;
        },

        _versionCheck : function () {
            // getting version only works on 1.0.110 and up
            var haveVersion = this.getPluginVersion();

            // if no upgrade required
            if( this._versionMatch( haveVersion ) ){
                this._fireEvent("onVersionCheck", [{
                    "@type": "VersionCheckEvent",
                    InstalledVersion: haveVersion,
                    RequiredVersion: this._config.pluginVersion,
                    StatusCode : Vivox.OK
                }]);
                return Vivox.OK;
            }

            // upgrade required
            this._fireEvent("onVersionCheck", [{
                "@type": "VersionCheckEvent",
                InstalledVersion: haveVersion,
                RequiredVersion: this._config.pluginVersion,
                StatusCode : Vivox.UPGRADE_REQUIRED
            }]);

            // start download if requested
            if( this._config.autoDownload ){
                this.startPluginInstall();
            }

            return Vivox.UPGRADE_REQUIRED;
        },

        startPluginInstall : function () {
            var status = this.detectPluginSupport();

            if( status != Vivox.OK ){
                return;
            }

            var self = this;
            if(!( this._installing || this.isPluginInstalled() )){
                this._installing = setInterval( function () {
                    self._startup();
                }, 3*1000);
            }

            this._fireEvent("onInstall", [{
                "@type"     : "InstallEvent",
                StatusCode : status,
                RestartRequired : Boolean(Vivox.BrowserDetect.browser == "Firefox")
            }]);


            document.location = this._installUrl;            
        },

        isPluginInstalled : function () {
            return ( this.getPluginStatus() == Vivox.OK );
        },

        getPluginStatus : function () {
            // todo : make OS aware
            switch(Vivox.BrowserDetect.browser) {
                case "Explorer":
                    if(! window.ActiveXObject ){
                        this.error("ActiveX not enabled.");
                        return Vivox.ACTIVE_X_REQUIRED;
                    }
                    try {
                        new ActiveXObject('atlvivoxvoiceplugin.atlvivoxvoiceplugin');
                        return Vivox.OK;
                    }
                    catch (e) {}
                    return Vivox.INSTALL_REQUIRED;

                case "Firefox":
                case "Chrome":
                case "Safari":
                    navigator.plugins.refresh(false);
                    var i;
                    for( i = 0; i < navigator.plugins.length; i++ ){
                        if ((navigator.plugins[i].name == 'Vivox Voice Plugin' &&
                             navigator.plugins[i].filename == 'npvivoxvoiceplugin.dll') ||
                            navigator.plugins[i].filename == 'vivoxvoice.plugin') {
                            return Vivox.OK;
                        }
                    }
                    return Vivox.INSTALL_REQUIRED;

                default:
                    return Vivox.BROWSER_NOT_SUPPORTED;
            }
        },

        _versionMatch : function ( haveVersion ){
            var needVersion = this._config.pluginVersion;
            
            var have = this._parseVersionString( haveVersion );
            var need = this._parseVersionString( needVersion );

            for(var i = 0; i < 3; i++ ){
                if( have[i] > need[i] ){
                    return haveVersion;
                }
                if( have[i] < need[i] ){
                    return false;
                }
            }
            return haveVersion;
        },

        _parseVersionString : function ( version ){
            var a = version.split('.');
            return [ parseInt(a[0]), parseInt(a[1]), parseInt(a[2]) ];
        },

        detectPluginSupport : function () {
            var o = this._config;

            var browser = Vivox.BrowserDetect.browser;
            var os = Vivox.BrowserDetect.OS;

            if( os == "Windows" ){
                switch( browser ){
                    case "Explorer":
                    case "Chrome":
                    case "Safari":
                        this._installUrl = o.vvxInstallLocationWin;
                        break;
                    case "Firefox":
                        this._installUrl = o.vvxInstallLocationWinFF;
                        break;
                    default:
                        return Vivox.BROWSER_NOT_SUPPORTED;
                }
            }

            else if( os == "Mac" ){
                switch( browser ){
                    case "Safari":
                    case "Chrome":
                       this._installUrl = o.vvxInstallLocationMac;
                        break;
                    case "Firefox":
                        this._installUrl = o.vvxInstallLocationMacFF;
                        break;                
                    default:
                        return Vivox.BROWSER_NOT_SUPPORTED;
                }
            }

            else {
                return Vivox.OS_NOT_SUPPORTED;
            }

            return Vivox.OK;
        },

        /**
         * Registers system-initiated event listeners by assigning scope-preserving callback closure functions on the
         * script object. This is the plugin interface.
         * @private
         */
        _addScriptObjectListeners : function () {
            this._requestPrefix = generateShortGuid();
            this._requestCount = 0;
            this._requestStore = {};

            /* plug-in callbacks with closure for scope*/
            var self = this;
            this._scriptCallbacks = {

                // FF  for versions < 1.14.0
                vx_get_message : function (xml) {
                    self._messageHandler(xml);
                },

                // IE, and FF going forward
                onvx_get_message : function (xml) {
                    self._messageHandler(xml);
                },

                onTextStateChanged : function (account_handle, session_uri, text_state, status_code){
                    self._fireEvent("onTextStateChanged", [{
                        "@type" : 'TextStateChangedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        TextState : text_state,
                        StatusCode : status_code
                    }]);
                },

                onAudioStateChanged : function(account_handle, session_uri, audio_state, status_code){
                    self._fireEvent("onAudioStateChanged", [{
                        "@type" : 'AudioStateChangedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        AudioState : audio_state,
                        StatusCode : status_code
                    }]);
                },

                onParticipantAdded : function (account_handle, session_uri, json_participant){
                    var obj = xml2object( Vivox.utf8.decode(json_participant) );
                    self._fireEvent("onParticipantAdded", [{
                        "@type" : 'ParticipantAddedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        Participant : Vivox.Participant(obj.IParticipant)
                    }]);
                },

                onParticipantRemoved : function (account_handle, session_uri, participant_uri, removed_reason, json_participant){
                    var obj = xml2object( Vivox.utf8.decode(json_participant) );
                    self._fireEvent("onParticipantRemoved", [{
                        "@type": 'ParticipantRemovedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        ParticipantUri : participant_uri,
                        RemovedReason : removed_reason,
                        Participant : Vivox.Participant(obj.IParticipant)
                    }]);
                },

                onParticipantUpdated : function (account_handle, session_uri, json_participant){
                    var obj = eval('json='+ Vivox.utf8.decode(json_participant) );
                    self._fireEvent("onParticipantUpdated", [{
                        "@type": 'ParticipantUpdatedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        Participant : Vivox.Participant(obj.IParticipant)
                    }]);
                },

                onSessionUpdated : function(account_handle, session_uri, session_xml){
                    var obj = xml2object( Vivox.utf8.decode(session_xml) );
                    self._fireEvent("onSessionUpdated", [{
                        "@type": 'SessionUpdatedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        Session : Vivox.Session(obj.ISession)
                    }]);
                },

                onMessageReceived : function(account_handle, session_uri, participant_uri, message_body, message_header){
                    var participant = self.getParticipant(session_uri, participant_uri);
                    self._fireEvent("onMessageReceived", [{
                        "@type": 'MessageReceivedEvent',
                        AccountHandle : account_handle,
                        SessionUri : session_uri,
                        ParticipantUri : participant_uri,
                        Participant : participant,
                        MessageBody : Vivox.utf8.decode(message_body),
                        MessageHeader : message_header
                    }]);
                },

                onSendMsgCompleted : function(account_handle, token, error_code){
                    self._fireEvent("onSendMessageCompleted", [{
                        "@type": 'SendMsgCompletedEvent',
                        AccountHandle : account_handle,
                        RequestId : token,
                        ErrorCode : error_code
                    }]);
                },

                onSetVoiceFontCompleted : function(account_handle, token, error_code){
                    self._fireEvent("onSetVoiceFontCompleted", [{
                        "@type": 'SetVoiceFontCompletedEvent',                                                                                                
                        AccountHandle : account_handle,
                        RequestId : token,
                        ErrorCode: error_code
                    }]);
                },

                onRecordingFramesCaptured : function(account_handle, recording_handle, total_frames, frame_count, first_loop_frame, total_loop_frames){
                    self._fireEvent("onRecordingFramesCaptured", [{
                        "@type": 'RecordingFramesCapturedEvent',
                        AccountHandle : account_handle,
                        RecordingHandle : recording_handle,
                        TotalFrames : total_frames,
                        FrameCount : frame_count,
                        FirstLoopFrame : first_loop_frame,
                        TotalLoopFrames : total_loop_frames
                    }]);
                },

                onFramePlayed : function(account_handle, playback_handle, current_frame, last_frame){
                    self._fireEvent("onFramePlayed", [{
                        "@type" : "FramePlayedEvent",
                        AccountHandle : account_handle,
                        PlaybackHandle : playback_handle,
                        CurrentFrame : current_frame,
                        LastFrame : last_frame
                    }]);
                },

                onAudioInjectionCompleted : function(account_handle, injection_handle){
                    self._fireEvent("onAudioInjectionCompleted", [{
                        "@type" : "AudioInjectionCompletedEvent",
                        AccountHandle : account_handle,
                        InjectionHandle : injection_handle
                    }]);
                },

                onChannelError : function(account_handle, error_code, session_uri){
                    self._fireEvent("onChannelError", [{
                        "@type" : "ChannelErrorEvent",
                        AccountHandle : account_handle,
                        ErrorCode: error_code,
                        SessionUri: session_uri
                    }]);
                },

                onParticipantError : function(account_handle, error_code, session_uri, participant_uri){
                    self._fireEvent("onParticipantError", [{
                        "@type" : "ParticipantErrorEvent",
                        AccountHandle: account_handle,
                        ErrorCode: error_code,
                        SessionUri: session_uri,
                        ParticipantUri: participant_uri
                    }]);
                },

                onUnhandledError : function(account_handle, error_code, diagnostic_code, diagnostic_string, diagnostic_message_type){
                    self._fireEvent("onUnhandledError", [{
                        "@type" : "UnhandledErrorEvent",
                        AccountHandle: account_handle,
                        ErrorCode: error_code,
                        DiagnosticCode : diagnostic_code,
                        DiagnosticString : diagnostic_string,
                        DiagnosticMessageType : diagnostic_message_type
                    }]);

                },

                onRecordingStarted : function (account_handle, session_uri){
                    self._fireEvent("onRecordingStarted", [{
                        "@type" : "RecordingStartedEvent",
                        AccountHandle: account_handle,
                        SessionUri: session_uri
                    }]);
                },

                onRecordingStopped : function (account_handle, session_uri, frames){
                    self._fireEvent("onRecordingStopped", [{
                        "@type" : "RecordingStoppedEvent",
                        AccountHandle: account_handle,
                        SessionUri: session_uri,
                        Frames : frames
                    }]);
                },

                onRecordingSaveProgress : function (account_handle, session_uri, progress_value, progress_max){
                    self._fireEvent("onRecordingSaveProgress", [{
                        "@type" : "RecordingSaveProgressEvent",                                                                                                                        
                        AccountHandle: account_handle,
                        SessionUri: session_uri,
                        ProgressValue: progress_value,
                        ProgressMax: progress_max
                    }]);
                },

                onRecordingAllChannelsStarted : function (account_handle){
                    self._fireEvent("onRecordingAllChannelsStarted", [{
                        "@type" : "RecordingAllChannelsStartedEvent",
                        AccountHandle: account_handle
                    }]);
                },

                onRecordingAllChannelsStopped : function (account_handle, frames){
                    self._fireEvent("onRecordingAllChannelsStopped", [{
                        "@type" : "RecordingAllChannelsStoppedEvent",
                        AccountHandle: account_handle,
                        Frames : frames
                    }]);
                },

                onRecordingAllChannelsSaveProgress : function (account_handle, progress_value, progress_max){
                    self._fireEvent("onRecordingAllChannelsSaveProgress", [{
                        "@type" : "RecordingAllChannelsSaveProgressEvent",                                                                                                                        
                        AccountHandle: account_handle,
                        ProgressValue: progress_value,
                        ProgressMax: progress_max
                    }]);
                },

				onWavDestination : function (account_handle, path){
                    self._fireEvent("onWavDestination", [{
                        "@type" : "WavDestinationEvent",
                        AccountHandle: account_handle,
                        Path: path
                    }]);
                },

                // known typo in plugin callback name (cf: "availability")
                onServiceAvailablityStateChanged : function (state){
                    self._fireEvent("onServiceAvailabilityStateChanged", [{
                        "@type" : 'ServiceAvailabilityStateChangedEvent',
                        State: state
                    }]);
                },

                // ... except in IE where it's spelled right
                onServiceAvailabilityStateChanged : function (state){
                    self._fireEvent("onServiceAvailabilityStateChanged", [{
                        "@type" : 'ServiceAvailabilityStateChangedEvent',
                        State: state
                    }]);
                }
            };

            // attach the callbacks to plugin
            if( Vivox.BrowserDetect.browser == "Explorer" ){
                this.setupIEScriptObjectCallbacks();
            }
            else {
                this.setupScriptObjectCallbacks();
            }
        },


        /**
         * Listen for our own events to maintain various participant states. These should be used
         * only to catch direct plugin events (eg: participantAdded). To intercept app-driven function,
         * see handleResponseMessage().
         * @private
         */
        _addStateListeners : function () {
            this._localEventListeners = {

                onServiceAvailabilityStateChanged : function (event) {
                    switch (event.State) {
                        case Vivox.AVAILABILITY_STATE_READY:
                            if( this._config.autoConnect && ! this.getConnector() ) {
                                this._connect();
                            }
                            break;
                        case Vivox.AVAILABILITY_STATE_STARTING:
                        case Vivox.AVAILABILITY_STATE_UNAVAILABLE:
                            this._onDisconnected();
                    }
                },

                onParticipantAdded : function (event) {
                    if( event.Participant.IsMe ){
                        this.info('Joined session: ' + event.SessionUri);
                        this._onSessionStart(event);
                    }
                    this._setParticipant(event.AccountHandle, event.SessionUri, event.Participant.Uri, event.Participant);
                },

                onParticipantUpdated : function (event) {
                    this._setParticipant(event.AccountHandle, event.SessionUri, event.Participant.Uri, event.Participant);
                },

                onParticipantRemoved : function (event) {
                    this._setParticipant(event.AccountHandle, event.SessionUri, event.Participant.Uri);
                    
                    if( event.Participant.IsMe ){
                        this.info('Left session: ' + event.SessionUri);
                        this._fireEvent("onSessionEnd", [{
                            "@type"     : "SessionEndEvent",
                            SessionUri : event.SessionUri
                        }]);
                        
                        this._cleanupSessionCheck(event.SessionUri, event.AccountHandle);
                    }
                },

                onSessionUpdated : function (event) {
                    this._setSession(event.AccountHandle, event.Session.Uri, event.Session);
                },

                onTextStateChanged : function (event) {
                    this._cleanupSessionCheck(event.SessionUri, event.AccountHandle);
                },
                
                onAudioStateChanged : function (event) {
                    // if both text and audio are disconnected, clean up internal state
                    this._cleanupSessionCheck(event.SessionUri, event.AccountHandle);
                },

                onAccountLoginStateChange : function (event) {

                    if( !(event.StatusCode == "0" || event.StatusCode == "200") ){
                        return;
                    }

                    var account = this._setAccount({
                        AccountHandle : event.AccountHandle,
                        State : event.State
                    });

                    // in legacy mode state will be a string
                    var state = parseInt(account.State);
                    if( state == Vivox.ACCOUNT_STATE_LOGGED_IN ) {
                        this._onLoggedIn(account);
                    }
                    else if ( state == Vivox.ACCOUNT_STATE_LOGGED_OUT ) {
                        this._onLoggedOut(account);
                    }
                },
                
                onWavDestination : function (event) {
                    this._setAccount({
                        AccountHandle : event.AccountHandle,
                        WavDestinationPath : event.Path
                    })
                },
                onChannelError : function (event) {
                    this.error(event.SessionUri + ": " + event.ErrorCode, "error");
                }
            };            
        },

        /**
         * Connect Sequence
         */

        _connect: function (){
            // Step 1a: Check to see if authorized to run voice on this host
            this.owiAuth( Vivox.lib.getHostname(), this._onAuthComplete );
        },

        _onAuthComplete: function (results) {
            // Step 1b - prompt the user for authorization

            if ( results.Allow != 1){
                this.owiAuthListAllow( results.Url );
                return;
            }

            // Step 2a: Resume any existing connection
            this.dump(this._onDumpComplete);
        },

        _onDumpComplete: function(results){
            // Step 2b: Create a connection if one doesn't exist
            if( this.getConnector() ) {
                return;
            }

            this.info("Connecting to: " + this._accountService );
            this.connectorCreate(this._onConnectorCreateResponse, {scope: this});
        },

        _onConnectorCreateResponse : function (response, data) {
            if( ! response.Success ){
                this.error("Auto-connect failed: " + response.StatusString + " [" + response.StatusCode + "]");
            }
        },


        _onDisconnected : function () {
            this._setConnector(null);
            this._fireEvent("onDisconnected", [{
                "@type"     : "DisconnectedEvent"
            }]);

            // todo : fire participant removed events, session end events
        },

        _onConnected : function () {
            var connector = this.getConnector();

            this._fireEvent("onConnected", [{
                "@type"     : "ConnectedEvent",
                Connector   : connector
            }]);

            if (! (this._config.anonymous || this._config.username )){
                return;
            }
            
            // if resuming a connection, we're already logged in
            if( this.isLoggedIn() ){
                return;
            }
            
            // Step 3: Login
            if ( this._config.anonymous ){
                this.info("Connected, logging in anonymously as " + this._config.anonymous);
                this.anonymousLogin(this._config.anonymous, this._onLoginRequestComplete, {scope: this});
                return;
            }

            if( this._config.username && this._config.password ){
                this.info("Connected, logging in as " + this._config.username);
                this.login( this._config.username, this._config.password, this._onLoginRequestComplete, {scope: this});
            }
        },

        _onLoginRequestComplete : function (response, data) {
            if( ! response.Success ){
                this.error("Auto-login failed: " + response.StatusString + " [" + response.StatusCode + "]");
            }
        },

        _onLoggedIn : function ( account ) {
            this.info("Logged in as: " + account.DisplayName );
            this.getWavDestination();
            this.setLocalMicMute(true);
            this.setTransmitAllSessions();

            this._fireEvent("onLoggedIn", [{
                "@type"         : "LoggedInEvent",
                Account   : account
            }]);

            // Step 4: Join Channels
            var uri = this._config.channelUri;

            if( this._config.ephemeralId ){
                uri = this.generateEphemeralUri(this._config.ephemeralId);
            }

            if( uri ) {
                this.startSession( uri );
            }
        },

        _onLoggedOut : function ( account ) {
            this.info("Logged out.");
            this._fireEvent("onLoggedOut", [{
                "@type"         : "LoggedOutEvent",
                Account   : account
            }]);
        },

        _onSessionStart : function (event) {
            this._fireEvent("onSessionStart", [{
                "@type"     : "SessionStartEvent",
                Session : this.getSession(event.SessionUri)
            }]);
        },

        _onSessionEnd : function (session_uri) {
            this._fireEvent("onSessionEnd", [{
                "@type"     : "SessionEndEvent",
                Session : this.getSession(session_uri)
            }]);
        },

        /**
         *  Method additions
         */

        generateEphemeralUri : function ( identifier ) {
            var account = this.getAccount();
            if( ! account ) {
                return null;
            }
            var domain = Vivox.lib.getDomain(account.Uri);
            return 'sip:confctl-g-'+identifier+'@'+domain;
        },

        getPersonalChannelUri : function ( account_uri ) {
            return account_uri.replace('sip:', 'sip:confctl-p-');
        },

        startSession : function (session_uri, options){
            var opt  = options || {};
            var account = this.getAccount( opt.accountHandle || this._accountHandle );

            var connector = this.getConnector();
            if( !(connector && account && account.State == 1) ){
                this.error("Attempt to start session while not logged in.");
            }

            var session = this.getSession(session_uri);
            if( session ){
                this.error("Already in session: " + session_uri);
            }

            this.setAudioState(session_uri, true, {
                name : opt.name,
                fontId : opt.fontId,
                password: opt.password
            });
            
            this.setTextState(session_uri, true, {
                password: opt.password
            });

        },

        endSession: function (session_uri){
            var session = this.getSession(session_uri);
            if(! session ) {
                this.warn("Not in session: " + session_uri);
                return;
            }

            this.setAudioState(session_uri, false);
            this.setTextState(session_uri, false);
        },

        /**
         *  State Management
         */

        getConnector : function () {
            return this._connector;
        },

        getAccount : function ( optional_account_handle ){
            if( ! optional_account_handle ) {
                optional_account_handle = this._accountHandle
            }
            return this._accounts[optional_account_handle];
        },

        getAccountByUri : function ( account_uri ) {
            var ah, account;
            for(ah in this._accounts) {
                if( this._accounts[ah].Uri == account_uri ){
                    return this._accounts[ah];
                }
            }
            return null;
        },

        getAccounts : function () {
            var list = [];
            for(var ah in this._accounts) {
                list.push( this._accounts[ah]);
            }
            return list;
        },

        isLoggedIn : function ( ah ) {
            if( ah ) {
                return (this._accounts[ah].State == 1);
            }
            
            for(ah in this._accounts) {
                if( this._accounts[ah].State == 1) {
                    return true;
                }
            }
            return false;
        },

        getSession : function (session_uri, optional_account_handle) {
            var accountHandle = optional_account_handle || this._accountHandle;
            return this._sessions[accountHandle]
                    && this._sessions[accountHandle][session_uri];
        },

        getSessions : function (optional_account_handle) {
            var list = [];
            var ah, uri;
            for(ah in this._sessions) {
                for(uri in this._sessions[ah]) {
                    list.push(this._sessions[ah][uri]);                    
                }
            }
            return list;
        },

        getChannels : function (optional_account_handle) {
            var list = [];
            var ah, uri;
            for(ah in this._sessions) {
                for(uri in this._sessions[ah]) {
                    if( this._sessions[ah][uri].isChannel ){
                        list.push(this._sessions[ah][uri]);
                    }
                }
            }
            return list;
        },

        getP2PSessions : function (optional_account_handle) {
            var list = [];
            var ah, uri;
            for(ah in this._sessions) {
                for(uri in this._sessions[ah]) {
                    if( ! this._sessions[ah][uri].isChannel ){
                        list.push(this._sessions[ah][uri]);
                    }
                }
            }
            return list;
        },

        getSessionParticipants : function(session_uri, optional_account_handle){
            var accountHandle = optional_account_handle || this._accountHandle;
            return this._participants[accountHandle]
                    && this._participants[accountHandle][session_uri]
        },

        isSessionConnected : function (session ) {
            return ( session.AudioState == Vivox.AUDIO_STATE_CONNECTED
                    || session.TextState == Vivox.TEXT_STATE_CONNECTED );
        },

        getParticipant : function (session_uri, participant_uri, optional_account_handle ){
            var accountHandle = optional_account_handle || this._accountHandle;
            return this._participants[accountHandle]
                    && this._participants[accountHandle][session_uri]
                    && this._participants[accountHandle][session_uri][participant_uri];
        },
        
        _setConnector : function ( properties ) {
            if( ! properties ) {
                this._connector = null;
                return this._connector;
            }
            if( ! this._connector  ) {
                this._connector =     {
                    ConnectorHandle : null,
                    MicVol : null,
                    SpeakerVol : null,
                    MicMute : null,
                    SpeakerMute : null

                }
            }

            Vivox.lib.updateObject(this._connector, properties);
//            this._connector.MicVol = Vivox.lib.toNumber(this._connector.MicVol);
//            this._connector.SpeakerVol = Vivox.lib.toNumber(this._connector.SpeakerVol);
//            this._connector.SpeakerMute = Vivox.lib.toBoolean(this._connector.SpeakerMute);
//            this._connector.MicMute = Vivox.lib.toBoolean(this._connector.MicMute);
            this.logObj(this._connector, "state", "Connector");
            return this._connector;
        },

        _setAccount : function ( properties ) {
            if(! this._accounts[properties.AccountHandle] ){
                this._accounts[properties.AccountHandle] = {
                    AccountHandle : null,
                    Uri : null,
                    DisplayName : null,
                    IsAnonymousLogin : null,
                    State : null,
                    WavDestinationPath : null
                };
            }
            var account = this._accounts[properties.AccountHandle];
            Vivox.lib.updateObject(account, properties);
//            account.IsAnonymousLogin = Vivox.lib.toBoolean(account.IsAnonymousLogin);
//            account.State = Vivox.lib.toNumber(account.State);
            this.logObj(account, "state", "Account");
            return account;
        },

        _setSession : function (account_handle, sessionUri, properties) {
            if( ! account_handle ){
                return null;
            }
            if(! this._sessions[account_handle] ){
                this._sessions[account_handle] = {};
            }

            if( ! properties && this._sessions[account_handle] ){
                delete this._sessions[account_handle][sessionUri];
                return null;
            }

            // hack, this should come from the SSI;
            properties.IsChannel = Boolean(sessionUri.match(/^sip:confctl/));

            this._sessions[account_handle][properties.Uri] = properties;

            this.logObj(this._sessions[account_handle][properties.Uri], "state", "Session");
            return this._sessions[account_handle][properties.Uri];
        },

        _cleanupSessionCheck : function (sessionUri, accountHandle) {
            var session = this.getSession(sessionUri, accountHandle);

            if( ! session ) {
                return;
            }

            // don't cleanup if has either text or audio state
            if( ! (session.AudioState == Vivox.AUDIO_STATE_DISCONNECTED
                   && session.TextState == Vivox.TEXT_STATE_DISCONNECTED) ){
                return;
            }

            // don't clean up if waiting on a participant removed for local user
            if( this.getParticipant(sessionUri, this.getAccount().Uri, accountHandle) ){
                return;
            }

            // forget the session object
            this._setSession(accountHandle, sessionUri, null)
        },

        _setParticipant : function (account_handle, session_uri, participant_uri, participant) {
            if(! this._participants[account_handle] ){
                this._participants[account_handle] = {};
            }
            
            if(! this._participants[account_handle][session_uri] ){
                this._participants[account_handle][session_uri] = {};
            }

            if( ! participant  ){
                delete this._participants[account_handle][session_uri][participant_uri];
                return null;
            }

            this._participants[account_handle][session_uri][participant.Uri] = participant;

            this.logObj(participant, "state", "Participant");
            return participant;
        },

        /**
         *  Extract current state from a Dump response, fire events to simulate fresh login
         */

        _processDump  : function ( dumpResponseObj ){
            var response = dumpResponseObj.Response;
            var results = response.Results;

            if (! (results.Connectors && results.Connectors.Connector) ){
                this.info("No connection to resume.");
                return;
            }
            var connector = results.Connectors.Connector;
            this._setConnector({
                ConnectorHandle : connector.ConnectorHandle,
                MicVol : connector.MicVol,
                SpeakerVol : connector.SpeakerVol,
                SpeakerMute : connector.SpeakerMute
            });

            // todo: replay events: onLocalMicMute, onLocalSpeakerMute,

            this._processDumpAccount(connector.Accounts);

            this.info("Resumed connection to " +  this._accountService);

            // replay events as if a new login

            this._onConnected();
            
            var account_handle, account;
            for(account_handle in this._accounts ){
                account = this.getAccount(account_handle);
                this._fireEvent("onAccountLoginStateChange", [{
                    "@type"         : "AccountLoginStateChangeEvent",
                    AccountHandle   : account.AccountHandle,
                    StatusCode      : "0",
                    StatusString    : null,
                    State           : String(account.State)
                }]);
            }

            var account_sessions, session_uri, session_participants, p;
            for(account_handle in this._sessions ){
                account_sessions = this._sessions[account_handle];
                for(session_uri in account_sessions ){
                    this._fireEvent("onSessionUpdated", [{
                        '@type': 'SessionUpdatedEvent',
                        AccountHandle: account_handle,
                        SessionUri: session_uri,
                        Session: this.getSession(session_uri, account_handle)}
                    ]);
                    for( p in this.getSessionParticipants(session_uri) ){
                        this._fireEvent("onParticipantAdded", [{
                            '@type': 'ParticipantUpdatedEvent',
                            AccountHandle: account_handle ,
                            SessionUri: session_uri,
                            Participant: this.getParticipant(session_uri, p)
                        }]);
                    }
                }
            }
        },

        _processDumpAccount : function ( dumpAccounts ) {

            // massage data in to array
            var connector = this.getConnector();
            var i, da, account;

            for(i=0; i < dumpAccounts.length; i++ ){
                da = dumpAccounts[i];

                account = this._setAccount({
                    AccountHandle       : da.AccountHandle,
                    Uri                 : da.AccountUri,
                    DisplayName         : da.AccountDisplayName,
                    IsAnonymousLogin    : da.IsAnonymousLogin,
                    State    : da.State
                });

                this._processDumpSessionGroups(account.AccountHandle, da.SessionGroups );
                this._accountHandle = da.AccountHandle;                                            
            }
        },

        _processDumpSessionGroups : function ( account_handle, dump_groups ) {
            var sg, i, dump_sessions, s, session, group;
            for(sg=0; sg < dump_groups.length; sg++){
                group = dump_groups[sg];
                if (group.CurrentRecordingFilename){
                     this._fireEvent("onRecordingAllChannelsStarted", [{
                        "@type" : "RecordingAllChannelsStartedEvent",
                        AccountHandle: account_handle
                    }]); 

                }
                dump_sessions = group.Sessions;
                for(i=0; i < group.Sessions.length; i++ ){
                    s = group.Sessions[i];
                    session = this._setSession(account_handle, s.Uri, Vivox.Session({
                        Uri                 : s.Uri,
                        Name                : s.Name,
                        IsIncoming          : s.IsIncoming,
                        IsAudioMutedTarget  : s.IsAudioMutedForMe,
                        IsTextMutedTarget   : s.IsTextMutedForMe,
                        VoiceFont           : s.SessionFontId,
                        Volume              : s.Volume,
                        DurableMediaID      : s.DurableMediaId,

                        AudioState : s.HasAudio ? "AudioStateConnected" : "AudioStateDisconnected",
                        TextState  : s.HasText  ? "TextStateConnected"  : "TextStateDisconnected"
                    }));

                    // process participants
                    this._processDumpParticipant(account_handle, session.Uri, s.Participants);
                }
            }
        },

        _processDumpParticipant : function (account_handle, session_uri, dump_participants ){
            var i, p, participant, type;
            for(i=0; i < dump_participants.length; i++ ){
                p = dump_participants[i];
                switch(p.Type) {
                    case "Owner":
                        type = Vivox.PARTICIPANT_OWNER;
                        break;
                    case "Moderator":
                        type = Vivox.PARTICIPANT_MODERATOR;                
                        break;
                    case "User":
                        type = Vivox.PARTICIPANT_USER;
                        break;
                    default:
                        type = p.Type;
                }
                
                participant = this._setParticipant(account_handle, session_uri, p.Uri, Vivox.Participant({
                    Uri : p.Uri,
                    DisplayName : p.DisplayName,
                    IsModeratorAudioMuted : p.IsAudioModeratorMuted,
                    IsModeratorTextMuted : p.IsTextModeratorMuted,
                    IsLocalAudioMuted : p.IsAudioMutedForMe,
                    IsAudioEnabled : p.HasAudio,
                    IsTextEnabled : p.HasText,
                    IsHandRaised : p.IsHandRaised,
                    IsTyping : p.IsTyping,
                    IsSpeaking : p.IsSpeaking,
                    Type : type,
                    Volume : p.Volume,
                    Energy : p.Energy,
                    IsGuest : p.IsAnonymousLogin,
                    IsMe : this.getAccountByUri(p.Uri) ? true : false
                }));
            }
        },

        /**
         *  SDK Functions (asynchronous)
         */

        dump : function (callback_fn, options) {
            return this.pluginRequest("vx_req_aux_diagnostic_state_dump", {}, callback_fn, options);
        },

        connectorCreate: function (callback_fn, options){
            return this.pluginRequest("vx_req_connector_create", {
                AccountManagementServer : this._accountService,
                Mode : "Normal",
                MinimumPort : 9000,
                MaximumPort : 19000
            }, callback_fn, options);
        },

        anonymousLogin: function(displayName, callback_fn, options) {
            if( this.isLoggedIn() ){
                return this._fakeFailedResponse("multipleLogins", "Already logged in.", callback_fn, options);
            }

            return this.pluginRequest("vx_req_account_anonymous_login", {
                AccountManagementServer : this._accountService,
                ConnectorHandle : this.getConnector().ConnectorHandle,
                DisplayName : displayName,
                EnableText : "TextModeEnabled",
                ParticipantPropertyFrequency : 100
            }, callback_fn, options);
        },

        login: function(username, password, callback_fn, options) {
            if( this.isLoggedIn() ){
                return this._fakeFailedResponse("multipleLogins", "Already logged in.", callback_fn, options);
            }
            return this.pluginRequest("vx_req_account_login", {
                AccountManagementServer : this._accountService,
                ConnectorHandle : this.getConnector().ConnectorHandle,
                AccountName : username,
                AccountPassword : password,
                EnableText : "TextModeEnabled",
                ParticipantPropertyFrequency : 100,
                BuddyManagementMode : "Application",
                EnableBuddiesAndPresence : "true"
            }, callback_fn, options);
        },

        logout: function (callback_fn, options) {
            return this.pluginRequest("vx_req_account_logout", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        webcall: function(relative_url, parameters, callback_fn, options) {
            var p;
            var paramArray = [];
            for (p in parameters) {
                paramArray.push({
                    Name: p,
                    Value: parameters[p]
                });
            }
            return this.pluginRequest("vx_req_account_web_call", {
                AccountHandle : this._getOptionsAccountHandle(options),
                RelativePath : relative_url,
                Parameters : {
                    Parameter : paramArray
                }
            }, callback_fn, options);
        },

        kickChannelUser: function (session_uri, participant_uri, callback_fn, options){
            return this.pluginRequest("vx_req_channel_kick_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri
            }, callback_fn, options);
        },

        banChannelUser: function(session_uri, participant_uri, callback_fn, options){
            return this.pluginRequest("vx_req_channel_ban_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri
            }, callback_fn, options);
        },

        unbanChannelUser: function(session_uri, participant_uri, callback_fn, options){
            return this.pluginRequest("vx_req_channel_unban_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri
            }, callback_fn, options);
        },

        addChannelModerator: function(session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_add_moderator", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ModeratorURI : participant_uri
            }, callback_fn, options);
        },

        removeChannelModerator: function(session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_remove_moderator", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ModeratorURI : participant_uri
            }, callback_fn, options);
        },

        muteAllChannelUsers: function(session_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_mute_all_users", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri
            }, callback_fn, options);
        },

        unmuteAllChannelUsers: function(session_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_unmute_all_users", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri
            }, callback_fn, options);
        },

        muteChannelUser: function (session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_mute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri
            }, callback_fn, options);
        },

        muteChannelUserText: function (session_uri, participant_uri, callback_fn, options ){
            return this.pluginRequest("vx_req_channel_mute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri,
                Scope : 'Text'
            }, callback_fn, options);
        },

        muteChannelUserAudio: function (session_uri, participant_uri, callback_fn, options ){
            return this.pluginRequest("vx_req_channel_mute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri,
                Scope : 'Audio'
            }, callback_fn, options);
        },

        unmuteChannelUser: function(session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_unmute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri
            }, callback_fn, options);
        },

        unmuteChannelUserText: function(session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_unmute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri,
                Scope : "Text"
            }, callback_fn, options);
        },

        unmuteChannelUserAudio: function(session_uri, participant_uri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_unmute_user", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : session_uri,
                ParticipantURI : participant_uri,
                Scope : "Audio"
            }, callback_fn, options);
        },

        setLocalMicMute: function (value, callback_fn, options) {
            return this.pluginRequest("vx_req_connector_mute_local_mic", {
                ConnectorHandle : this.getConnector().ConnectorHandle,
                Value : (value) ? "true": "false"
            }, callback_fn, options);
        },

        setLocalSpeakerMute: function (value, callback_fn, options) {
            return this.pluginRequest("vx_req_connector_mute_local_speaker", {
                ConnectorHandle : this.getConnector().ConnectorHandle,
                Value : (value) ? "true": "false"
            }, callback_fn, options);
        },

        startAudioCapture: function (callback_fn, options) {
            return this.pluginRequest("vx_req_aux_start_buffer_capture", {}, callback_fn, options);
        },

        stopAudioCapture: function (callback_fn, options) {
            return this.pluginRequest("vx_req_aux_capture_audio_stop", {}, callback_fn, options);
        },

        startAudioPlayback: function (fontId, callback_fn, options) {
            this.pluginRequest("vx_req_aux_play_audio_buffer", {
                AccountHandle : this._getOptionsAccountHandle(options),
                TemplateFontID : fontId
            }, callback_fn, options);
        },

        getRenderDevices: function( callback_fn, options) {
            this.pluginRequest("vx_req_aux_get_render_devices", {}, callback_fn, options);
        },

        getCaptureDevices: function( callback_fn, options) {
            this.pluginRequest("vx_req_aux_get_capture_devices", {}, callback_fn, options);
        },

        setCaptureDevice: function(device_name, callback_fn, options){
            this.pluginRequest("vx_req_aux_set_capture_device", {
                CaptureDeviceSpecifier : device_name
            }, callback_fn, options);
        },

        stopAudioPlayback: function (callback_fn, options) {
            return this.pluginRequest("vx_req_aux_render_audio_stop", {}, callback_fn, options);
        },

        createChannel: function(properties, callback_fn, options) {
            // todo : document properties
            properties.AccountHandle = this._getOptionsAccountHandle(options);            
            return this.pluginRequest("vx_req_account_channel_create", properties, callback_fn, options);
        },

        updateChannel: function(properties, callback_fn, options) {
            properties.AccountHandle = this._getOptionsAccountHandle(options);
            // todo : document properties            
            return this.pluginRequest("vx_req_account_channel_update", properties, callback_fn, options);
        },

        deleteChannel: function(channelUri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_delete", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : channelUri
            }, callback_fn, options);
        },

        getChannelInfo: function(channelUri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_get_info", {
                AccountHandle : this._getOptionsAccountHandle(options),
                URI : channelUri
            }, callback_fn, options);
        },

        getChannelFavorites: function(callback_fn, options){
            return this.pluginRequest("vx_req_account_channel_favorites_get_list", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        setChannelFavorite: function(properties, callback_fn, options){
            // todo: document properties
            properties.AccountHandle = this._getOptionsAccountHandle(options);
            return this.pluginRequest("vx_req_account_channel_favorite_set", properties, callback_fn, options);
        },

        deleteChannelFavorite: function(favoriteId, callback_fn, options){
            return this.pluginRequest("vx_req_account_channel_favorite_delete", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ID : favoriteId
            }, callback_fn, options);
        },

        getChannelModerators: function(channelUri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_get_moderators", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : channelUri
            }, callback_fn, options);
        },

        getChannelBannedUsers: function(channelUri, callback_fn, options) {
            return this.pluginRequest("vx_req_channel_get_banned_users", {
                AccountHandle : this._getOptionsAccountHandle(options),
                ChannelURI : channelUri
            }, callback_fn, options);
        },

        searchAccounts: function(pageNumber, pageSize, firstName, lastName, userName, email, displayName, callback_fn, options) {
            return this.pluginRequest("vx_req_account_buddy_search", {
                AccountHandle : this._getOptionsAccountHandle(options),
                PageNumber : pageNumber,
                PageSize : pageSize,
                FirstName : firstName,
                LastName : lastName,
                UserName : userName,
                EMail :  email,
                DisplayName :  displayName
            }, callback_fn, options);
        },

        setBuddy: function(buddyUri, displayName, buddyData, groupId, message, callback_fn, options) {
            return this.pluginRequest("vx_req_account_buddy_set", {
                AccountHandle : this._getOptionsAccountHandle(options),
                BuddyURI : buddyUri,
                DisplayName : displayName,
                BuddyData : buddyData,
                GroupID : groupId,
                Message : message
            }, callback_fn, options);
        },

        deleteBuddy: function(buddyUri, callback_fn, options) {
            return this.pluginRequest("vx_req_account_buddy_delete", {
                AccountHandle : this._getOptionsAccountHandle(options),
                BuddyURI : buddyUri
            }, callback_fn, options);
        },

        setBuddyGroup: function(groupId, groupName, groupData, callback_fn, options) {
            return this.pluginRequest("vx_req_account_buddygroup_set", {
                AccountHandle : this._getOptionsAccountHandle(options),
                GroupID : groupId,
                GroupName : groupName,
                GroupData : groupData
            }, callback_fn, options);
        },

        deleteBuddyGroup: function(groupId, callback_fn, options) {
            return this.pluginRequest("vx_req_account_buddygroup_delete", {
                AccountHandle : this._getOptionsAccountHandle(options),
                GroupID : groupId
            }, callback_fn, options);
        },

        getBuddiesAndGroups: function(callback_fn, options) {
            return this.pluginRequest("vx_req_account_list_buddies_and_groups", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        setPresence: function(presence, message, callback_fn, options) {
            return this.pluginRequest("vx_req_account_set_presence", {
                AccountHandle : this._getOptionsAccountHandle(options),
                Presence : presence,
                CustomMessage : message
            }, callback_fn, options);
        },

        sendSubscriptionReply: function(buddyUri, ruleType, autoAccept, subscriptionHandle, callback_fn, options) {
            return this.pluginRequest("vx_req_account_send_subscription_reply", {
                AccountHandle : this._getOptionsAccountHandle(options),
                BuddyURI : buddyUri,
                RuleType : ruleType,
                AutoAccept : autoAccept,
                SubscriptionHandle : subscriptionHandle
            }, callback_fn, options);
        },

        createBlockRule: function(blockMask, presenceOnly, callback_fn, options) {
            return this.pluginRequest("vx_req_account_create_block_rule", {
                AccountHandle : this._getOptionsAccountHandle(options),
                BlockMask : blockMask,
                PresenceOnly : presenceOnly
            }, callback_fn, options);
        },

        deleteBlockRule: function(blockMask, callback_fn, options) {
            return this.pluginRequest("vx_req_account_delete_block_rule", {
                AccountHandle : this._getOptionsAccountHandle(options),
                BlockMask : blockMask
            }, callback_fn, options);
        },

        getBlockRules: function(callback_fn, options) {
            return this.pluginRequest("vx_req_account_list_block_rules", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        createAutoAcceptRule: function(autoAcceptMask, autoAddAsBuddy, callback_fn, options) {
            return this.pluginRequest("vx_req_account_create_auto_accept_rule", {
                AccountHandle : this._getOptionsAccountHandle(options),
                AutoAcceptMask : autoAcceptMask,
                AutoAddAsBuddy : autoAddAsBuddy
            }, callback_fn, options);
        },

        deleteAutoAcceptRule: function(autoAcceptMask, callback_fn, options) {
            return this.pluginRequest("vx_req_account_delete_auto_accept_rule", {
                AccountHandle : this._getOptionsAccountHandle(options),
                AutoAcceptMask : autoAcceptMask
            }, callback_fn, options);
        },

        getAutoAcceptRules: function(callback_fn, options) {
            return this.pluginRequest("vx_req_account_list_auto_accept_rules", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        setChannelFavoriteGroup: function(properties, callback_fn, options) {
            properties.AccountHandle = this._getOptionsAccountHandle(options);
            return this.pluginRequest("vx_req_account_channel_favorite_group_set", properties, callback_fn, options);
        },

        deleteChannelFavoriteGroup: function(groupId, callback_fn, options) {
            return this.pluginRequest("vx_req_account_channel_favorite_group_delete", {
                AccountHandle : this._getOptionsAccountHandle(callback_fn, options),
                GroupID : groupId
            }, callback_fn, options);
        },

        searchChannels: function (properties, callback_fn, options) {
            properties.AccountHandle = this._getOptionsAccountHandle(options);
            return this.pluginRequest("vx_req_account_channel_search", properties, callback_fn, options);
        },

        searchUsers: function (properties, callback_fn, options) {
            // todo: document properties
            properties.AccountHandle = this._getOptionsAccountHandle(options);
            return this.pluginRequest("vx_req_account_buddy_search", properties, callback_fn, options);
        },

        getSessionFonts: function (callback_fn, options) {
            return this.pluginRequest("vx_req_account_get_session_fonts", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },

        getTemplateFonts: function (callback_fn, options) {
            return this.pluginRequest("vx_req_account_get_template_fonts", {
                AccountHandle : this._getOptionsAccountHandle(options)
            }, callback_fn, options);
        },


        /**
         *  Simplified Session Interface Calls  (synchronous)
         */

        start: function () {
            this.info("Starting Vivox plug-in...");
            try {
                return this.getPlugin().Start();
            } catch(e){
                this.handleException(e);
                return false;
            }
        },

        startNamed: function ( connection_name ) {
            this.info("Starting Vivox plug-in.");
            try {
                return this.getPlugin().StartNamed( Vivox.utf8.encode(connection_name) );
            } catch(e){
                this.handleException(e);
            }
        },

        getPluginVersion : function () {
            var haveVersion = "0.0.0";
            try {
                haveVersion = this.getPlugin().GetPluginVersion() || haveVersion;
                // broken plugin version in 1.0.10
                if ( haveVersion == "0.2.1.309" ) {
                    haveVersion = "1.0.10"
                }
            } catch(e){
                this.handleException(e);
            }
            return haveVersion;
        },

        pluginGetSessionCount: function (){
            try {
                return this.getPlugin().GetSessionCount();
            } catch(e){
                this.handleException(e);
            }
        },

        pluginGetSessionAt: function (index){
            try {
                var xmlReturn = this.getPlugin().GetSessionAt(index);
                return this.makeObject(xmlReturn);
            } catch(e){
                this.handleException(e);
            }
        },

        pluginGetSession:	function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                var xmlReturn = this.getPlugin().GetSession(accountHandle, focusUri);
                return this.makeObject(xmlReturn);
            } catch(e) {
                this.handleException(e);
            }
        },

        pluginGetParticipant:	function (focusUri, userUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);             
            try {
                var xmlReturn = this.getPlugin().GetParticipant(accountHandle, focusUri, userUri);
                return this.makeObject(xmlReturn);
            } catch(e){
                this.handleException(e);
            }
        },

        setTextState: function (focusUri, value, options){
            var opt = options || {};
            var accountHandle = opt.accountHandle || this._accountHandle;
            var password = Vivox.utf8.encode(opt.password || '');
			var name = Vivox.utf8.encode(opt.name || '');
            try {
                return this.getPlugin().SetTextState(accountHandle, focusUri, value, password, name);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetTextState: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetTextState(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        startRecording: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StartRecording(accountHandle, focusUri);
            } catch(e) {
                this.handleException(e);
            }
        },

        stopRecording: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StopRecording(accountHandle, focusUri);
            } catch(e) {
                this.handleException(e);
            }
        },


        startRecordingAllChannels: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StartRecordingAllChannels(accountHandle);
            } catch(e) {
                this.handleException(e);
            }
        },

        stopRecordingAllChannels: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StopRecordingAllChannels(accountHandle);
            } catch(e) {
                this.handleException(e);
            }
        },

        saveRecording: function (focusUri, filepath, flag, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SaveRecording(accountHandle, focusUri, Vivox.utf8.encode(filepath), flag);
            } catch(e) {
                this.handleException(e);
            }
        },
        startSingleSession: function ( focus_uri, options ){
            var opt = options || {};
            var accountHandle = opt.accountHandle || this._accountHandle;
            var font_id = opt.fontId || 0;
            var password = Vivox.utf8.encode(opt.password  || '');
            var join_text = opt.joinText || false;
            var name = Vivox.utf8.encode(opt.name || '');

            try {
                return this.getPlugin().SetSingleCall(accountHandle, focus_uri, font_id, join_text, password, name);
            } catch(e) {
                this.handleException(e);
            }
        },
        
        setAudioState: function (focusUri, value, options){
            var opt = options || {};
            var accountHandle = opt.accountHandle || this._accountHandle;
            var font_id = opt.fontId || 0;
            var password = Vivox.utf8.encode(opt.password  || '');
            var name = Vivox.utf8.encode(opt.name || '');
            try {
                return this.getPlugin().SetAudioState(accountHandle, focusUri, value, font_id, password, name );
            } catch(e) {
                this.handleException(e);
            }
        },

        canSetAudioState: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetAudioState(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        sendMessage: function (session_uri, content, options){
            var opt = options || {};
            var accountHandle = opt.accountHandle || this._accountHandle;
            var contentType = opt.contentType || 'text/plain';
            var cookie = opt.cookie || generateGuid();
            try {
                this.getPlugin().SendMsg(
                        accountHandle,
                        session_uri,
                        contentType,
                        Vivox.utf8.encode(content),
                        cookie);
            } catch(e){
                this.handleException(e);
            }
            return cookie;
        },

        canSendMessage:	function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);            
            try {
                return this.getPlugin().CanSendMsg(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setTyping: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetTyping(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetTyping: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetTyping(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setHandRaised: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetHandRaised(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetHandRaised: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);                                   
            try {
                return this.getPlugin().CanSetHandRaised(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setSessionAudioMute: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);                                               
            try {
                return this.getPlugin().MuteRender(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetSessionAudioMute: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);                                                           
            try {
                return this.getPlugin().CanMuteRender(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setSessionTextMute: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().MuteText(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetSessionTextMute: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);            
            try {
                return this.getPlugin().CanMuteText(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setSessionVolume: function (focusUri, value, options){
            var accountHandle = this._getOptionsAccountHandle(options);            
            try {
                return this.getPlugin().SetRenderVolume(accountHandle, focusUri, value);
            } catch(e){
                this.handleException(e);
            }
        },
        canSetSessionVolume:	function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);            
            try {
                return this.getPlugin().CanSetRenderVolume(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setVoiceFont: function (focusUri, font_id, options){
            var accountHandle = this._getOptionsAccountHandle(options);                        
            try {
                return this.getPlugin().SetVoiceFont(accountHandle, focusUri, parseInt(font_id) );
            } catch(e){
                this.handleException(e);
            }
        },

        canSetVoiceFont: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);                        
            try {
                return this.getPlugin().CanSetVoiceFont(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setTransmitToOneSession: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetTransmitToOneChannel(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetTransmitToOneSession:	function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetTransmitToOneChannel(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setTransmitAllSessions:	function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetTransmitAllChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetTransmitAllSessions: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetTransmitAllChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        setTransmitNoSessions: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetTransmitNoChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetTransmitNoSessions: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetTransmitNoChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        setSessionFocus: function (sessionUri, focused, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetFocusOneChannel(accountHandle, sessionUri, focused);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetSessionFocus: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetFocusOnechannel(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        clearAllFocusedSessions: function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().ClearAllFocusedChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        canClearAllFocusedSessions:	function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanClearAllFocusedChannels(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        setUserLocalVolume: function (focusUri, userUri, volume, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetParticipantVolume(accountHandle, focusUri, userUri, volume);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetUserLocalVolume: function (focusUri, userUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetParticipantVolume(accountHandle, focusUri, userUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setParticipantAudioMute : function (focusUri, userUri, muted, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetParticipantAudioMuted(accountHandle, focusUri, userUri, Boolean(muted));
            } catch(e){
                this.handleException(e);
            }
        },

        canSetParticipantAudioMute : function (focusUri, userUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try{
                return this.getPlugin().CanSetParticipantAudioMuted(accountHandle, focusUri, userUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setUserLocalMute: function (focusUri, userUri, muted, options){
            this.log("Call 'setUserLocalMute' has been deprecated. Please use setParticpantAudioMute.", "warn");
           return this.setParticipantAudioMute(focusUri, userUri, muted, options)
        },

        canSetUserLocalMute: function (focusUri, userUri, options){
            this.log("Call 'canSetUserLocalMute' has been deprecated. Please use canSetParticipantAudioMute.", "warn");
            return this.canSetParticipantAudioMute(focusUri, userUri, options);
        },

        set3dSessionPosition: function (focusUri, speakerPosition, listenerPosition, listenerAtOrientation, listenerUpOrientation, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            if( ! listenerPosition ) {
                listenerPosition  = speakerPosition;                
            }
            try {
                return this.getPlugin().SetMy3dPosition(accountHandle,
                        focusUri,                 
                        Vivox.lib.vCoordinate2Xml(listenerPosition),
                        Vivox.lib.vCoordinate2Xml(listenerAtOrientation),
                        Vivox.lib.vCoordinate2Xml(listenerUpOrientation),
                        Vivox.lib.vCoordinate2Xml(speakerPosition)
                        );
            } catch(e){
                this.handleException(e);
            }
        },

        canSet3dSessionPosition:	function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetMy3dPosition(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        setStaticSessionPosition:	function (focusUri, speakerPosition, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().SetSessionPosition(accountHandle, focusUri,speakerPosition);
            } catch(e){
                this.handleException(e);
            }
        },

        canSetStaticSessionPosition: function (focusUri, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().CanSetSessionPosition(accountHandle, focusUri);
            } catch(e){
                this.handleException(e);
            }
        },

        startAudioInjection: function (filename, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StartAudioInjection(accountHandle, filename);
            } catch(e){
                this.handleException(e);
            }

        },

        stopAudioInjection:	function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().StopAudioInjection(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        restartAudioInjection: function (filename, options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().RestartAudioInjection(accountHandle, filename);
            } catch(e){
                this.handleException(e);
            }
        },

        getWavDestination:	function (options){
            var accountHandle = this._getOptionsAccountHandle(options);
            try {
                return this.getPlugin().GetWavDestination(accountHandle);
            } catch(e){
                this.handleException(e);
            }
        },

        /**
         *  System Dialog Interfaces (asynchronous)
         */

        owiAuth: function (url, callback_fn, options){
            return this.pluginRequest("owi_req_auth", {Url : url}, callback_fn, options);
        },

        owiAuthListAllow: function (url){
            return this.pluginRequest("owi_req_acceptance_list_allow_dialog", {Url : url} );
        },

        owiManage: function (){
            // todo : need to rename these fns 
            return this.pluginRequest("owi_req_acceptance_list_manage_dialog", {} );
        },

        owiLogin: function (x,y){
            return this.pluginRequest("owi_req_login_dialog", {xpos: x, ypos: y} );
        },

        owiAudioSettings: function (){
            return this.pluginRequest("owi_req_audio_settings_dialog", {});
        },

        owiRoster: function (){
            return this.pluginRequest("owi_req_roster_list_edit_dialog", {} );
        },

        owiPushToTalk: function (){
            return this.pluginRequest("owi_req_ptt_dialog", {} );
        },

        owiVolume: function (x,y){
            return this.pluginRequest("owi_req_volum_dialog", {xpos: x, ypos: y} );
        },


        /**
         * Event Handling
         */

        /**
         *  Registers a object as an event listener
         * @param {Object} callback_obj
         */
        setCallbacks: function( callback_obj ){
            this._callbacks.push(callback_obj);
        },

        /**
         *  Frees all saved callback references
         */
        unsetCallbacks: function() {
            this._callbacks = [];
        },

        /**
         * Publish an event/callback. Class internal callbacks are executed before external
         * @private
         * @param name - callback function name
         * @param args - arguments to callback (eg: event, parameters, etc)
         */
        _fireEvent : function (name, args ){
            if( name in this._localEventListeners ){
                this._localEventListeners[name].apply(this, args);
            }
            //
            this._dispatchEvent(name, args);
        },

        /**
         * Dispatch event to all external listeners. If scope is not specified in callback object,
         * the callback object itself is used as 'this'. Differs from _fireEvent in that it can be
         * overwritten without affecting internal state management.
         * @private
         * @param name - callback function name
         * @param args - arguments to callback (eg: event, parameters, etc)
         */
        _dispatchEvent: function( name, args ) {
            this.logObj(args , "debug", name);

            // check each callback object for this listener and fire
            var o, i;
            for(i=0; i < this._callbacks.length; i++  ){
                o = this._callbacks[i];
                // fire as designated scope or as this callback
                var scope = o.scope || o;
                if( o[name] ){
                    o[name].apply(scope, args);
                }
            }
        },

        /**
         *  Plug-in interaction
         */

        _messageHandler: function( xml ){

            this.log('messageHandler: ' + xml, "api");

            var messageObj = xml2object( Vivox.utf8.decode(xml) );

            Vivox.lib.typecastObject(messageObj, true);
            
            if ( messageObj.Response ){
                return this._handleResponseMessage(messageObj);
            }

            if ( messageObj.Event ){
                return this._handleEventMessage(messageObj);
            }

            throw new Vivox.Error('pluginError', 'UnhandledMessage: ' + xml);
        },

        _handleEventMessage : function (messageObj) {
            var event   = messageObj.Event;
            var type    = event['@type'];
            var action  = event['@action'];

            if(! type ) {
                if( action == "OWI.AcceptanceListAllow" ){
                    type = "AcceptanceListAllowEvent";
                    event['@type'] = type;
                }
                else {
                    this.warn("Unhandled Event: " + type + ", " + action);
                    return;
                }
            }

            // ex. AccountLoginStateChangeEvent -> onAccountLoginStateChange
            type = "on" + type.replace(/Event$/, '');
            this._fireEvent(type, [event]);
        },

        _handleResponseMessage : function (messageObj) {
            var response = messageObj.Response;
            var requestId      = response['@requestId'];
            var responseType   = response['@action'];
            var statusString = response.Results ? response.Results.StatusString : null;
            var statusCode   = response.Results ? response.Results.StatusCode : null;

            // intercept certain events for state management and custom events
            if (response.ReturnCode == null || response.ReturnCode == "0" ) {
                var results = response.Results;
                var connector = this.getConnector();
                switch(responseType) {

                    case "Aux.DiagnosticStateDump.1":
                        this._processDump(messageObj);
                        break;

                    // todo: handle acceptance list allow

                    case "Account.Login.1":
                    case "Account.AnonymousLogin.1":
                        this._accountHandle = results.AccountHandle;                            
                        this._setAccount({
                            AccountHandle : results.AccountHandle,
                            Uri : results.Uri,
                            DisplayName : results.DisplayName,
                            IsAnonymousLogin : (results.AccountID == "0")
                        });
                        break;

                    case "Connector.Create.1":
                        this.info('Connection successful.');
                        this._setConnector({
                            ConnectorHandle : results.ConnectorHandle
                        });
                        this._onConnected();
                        break;

                    case 'Connector.MuteLocalSpeaker.1':
                        connector = this._setConnector({
                            SpeakerMute : Boolean(messageObj.Response.InputXml.Request.Value)
                        });
                        this._fireEvent("onLocalSpeakerMute", [{
                            '@type': 'LocalSpeakerMuteEvent',
                            ConnectorHandle: connector.ConnectorHandle,
                            SpeakerMute: connector.SpeakerMute
                        }]);
                        break;

                    case 'Connector.MuteLocalMic.1':
                        connector = this._setConnector({
                            MicMute : stringToBoolean(messageObj.Response.InputXml.Request.Value)
                        });
                        this._fireEvent("onLocalMicMute", [{
                            '@type': 'LocalMicMuteEvent',
                            ConnectorHandle: connector.ConnectorHandle,
                            MicMute: connector.MicMute
                        }]);
                        break;

                    case 'Connector.SetLocalMicVolume.1':
                        connector = this._setConnector({
                            MicVol : Number(messageObj.Response.InputXml.Request.Value)
                        });
                        break;
                
                    case 'Connector.SetLocalSpeakerVolume.1':
                        connector = this._setConnector({
                            SpeakerVol : Number(messageObj.Response.InputXml.Request.Value)
                        });
                        break;
                }
            }
            else {
                // eg Login, Dump, other automated events
                this._fireEvent("onError", [{
                    "@type"     : responseType,
                    StatusString : statusString,
                    StatusCode : statusCode
                }]);
            }
            
            // normalize Owi response-less events with normal result set responses.
            var payload = response.Results ? response.Results : response;
            if( response.InputXml ) {
                payload.Request = response.InputXml.Request;
            }
            payload.Success = Boolean( response.ReturnCode === undefined || response.ReturnCode == "0" );

            this.handleResponseCallback(requestId, responseType, payload );
        },

        /**
         * this abstraction lets subclasses modify the payload
         * @param requestId
         * @param responseType
         * @param payloadObj - object to be given to the callback, the messageObj by default
         */
        handleResponseCallback : function (requestId, responseType, payloadObj ){

            this.logObj(payloadObj, "api", responseType);

            // no callback specified, nothing to do
            if( !(requestId in this._requestStore) ){
                return;
            }

            // free up stored callback reference
            var record = this._requestStore[requestId];
            if( ! record ){
                return;
            }
            delete this._requestStore[requestId];

            // notify track of response duration
            if (record.requestTime) {
                var endTime = (new Date()).valueOf();                
                var time = endTime - record.requestTime;
                this.log('Round Trip ' + responseType + " (" +time + "ms)", "api");
            }

            // fire the response callback in passed scope, or current scope
            var callback = record._callback;
            if ( callback ) {
                var scope = record._scope || this;
                callback.call(scope, payloadObj, record._data);
            }
        },

        _fakeFailedResponse : function (status_code, status_string, callback_fn, options) {
            var payload = {
                StatusCode: status_code,
                Success: false,
                StatusString: status_string
            };

            this.logObj(payload, "debug");

            if ( callback_fn ) {
                var scope = options ? options.scope : this;

                // defer to be consistently asynchronous
                setTimeout( function () {                         
                    callback_fn.call(scope, payload, options);
                }, 1);
            }
        },

        pluginRequest : function (command, args, callback_fn, data){
            try {
                // fetch the xml template
                var requestXml = this.getPlugin().vx_req_create(command);
                if ( ! requestXml ){
                    throw new Vivox.Error("requestError", "Failed creating xml for request: " + command);
                }

                // parse the xml template into a request object
                var request= xml2object(requestXml);
                if (! request ){
                    throw new Vivox.Error("requestError", "Failed creating xml for request: " + command);
                }

                // copy the properties over to the request object
                for( var k in args ){
                    if( ! k in request.Request ){
                        this.warn("Ignoring unrecognized property ["+ k + "] in request: " + command);
                    }
                    else {
                        request.Request[k] = args[k];
                    }
                }

                // register in callback cache
                var request_id = "Req-" + this._requestPrefix + "-" + this._requestCount++;


                var record = {};
                record._callback = callback_fn;
                record._data = data;
                record._scope = data ? data.scope : null;

                record.requestTime = (new Date).getTime();

                request.Request['@requestId'] = request_id;
                this._requestStore[request_id] = record;

                // convert the request object back to xml and send
                var conCreateReqXml = json2xml(request);
                this.log('issueRequest: '+ conCreateReqXml, "api");
                this.getPlugin().vx_issue_request( Vivox.utf8.encode(conCreateReqXml) );
            }
            catch (e) {
                this.handleException(e);
                return false;
            }
            return true;
        },

        /* misc / helpers */

        getPlugin : function () {
            var scriptObject = document.getElementById(this._objectId);
            if( ! scriptObject ) {
                throw new Vivox.Error("noPlugin", 'Vivox Plug-in not found.');
            }
            return scriptObject;
        },

        log : function (msg, type) {
            if( ! (this._debug && (this._debug.all || this._debug[type])) ){
                return;
            }
            if( this._logger ){
                try {
                    this._logger(msg, type);
                }
                catch(e){
                    this.error("Unable to excecute log function: " + e);
                }
            }
        },
        info : function (msg) {
            this.log(msg, "info");
        },
        debug: function (msg) {
            this.log(msg, "debug");
        },
        warn: function (msg) {
            this.log(msg, "warn");
        },
        error: function (msg) {
            this.log(msg, "error");
        },

        logObj : function (obj, type, optional_name){
            var o;
            if( optional_name ){
                o = {};
                o[optional_name] = obj;
            }
            else {
                o = obj;
            }
            this.log( this.debugObj(o), type );
        },

        debugObj : function (obj, indent){
            if( ! indent ){
                indent = "";
            }
            var sub_indent = indent ? indent + "     " : "    ";

            var props = [];
            var str;
            if ( obj instanceof Array ){
                for(var i = 0; i < obj.length; i++ ){
                    str = this.debugValue(obj[i], sub_indent);
                    if( str != null ){
                        props.push("\n" + sub_indent + str);
                    }
                }
                return "[" + props.join(",") + "\n" + indent + "]";
            }
            else if( typeof obj == "object") {
                for( var k in obj ){
                    if( k.substring(0,1) == "_"){
                        continue;
                    }
                    str = this.debugValue(obj[k], sub_indent);
                    if( str != null ){
                        props.push("\n" + sub_indent + this.debugValue(k) + " : " + str);
                    }
                }
                return "{" + props.join(",") + "\n" + indent + "}";
            }
            else {
                this.debugValue(obj, sub_indent);
            }
            return null;
        },

        debugValue : function ( value, indent ) {
            var v = value;
            var type = typeof v;

            if( v == null ){
                return 'null';
            }

            switch( type ) {
                case "function" :
                    return null
                    break;
                case "string" :
                    v = '"' + v.replace('\"', '\\\"') + '"';
                    break;
                case "object":
                    v = this.debugObj(v, indent);
                    break;
            }
            return v.toString();
        },

        handleException: function(e) {
            var message;
            if (e.number === undefined) {
                message = e;
            }
            else {
                var number = e.number;
                if (number < 0) {
                    number = 0xFFFFFFFF + number + 1;
                }
                message = e.message + "', 0x" + number.toString(16);
            }
            this.warn("Error: " + message);
        },

        setupScriptObjectCallbacks : function () {
            var scriptObject = this.getPlugin();
            var sc = this._scriptCallbacks;
            var n;
            for( n in sc ){
                scriptObject[n] = sc[n];
            }
        },

        setupIEScriptObjectCallbacks: function () {
            var str = "";
            var id = this._objectId;
            var sc = this._scriptCallbacks;
            for( var n in sc ){
                str += "function document." + id + '::' + n + "(){"
                        + "var args = Array.prototype.slice.call(arguments);"
                        + "sc."+ n + ".apply(sc, args);"
                        +"};";
            }
            eval(str);
        },

        /* class utils */
        _getOptionsAccountHandle : function (options){
            if( options && options.AccountHandle ){
                return options.AccountHandle
            }
            return this._accountHandle;
        }
        
    }
    /**
     * Exception and Error Object
     * @param code
     * @param message
     */

    window.Vivox.Error = function ( code, message) {
        this.errorCode = code;
        this.errorString = message;
    };
    Vivox.Error.prototype.toString = function () {
        return "[" + this.errorCode + "] " + this.errorString;
    };

    /* helper functions for the automatic type casting */
    function stringToBoolean (str){
        return Boolean(str != "false" && str != "0" && str);
    }
    function forceArray (obj){
        for( var k in obj){
            var node;
            if( obj[k] instanceof Array ){
                node = obj[k];
            }
            else {
                node = [ obj[k] ];
            }
            Vivox.lib.typecastObject(node);
            return node;
        }
        return [];
    }
    function ignoreCast (obj){
        return obj; // so we can explicitly ignore casting on objects like 'prototype'
    }


    Vivox.lib = {

        // Casting Functions; overwrite-able for string-only legacy behavior
        toBoolean : stringToBoolean,

        toNumber : function (i){
            return parseFloat(i);
        },

        // Misc
        updateObject : function (obj, properties ){
            for ( var p in properties ){
                if( !(p in obj) ){
                    this.warn("Unexpected Property: " +  + p);
                }
                obj[p] = properties[p];
            }
        },

        extend : function (subclass, superclass, props) {
            // custom framework-free inheritance, adapted from:
            // http://ejohn.org/blog/simple-javascript-inheritance/
            // http://devlicio.us/blogs/sergio_pereira/archive/2009/06/12/javascript-not-your-father-s-inheritance-model-part-2.aspx
            var scopify = function ( fn_name ) {
                return function () {
                    var restore = this._super;
                    this._super = superclass.prototype[fn_name] || Vivox.noOp;
                    var ret = props[fn_name].apply(this,arguments);
                    this._super = restore;
                    return ret;
                }
            };

            var fn = function () {};
            fn.prototype = superclass.prototype;
            subclass.prototype = new fn();

            for( var p in props ){
                if( typeof props[p] != "function" ){
                    subclass.prototype[p] = props[p];
                }
                else {
                    subclass.prototype[p] = scopify(p);
                }
            }
           subclass.prototype.constructor = subclass;
        },
             
        getDomain : function (uri) {
            var parts = uri.split('@');
            return parts[parts.length-1];
        },

        noOp : function () {
            //eg. _super() is always safe to call
        },

        getHostname : function  () {
            var uri = document.location.toString();
            if (uri.indexOf("?") > 0){
                uri = uri.substring(0, uri.indexOf("?"));
            }
            var o = parseUri(uri);
            return (o.protocol == "file" ) ? 'localhost' : o.host;
        },

        // Hackish type detection for responses and objects based on key name.
        // Default is to leave properties as-is (ie: strings)
        _castDictionary : {
            IsAnonymousLogin : stringToBoolean,
            IsAudioMuted : stringToBoolean,
            IsIncoming : stringToBoolean,
            IsTextMuted : stringToBoolean,
            IsAudioMutedTarget : stringToBoolean,
            IsTextMutedTarget : stringToBoolean,
            HasAudioTarget : stringToBoolean,
            HasTextTarget : stringToBoolean,
            Volume : Number,
            VolumeTarget : Number,
            SpeakerPosition : Vivox.VCoordinate,
            ListenerPosition : Vivox.VCoordinate,
            ListenerUpOrientation : Vivox.VCoordinate,
            ListenerAtOrientation : Vivox.VCoordinate,
            IsConnected : stringToBoolean,
            IsAudioEnabled : stringToBoolean,
            IsTextEnabled : stringToBoolean,
            IsModeratorAudioMuted : stringToBoolean,
            IsModeratorTextMuted : stringToBoolean,
            IsModerator : stringToBoolean,
            IsModeratorMuted : stringToBoolean, 
            IsLocalAudioMuted : stringToBoolean,
            IsLocalTextMuted : stringToBoolean,
            IsSpeaking : stringToBoolean,
            IsTyping : stringToBoolean,
            IsHandRaised : stringToBoolean,
            Energy : Number,
            IsMe : stringToBoolean,
            IsGuest : stringToBoolean,
            IsLocalAudioMutedTarget : stringToBoolean,
            MicVol : Number,
            SpeakerVol : Number,
            SpeakerMute : stringToBoolean,
            MicMute : stringToBoolean,
            HasAudio : stringToBoolean,
            HasText : stringToBoolean,
            Connected : stringToBoolean,
            Connections : Number,
            MaxAllowed : Number,
            Allow : stringToBoolean,
            IsFocused : stringToBoolean,
            IsPositional: stringToBoolean,
            IsAudioMutedForMe : stringToBoolean,
            IsTextMutedForMe : stringToBoolean,
            IsTransmitEnabled : stringToBoolean,
            IsAudioModeratorMuted : stringToBoolean,
            IsTextModeratorMuted : stringToBoolean,
            IsAdPlaying : stringToBoolean,
            IsTransmitEnabled : stringToBoolean,
            Size : Number,
            RollOff : Number,
            MaxGain : Number,
            MaxRange : Number,
            Protected : stringToBoolean,
            Persistent : stringToBoolean,
            ActiveParticipants : Number,
            Capacity : Number,
            Limit : Number,
            ChannelLimit : Number,
            ChannelCapacity : Number,
            ChannelActiveParticipants : Number,
            ChannelIsPersistent : stringToBoolean,
            ChannelIsProtected : stringToBoolean,
            ChannelSize : Number,
            ClampingDist : Number,
            Page: Number,
            From : Number,
            To: Number,
            Expired : stringToBoolean,
            NumberOfAliases : Number,
            ChannelParticipantsResults : forceArray,
            ChannelListResults : forceArray,
            AccountListBuddies : forceArray,
            Favorites : forceArray,
            SessionGroups : forceArray,
            Sessions : forceArray,
            Participants : forceArray,
            Accounts : forceArray,
            BannedUsers : forceArray,
            TemplateFonts : forceArray,
            SessionFonts : forceArray
        },

        typecastObject : function ( obj, recursive){
            for( var k in obj ) {
                if( typeof obj[k] == "function" ){
                    continue;
                }
                if( Vivox.lib._castDictionary[k] ){
                    obj[k] = Vivox.lib._castDictionary[k](obj[k]);
                }
                if( obj[k] instanceof Object && recursive){
                    Vivox.lib.typecastObject(obj[k], recursive);
                }                
            }
        },

        vCoordinate2Xml : function( vCoordinate ) {
            return '<VCoordinate>'
                    + "<X>" + vCoordinate.X + "</X>"
                    + "<Y>" + vCoordinate.Y + "</Y>"
                    + "<Z>" + vCoordinate.Z + "</Z>"
                    + '</VCoordinate>';
        }   
    };

    Vivox.Session = function (properties, session) {        
        if(! session  ){
            session = {
                IsAudioMuted: null,
                IsTextMuted: null,
                Volume: null,
                Uri : null,
                AudioState: null,
                TextState: null,
                IsIncoming: null,
                VoiceFont: null,
                IsAudioMutedTarget: null,
                IsTextMutedTarget: null,
                IsAdPlaying : null,
                IsTransmitEnabled : null,
                VolumeTarget: null,
                VoiceFontTarget: null,
                HasAudioTarget: null,
                HasTextTarget: null,
                Name: null,
                DurableMediaID: null,
                SpeakerPosition: null,
                ListenerPosition: null,
                ListenerUpOrientation: null,
                ListenerAtOrientation: null
            };
        }

        Vivox.lib.typecastObject(properties);
        Vivox.lib.updateObject(session, properties);
        return session;
    };
        
    Vivox.Participant = function (properties, participant) {
        if(! participant ){
            participant = {
                IsConnected : null,
                IsAudioEnabled : null,
                IsTextEnabled : null,
                IsModeratorAudioMuted : null,
                IsModeratorTextMuted : null,
                IsLocalAudioMuted : null,
                IsLocalTextMuted : null,
                IsSpeaking : null,
                IsTyping : null,
                IsHandRaised : null,
                Volume : null,
                Energy : null,
                DisplayName : null,
                Type : null,
                Uri : null,
                IsMe : null,
                IsGuest : null,
                AuxState : null,
                IsLocalAudioMutedTarget : null,
                VolumeTarget : null
            };
        }

        Vivox.lib.typecastObject(properties);
        Vivox.lib.updateObject(participant, properties);
        return participant;
    };

    Vivox.VCoordinate = function ( coordinates ){
        var coords = coordinates && coordinates.VCoordinate
                ? coordinates.VCoordinate : {};
        coords.X = Vivox.lib.toNumber(coords.X || 0);
        coords.Y = Vivox.lib.toNumber(coords.Y || 0);
        coords.Z = Vivox.lib.toNumber(coords.Z || 0);
        return coords;
    };


    Vivox.utf8 = {
        // public method for url encoding
        // http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html

        encode : function (string) {
            try {
                return unescape( encodeURIComponent( string) );
            }
            catch (e) {
                error_log(e);
                return string;
            }
        },

        // public method for url decoding
        decode : function (utftext) {
            try {                       
                return decodeURIComponent( escape(utftext) );
            }
            catch (e) {
                error_log(e);
                return utftext;
            }
        }
    };


    /* Serialization */

    function xml2object (xml){
        var jsonString = xml2json( parseXml(xml), "  ");
        var obj = eval('json='+jsonString);
        if( obj.parsererror ) {
            throw new Vivox.Error("xmlParse", 'Bad Response XML: ' + messageObj.parsererror['#text'] + ": " + xml);
        }        
        return obj;
    }

    function parseXml (xml) {
        var dom = null;
        if (window.DOMParser) {
            try {
                dom = (new DOMParser()).parseFromString(xml, "text/xml");
            }
            catch (e) {dom = null;}
        }
        else if (window.ActiveXObject) {
            try {
                dom = new ActiveXObject('Microsoft.XMLDOM');
                dom.async = false;
                if (!dom.loadXML(xml)) // parse error ..
                    window.alert(dom.parseError.reason + dom.parseError.srcText);
            }
            catch (e) {dom = null;}
        }
        return dom;
    }

    /**
     *
     */
    function generateShortGuid() {
        var result, i, j;
        result = '';
        for(j=0; j<16; j++) {
            if( j == 8 || j == 12|| j == 16|| j == 20) {
                result = result + '-';
            }
            i = Math.floor(Math.random()*16).toString(16).toLowerCase();
            result = result + i;
        }
        return result+'_';
    }


    function generateGuid()
    {
        var result, i, j;
        result = '';
        for(j=0; j<32; j++)
        {
            if( j == 8 || j == 12|| j == 16|| j == 20)
                result = result + '-';
            i = Math.floor(Math.random()*16).toString(16).toLowerCase();
            result = result + i;
        }
        return result
    }


    /**
     * private static class property for tracking all vivox objects embedded in page
     * @private
     * @static
     */

    var embedCounter = 0;    
    function nextObjectId(){
        return "vivoxPluginObject" + embedCounter++; 
    }



    /* Third Party */


    /*	This work is licensed under Creative Commons GNU LGPL License.
	    License: http://creativecommons.org/licenses/LGPL/2.1/
        Version: 0.9
	    Author:  Stefan Goessner/2006
	    Web:     http://goessner.net/
    */

    function json2xml(o, tab) {
        var toXml = function(v, name, ind) {
            var xml = "";
            var m,n, i;
            if (v instanceof Array) {
                for (i=0, n=v.length; i<n; i++)
                    xml += ind + toXml(v[i], name, ind+"\t") + "\n";
            }
            else if (typeof(v) == "object") {
                var hasChild = false;
                xml += ind + "<" + name;
                for (m in v) {
                    if (m.charAt(0) == "@")
                        xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
                    else
                        hasChild = true;
                }
                xml += hasChild ? ">" : "/>";
                if (hasChild) {
                    for (m in v) {
                        if (m == "#text")
                            xml += v[m];
                        else if (m == "#cdata")
                            xml += "<![CDATA[" + v[m] + "]]>";
                        else if (m.charAt(0) != "@")
                                xml += toXml(v[m], m, ind+"\t");
                    }
                    xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
                }
            }
            else {
                if ( v == undefined ) {
		    xml += ind + "<" + name + "></" + name + ">";
                } else {
		    xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
                }
            }
            return xml;
        }, xml="";
        for (var m in o)
            xml += toXml(o[m], m, "");
        return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
    }

    function xml2json(xml, tab) {
        var X = {
            toObj: function(xml) {
                var o = {};
                if (xml.nodeType==1) {   // element node ..
                    if (xml.attributes.length)   // element with attributes  ..
                        for (var i=0; i<xml.attributes.length; i++)
                            o["@"+xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue||"").toString();
                    if (xml.firstChild) { // element has child nodes ..
                        var textChild=0, cdataChild=0, hasElementChild=false, n;
                        for (n=xml.firstChild; n; n=n.nextSibling) {
                            if (n.nodeType==1) hasElementChild = true;
                            else if (n.nodeType==3 && n.nodeValue.match(/[^ \f\n\r\t]/)) textChild++; // non-whitespace text
                            else if (n.nodeType==4) cdataChild++; // cdata section node
                        }
                        if (hasElementChild) {
                            if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
                                X.removeWhite(xml);
                                for (n=xml.firstChild; n; n=n.nextSibling) {
                                    if (n.nodeType == 3)  // text node
                                        o["#text"] = X.escape(n.nodeValue);
                                    else if (n.nodeType == 4)  // cdata node
                                        o["#cdata"] = X.escape(n.nodeValue);
                                    else if (o[n.nodeName]) {  // multiple occurence of element ..
                                            if (o[n.nodeName] instanceof Array)
                                                o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                                            else
                                                o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                        }
                                        else  // first occurence of element..
                                            o[n.nodeName] = X.toObj(n);
                                }
                            }
                            else { // mixed content
                                if (!xml.attributes.length)
                                    o = X.escape(X.innerXml(xml));
                                else
                                    o["#text"] = X.escape(X.innerXml(xml));
                            }
                        }
                        else if (textChild) { // pure text
                            if (!xml.attributes.length)
                                o = X.escape(X.innerXml(xml));
                            else
                                o["#text"] = X.escape(X.innerXml(xml));
                        }
                        else if (cdataChild) { // cdata
                                if (cdataChild > 1)
                                    o = X.escape(X.innerXml(xml));
                                else
                                    for (n=xml.firstChild; n; n=n.nextSibling)
                                        o["#cdata"] = X.escape(n.nodeValue);
                            }
                    }
                    if (!xml.attributes.length && !xml.firstChild) o = null;
                }
                else if (xml.nodeType==9) { // document.node
                    o = X.toObj(xml.documentElement);
                }
                else
                    alert("unhandled node type: " + xml.nodeType);
                return o;
            },
            toJson: function(o, name, ind) {
                var json = name ? ("\""+name+"\"") : "";
                if (o instanceof Array) {
                    for (var i=0,n=o.length; i<n; i++)
                        o[i] = X.toJson(o[i], "", ind+"\t");
                    json += (name?":[":"[") + (o.length > 1 ? ("\n"+ind+"\t"+o.join(",\n"+ind+"\t")+"\n"+ind) : o.join("")) + "]";
                }
                else if (o === null || o === undefined )
                    json += (name&&":") + "null";
                else if (typeof(o) == "object") {
                        var arr = [];
                        for (var m in o)
                            arr[arr.length] = X.toJson(o[m], m, ind+"\t");
                        json += (name?":{":"{") + (arr.length > 1 ? ("\n"+ind+"\t"+arr.join(",\n"+ind+"\t")+"\n"+ind) : arr.join("")) + "}";
                    }
                    else if (typeof(o) == "string")
                            json += (name&&":") + "\"" + o.toString() + "\"";
                        else
                            json += (name&&":") + o.toString();
                return json;
            },
            innerXml: function(node) {
                var s = ""
                if ("innerHTML" in node)
                    s = node.innerHTML;
                else {
                    var asXml = function(n) {
                        var s = "";
                        if (n.nodeType == 1) {
                            s += "<" + n.nodeName;
                            for (var i=0; i<n.attributes.length;i++)
                                s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue||"").toString() + "\"";
                            if (n.firstChild) {
                                s += ">";
                                for (var c=n.firstChild; c; c=c.nextSibling)
                                    s += asXml(c);
                                s += "</"+n.nodeName+">";
                            }
                            else
                                s += "/>";
                        }
                        else if (n.nodeType == 3)
                            s += n.nodeValue;
                        else if (n.nodeType == 4)
                                s += "<![CDATA[" + n.nodeValue + "]]>";
                        return s;
                    };
                    for (var c=node.firstChild; c; c=c.nextSibling)
                        s += asXml(c);
                }
                return s;
            },
            escape: function(txt) {
                return txt.replace(/[\\]/g, "\\\\")
                        .replace(/[\"]/g, '\\"')
                        .replace(/[\n]/g, '\\n')
                        .replace(/[\r]/g, '\\r');
            },
            removeWhite: function(e) {
                e.normalize();
                for (var n = e.firstChild; n; ) {
                    if (n.nodeType == 3) {  // text node
                        if (!n.nodeValue.match(/[^ \f\n\r\t]/)) { // pure whitespace text node
                            var nxt = n.nextSibling;
                            e.removeChild(n);
                            n = nxt;
                        }
                        else
                            n = n.nextSibling;
                    }
                    else if (n.nodeType == 1) {  // element node
                        X.removeWhite(n);
                        n = n.nextSibling;
                    }
                    else                      // any other node
                        n = n.nextSibling;
                }
                return e;
            }
        };
        if (xml.nodeType == 9) // document node
            xml = xml.documentElement;
        var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
        return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
    }

    /*
     * Browser detection
     * - courtesy of QuirksMode. http://www.quirksmode.org/js/detect.html
     */
    Vivox.BrowserDetect = {
        init: function () {
            this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
            this.version = this.searchVersion(navigator.userAgent)
                    || this.searchVersion(navigator.appVersion)
                    || "an unknown version";
            this.OS = this.searchString(this.dataOS) || "an unknown OS";
        },
        searchString: function (data) {
            for (var i=0;i<data.length;i++)	{
                var dataString = data[i].string;
                var dataProp = data[i].prop;
                this.versionSearchString = data[i].versionSearch || data[i].identity;
                if (dataString) {
                    if (dataString.indexOf(data[i].subString) != -1)
                        return data[i].identity;
                }
                else if (dataProp)
                    return data[i].identity;
            }
            return null;
        },
        searchVersion: function (dataString) {
            var index = dataString.indexOf(this.versionSearchString);
            if (index == -1) return null;
            return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
        },

        dataBrowser: [
            {
                string: navigator.userAgent,
                subString: "Chrome",
                identity: "Chrome"
            },
            {string: navigator.userAgent,
                subString: "OmniWeb",
                versionSearch: "OmniWeb/",
                identity: "OmniWeb"
            },
            {
                string: navigator.vendor,
                subString: "Apple",
                identity: "Safari",
                versionSearch: "Version"
            },
            {
                prop: window.opera,
                identity: "Opera"
            },
            {
                string: navigator.vendor,
                subString: "iCab",
                identity: "iCab"
            },
            {
                string: navigator.vendor,
                subString: "KDE",
                identity: "Konqueror"
            },
            {
                string: navigator.userAgent,
                subString: "Firefox",
                identity: "Firefox"
            },
            {
                string: navigator.vendor,
                subString: "Camino",
                identity: "Camino"
            },
            {		// for newer Netscapes (6+)
                string: navigator.userAgent,
                subString: "Netscape",
                identity: "Netscape"
            },
            {
                string: navigator.userAgent,
                subString: "MSIE",
                identity: "Explorer",
                versionSearch: "MSIE"
            },
            {
                string: navigator.userAgent,
                subString: "Gecko",
                identity: "Mozilla",
                versionSearch: "rv"
            },
            { 		// for older Netscapes (4-)
                string: navigator.userAgent,
                subString: "Mozilla",
                identity: "Netscape",
                versionSearch: "Mozilla"
            }
        ],
        dataOS : [
            {
                string: navigator.platform,
                subString: "Win",
                identity: "Windows"
            },
            {
                string: navigator.platform,
                subString: "Mac",
                identity: "Mac"
            },
            {
                string: navigator.userAgent,
                subString: "iPhone",
                identity: "iPhone/iPod"
            },
            {
                string: navigator.platform,
                subString: "Linux",
                identity: "Linux"
            }
        ]

    };
    Vivox.BrowserDetect.init();


    /*
    parseUri 1.2.1
	(c) 2007 Steven Levithan <stevenlevithan.com>
	MIT License
    */

    function parseUri (str) {
        var	o   = parseUri.options,
                m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                uri = {},
                i   = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    }

    parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    /* json2.js
 * 2008-01-17
 * Public Domain
 * No warranty expressed or implied. Use at your own risk.
 * See http://www.JSON.org/js.html
*/
if(!this.JSON){JSON=function(){function f(n){return n<10?'0'+n:n;}
Date.prototype.toJSON=function(){return this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z';};var m={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'};function stringify(value,whitelist){var a,i,k,l,r=/["\\\x00-\x1f\x7f-\x9f]/g,v;switch(typeof value){case'string':return r.test(value)?'"'+value.replace(r,function(a){var c=m[a];if(c){return c;}
c=a.charCodeAt();return'\\u00'+Math.floor(c/16).toString(16)+
(c%16).toString(16);})+'"':'"'+value+'"';case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
if(typeof value.toJSON==='function'){return stringify(value.toJSON());}
a=[];if(typeof value.length==='number'&&!(value.propertyIsEnumerable('length'))){l=value.length;for(i=0;i<l;i+=1){a.push(stringify(value[i],whitelist)||'null');}
return'['+a.join(',')+']';}
if(whitelist){l=whitelist.length;for(i=0;i<l;i+=1){k=whitelist[i];if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}else{for(k in value){if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}
return'{'+a.join(',')+'}';}}
return{stringify:stringify,parse:function(text,filter){var j;function walk(k,v){var i,n;if(v&&typeof v==='object'){for(i in v){if(Object.prototype.hasOwnProperty.apply(v,[i])){n=walk(i,v[i]);if(n!==undefined){v[i]=n;}}}}
return filter(k,v);}
if(/^[\],:{}\s]*$/.test(text.replace(/\\./g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof filter==='function'?walk('',j):j;}
throw new SyntaxError('parseJSON');}};}();} 
})();
