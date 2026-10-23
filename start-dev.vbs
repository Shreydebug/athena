' CRIMESCAPE dev server launcher - fully detached, hidden window
Set shell = CreateObject("WScript.Shell")
cmd = "cmd /c cd /d ""C:\Users\Shubhankar\Desktop\crime analytics\crimescape"" && npm run dev >> dev.log 2>&1"
shell.Run cmd, 0, False
