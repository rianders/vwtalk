<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="JibeWeb.Default" %>
<%@ Register Src="~/Unity3Player.ascx" TagName="Unity3Player" TagPrefix="jibe" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <script src="../Scripts/jquery-1.4.1.min.js" type="text/javascript"></script>
    <script src="../Scripts/VivoxUnity.js" type="text/javascript"></script>
    <script src="../Scripts/VivoxVoiceAPI.js" type="text/javascript"></script>
    <script src="../../Scripts/version.js" type="text/javascript"></script>
    <script language="javascript" type="text/javascript">

        window.username = '<%= UserName %>';

        function GetUserName(gameObject) {
            GetUnity().SendMessage(gameObject, "SetUserName", window.username);
        }

        function GetDynamicRoomId(gameObject) {
        }
        function LoadExternal(linkUrl) {
            document.getElementById("externallink").innerHTML = "<a href='" + linkUrl + "' target='_blank'>" + linkUrl + "</a>";
        }
        function ChatHistory(historyText) {
            document.getElementById("ChatHistory").innerHTML = historyText;
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
    </script>
    
    <link href="../styles/style.css" rel="stylesheet" type="text/css" />
    <title>RU Unity3D Tech Demo</title>
</head>
<body>
   <form id="form1" runat="server">
    <jibe:Unity3Player ID="Unity3Player1" runat="Server" PlayerWidth="800" PlayerHeight="500" UnityPath="/jibe/webplayer.unity3d" />
    <hr />
    <div id="leftPane">
        <div id="externallink">
        </div>
        <div id="VivoxInstall">
        </div>
        <p class="footer">
            Powered by Jibe 1.4, from ReactionGrid!<br/>
            Environment developed through Rutgers University!</p>
    </div>
    <div id="rightPane">
        <div id="ChatHistory">
        </div>
    </div>
    </form>
</body>

</html>

