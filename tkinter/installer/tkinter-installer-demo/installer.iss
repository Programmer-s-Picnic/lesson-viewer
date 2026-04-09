[Setup]
AppName=Tkinter Installer Demo
AppVersion=1.0
DefaultDirName={autopf}\TkinterInstallerDemo
DefaultGroupName=Tkinter Installer Demo
OutputDir=output
OutputBaseFilename=TkinterInstallerDemoSetup
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\app.ico

[Files]
Source: "dist\app.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Tkinter Installer Demo"; Filename: "{app}\app.exe"
Name: "{autodesktop}\Tkinter Installer Demo"; Filename: "{app}\app.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\app.exe"; Description: "Launch Tkinter Installer Demo"; Flags: nowait postinstall skipifsilent