<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<!-- <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"> -->
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta name="generator" content="HTML Tidy for Linux (vers 6 November 2007), see www.w3.org" />
<title>Rutgers University Jibe World - Jibe 1.4.2</title>
<link rel="stylesheet" type="text/css" href="markitup/skins/markitup/style.css" />
<link rel="stylesheet" type="text/css" href="markitup/sets/default/style.css" />
<link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />
<script type="text/javascript" src="http://webplayer.unity3d.com/download_webplayer-3.x/3.0/uo/UnityObject.js">
</script>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js" type="text/javascript">
</script>
<script type="text/javascript" src="markitup/jquery.markitup.js">
</script>
<script type="text/javascript" src="markitup/sets/default/set.js">
</script>
<script src="http://Rutgers.jibemix.com/Scripts/VivoxUnity.js" type="text/javascript">
</script>
<script src="http://Rutgers.jibemix.com/Scripts/VivoxVoiceAPI.js" type="text/javascript">
</script>
<script src="http://Rutgers.jibemix.com/Scripts/version.js" type="text/javascript">
</script>

<script type="text/javascript">
//<![CDATA[
                <!--
                function GetUnity() {
                        if (typeof unityObject != "undefined") {
                                return unityObject.getObjectById("unityPlayer");
                        }
                        return null;
                }
                if (typeof unityObject != "undefined") {
                        var params = {
                                disableContextMenu: true
                        };
                        unityObject.embedUnity("unityPlayer", "webplayer.unity3d", 800, 500, params);
                }
                -->

    function GetUserName(gameObject) {
    }
    function GetUserUUID(gameObject) {
    }
    function GetDynamicRoomId(gameObject) {
    }
    function LoadExternalWebpage(dataFromUnity) {
        document.getElementById("RightiFrame").src = dataFromUnity;

    }
    function LoadExternal(linkUrl) {
        document.getElementById("externallink").innerHTML = "<a href='" + linkUrl + "' target='_blank'>" + linkUrl + "<\/a>";
    }
    function ChatHistory(chatMessage) {
        $(function() {
            $('#ToggleChat').show();
        });
        document.getElementById("ChatHistory").innerHTML += chatMessage + '\n';
        document.getElementById("ChatHistory").scrollTop = document.getElementById("ChatHistory").scrollHeight;
    }
    function DebugHistory(message) {
    }
    function ChatAlert(unreadCount) {
        if (unreadCount > 1) {
            document.title = baseTitle + " < " + unreadCount + " Unread Chats >";
        }
        else if (unreadCount = 1) {
            document.title = baseTitle + " < " + unreadCount + " Unread Chat >";
        }
        else {
            document.title = baseTitle;
        }
    }
 

                <!--
                body {
                        font-family: Helvetica, Verdana, Arial, sans-serif;
                        background-color: white;
                        color: black;
                        text-align: center;
                }
                a:link, a:visited {
                        color: #000;
                }
                a:active, a:hover {
                        color: #666;
                }
                p.header {
                        font-size: small;
                }
                p.header span {
                        font-weight: bold;
                }
                p.footer {
                        font-size: x-small;
                }
                div.content {
                        margin: auto;
                        width: 800px;
                }
                div.missing {
                        margin: auto;
                        position: relative;
                        top: 50%;
                        width: 193px;
                }
                div.missing a {
                        height: 63px;
                        position: relative;
                        top: -31px;
                }
                div.missing img {
                        border-width: 0px;
                }
                div#unityPlayer {
                        cursor: default;
                        height: 500px;
                        width: 800px;
                }
                
                
                #ChatHistory
        {
            border: inset;
            text-align: left;
            width: 98%;
            height: 300px;
            overflow: auto;
            background-color: #eeeeee;
            font-family: Consolas, Courier New, sans-serif;
            font-size: 0.75em;
        }
        div#ToggleChat
         {
            text-decoration: underline;
            font-size: 0.9em;
   cursor: pointer;
   cursor: hand;
        }
                
                
                -->
/*]]>*/
</style>

<script type="text/javascript">
    //<![CDATA[
    
    function testFunction(textToDisplay) {
            $('#TestArea').val(textToDisplay);
        }
    
    $(document).ready(function() {
        
        $('#TestArea').markItUp(mySettings);
        $('.add').click(function() {
            $.markItUp({ openWith: '<opening tag>',
                closeWith: '<\/closing tag>',
                placeHolder: "New content"
            }
                                );
            return false;
        });
        $('#ChatHistory').hide();
        $('#ToggleChat').hide();
        $('#ToggleChat').click(function() {
            $('#ChatHistory').slideToggle('medium');
        });

        
    });
    //]]>
</script>
<style type="text/css">
/*<![CDATA[*/
 p.c5 {color: red}
 p.c4 {font-size: 80%}
 iframe.c3 {border:none}
 div.c2 {text-align: center}
 iframe.c1 {border:none; overflow:hidden; width:450px; height:21px;}
/*]]>*/
</style>
</head>
<body>
<div class="c2"><script type="text/javascript" src="https://apis.google.com/js/plusone.js">
</script> <a href="http://twitter.com/share" class="twitter-share-button">Tweet</a> <script type="text/javascript" src="http://platform.twitter.com/widgets.js">

</script> <iframe src="//www.facebook.com/plugins/like.php?href=http%3A%2F%2Fonlinelearning.rutgers.edu%2Fvirtual-worlds&amp;send=false&amp;layout=button_count&amp;width=450&amp;show_faces=true&amp;action=like&amp;colorscheme=light&amp;font&amp;height=21&amp;appId=118538684918025" scrolling="no" frameborder="0" class="c1"></iframe></div>
<table border="0" cellpadding="5">
<tr valign="top">
<td><iframe id="LeftiFrame" width="285" height="550" class="c3" src="default_left_iframe.html" name="LeftiFrame"></iframe></td>
<td>
<div class="content missing" id="unityPlayer"><a href="http://unity3d.com/webplayer/" title="Unity Web Player. Install now!"><img alt="Unity Web Player. Install now!" src="http://webplayer.unity3d.com/installation/getunity.png" width="193" height="63" /></a></div>
<p class="c4"><strong>[</strong> <a href="http://onlinelearning.rutgers.edu/virtual-worlds" target="_blank">About</a> <strong>|</strong> <a href="http://education.reactiongrid.com/Help-using-Vivox-Voice-in-Jibe.ashx" target="_blank">Help with Voice</a> <strong>|</strong> <a href="http://jibemix.com" target="_blank">JibeMix Portal</a> <strong>|</strong> <a href="http://rutgers.jibemix.com/jibe/webplayer_fullpage.html">FULLSCREEN</a> <strong>]</strong></p>
<p class="c5">Want to learn more? Join a <a href="http://becunningandfulloftricks.com/2011/05/11/live-tutorials-on-the-web-for-jibe-and-unity3d/" target="_blank">Live Tutorial!</a></p>
<div id="externallink"></div>
<div id="VivoxInstall"></div>
<div id="ToggleChat">Open/Close Chat Log</div>
<textarea id="ChatHistory" readonly="true">
</textarea>
 
<textarea id="TestArea">
</textarea>
 <!--<div id="ChatHistory" contenteditable="true" readonly="true">-->
<p class="footer">Powered by Jibe 1.4.2 and SmartFoxServer</p>
</td>
<td><iframe id="RightiFrame" width="500" height="500" class="c3" src="defaultrightiframe.html" name="RightiFrame"></iframe></td>
</tr>
</table>
</body>
</html>
