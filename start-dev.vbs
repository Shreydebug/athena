' ATHENA dev server launcher - fully detached, hidden window
' resolves its own directory, so the project folder can be renamed freely
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /c cd /d """ & dir & """ && npm run dev >> dev.log 2>&1"
shell.Run cmd, 0, False
